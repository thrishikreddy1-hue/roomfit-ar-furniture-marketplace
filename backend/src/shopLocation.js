// Accept normal Google Maps place/directions links and the two Google share-link formats.
// Never fetch or resolve the pasted URL on the server.
function normalizeGoogleMapsUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) return null;
  const text = value.trim();
  if (!text) return '';
  try {
    const url = new URL(text);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    const host = url.hostname.toLowerCase();
    const mapsPath = /^\/maps(?:\/|$)/.test(url.pathname);
    const valid = host === 'maps.app.goo.gl' || host === 'maps.google.com'
      || (host === 'goo.gl' && mapsPath)
      || (['google.com', 'www.google.com', 'google.co.in', 'www.google.co.in'].includes(host) && mapsPath);
    return valid ? url.href : null;
  } catch {
    return null;
  }
}

module.exports = { normalizeGoogleMapsUrl };
