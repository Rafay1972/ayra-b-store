'use strict';

require('dotenv').config();

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');

const { connectDatabase, getConnectionState } = require('./config/database');

const productRoutes = require('./routes/products');
const categoryRoutes = require('./routes/categories');
const slideRoutes = require('./routes/slides');
const settingsRoutes = require('./routes/settings');
const reviewRoutes = require('./routes/reviews');
const backupRoutes = require('./routes/backup');

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 3000;

// --- Security Middleware ---

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://images.unsplash.com", "https://placehold.co", "blob:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      connectSrc: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type'],
  maxAge: 86400
}));

app.use(compression());

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: false, limit: '20mb' }));

app.use(mongoSanitize({
  replaceWith: '_',
  onSanitize: function (obj) {
    console.warn('[Security] NoSQL injection attempt blocked on key:', obj.key);
  }
}));

var apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Try again later.' }
});

var authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many login attempts. Try again later.' }
});

// --- Static Files ---

app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d',
  etag: true,
  lastModified: true,
  setHeaders: function (res, filePath) {
    if (filePath.endsWith('.css')) res.set('Content-Type', 'text/css');
    if (filePath.endsWith('.js')) res.set('Content-Type', 'application/javascript');
  }
}));

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  }
  next();
});

// --- API Routes ---

app.use('/api/products', apiLimiter, productRoutes);
app.use('/api/categories', apiLimiter, categoryRoutes);
app.use('/api/slides', apiLimiter, slideRoutes);
app.use('/api/settings', apiLimiter, settingsRoutes);
app.use('/api/settings/verify-password', authLimiter);
app.use('/api/settings/change-password', authLimiter);
app.use('/api/reviews', apiLimiter, reviewRoutes);
app.use('/api/backup', apiLimiter, backupRoutes);

// --- Health Check ---

app.get('/api/health', function (req, res) {
  var dbState = getConnectionState();
  res.json({
    status: 'ok',
    database: dbState.connected ? 'connected' : 'disconnected',
    uptime: Math.floor(process.uptime())
  });
});

// --- Admin & Security ---

const adminSlug = process.env.ADMIN_SLUG || 'manage-hq-7x4p';

app.get('/' + adminSlug, function (req, res) {
  res.sendFile(path.join(__dirname, 'views', 'admin-dashboard.html'));
});

app.get(['/admin', '/wp-admin', '/login', '/dashboard', '/panel', '/backend', '/manage-hq'], function (req, res) {
  res.status(404).send('Not Found');
});

// --- SPA Fallback ---

app.get('*', function (req, res) {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Global Error Handler ---

app.use(function (err, req, res, next) {
  console.error('[Server Error]', err.message);
  res.status(500).json({ success: false, error: 'Internal server error.' });
});

// --- Start ---

async function start() {
  try {
    await connectDatabase();
    console.log('[Server] Database connected.');
  } catch (err) {
    console.warn('[Server] Starting without database. Frontend will use localStorage fallback.');
  }

  app.listen(PORT, function () {
    console.log('[Server] Running on http://localhost:' + PORT);
  });
}

start();
