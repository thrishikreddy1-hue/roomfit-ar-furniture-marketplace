const { test } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeGoogleMapsUrl } = require('../src/shopLocation');

test('normalizes standard and short Google Maps links, accepts empty optional field', () => {
  for (const url of ['https://maps.app.goo.gl/abc', 'https://goo.gl/maps/abc', 'https://maps.google.com/?q=shop',
    'https://www.google.com/maps/place/Shop', 'https://google.co.in/maps/search/?api=1&query=shop']) {
    assert.equal(normalizeGoogleMapsUrl(` ${url} `), url);
  }
  assert.equal(normalizeGoogleMapsUrl('   '), '');
});

test('rejects misleading hosts, non-Maps paths, unsafe schemes, credentials and oversized links', () => {
  for (const url of ['http://www.google.com/maps', 'javascript:alert(1)', 'https://www.google.com/search?q=shop',
    'https://goo.gl/unrelated', 'https://www.google.com.evil.test/maps', 'https://evil.test/?maps=google.com',
    'https://evil@www.google.com/maps', 'https://maps.google.com:444/maps', 'https://maps.app.goo.gl/' + 'a'.repeat(2048), null, 3]) {
    assert.equal(normalizeGoogleMapsUrl(url), null);
  }
});
