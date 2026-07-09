'use strict';

const express = require('express');
const router = express.Router();
const Slide = require('../models/Slide');
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
    var slides = await Slide.find().sort({ createdAt: 1 }).lean();
    cache = slides;
    lastCacheTime = Date.now();
    res.json({ success: true, data: slides });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to retrieve slides.' });
  }
});

router.post('/', async function (req, res) {
  try {
    var slide = new Slide({
      title: sanitizeString(req.body.title),
      desc: sanitizeString(req.body.desc || ''),
      btn: sanitizeString(req.body.btn || 'Shop Now'),
      catKey: sanitizeString(req.body.catKey || ''),
      tag: sanitizeString(req.body.tag || ''),
      img: req.body.img || ''
    });
    var saved = await slide.save();
    cache = null;
    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.put('/:id', async function (req, res) {
  try {
    if (!validator.isMongoId(req.params.id)) {
      return res.status(400).json({ success: false, error: 'Invalid slide ID.' });
    }
    var updates = {};
    if (req.body.title !== undefined) updates.title = sanitizeString(req.body.title);
    if (req.body.desc !== undefined) updates.desc = sanitizeString(req.body.desc);
    if (req.body.btn !== undefined) updates.btn = sanitizeString(req.body.btn);
    if (req.body.catKey !== undefined) updates.catKey = sanitizeString(req.body.catKey);
    if (req.body.tag !== undefined) updates.tag = sanitizeString(req.body.tag);
    if (req.body.img !== undefined) updates.img = req.body.img;

    var slide = await Slide.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    });
    if (!slide) {
      return res.status(404).json({ success: false, error: 'Slide not found.' });
    }
    cache = null;
    res.json({ success: true, data: slide });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.delete('/:id', async function (req, res) {
  try {
    if (!validator.isMongoId(req.params.id)) {
      return res.status(400).json({ success: false, error: 'Invalid slide ID.' });
    }
    var slide = await Slide.findByIdAndDelete(req.params.id);
    if (!slide) {
      return res.status(404).json({ success: false, error: 'Slide not found.' });
    }
    cache = null;
    res.json({ success: true, message: 'Slide deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete slide.' });
  }
});

module.exports = router;
