'use strict';

const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const validator = require('validator');

let cache = null;
let lastCacheTime = 0;
const CACHE_TTL = 30000;

function sanitizeString(val) {
  if (typeof val !== 'string') return '';
  return validator.escape(validator.unescape(validator.trim(val)));
}

// GET all products
router.get('/', async function (req, res) {
  try {
    if (!req.query.cat && cache && (Date.now() - lastCacheTime < CACHE_TTL)) {
      return res.json({ success: true, count: cache.length, data: cache });
    }
    var filter = {};
    if (req.query.cat && req.query.cat !== 'All') filter.cat = sanitizeString(req.query.cat);
    var products = await Product.find(filter, {
      name: 1, cat: 1, badge: 1, price: 1, old: 1, rating: 1, reviews: 1, stock: 1,
      variants: 1, createdAt: 1,
      imgs: { $slice: 1 }
    }).sort({ createdAt: -1 }).lean();
    if (!req.query.cat) {
      cache = products;
      lastCacheTime = Date.now();
    }
    res.json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed' });
  }
});

// GET single product
router.get('/:id', async function (req, res) {
  try {
    if (!validator.isMongoId(req.params.id)) return res.status(400).json({ success: false });
    var product = await Product.findById(req.params.id).lean();
    if (!product) return res.status(404).json({ success: false });
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// POST create product
router.post('/', async function (req, res) {
  try {
    var body = req.body;
    var product = new Product({
      name: sanitizeString(body.name),
      cat: sanitizeString(body.cat),
      imgs: Array.isArray(body.imgs) ? body.imgs.slice(0, 20) : [],
      badge: body.badge === 'sale' ? 'sale' : 'new',
      price: sanitizeString(body.price),
      old: sanitizeString(body.old || ''),
      rating: parseFloat(body.rating) || 4.5,
      reviews: parseInt(body.reviews, 10) || 0,
      desc: sanitizeString(body.desc || ''),
      features: Array.isArray(body.features) ? body.features.map(sanitizeString) : [],
      meta: body.meta || {},
      stock: parseInt(body.stock, 10) || 0,
      variants: Array.isArray(body.variants) ? body.variants : []
    });
    var saved = await product.save();
    cache = null;
    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PUT update product
router.put('/:id', async function (req, res) {
  try {
    if (!validator.isMongoId(req.params.id)) return res.status(400).json({ success: false });
    var body = req.body;
    var updates = {};
    if (body.name !== undefined) updates.name = sanitizeString(body.name);
    if (body.cat !== undefined) updates.cat = sanitizeString(body.cat);
    if (body.imgs !== undefined) updates.imgs = Array.isArray(body.imgs) ? body.imgs.slice(0, 20) : [];
    if (body.badge !== undefined) updates.badge = body.badge === 'sale' ? 'sale' : 'new';
    if (body.price !== undefined) updates.price = sanitizeString(body.price);
    if (body.old !== undefined) updates.old = sanitizeString(body.old);
    if (body.desc !== undefined) updates.desc = sanitizeString(body.desc);
    if (body.features !== undefined) updates.features = Array.isArray(body.features) ? body.features.map(sanitizeString) : [];
    if (body.meta !== undefined) updates.meta = body.meta;
    if (body.stock !== undefined) updates.stock = parseInt(body.stock, 10) || 0;
    if (body.variants !== undefined) updates.variants = Array.isArray(body.variants) ? body.variants : [];

    var product = await Product.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    });
    if (!product) return res.status(404).json({ success: false });
    cache = null;
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE product
router.delete('/:id', async function (req, res) {
  try {
    if (!validator.isMongoId(req.params.id)) return res.status(400).json({ success: false });
    var product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ success: false });
    cache = null;
    res.json({ success: true, message: 'Product deleted.' });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

module.exports = router;
