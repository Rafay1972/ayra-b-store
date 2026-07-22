'use strict';

require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Slide = require('../models/Slide');
const Settings = require('../models/Settings');
const { processImage, processImages } = require('../utils/imageHandler');

async function migrate() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected.');

    // 1. Products
    const products = await Product.find();
    console.log(`Found ${products.length} products to check...`);
    let pCount = 0;
    for (let p of products) {
      if (p.imgs && p.imgs.length > 0) {
        let changed = false;
        const newImgs = p.imgs.map(img => {
          if (img.startsWith('data:image')) {
            changed = true;
            return processImage(img, 'prod');
          }
          return img;
        });
        if (changed) {
          p.imgs = newImgs;
          await p.save();
          pCount++;
        }
      }
    }
    console.log(`Migrated ${pCount} products.`);

    // 2. Slides
    const slides = await Slide.find();
    console.log(`Found ${slides.length} slides to check...`);
    let sCount = 0;
    for (let s of slides) {
      if (s.img && s.img.startsWith('data:image')) {
        s.img = processImage(s.img, 'slide');
        await s.save();
        sCount++;
      }
    }
    console.log(`Migrated ${sCount} slides.`);

    // 3. Settings (Categories & Community Imgs)
    const settings = await Settings.findOne({ key: 'general' });
    if (settings) {
      let setChanged = false;
      if (settings.catImgs) {
        for (const k of settings.catImgs.keys()) {
          const v = settings.catImgs.get(k);
          if (v && typeof v === 'string' && v.startsWith('data:image')) {
            settings.catImgs.set(k, processImage(v, 'cat'));
            setChanged = true;
          }
        }
      }
      
      if (settings.communityImgs && settings.communityImgs.length > 0) {
        const newCImgs = settings.communityImgs.map(img => {
          if (img.startsWith('data:image')) {
            setChanged = true;
            return processImage(img, 'comm');
          }
          return img;
        });
        if (setChanged) settings.communityImgs = newCImgs;
      }

      if (setChanged) {
        settings.adminPw = settings.adminPw || 'ayra123';
        settings.markModified('catImgs');
        await settings.save();
        console.log(`Migrated settings.`);
      } else {
        console.log(`No settings migration needed.`);
      }
    }

    console.log('Migration complete!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

migrate();
