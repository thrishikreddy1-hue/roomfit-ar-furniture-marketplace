const express = require('express');
const db = require('../db');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/shop/:shopId', async (req, res) => {
  const reviews = await db.reviews.findMany({ shopId: req.params.shopId }, { newestFirst: true, limit: 20 });
  const average = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : null;
  res.json({ reviews, average, count: reviews.length });
});

router.post('/shop/:shopId', requireRole('buyer'), async (req, res) => {
  const shop = await db.shops.byId(req.params.shopId);
  if (!shop) return res.status(404).json({ error: 'Shop not found' });
  const rating = Number(req.body?.rating);
  const body = String(req.body?.body || '').trim();
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ error: 'rating must be between 1 and 5' });
  if (body.length > 500) return res.status(400).json({ error: 'Review must be 500 characters or fewer' });
  const enquired = await db.enquiries.findOne({ buyerId: req.user.id, shopId: shop.id });
  if (!enquired) return res.status(403).json({ error: 'You can review a shop after enquiring about a product' });
  const existing = await db.reviews.findOne({ buyerId: req.user.id, shopId: shop.id });
  const review = existing
    ? await db.reviews.update(existing.id, { rating, body, buyerName: req.user.name })
    : await db.reviews.insert({ buyerId: req.user.id, buyerName: req.user.name, shopId: shop.id, rating, body });
  res.status(existing ? 200 : 201).json({ review });
});

module.exports = router;
