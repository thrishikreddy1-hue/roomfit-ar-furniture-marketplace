const express = require('express');
const db = require('../db');
const { requireRole } = require('../middleware/auth');
const { withShops, hiddenShopIds } = require('./products');

const router = express.Router();

router.get('/', requireRole('buyer'), async (req, res) => {
  const saved = await db.wishlists.findMany({ buyerId: req.user.id });
  const productIds = new Set(saved.map((item) => item.productId));
  const hidden = await hiddenShopIds();
  const products = await withShops((await db.products.findMany()).filter((product) => productIds.has(product.id) && !hidden.has(product.shopId)));
  res.json({ products });
});

router.post('/:productId', requireRole('buyer'), async (req, res) => {
  const product = await db.products.byId(req.params.productId);
  if (!product || (await hiddenShopIds()).has(product.shopId)) return res.status(404).json({ error: 'Product not found' });
  const existing = await db.wishlists.findOne({ buyerId: req.user.id, productId: product.id });
  if (existing) {
    await db.wishlists.remove(existing.id);
    return res.json({ saved: false });
  }
  await db.wishlists.insert({ buyerId: req.user.id, productId: product.id });
  res.status(201).json({ saved: true });
});

router.delete('/:productId', requireRole('buyer'), async (req, res) => {
  // Removing a saved entry is also allowed when its product was deleted or hidden.
  const entries = await db.wishlists.findMany({ buyerId: req.user.id, productId: req.params.productId });
  await Promise.all(entries.map((entry) => db.wishlists.remove(entry.id)));
  res.status(204).end();
});

module.exports = router;
