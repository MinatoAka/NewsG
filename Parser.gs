function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanTitle(rawTitle, source) {
  let title = String(rawTitle || "").trim();
  const sourceName = String(source || "").trim();

  if (sourceName) {
    title = title.replace(
      new RegExp("\\s*(?:-|–|\\|)\\s*" + escapeRegex(sourceName) + "$", "i"),
      ""
    ).trim();
  }

  const idx = title.lastIndexOf(" - ");
  if (idx > 10) {
    title = title.substring(0, idx).trim();
  }

  return title;
}

function isTrustedSource(source, trustedSet) {
  if (!source) return false;
  const normalized = String(source).toLowerCase().trim();
  return trustedSet.has(normalized) || Array.from(trustedSet).some(item => normalized.includes(item));
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

    let source = item.getChild("source") ? (item.getChild("source").getValue() || "").trim() : "";
    let title = cleanTitle(rawTitle, source);

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
