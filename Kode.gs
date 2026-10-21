function doGet(e) {
  const props = PropertiesService.getScriptProperties();
  const ALLOWED_DOMAINS = (JSON.parse(props.getProperty("DOMAINS") || "[]") || [])
    .map(domain => String(domain).toLowerCase().trim())
    .filter(Boolean);
  const QUERY = props.getProperty("KUERY") || "berita keuangan indonesia";
  const FETCH_COUNT = 50;
  const TRUSTED_SOURCES = (JSON.parse(props.getProperty("TRUSTED_NEWS") || "[]") || [])
    .map(source => String(source).toLowerCase().trim())
    .filter(Boolean);
  const CACHE_TTL_SECONDS = 300;
  const CACHE_KEY = 'newsg:' + Utilities.base64EncodeWebSafe(QUERY + '|' + JSON.stringify(TRUSTED_SOURCES));

  let clientDomain = '';
  if (e && e.parameter && e.parameter.ref) {
    clientDomain = String(e.parameter.ref).toLowerCase().trim();
  }

  const isAllowed = ALLOWED_DOMAINS.length > 0
    ? ALLOWED_DOMAINS.some(domain => clientDomain.includes(domain))
    : false;

  if (!isAllowed) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: 'Access denied: Unauthorized origin.'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  const cache = CacheService.getScriptCache();
  const cachedResult = cache.get(CACHE_KEY);
  if (cachedResult) {
    return ContentService.createTextOutput(cachedResult).setMimeType(ContentService.MimeType.JSON);
  }

  // Fungsi timeAgo ditaruh di sini biar rapi
  function timeAgo(ds) {
    try {
      const d = new Date(ds);
      if (isNaN(d.getTime())) return '';
      const diff = (Date.now() - d.getTime()) / 1000;
      if (diff < 60) return 'baru saja';
      if (diff < 3600) return Math.floor(diff / 60) + ' menit lalu';
      if (diff < 86400) return Math.floor(diff / 3600) + ' jam lalu';
      return Math.floor(diff / 86400) + ' hari lalu';
    } catch (err) {
      return '';
    }
  }

  function isTrusted(source) {
    if (!source) return false;
    const s = source.toLowerCase();
    return TRUSTED_SOURCES.some(ts => s.includes(ts));
  }

  const googleRss = 'https://news.google.com/rss/search?q=' + encodeURIComponent(QUERY) + '&hl=id&gl=ID&ceid=ID:id';

  try {
    const response = UrlFetchApp.fetch(googleRss, { muteHttpExceptions: true });

    if (response.getResponseCode() !== 200) {
      throw new Error('Google News menolak request (HTTP ' + response.getResponseCode() + '). Mungkin kena rate limit.');
    }

    const xmlText = response.getContentText();
    const document = XmlService.parse(xmlText);
    const root = document.getRootElement();
    const channel = root.getChild('channel');

    if (!channel) throw new Error('Struktur RSS tidak valid (channel tidak ditemukan).');

    const items = channel.getChildren('item');
    const processedItems = [];

    for (let i = 0; i < items.length && processedItems.length < FETCH_COUNT; i++) {
      const item = items[i];
      let rawTitle = item.getChildText('title') || '';
      const link = item.getChildText('link') || '';
      const pubDate = item.getChildText('pubDate') || '';

      const sourceElement = item.getChild('source');
      let source = sourceElement ? sourceElement.getValue().trim() : '';

      let title = rawTitle;
      const idx = title.lastIndexOf(' - ');
      if (idx > 10) {
        if (!source) source = title.substring(idx + 3).trim();
        title = title.substring(0, idx).trim();
      }

      if (!title || !link) continue;
      if (TRUSTED_SOURCES.length && !isTrusted(source)) continue;

      processedItems.push({
        title: title,
        link: link,
        source: source || 'Google News',
        time: timeAgo(pubDate) // <-- INI DIPERBAIKI (Panggil fungsinya, bukan IIFE)
      });
    }

    const result = JSON.stringify({
      status: 'ok',
      items: processedItems
    });

    cache.put(CACHE_KEY, result, CACHE_TTL_SECONDS);

    return ContentService.createTextOutput(result).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    console.error('NewsG Error: ' + err.toString());

    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
