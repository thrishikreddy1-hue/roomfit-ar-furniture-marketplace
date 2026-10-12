const express = require('express');
const db = require('../db');
const { optionalAuth, requireRole } = require('../middleware/auth');
const { withShops } = require('./products');
const { publish } = require('../events');
const activity = require('../activity');

const router = express.Router();

const SHOP_FIELDS = ['name', 'description', 'logo', 'coverImage', 'city', 'address', 'phone', 'whatsappNotifications', 'deliveryAreas', 'deliveryLeadTime', 'assemblyAvailable', 'pickupAvailable'];
const pick = (body) => Object.fromEntries(SHOP_FIELDS.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));
function deliveryError(data) {
  for (const key of ['assemblyAvailable', 'pickupAvailable']) {
    if (data[key] !== undefined && typeof data[key] !== 'boolean') return `${key} must be true or false`;
  }
  for (const key of ['deliveryAreas', 'deliveryLeadTime']) {
    if (data[key] !== undefined) {
      if (typeof data[key] !== 'string' || data[key].length > 300) return `${key} must be text of 300 characters or fewer`;
      data[key] = data[key].trim();
    }
  }
  return null;
}
const phoneHasWhatsAppFormat = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15;
};

async function shopSummary(shop) {
  const products = await db.products.findMany({ shopId: shop.id });
  return { ...shop, productCount: products.length };
}

async function sellerAnalytics(shop) {
  const products = await db.products.findMany({ shopId: shop.id });
  const enquiries = await db.enquiries.findMany({ shopId: shop.id });
  return {
    productViews: products.reduce((sum, product) => sum + (product.viewCount || 0), 0),
    enquiries: enquiries.length,
    arLaunches: products.reduce((sum, product) => sum + (product.arLaunchCount || 0), 0),
    arSessions: products.reduce((sum, product) => sum + (product.arSessionCount || 0), 0),
    mostViewed: [...products].filter((product) => product.viewCount > 0).sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))[0] || null,
  };
}

router.get('/', async (req, res) => {
  const q = String(req.query.q || '').toLowerCase();
  const shops = (await db.shops.findMany())
    .filter((s) => !s.suspended) // hidden from shoppers by an admin
    .filter((s) => !q || s.name.toLowerCase().includes(q) || (s.city || '').toLowerCase().includes(q));
  res.json({ shops: await Promise.all(shops.map(shopSummary)) });
});

// Seller's own shop (declared before /:id so "mine" isn't treated as an id)
router.get('/mine', requireRole('seller'), async (req, res) => {
  const shop = await db.shops.findOne({ ownerId: req.user.id });
  if (!shop) return res.status(404).json({ error: 'You have not created a shop yet' });
  res.json({ shop: await shopSummary(shop), products: await db.products.findMany({ shopId: shop.id }), analytics: await sellerAnalytics(shop) });
});

router.get('/:id', optionalAuth, async (req, res) => {
  const shop = await db.shops.byId(req.params.id);
  if (!shop || (shop.suspended && req.user?.role !== 'admin')) return res.status(404).json({ error: 'Shop not found' });
  const products = await withShops(await db.products.findMany({ shopId: shop.id }));
  res.json({ shop: await shopSummary(shop), products });
});

router.post('/', requireRole('seller'), async (req, res) => {
  if (await db.shops.findOne({ ownerId: req.user.id })) {
    return res.status(409).json({ error: 'You already own a shop — update it instead' });
  }
  const data = pick(req.body || {});
  const invalidDelivery = deliveryError(data);
  if (invalidDelivery) return res.status(400).json({ error: invalidDelivery });
  if (!data.name?.trim()) return res.status(400).json({ error: 'Shop name is required' });
  if (data.whatsappNotifications !== undefined && typeof data.whatsappNotifications !== 'boolean') {
    return res.status(400).json({ error: 'WhatsApp notifications preference must be true or false' });
  }
  if (data.whatsappNotifications === true && !phoneHasWhatsAppFormat(data.phone)) {
    return res.status(400).json({ error: 'Add a valid shop phone number before enabling WhatsApp notifications' });
  }
  if (data.whatsappNotifications !== true) data.whatsappNotifications = false;
  const shop = await db.shops.insert({ ...data, name: data.name.trim(), ownerId: req.user.id });
  publish('shop.updated', { shopId: shop.id });
  await activity.record('shop.created', req.user, `${req.user.name} opened ${shop.name}`, { shopId: shop.id });
  res.status(201).json({ shop: await shopSummary(shop) });
});

router.put('/:id', requireRole('seller'), async (req, res) => {
  const shop = await db.shops.byId(req.params.id);
  if (!shop) return res.status(404).json({ error: 'Shop not found' });
  if (shop.ownerId !== req.user.id) return res.status(403).json({ error: 'You do not own this shop' });
  const data = pick(req.body || {});
  const invalidDelivery = deliveryError(data);
  if (invalidDelivery) return res.status(400).json({ error: invalidDelivery });
  if (data.name !== undefined && !String(data.name).trim()) {
    return res.status(400).json({ error: 'Shop name cannot be empty' });
  }
  if (data.whatsappNotifications !== undefined && typeof data.whatsappNotifications !== 'boolean') {
    return res.status(400).json({ error: 'WhatsApp notifications preference must be true or false' });
  }
  const phoneChanged = data.phone !== undefined && data.phone !== shop.phone;
  if (phoneChanged) data.whatsappNotifications = false;
  if (data.whatsappNotifications === true && !phoneHasWhatsAppFormat(data.phone ?? shop.phone)) {
    return res.status(400).json({ error: 'Add a valid shop phone number before enabling WhatsApp notifications' });
  }
  const updated = await db.shops.update(shop.id, data);
  publish('shop.updated', { shopId: shop.id });
  await activity.record('shop.updated', req.user, `${updated.name} updated its shop profile`, { shopId: shop.id });
  res.json({ shop: await shopSummary(updated) });
});

module.exports = router;
