'use strict';

const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
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
    var settings = await Settings.findOne({ key: 'general' }).lean();
    if (!settings) {
      return res.json({ success: true, data: null });
    }
    // Strip admin password from public response
    var safe = Object.assign({}, settings);
    delete safe.adminPw;
    cache = safe;
    lastCacheTime = Date.now();
    res.json({ success: true, data: safe });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to retrieve settings.' });
  }
});

router.put('/', async function (req, res) {
  try {
    var body = req.body;
    var updates = {};
    if (body.waPhone !== undefined) updates.waPhone = body.waPhone.replace(/[^0-9]/g, '');
    if (body.waMsg !== undefined) updates.waMsg = sanitizeString(body.waMsg);
    if (body.offerTxt !== undefined) updates.offerTxt = sanitizeString(body.offerTxt);
    if (body.offerClr !== undefined) {
      var clr = body.offerClr;
      if (/^#[0-9A-Fa-f]{3,8}$/.test(clr)) {
        updates.offerClr = clr;
      }
    }
    if (body.socLinks !== undefined) {
      updates.socLinks = {
        insta: sanitizeString(body.socLinks.insta || ''),
        fb: sanitizeString(body.socLinks.fb || ''),
        tiktok: sanitizeString(body.socLinks.tiktok || ''),
        snap: sanitizeString(body.socLinks.snap || '')
      };
    }
    if (body.catImgs !== undefined && typeof body.catImgs === 'object') {
      updates.catImgs = body.catImgs;
    }
    if (body.deliveryCharge !== undefined) {
      var dc = Number(body.deliveryCharge);
      if (!isNaN(dc) && dc >= 0) updates.deliveryCharge = dc;
    }
    if (body.communityImgs !== undefined && Array.isArray(body.communityImgs)) {
      // Allow base64 or URL strings, max 5 photos
      updates.communityImgs = body.communityImgs.slice(0, 5);
    }
    // Website UI toggles
    if (body.showOfferBanner !== undefined) updates.showOfferBanner = !!body.showOfferBanner;
    if (body.autoPlaySlide !== undefined) updates.autoPlaySlide = !!body.autoPlaySlide;
    if (body.showWishlist !== undefined) updates.showWishlist = !!body.showWishlist;
    if (body.showStarRatings !== undefined) updates.showStarRatings = !!body.showStarRatings;
    if (body.showSoc !== undefined) updates.showSoc = !!body.showSoc;

    var settings = await Settings.findOneAndUpdate(
      { key: 'general' },
      updates,
      { new: true, runValidators: true, upsert: true, setDefaultsOnInsert: true }
    );
    var safe = Object.assign({}, settings.toObject());
    delete safe.adminPw;
    cache = null;
    res.json({ success: true, data: safe });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Admin login verification
router.post('/verify-password', async function (req, res) {
  try {
    var password = req.body.password;
    if (typeof password !== 'string' || password.length === 0) {
      return res.status(400).json({ success: false, error: 'Password is required.' });
    }
    var settings = await Settings.findOne({ key: 'general' });
    if (!settings) {
      var defaultPw = process.env.ADMIN_DEFAULT_PASSWORD || 'ayra123';
      if (password === defaultPw) {
        return res.json({ success: true, authenticated: true });
      }
      return res.json({ success: true, authenticated: false });
    }
    var activePw = settings.adminPw || process.env.ADMIN_DEFAULT_PASSWORD || 'ayra123';
    var match = password === activePw;
    res.json({ success: true, authenticated: match });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Authentication check failed.' });
  }
});

// Change password
router.post('/change-password', async function (req, res) {
  try {
    var currentPw = req.body.oldPassword || req.body.currentPassword;
    var newPw = req.body.newPassword;
    if (typeof currentPw !== 'string' || typeof newPw !== 'string') {
      return res.status(400).json({ success: false, error: 'Both passwords are required.' });
    }
    if (newPw.length < 4) {
      return res.status(400).json({ success: false, error: 'New password must be at least 4 characters.' });
    }

    var settings = await Settings.findOne({ key: 'general' });
    var activePw = settings ? settings.adminPw : (process.env.ADMIN_DEFAULT_PASSWORD || 'ayra123');
    if (currentPw !== activePw) {
      return res.status(403).json({ success: false, error: 'Current password is incorrect.' });
    }

    await Settings.findOneAndUpdate(
      { key: 'general' },
      { adminPw: newPw },
      { upsert: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, message: 'Password changed.' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to change password.' });
  }
});

module.exports = router;
