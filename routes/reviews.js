'use strict';

const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Product = require('../models/Product');
const validator = require('validator');

function sanitizeString(val) {
  if (typeof val !== 'string') return '';
  return validator.escape(validator.unescape(validator.trim(val)));
}

// Get reviews for a product
router.get('/:productId', async function (req, res) {
  try {
    const { productId } = req.params;
    if (!validator.isMongoId(productId)) {
      return res.status(400).json({ success: false, error: 'Invalid product ID' });
    }
    const reviews = await Review.find({ productId }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: reviews });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch reviews' });
  }
});

// Post a new review
router.post('/', async function (req, res) {
  try {
    const { productId, rating, name, text } = req.body;
    
    if (!validator.isMongoId(productId)) {
      return res.status(400).json({ success: false, error: 'Invalid product ID' });
    }
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, error: 'Rating must be between 1 and 5' });
    }
    
    const review = new Review({
      productId,
      name: sanitizeString(name),
      rating: Number(rating),
      text: sanitizeString(text)
    });
    
    await review.save();
    
    // Update Product average rating and count
    const allReviews = await Review.find({ productId });
    const count = allReviews.length;
    const sum = allReviews.reduce((acc, r) => acc + r.rating, 0);
    const avg = count > 0 ? (sum / count).toFixed(1) : 0;
    
    await Product.findByIdAndUpdate(productId, {
      rating: Number(avg),
      reviews: count
    });

    res.status(201).json({ success: true, data: review });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
