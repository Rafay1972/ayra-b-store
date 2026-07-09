'use strict';

const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    enum: ['general']
  },
  adminPw: {
    type: String,
    required: true,
    minlength: [4, 'Password must be at least 4 characters.']
  },
  waPhone: {
    type: String,
    default: '923317448054',
    trim: true
  },
  waMsg: {
    type: String,
    default: "Hello! I'd like to place an order from Ayra B. Please share details.",
    trim: true
  },
  socLinks: {
    insta: { type: String, default: '', trim: true },
    fb: { type: String, default: '', trim: true },
    tiktok: { type: String, default: '', trim: true },
    snap: { type: String, default: '', trim: true }
  },
  offerTxt: {
    type: String,
    default: 'Eid Special Sale — 20% OFF on All Collections | Code: AYRA20',
    trim: true
  },
  offerClr: {
    type: String,
    default: '#18120E',
    trim: true
  },
  catImgs: {
    type: Map,
    of: String,
    default: {}
  },
  deliveryCharge: {
    type: Number,
    default: 200
  },
  communityImgs: {
    type: [String],
    default: []
  },
  showOfferBanner: {
    type: Boolean,
    default: true
  },
  autoPlaySlide: {
    type: Boolean,
    default: true
  },
  showWishlist: {
    type: Boolean,
    default: true
  },
  showStarRatings: {
    type: Boolean,
    default: true
  },
  showSoc: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  versionKey: false
});

module.exports = mongoose.model('Settings', settingsSchema);
