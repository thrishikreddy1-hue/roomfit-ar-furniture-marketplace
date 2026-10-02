const express = require('express');
const db = require('../db');
const { requireRole } = require('../middleware/auth');
const { withShops } = require('./products');

const router = express.Router();

router.get('/', requireRole('buyer'), async (req, res) => {
  const saved = await db.wishlists.findMany({ buyerId: req.user.id });
  const productIds = new Set(saved.map((item) => item.productId));
  const products = await withShops((await db.products.findMany()).filter((product) => productIds.has(product.id)));
  res.json({ products });
});

router.post('/:productId', requireRole('buyer'), async (req, res) => {
  const product = await db.products.byId(req.params.productId);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  const existing = await db.wishlists.findOne({ buyerId: req.user.id, productId: product.id });
  if (existing) {
    await db.wishlists.remove(existing.id);
    return res.json({ saved: false });
  }
  await db.wishlists.insert({ buyerId: req.user.id, productId: product.id });
  res.status(201).json({ saved: true });
});

module.exports = router;
