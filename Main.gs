function doGet(e) {
  const props = PropertiesService.getScriptProperties();

  const ALLOWED_DOMAINS = parseStringArray(props.getProperty("DOMAINS"), []);
  const QUERY = props.getProperty("KUERY") || "berita keuangan indonesia";
  const TRUSTED_SOURCES = parseStringArray(props.getProperty("TRUSTED_NEWS"), []);
  const FETCH_COUNT = 20;
  const CACHE_TTL_SECONDS = 300;

  const clientRef = e && e.parameter && e.parameter.ref ? String(e.parameter.ref).trim() : "";
  const clientDomain = normalizeHost(clientRef);

  if (!isAllowedOrigin(clientDomain, ALLOWED_DOMAINS)) {
    return jsonResponse({
      status: "error",
      message: "Access denied: Unauthorized origin."
    });
  }

  const cache = CacheService.getScriptCache();
  const cacheKey = "newsg:" + hashString(JSON.stringify({
      query: QUERY,
      trusted: TRUSTED_SOURCES
    })
  );

  const cached = cache.get(cacheKey);
  if (cached) {
    return ContentService.createTextOutput(cached).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    const rssUrl = "https://news.google.com/rss/search?q=" +
      encodeURIComponent(QUERY) +
      "&hl=id&gl=ID&ceid=ID:id";

    const response = UrlFetchApp.fetch(rssUrl, {
      muteHttpExceptions: true
    });

    if (response.getResponseCode() !== 200) {
      throw new Error("Google News menolak request (HTTP " + response.getResponseCode() + ").");
    }

    const xmlText = response.getContentText();
    const items = parseGoogleNewsRss(xmlText, TRUSTED_SOURCES, FETCH_COUNT);

    const result = JSON.stringify({
      status: "ok",
      items: items
    });

    cache.put(cacheKey, result, CACHE_TTL_SECONDS);

    return ContentService.createTextOutput(result).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    console.error("NewsG Error: " + err.toString());
    return jsonResponse({
      status: "error",
      message: err.toString()
    });
  }
}
