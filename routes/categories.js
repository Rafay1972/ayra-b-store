'use strict';

const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const validator = require('validator');

let cache = null;
let lastCacheTime = 0;
const CACHE_TTL = 30000;

function sanitizeString(val) {
  if (typeof val !== 'string') return '';
  return validator.escape(validator.unescape(validator.trim(val)));
}

router.get('/', async function (req, res) {
  try {
    if (cache && (Date.now() - lastCacheTime < CACHE_TTL)) {
      return res.json({ success: true, data: cache });
    }
    const Product = require('../models/Product');
    var categories = await Category.find().sort({ createdAt: 1 }).lean();
    
    // Dynamically calculate counts via aggregation
    const catNames = categories.map(c => c.name);
    const counts = await Product.aggregate([
      { $match: { cat: { $in: catNames } } },
      { $group: { _id: '$cat', count: { $sum: 1 } } }
    ]);
    
    const countMap = {};
    for (let c of counts) countMap[c._id] = c.count;
    
    for (let cat of categories) {
      cat.count = countMap[cat.name] || 0;
    }
    
    cache = categories;
    lastCacheTime = Date.now();
    res.json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to retrieve categories.' });
  }
});

router.post('/', async function (req, res) {
  try {
    var cat = new Category({
      name: sanitizeString(req.body.name),
      icon: sanitizeString(req.body.icon || ''),
      count: parseInt(req.body.count, 10) || 0
    });
    var saved = await cat.save();
    cache = null;
    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, error: 'Category already exists.' });
    }
    res.status(400).json({ success: false, error: err.message });
  }
});

router.delete('/:id', async function (req, res) {
  try {
    if (!validator.isMongoId(req.params.id)) {
      return res.status(400).json({ success: false, error: 'Invalid category ID.' });
    }
    var cat = await Category.findByIdAndDelete(req.params.id);
    if (!cat) {
      return res.status(404).json({ success: false, error: 'Category not found.' });
    }
    cache = null;
    res.json({ success: true, message: 'Category deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete category.' });
  }
});

module.exports = router;
