function doGet(e) {
  const props = PropertiesService.getScriptProperties();
  const ALLOWED_DOMAINS = parseStringArray(props.getProperty("DOMAINS"), []);
  const QUERY = props.getProperty("KUERY") || "berita keuangan indonesia";
  const TRUSTED_SOURCES = parseStringArray(props.getProperty("TRUSTED_NEWS"), []);
  const FETCH_COUNT = 20;
  const CACHE_TTL_SECONDS = 1800;
  const INFLIGHT_TTL_SECONDS = 60;

  const clientRef = e && e.parameter && e.parameter.ref ? String(e.parameter.ref).trim() : "";
  const clientDomain = normalizeHost(clientRef);

  if (!isAllowedOrigin(clientDomain, ALLOWED_DOMAINS)) {
    return jsonResponse({
      status: "error",
      message: "Access denied: Unauthorized origin."
    });
  }

  const normalizedTrustedSources = normalizeTrustedSources(TRUSTED_SOURCES);

  const cache = CacheService.getScriptCache();
  const cacheKey = "newsg:" + hashString([
    QUERY,
    Array.from(normalizedTrustedSources).sort().join(",")
  ].join("|"));

  const cached = cache.get(cacheKey);
  if (cached) {
    return ContentService.createTextOutput(cached).setMimeType(ContentService.MimeType.JSON);
  }

  const inflightKey = cacheKey + ":inflight";
  if (cache.get(inflightKey) === "1") {
    const fallback = cache.get(cacheKey);
    if (fallback) {
      return ContentService.createTextOutput(fallback).setMimeType(ContentService.MimeType.JSON);
    }
  }

  try {
    cache.put(inflightKey, "1", INFLIGHT_TTL_SECONDS);

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
    const items = parseGoogleNewsRss(xmlText, normalizedTrustedSources, FETCH_COUNT);

    const result = JSON.stringify({
      status: "ok",
      items: items
    });

    cache.put(cacheKey, result, CACHE_TTL_SECONDS);
    cache.remove(inflightKey);

    return ContentService.createTextOutput(result).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    cache.remove(inflightKey);
    console.error("NewsG Error: " + err.toString());
    return jsonResponse({
      status: "error",
      message: err.toString()
    });
  }
}

function isAllowedOrigin(clientDomain, allowedDomains) {
  if (!clientDomain) return false;
  if (!allowedDomains || allowedDomains.length === 0) return false;

  const normalizedAllowed = allowedDomains
    .map(domain => normalizeHost(domain))
    .filter(Boolean);

  return normalizedAllowed.includes(clientDomain);
}
