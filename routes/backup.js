'use strict';

const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Category = require('../models/Category');
const Slide = require('../models/Slide');
const Settings = require('../models/Settings');

// GET /api/backup/export
// Download all store data as a JSON file
router.get('/export', async (req, res) => {
  try {
    const products = await Product.find().lean();
    const categories = await Category.find().lean();
    const slides = await Slide.find().lean();
    const settings = await Settings.findOne({ key: 'general' }).lean();

    const backupData = {
      timestamp: new Date().toISOString(),
      storeData: {
        products,
        categories,
        slides,
        settings
      }
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="ayrab_backup_${Date.now()}.json"`);
    res.send(JSON.stringify(backupData, null, 2));
  } catch (err) {
    res.status(500).json({ success: false, error: 'Backup export failed' });
  }
});

// POST /api/backup/import
// Restore store data from JSON (Replaces all existing data)
router.post('/import', async (req, res) => {
  try {
    const backupData = req.body;
    if (!backupData || !backupData.storeData) {
      return res.status(400).json({ success: false, error: 'Invalid backup file format' });
    }

    const { products, categories, slides, settings } = backupData.storeData;

    // Clear existing data
    await Promise.all([
      Product.deleteMany({}),
      Category.deleteMany({}),
      Slide.deleteMany({})
    ]);

    // Insert new data
    const promises = [];
    
    if (products && products.length > 0) {
      // Remove _id to let mongo generate new ones or keep them if valid? 
      // Mongoose insertMany allows keeping _id if they don't conflict, since we deleted all, it's fine.
      promises.push(Product.insertMany(products));
    }
    
    if (categories && categories.length > 0) {
      promises.push(Category.insertMany(categories));
    }
    
    if (slides && slides.length > 0) {
      promises.push(Slide.insertMany(slides));
    }
    
    if (settings) {
      // Settings schema enforces a single document with key: 'general'
      const { _id, ...settingsData } = settings;
      promises.push(Settings.findOneAndUpdate(
        { key: 'general' },
        settingsData,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ));
    }

    await Promise.all(promises);

    res.json({ success: true, message: 'Restore completed successfully' });
  } catch (err) {
    console.error('[Backup Import]', err);
    res.status(500).json({ success: false, error: err.message || 'Restore failed' });
  }
});

module.exports = router;
