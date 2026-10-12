// End-to-end API tests: a seller lists a product, the admin adds its 3D model, a shopper
// finds it by size and sends an enquiry, and the seller follows up (and hears about it live).
// Uses a throwaway data file and upload folder.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const path = require('path');
const fs = require('fs');

process.env.NODE_ENV = 'test';
process.env.DATA_FILE = path.join(os.tmpdir(), `roomfit-test-${process.pid}.json`);
process.env.UPLOAD_DIR = path.join(os.tmpdir(), `roomfit-test-uploads-${process.pid}`);
// Also creates the admin when these tests run against MongoDB (no demo admin there).
process.env.ADMIN_EMAIL = 'admin@roomfit.test';
process.env.ADMIN_PASSWORD = 'password123';

const { createApp } = require('../src/app');
const { seed, DEMO_PASSWORD } = require('../src/seed');

let server;
let base;

async function api(method, url, { token, body } = {}) {
  const res = await fetch(base + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body && JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null, raw: text };
}

const login = async (email) => (await api('POST', '/api/auth/login', { body: { email, password: DEMO_PASSWORD } })).body.token;

async function uploadFile(token, name, bytes = 'x') {
  const form = new FormData();
  form.append('file', new Blob([bytes]), name);
  const res = await fetch(`${base}/api/uploads`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
  return { status: res.status, body: await res.json() };
}

const waitFor = async (check, ms = 3000) => {
  const end = Date.now() + ms;
  while (!check()) {
    if (Date.now() > end) throw new Error('timed out waiting for a live event');
    await new Promise((r) => setTimeout(r, 20));
  }
};

// Opens the live-update stream and collects its events.
const streams = new Set();
async function openStream(token) {
  const controller = new AbortController();
  const res = await fetch(`${base}/api/events`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    signal: controller.signal,
  });
  assert.equal(res.headers.get('content-type'), 'text/event-stream');
  const events = [];
  (async () => {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) return;
      buf += decoder.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf('\n\n')) >= 0) {
        const data = buf.slice(0, i).split('\n').filter((l) => l.startsWith('data: ')).map((l) => l.slice(6)).join('');
        buf = buf.slice(i + 2);
        if (data) events.push(JSON.parse(data));
      }
    }
  })().catch(() => {});
  const stream = { events, close: () => controller.abort() };
  streams.add(stream);
  await waitFor(() => events.some((e) => e.type === 'ready'));
  return stream;
}

before(async () => {
  await seed({ log: false });
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  for (const s of streams) s.close();
  server.closeAllConnections();
  server.close();
  await require('../src/db').close();
  fs.rmSync(process.env.DATA_FILE, { force: true });
  fs.rmSync(process.env.UPLOAD_DIR, { recursive: true, force: true });
});

test('auth: register, duplicate email, bad login, me', async () => {
  const reg = await api('POST', '/api/auth/register', {
    body: { name: 'New Buyer', email: 'New@Example.com', password: 'secret1', role: 'buyer' },
  });
  assert.equal(reg.status, 201);
  assert.equal(reg.body.user.email, 'new@example.com');
  assert.equal(reg.body.user.passwordHash, undefined);

  const dup = await api('POST', '/api/auth/register', {
    body: { name: 'X', email: 'new@example.com', password: 'secret1' },
  });
  assert.equal(dup.status, 409);

  const bad = await api('POST', '/api/auth/login', { body: { email: 'new@example.com', password: 'nope' } });
  assert.equal(bad.status, 401);

  const me = await api('GET', '/api/auth/me', { token: reg.body.token });
  assert.equal(me.body.user.name, 'New Buyer');

  // Nobody can sign up as an admin
  const admin = await api('POST', '/api/auth/register', {
    body: { name: 'Sneaky', email: 'sneaky@example.com', password: 'secret1', role: 'admin' },
  });
  assert.equal(admin.status, 400);
});

test('listing flow: create product without price, find it by size', async () => {
  const seller = await login('seller@oakandloom.test');
  const buyer = await login('buyer@roomfit.test');

  // Buyers cannot create products
  assert.equal((await api('POST', '/api/products', { token: buyer, body: {} })).status, 403);

  const invalid = await api('POST', '/api/products', { token: seller, body: { name: 'Table' } });
  assert.equal(invalid.status, 400);

  const created = await api('POST', '/api/products', {
    token: seller,
    body: {
      name: 'Compact Coffee Table',
      category: 'Tables',
      price: 9999, // ignored: listings have no prices
      stock: 2,
      dimensions: { width: 90, depth: 50, height: 40 },
      modelUrl: 'https://example.com/table.glb', // ignored: only the admin adds 3D models
      placement: 'wall',
    },
  });
  assert.equal(created.status, 201, created.raw);
  assert.equal(created.body.product.price, undefined);
  assert.equal(created.body.product.modelUrl, '');
  assert.equal(created.body.product.placement, 'floor');
  assert.equal(created.body.product.shop.name, 'Oak & Loom');
  assert.ok('phone' in created.body.product.shop);

  // No product in the catalogue exposes a price
  const all = await api('GET', '/api/products');
  assert.ok(all.body.products.every((p) => p.price === undefined));

  // "Fits my space" filter: a 100cm-wide nook fits the table but not the sofas
  const fits = await api('GET', '/api/products?maxWidth=100&category=Tables');
  assert.ok(fits.body.products.some((p) => p.id === created.body.product.id));
  assert.equal((await api('GET', '/api/products?maxWidth=100&category=Sofas')).body.products.length, 0);

  // Sellers can't add a model by editing the product either
  const id = created.body.product.id;
  const edited = await api('PUT', `/api/products/${id}`, { token: seller, body: { modelUrl: 'https://example.com/t.glb', stock: 3 } });
  assert.equal(edited.body.product.stock, 3);
  assert.equal(edited.body.product.modelUrl, '');
  assert.equal((await fetch(`${base}/ar/${id}`)).status, 404);
});

test('sellers can add up to 20 products only', async () => {
  const seller = await login('seller@oakandloom.test');
  const shop = await api('GET', '/api/shops/mine', { token: seller });
  const existing = shop.body.products.length;

  for (let i = existing; i < 20; i += 1) {
    const created = await api('POST', '/api/products', {
      token: seller,
      body: {
        name: `Seller cap ${i + 1}`,
        category: 'Decor',
        stock: 1,
        dimensions: { width: 30 + i, depth: 20, height: 25 },
      },
    });
    assert.equal(created.status, 201, created.raw);
  }

  const limitHit = await api('POST', '/api/products', {
    token: seller,
    body: {
      name: 'Seller cap overflow',
      category: 'Decor',
      stock: 1,
      dimensions: { width: 30, depth: 20, height: 25 },
    },
  });

  assert.equal(limitHit.status, 400);
  assert.match(String(limitHit.body.error), /20 products/i);
});

test('product detail returns recommendation list', async () => {
  const buyer = await login('buyer@roomfit.test');
  const all = await api('GET', '/api/products');
  const product = all.body.products[0];
  const detail = await api('GET', `/api/products/${product.id}`, { token: buyer });

  assert.equal(detail.status, 200, detail.raw);
  assert.ok(Array.isArray(detail.body.related));
  assert.ok(detail.body.related.length > 0);
  assert.ok(detail.body.related.some((p) => p.id !== product.id));
});

test('admin adds 3D models; sellers and shoppers cannot', async () => {
  const admin = await login('admin@roomfit.test');
  const seller = await login('seller@oakandloom.test');
  const buyer = await login('buyer@roomfit.test');
  const { body } = await api('GET', '/api/products?category=Decor');
  const product = body.products[0];

  for (const token of [seller, buyer, undefined]) {
    assert.ok([401, 403].includes((await api('GET', '/api/admin/products', { token })).status));
    assert.ok([401, 403].includes((await api('PUT', `/api/admin/products/${product.id}/ar`, { token, body: { modelUrl: '' } })).status));
  }

  // The queue lists every shop's products, those without a model first
  const queue = await api('GET', '/api/admin/products', { token: admin });
  assert.equal(queue.status, 200);
  assert.equal(queue.body.stats.total, queue.body.products.length);
  assert.ok(queue.body.products[0].shop.name);

  // Validation
  const badExt = await api('PUT', `/api/admin/products/${product.id}/ar`, { token: admin, body: { modelUrl: 'https://example.com/a.obj' } });
  assert.equal(badExt.status, 400);
  const badPlacement = await api('PUT', `/api/admin/products/${product.id}/ar`, { token: admin, body: { placement: 'ceiling' } });
  assert.equal(badPlacement.status, 400);

  // Remove the model: AR switches off and the piece moves to the "missing" list
  const cleared = await api('PUT', `/api/admin/products/${product.id}/ar`, { token: admin, body: { modelUrl: '', iosModelUrl: '' } });
  assert.equal(cleared.body.product.modelUrl, '');
  assert.equal((await fetch(`${base}/ar/${product.id}`)).status, 404);
  const missing = await api('GET', '/api/admin/products?ar=missing', { token: admin });
  assert.ok(missing.body.products.some((p) => p.id === product.id));

  // Upload a model (admin only) and attach it
  assert.equal((await uploadFile(seller, 'sofa.glb')).status, 403);
  assert.equal((await uploadFile(buyer, 'sofa.glb')).status, 403);
  const glb = await uploadFile(admin, 'sofa.glb');
  assert.equal(glb.status, 201);
  assert.equal(glb.body.kind, 'model');
  const set = await api('PUT', `/api/admin/products/${product.id}/ar`, { token: admin, body: { modelUrl: glb.body.url, placement: 'wall' } });
  assert.equal(set.status, 200, set.raw);
  assert.equal(set.body.product.placement, 'wall');
  const ar = await fetch(`${base}/ar/${product.id}`);
  assert.equal(ar.status, 200);
  assert.match(await ar.text(), /ar-scale="fixed"/);
});

test('seller photos go live one by one', async () => {
  const seller = await login('seller@lumen.test');
  const otherSeller = await login('seller@chairhouse.test');
  const { body } = await api('GET', '/api/products?category=Lighting');
  const lamp = body.products[0];

  const photo = await uploadFile(seller, 'lamp.jpg');
  assert.equal(photo.status, 201);
  assert.equal(photo.body.kind, 'image');

  assert.equal((await api('POST', `/api/products/${lamp.id}/images`, { token: otherSeller, body: { url: photo.body.url } })).status, 403);
  assert.equal((await api('POST', `/api/products/${lamp.id}/images`, { token: seller, body: { url: 'javascript:alert(1)' } })).status, 400);

  // Parallel adds all land (atomic list edits), without duplicates
  const urls = ['https://example.com/a.jpg', 'https://example.com/b.jpg', photo.body.url, photo.body.url];
  await Promise.all(urls.map((url) => api('POST', `/api/products/${lamp.id}/images`, { token: seller, body: { url } })));
  let images = (await api('GET', `/api/products/${lamp.id}`)).body.product.images;
  assert.deepEqual(new Set(images), new Set([...lamp.images, ...urls]));
  assert.equal(images.length, lamp.images.length + 3);

  const removed = await api('DELETE', `/api/products/${lamp.id}/images?url=${encodeURIComponent(photo.body.url)}`, { token: seller });
  images = removed.body.product.images;
  assert.ok(!images.includes(photo.body.url));
});

test('WhatsApp enquiry notification uses the approved template and does not block enquiries on API errors', async () => {
  const seller = await login('seller@chairhouse.test');
  const mine = await api('GET', '/api/shops/mine', { token: seller });
  const shop = mine.body.shop;
  const configured = {
    WA_ACCESS_TOKEN: process.env.WA_ACCESS_TOKEN,
    WA_PHONE_NUMBER_ID: process.env.WA_PHONE_NUMBER_ID,
    WA_TEMPLATE_NAME: process.env.WA_TEMPLATE_NAME,
    WA_TEMPLATE_LANGUAGE: process.env.WA_TEMPLATE_LANGUAGE,
    WA_GRAPH_API_VERSION: process.env.WA_GRAPH_API_VERSION,
  };
  const originalFetch = global.fetch;
  const originalError = console.error;
  const graphCalls = [];
  const createdEnquiryIds = [];
  let failNextSend = false;

  process.env.WA_ACCESS_TOKEN = 'test-token';
  process.env.WA_PHONE_NUMBER_ID = 'test-phone-number-id';
  process.env.WA_TEMPLATE_NAME = 'roomfit_new_enquiry';
  process.env.WA_TEMPLATE_LANGUAGE = 'en_US';
  process.env.WA_GRAPH_API_VERSION = 'v22.0';
  global.fetch = async (url, options) => {
    if (!String(url).startsWith('https://graph.facebook.com/')) return originalFetch(url, options);
    graphCalls.push({ url, options, payload: JSON.parse(options.body) });
    if (failNextSend) {
      failNextSend = false;
      return Response.json({ error: { message: 'provider unavailable' } }, { status: 503 });
    }
    return Response.json({ messages: [{ id: 'wamid.test' }] });
  };
  console.error = () => {};

  try {
    const invalidOptIn = await api('PUT', `/api/shops/${shop.id}`, {
      token: seller,
      body: { whatsappNotifications: 'true' },
    });
    assert.equal(invalidOptIn.status, 400);

    const enabled = await api('PUT', `/api/shops/${shop.id}`, {
      token: seller,
      body: { whatsappNotifications: true },
    });
    assert.equal(enabled.body.shop.whatsappNotifications, true);

    const { body } = await api('GET', '/api/products?category=Chairs');
    const enquiry = await api('POST', '/api/enquiries', {
      body: { productId: body.products[0].id, name: 'WhatsApp Buyer', phone: '9876543210', message: 'Is it in stock?' },
    });
    assert.equal(enquiry.status, 201, enquiry.raw);
    createdEnquiryIds.push(enquiry.body.enquiry.id);
    assert.equal(graphCalls.length, 1);
    assert.match(graphCalls[0].url, /\/v22\.0\/test-phone-number-id\/messages$/);
    assert.equal(graphCalls[0].options.headers.Authorization, 'Bearer test-token');
    assert.equal(graphCalls[0].payload.to, '919820000002');
    assert.equal(graphCalls[0].payload.template.name, 'roomfit_new_enquiry');
    assert.deepEqual(
      graphCalls[0].payload.template.components[0].parameters.map((p) => p.text),
      [body.products[0].name, 'WhatsApp Buyer', '9876543210', 'Is it in stock?', enquiry.body.enquiry.id],
    );

    failNextSend = true;
    const failedSend = await api('POST', '/api/enquiries', {
      body: { productId: body.products[0].id, name: 'Still Saved', phone: '9876543210', message: 'Second enquiry' },
    });
    assert.equal(failedSend.status, 201, failedSend.raw);
    createdEnquiryIds.push(failedSend.body.enquiry.id);
    assert.equal(graphCalls.length, 2);

    const phoneChanged = await api('PUT', `/api/shops/${shop.id}`, {
      token: seller,
      body: { phone: '+91 98200 00009', whatsappNotifications: true },
    });
    assert.equal(phoneChanged.body.shop.whatsappNotifications, false);
  } finally {
    await Promise.all(createdEnquiryIds.map((id) => require('../src/db').enquiries.remove(id)));
    global.fetch = originalFetch;
    console.error = originalError;
    for (const [key, value] of Object.entries(configured)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test('enquiry flow: guest and shopper enquire, seller follows up', async () => {
  const seller = await login('seller@chairhouse.test');
  const otherSeller = await login('seller@lumen.test');
  const buyer = await login('buyer@roomfit.test');
  const { body } = await api('GET', '/api/products?category=Chairs');
  const chair = body.products[0];

  // Validation
  assert.equal((await api('POST', '/api/enquiries', { body: { productId: 'nope', name: 'A', phone: '9876543210' } })).status, 404);
  assert.equal((await api('POST', '/api/enquiries', { body: { productId: chair.id, phone: '9876543210' } })).status, 400);
  assert.equal((await api('POST', '/api/enquiries', { body: { productId: chair.id, name: 'A', phone: 'abc' } })).status, 400);
  const wantsEmailButNone = await api('POST', '/api/enquiries', {
    body: { productId: chair.id, name: 'A', phone: '9876543210', preferredContact: 'email' },
  });
  assert.equal(wantsEmailButNone.status, 400);
  assert.equal((await api('POST', '/api/enquiries', { token: seller, body: { productId: chair.id, name: 'S', phone: '9876543210' } })).status, 403);
  const admin = await login('admin@roomfit.test');
  assert.equal((await api('POST', '/api/enquiries', { token: admin, body: { productId: chair.id, name: 'A', phone: '9876543210' } })).status, 403);

  // Guest enquiry gets a default message
  const guest = await api('POST', '/api/enquiries', { body: { productId: chair.id, name: 'Guest', phone: '+91 98765 43210' } });
  assert.equal(guest.status, 201, guest.raw);
  assert.equal(guest.body.enquiry.buyerId, null);
  assert.match(guest.body.enquiry.message, /price and availability/);

  // Signed-in shopper enquiry
  const mine = await api('POST', '/api/enquiries', {
    token: buyer,
    body: { productId: chair.id, name: 'Demo Buyer', phone: '9000000000', email: 'b@x.com', preferredContact: 'whatsapp', message: 'Is it available in green?' },
  });
  assert.equal(mine.status, 201, mine.raw);
  assert.equal(mine.body.enquiry.shopName, 'The Chair House');

  // Shopper sees only their own enquiry
  const buyerList = await api('GET', '/api/enquiries', { token: buyer });
  assert.deepEqual(buyerList.body.enquiries.map((e) => e.id), [mine.body.enquiry.id]);

  // Seller sees both, newest first; another shop sees none of them
  const sellerList = await api('GET', '/api/enquiries', { token: seller });
  assert.deepEqual(sellerList.body.enquiries.map((e) => e.id), [mine.body.enquiry.id, guest.body.enquiry.id]);
  assert.equal((await api('GET', `/api/enquiries/${mine.body.enquiry.id}`, { token: otherSeller })).status, 404);

  // Only the shop can change status; buyers cannot
  const id = mine.body.enquiry.id;
  assert.equal((await api('PATCH', `/api/enquiries/${id}/status`, { token: buyer, body: { status: 'closed' } })).status, 404);
  assert.equal((await api('PATCH', `/api/enquiries/${id}/status`, { token: seller, body: { status: 'bogus' } })).status, 400);
  const contacted = await api('PATCH', `/api/enquiries/${id}/status`, { token: seller, body: { status: 'contacted' } });
  assert.equal(contacted.body.enquiry.status, 'contacted');
  const closed = await api('PATCH', `/api/enquiries/${id}/status`, { token: seller, body: { status: 'closed' } });
  assert.deepEqual(closed.body.enquiry.history.map((h) => h.status), ['new', 'contacted', 'closed']);

  // The shopper can view their enquiry and its status
  const view = await api('GET', `/api/enquiries/${id}`, { token: buyer });
  assert.equal(view.body.enquiry.status, 'closed');
});

test('live events: enquiries reach only their shop and shopper', async () => {
  const seller = await login('seller@chairhouse.test');
  const otherSeller = await login('seller@oakandloom.test');
  const buyer = await login('buyer@roomfit.test');
  const [sellerStream, otherStream, buyerStream, guestStream] = await Promise.all(
    [seller, otherSeller, buyer, undefined].map(openStream),
  );
  const { body } = await api('GET', '/api/products?category=Chairs');
  const chair = body.products[0];

  const sent = await api('POST', '/api/enquiries', {
    token: buyer,
    body: { productId: chair.id, name: 'Demo Buyer', phone: '9000000000', message: 'Live?' },
  });
  const id = sent.body.enquiry.id;
  const isCreated = (e) => e.type === 'enquiry.created' && e.enquiryId === id;
  await waitFor(() => sellerStream.events.some(isCreated));
  await waitFor(() => buyerStream.events.some(isCreated));

  await api('PATCH', `/api/enquiries/${id}/status`, { token: seller, body: { status: 'contacted' } });
  await waitFor(() => buyerStream.events.some((e) => e.type === 'enquiry.updated' && e.status === 'contacted'));

  // Catalogue changes are public
  await api('PUT', `/api/products/${chair.id}`, { token: seller, body: { stock: 7 } });
  await waitFor(() => guestStream.events.some((e) => e.type === 'product.updated' && e.productId === chair.id));

  // Other shops and guests never hear about this enquiry
  assert.ok(!otherStream.events.some((e) => e.type.startsWith('enquiry.')));
  assert.ok(!guestStream.events.some((e) => e.type.startsWith('enquiry.')));
});

test('admin portal: sees every shop and shopper, and the activity log', async () => {
  const admin = await login('admin@roomfit.test');
  const seller = await login('seller@lumen.test');
  const buyer = await login('buyer@roomfit.test');

  for (const token of [seller, buyer, undefined]) {
    for (const url of ['/api/admin/overview', '/api/admin/enquiries', '/api/admin/shops', '/api/admin/users', '/api/admin/activity']) {
      assert.ok([401, 403].includes((await api('GET', url, { token })).status), url);
    }
  }

  // The admin's live stream hears about every shop's enquiries and every logged action
  const adminStream = await openStream(admin);
  const { body } = await api('GET', '/api/products?category=Lighting');
  const lamp = body.products[0];
  const sent = await api('POST', '/api/enquiries', { body: { productId: lamp.id, name: 'Portal Guest', phone: '9123456789' } });
  const id = sent.body.enquiry.id;
  await waitFor(() => adminStream.events.some((e) => e.type === 'enquiry.created' && e.enquiryId === id));
  await waitFor(() => adminStream.events.some((e) => e.type === 'activity.created' && e.activityType === 'enquiry.created'));

  // All enquiries, across shops
  const all = await api('GET', '/api/admin/enquiries', { token: admin });
  assert.ok(new Set(all.body.enquiries.map((e) => e.shopName)).size >= 2);
  assert.equal((await api('GET', '/api/admin/enquiries?q=portal%20guest', { token: admin })).body.enquiries.length, 1);

  // Admin can open any enquiry and step in on its status
  assert.equal((await api('GET', `/api/enquiries/${id}`, { token: admin })).status, 200);
  const closed = await api('PATCH', `/api/enquiries/${id}/status`, { token: admin, body: { status: 'closed' } });
  assert.equal(closed.body.enquiry.history.at(-1).by, 'admin');

  // Overview numbers match the underlying data
  const overview = await api('GET', '/api/admin/overview', { token: admin });
  assert.equal(overview.status, 200);
  assert.equal(overview.body.users.sellers, 3);
  assert.equal(overview.body.enquiries.total, all.body.enquiries.length);
  assert.ok(overview.body.recent.length > 0);

  // Activity log covers shoppers, sellers and admins
  const log = (await api('GET', '/api/admin/activity', { token: admin })).body.activity;
  const types = new Set(log.map((a) => a.type));
  for (const t of ['user.registered', 'enquiry.created', 'enquiry.status', 'product.created', 'product.photo', 'product.ar']) {
    assert.ok(types.has(t), `activity log is missing ${t}`);
  }
  assert.ok(log.some((a) => a.actorRole === 'guest' && a.summary.includes('Portal Guest')));
  const onlyEnquiries = (await api('GET', '/api/admin/activity?type=enquiry', { token: admin })).body.activity;
  assert.ok(onlyEnquiries.length > 0 && onlyEnquiries.every((a) => a.type.startsWith('enquiry.')));

  // Shops and users with their stats
  const shops = (await api('GET', '/api/admin/shops', { token: admin })).body.shops;
  const lumen = shops.find((s) => s.name === 'Lumen & Glass');
  assert.equal(lumen.owner.email, 'seller@lumen.test');
  assert.ok(lumen.stats.enquiries >= 1);
  const shopDetail = await api('GET', `/api/admin/shops/${lumen.id}`, { token: admin });
  assert.ok(shopDetail.body.enquiries.some((e) => e.id === id));
  const sellers = (await api('GET', '/api/admin/users?role=seller', { token: admin })).body.users;
  assert.equal(sellers.length, 3);
  assert.ok(sellers.every((u) => u.passwordHash === undefined && u.shop));
  const demoBuyer = (await api('GET', '/api/admin/users?q=buyer%40roomfit', { token: admin })).body.users[0];
  const buyerDetail = await api('GET', `/api/admin/users/${demoBuyer.id}`, { token: admin });
  assert.ok(buyerDetail.body.enquiries.length >= 1);

  // Admin removes a spam enquiry: gone for the shop too
  assert.equal((await api('DELETE', `/api/admin/enquiries/${id}`, { token: admin })).status, 204);
  assert.equal((await api('GET', `/api/enquiries/${id}`, { token: seller })).status, 404);
});

test('admin portal: suspending a shop hides it; suspending an account blocks it', async () => {
  const admin = await login('admin@roomfit.test');
  const seller = await login('seller@lumen.test');
  const shops = (await api('GET', '/api/admin/shops', { token: admin })).body.shops;
  const lumen = shops.find((s) => s.name === 'Lumen & Glass');
  const lamp = (await api('GET', `/api/products?shop=${lumen.id}`)).body.products[0];

  assert.equal((await api('PATCH', `/api/admin/shops/${lumen.id}`, { token: admin, body: { suspended: 'yes' } })).status, 400);
  assert.equal((await api('PATCH', `/api/admin/shops/${lumen.id}`, { token: admin, body: { suspended: true } })).status, 200);

  // Hidden from shoppers, and no new enquiries
  assert.ok(!(await api('GET', '/api/products')).body.products.some((p) => p.shopId === lumen.id));
  assert.ok(!(await api('GET', '/api/shops')).body.shops.some((s) => s.id === lumen.id));
  assert.equal((await api('GET', `/api/shops/${lumen.id}`)).status, 404);
  assert.equal((await api('GET', `/api/products/${lamp.id}`)).status, 404);
  assert.equal((await api('POST', '/api/enquiries', { body: { productId: lamp.id, name: 'X', phone: '9123456789' } })).status, 403);
  // ...but the seller and the admin still see it
  assert.equal((await api('GET', `/api/products/${lamp.id}`, { token: seller })).status, 200);
  assert.equal((await api('GET', `/api/products/${lamp.id}`, { token: admin })).status, 200);
  assert.equal((await api('GET', `/api/products/${lamp.id}`, { token: await login('seller@chairhouse.test') })).status, 404);
  assert.equal((await api('GET', '/api/shops/mine', { token: seller })).body.shop.suspended, true);
  // Sellers can't lift their own suspension
  await api('PUT', `/api/shops/${lumen.id}`, { token: seller, body: { suspended: false } });
  assert.equal((await api('GET', '/api/shops/mine', { token: seller })).body.shop.suspended, true);

  await api('PATCH', `/api/admin/shops/${lumen.id}`, { token: admin, body: { suspended: false } });
  assert.ok((await api('GET', '/api/products')).body.products.some((p) => p.shopId === lumen.id));

  // Account suspension: sign-in refused, existing sessions stop working
  const users = (await api('GET', '/api/admin/users?role=buyer', { token: admin })).body.users;
  const target = users.find((u) => u.email === 'new@example.com');
  const token = await (async () => (await api('POST', '/api/auth/login', { body: { email: 'new@example.com', password: 'secret1' } })).body.token)();
  assert.equal((await api('PATCH', `/api/admin/users/${target.id}`, { token: admin, body: { suspended: true } })).status, 200);
  const refused = await api('POST', '/api/auth/login', { body: { email: 'new@example.com', password: 'secret1' } });
  assert.equal(refused.status, 403);
  assert.match(refused.body.error, /suspended/);
  const me = await api('GET', '/api/auth/me', { token });
  assert.equal(me.status, 401);
  assert.match(me.body.error, /suspended/);

  const adminUser = (await api('GET', '/api/admin/users?role=admin', { token: admin })).body.users[0];
  assert.equal((await api('PATCH', `/api/admin/users/${adminUser.id}`, { token: admin, body: { suspended: true } })).status, 403);

  await api('PATCH', `/api/admin/users/${target.id}`, { token: admin, body: { suspended: false } });
  assert.equal((await api('GET', '/api/auth/me', { token })).status, 200);
  const log = (await api('GET', '/api/admin/activity', { token: admin })).body.activity;
  assert.ok(['shop.suspended', 'shop.restored', 'user.suspended', 'user.restored'].every((t) => log.some((a) => a.type === t)));
});

async function featureShop(label) {
  const registered = await api('POST', '/api/auth/register', {
    body: { name: `${label} Seller`, email: `${label}@features.test`, password: 'password123', role: 'seller' },
  });
  assert.equal(registered.status, 201);
  const token = registered.body.token;
  const shop = (await api('POST', '/api/shops', { token, body: { name: `${label} Shop` } })).body.shop;
  const result = await api('POST', '/api/products', {
    token,
    body: { name: `${label} Chair`, category: 'Chairs', stock: 3, dimensions: { width: 60, depth: 55, height: 90 }, images: ['https://example.com/front.jpg', 'https://example.com/side.jpg'] },
  });
  assert.equal(result.status, 201);
  return { token, shop, product: result.body.product };
}

test('wishlist: saved state survives product reads, stays private, and can be removed', async () => {
  const { token: seller, product, shop } = await featureShop('wishlist');
  const buyer = await login('buyer@roomfit.test');
  const other = (await api('POST', '/api/auth/login', { body: { email: 'new@example.com', password: 'secret1' } })).body.token;
  const path = `/api/wishlist/${product.id}`;
  assert.equal((await api('POST', path)).status, 401);
  assert.equal((await api('POST', path, { token: seller })).status, 403);
  assert.equal((await api('POST', '/api/wishlist/missing', { token: buyer })).status, 404);
  assert.equal((await api('GET', `/api/products/${product.id}`, { token: buyer })).body.saved, false);
  assert.equal((await api('POST', path, { token: buyer })).body.saved, true);
  assert.equal((await api('GET', `/api/products/${product.id}`, { token: buyer })).body.saved, true);
  assert.equal((await api('GET', `/api/products/${product.id}`, { token: other })).body.saved, false);
  assert.ok((await api('GET', '/api/wishlist', { token: buyer })).body.products.some((p) => p.id === product.id));
  assert.ok(!(await api('GET', '/api/wishlist', { token: other })).body.products.some((p) => p.id === product.id));
  // Suspended shops must not leak through saved listings.
  const db = require('../src/db');
  await db.shops.update(shop.id, { suspended: true });
  assert.ok(!(await api('GET', '/api/wishlist', { token: buyer })).body.products.some((p) => p.id === product.id));
  assert.equal((await api('POST', path, { token: buyer })).status, 404);
  assert.equal((await api('DELETE', path, { token: buyer })).status, 204);
  await db.shops.update(shop.id, { suspended: false });
  assert.equal((await api('GET', `/api/products/${product.id}`, { token: buyer })).body.saved, false);
  assert.equal((await api('DELETE', path, { token: buyer })).status, 204);
});

test('availability and delivery: valid seller settings reach buyers, invalid values are rejected', async () => {
  const { token, shop, product } = await featureShop('delivery');
  assert.equal((await api('PUT', `/api/products/${product.id}`, { token, body: { availability: 'unknown' } })).status, 400);
  for (const availability of ['reserved', 'sold', 'available']) {
    assert.equal((await api('PUT', `/api/products/${product.id}`, { token, body: { availability } })).status, 200);
    assert.equal((await api('GET', `/api/products/${product.id}`)).body.product.availability, availability);
  }
  const delivery = { deliveryAreas: '  Mumbai  ', deliveryLeadTime: '3–5 days', assemblyAvailable: true, pickupAvailable: false };
  assert.equal((await api('PUT', `/api/shops/${shop.id}`, { token, body: delivery })).status, 200);
  const displayed = (await api('GET', `/api/products/${product.id}`)).body.product.shop;
  assert.equal(displayed.deliveryAreas, 'Mumbai');
  assert.equal(displayed.deliveryLeadTime, '3–5 days');
  assert.equal(displayed.assemblyAvailable, true);
  assert.equal(displayed.pickupAvailable, false);
  for (const body of [{ assemblyAvailable: 'false' }, { pickupAvailable: 1 }, { deliveryAreas: ['Mumbai'] }, { deliveryLeadTime: 'x'.repeat(301) }]) {
    assert.equal((await api('PUT', `/api/shops/${shop.id}`, { token, body })).status, 400);
  }
});

test('photo order: only the owner can reorder existing photos without changing their set', async () => {
  const { token, product } = await featureShop('photos');
  const otherSeller = await login('seller@oakandloom.test');
  const path = `/api/products/${product.id}/images`;
  const images = [...product.images].reverse();
  assert.equal((await api('PUT', path, { token: otherSeller, body: { images } })).status, 403);
  for (const invalid of [[images[0]], [images[0], images[0]], ['https://example.com/foreign.jpg', images[1]]]) {
    assert.equal((await api('PUT', path, { token, body: { images: invalid } })).status, 400);
  }
  assert.equal((await api('PUT', path, { token, body: { images } })).status, 200);
  assert.deepEqual((await api('GET', `/api/products/${product.id}`)).body.product.images, images);
});

test('reviews: enquiry eligibility, rating validation, editing, and full-catalogue summary', async () => {
  const { token: seller, shop, product } = await featureShop('reviews');
  const buyer = await login('buyer@roomfit.test');
  const path = `/api/reviews/shop/${shop.id}`;
  assert.equal((await api('POST', path, { body: { rating: 5 } })).status, 401);
  assert.equal((await api('POST', path, { token: seller, body: { rating: 5 } })).status, 403);
  assert.equal((await api('POST', path, { token: buyer, body: { rating: 5 } })).status, 403);
  assert.equal((await api('POST', '/api/enquiries', { token: buyer, body: { productId: product.id, name: 'Buyer', phone: '9876543210' } })).status, 201);
  for (const rating of [0, 6, 1.5]) assert.equal((await api('POST', path, { token: buyer, body: { rating } })).status, 400);
  assert.equal((await api('POST', path, { token: buyer, body: { rating: 5, body: 'x'.repeat(501) } })).status, 400);
  assert.equal((await api('POST', path, { token: buyer, body: { rating: 1, body: 'First review' } })).status, 201);
  assert.equal((await api('POST', path, { token: buyer, body: { rating: 1, body: 'Updated review' } })).status, 200);
  // Older low ratings must still affect the total even beyond the first display page.
  const db = require('../src/db');
  const original = await db.reviews.findOne({ shopId: shop.id });
  await db.reviews.update(original.id, { createdAt: '2020-01-01T00:00:00.000Z' });
  for (let i = 0; i < 20; i += 1) await db.reviews.insert({ shopId: shop.id, buyerId: `review-buyer-${i}`, buyerName: `Buyer ${i}`, rating: 5, body: 'Helpful shop' });
  const first = (await api('GET', path)).body;
  assert.equal(first.count, 21);
  assert.equal(first.reviews.length, 20);
  assert.equal(first.average, 101 / 21);
  assert.equal(first.hasMore, true);
  assert.ok(first.reviews.every((review) => !('buyerId' in review)));
  const second = (await api('GET', `${path}?page=2`)).body;
  assert.equal(second.reviews.length, 1);
  assert.equal(second.reviews[0].body, 'Updated review');
  assert.equal(second.count, 21);
  assert.equal(second.hasMore, false);
  await db.shops.update(shop.id, { suspended: true });
  assert.equal((await api('GET', path)).status, 404);
});

test('analytics: explicit view/AR events, atomic counters, and seller isolation', async () => {
  const { token, product, shop } = await featureShop('analytics');
  const buyer = await login('buyer@roomfit.test');
  const admin = await login('admin@roomfit.test');
  const path = `/api/products/${product.id}/events`;
  for (let i = 0; i < 3; i += 1) await api('GET', `/api/products/${product.id}`, { token: buyer });
  assert.equal((await api('GET', '/api/shops/mine', { token })).body.analytics.productViews, 0);
  assert.equal((await api('POST', path, { body: { event: 'ar-launch' } })).status, 400);
  assert.equal((await api('POST', path, { body: { event: 'unknown' } })).status, 400);
  const views = await Promise.all(Array.from({ length: 20 }, () => api('POST', path, { body: { event: 'view' } })));
  assert.ok(views.every((result) => result.status === 204));
  await api('POST', path, { token, body: { event: 'view' } });
  assert.equal((await api('GET', '/api/shops/mine', { token })).body.analytics.productViews, 20);
  assert.equal((await api('PUT', `/api/admin/products/${product.id}/ar`, { token: admin, body: { modelUrl: 'https://example.com/chair.glb' } })).status, 200);
  await api('POST', path, { body: { event: 'ar-launch' } });
  await api('POST', path, { body: { event: 'ar-session' } });
  await api('POST', path, { token: admin, body: { event: 'ar-session' } });
  const analytics = (await api('GET', '/api/shops/mine', { token })).body.analytics;
  assert.equal(analytics.arLaunches, 1);
  assert.equal(analytics.arSessions, 1);
  assert.equal(analytics.mostViewed.id, product.id);
  await require('../src/db').shops.update(shop.id, { suspended: true });
  assert.equal((await api('POST', path, { body: { event: 'view' } })).status, 404);
  assert.equal((await fetch(`${base}/ar/${product.id}`)).status, 404);
});
