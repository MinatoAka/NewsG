function hashString(value) {
  try {
    const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value);
    return digest.map(function(byte) {
      return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('');
  } catch (err) {
    return Utilities.base64EncodeWebSafe(value).replace(/=+$/g, '').substring(0, 200);
  }
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
