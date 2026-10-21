function doGet(e) {
  const props = PropertiesService.getScriptProperties();

  const ALLOWED_DOMAINS = parseStringArray(props.getProperty("DOMAINS"), ["example.com"]);
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
  const cacheKey = "newsg:" + Utilities.base64EncodeWebSafe(
    JSON.stringify({
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

function parseGoogleNewsRss(xmlText, trustedSources, maxItems) {
  const document = XmlService.parse(xmlText);
  const root = document.getRootElement();
  const channel = root.getChild("channel");

  if (!channel) {
    throw new Error("Struktur RSS tidak valid (channel tidak ditemukan).");
  }

  const trustedSet = new Set(
    trustedSources
      .map(source => String(source).toLowerCase().trim())
      .filter(Boolean)
  );

  const items = channel.getChildren("item");
  const seenLinks = new Set();
  const processed = [];

  for (let i = 0; i < items.length && processed.length < maxItems; i++) {
    const item = items[i];
    const rawTitle = item.getChildText("title") || "";
    const link = (item.getChildText("link") || "").trim();
    const pubDate = item.getChildText("pubDate") || "";

    if (!link || seenLinks.has(link)) continue;
    seenLinks.add(link);

    let title = rawTitle;
    let source = item.getChild("source") ? (item.getChild("source").getValue() || "").trim() : "";

    const idx = title.lastIndexOf(" - ");
    if (idx > 10) {
      if (!source) {
        source = title.substring(idx + 3).trim();
      }
      title = title.substring(0, idx).trim();
    }

    if (!title) continue;
    if (trustedSet.size > 0 && !isTrustedSource(source, trustedSet)) continue;

    processed.push({
      title: title,
      link: link,
      source: source || "Google News",
      time: timeAgo(pubDate),
      publishedAt: pubDate || ""
    });
  }

  return processed;
}

function isAllowedOrigin(clientDomain, allowedDomains) {
  if (!clientDomain) return false;
  if (!allowedDomains || allowedDomains.length === 0) return false;

  const normalizedAllowed = allowedDomains
    .map(domain => normalizeHost(domain))
    .filter(Boolean);

  return normalizedAllowed.includes(clientDomain);
}

function isTrustedSource(source, trustedSet) {
  if (!source) return false;
  const normalized = String(source).toLowerCase().trim();
  return trustedSet.has(normalized) || Array.from(trustedSet).some(item => normalized.includes(item));
}

function normalizeHost(value) {
  if (!value) return "";

  const input = String(value).trim().toLowerCase();

  try {
    let url = input;
    if (!/^https?:\/\//i.test(url)) {
      url = "https://" + url;
    }

    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch (e) {
    return input
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0]
      .split("?")[0]
      .trim();
  }
}

function parseStringArray(value, fallback) {
  try {
    const parsed = JSON.parse(value || "[]");
    if (!Array.isArray(parsed)) {
      return Array.isArray(fallback) ? fallback : [];
    }

    return parsed
      .map(item => String(item).toLowerCase().trim())
      .filter(Boolean);
  } catch (e) {
    return Array.isArray(fallback) ? fallback : [];
  }
}

function timeAgo(ds) {
  try {
    const d = new Date(ds);
    if (isNaN(d.getTime())) return "";

    const diff = (Date.now() - d.getTime()) / 1000;

    if (diff < 60) return "baru saja";
    if (diff < 3600) return Math.floor(diff / 60) + " menit lalu";
    if (diff < 86400) return Math.floor(diff / 3600) + " jam lalu";
    return Math.floor(diff / 86400) + " hari lalu";
  } catch (err) {
    return "";
  }
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
