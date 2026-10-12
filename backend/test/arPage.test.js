const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { renderArPage } = require('../src/arPage');

function viewer({ embed = false, placement = 'floor' } = {}) {
  const html = renderArPage({ protocol: 'https', get: () => 'roomfit.test', query: { embed: embed ? '1' : '' } }, {
    id: 'chair', name: 'Chair', modelUrl: '/uploads/chair.glb', placement,
    dimensions: { width: 60, depth: 55, height: 90 },
  });
  const nodes = new Map();
  const node = (id) => {
    if (!nodes.has(id)) nodes.set(id, {
      listeners: {}, classList: { add() {} }, style: {},
      addEventListener(name, handler) { this.listeners[name] = handler; },
    });
    return nodes.get(id);
  };
  const mv = node('mv');
  mv.querySelector = () => embed ? null : node('ar-button');
  const calls = [];
  const script = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
  vm.runInNewContext(script, {
    document: { getElementById: node },
    fetch(url, options) { calls.push({ url, event: JSON.parse(options.body).event }); return Promise.resolve({ ok: true }); },
    setTimeout() {},
  });
  return { html, calls, node, status: (status) => mv.listeners['ar-status']({ detail: { status } }) };
}

test('AR telemetry records launches, but failures do not count as successful sessions', () => {
  const page = viewer();
  assert.equal(page.calls.length, 0); // Loading a viewer is not an AR launch.
  page.node('ar-button').listeners.click();
  page.status('failed');
  assert.deepEqual(page.calls.map((call) => call.event), ['ar-launch']);
  page.status('session-started');
  page.status('session-started');
  page.status('object-placed');
  assert.deepEqual(page.calls.map((call) => call.event), ['ar-launch', 'ar-session']);
  page.status('not-presenting');
  page.status('session-started');
  assert.equal(page.calls.filter((call) => call.event === 'ar-session').length, 2);
});

test('embedded 3D previews do not generate AR metrics and wall guidance matches placement', () => {
  const page = viewer({ embed: true });
  page.status('session-started');
  assert.equal(page.calls.length, 0);
  assert.match(viewer({ placement: 'wall' }).html, /point your camera at the wall/);
  assert.match(viewer().html, /ar-scale="fixed"/);
});
