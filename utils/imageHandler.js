const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Intercepts a base64 image string, saves it to the filesystem, and returns the URL.
 * If the string is already a URL or empty, returns it unmodified.
 */
function processImage(base64Str, prefix = 'img') {
  if (!base64Str || typeof base64Str !== 'string') return base64Str;
  
  if (!base64Str.startsWith('data:image/')) {
    return base64Str; // Already a URL or invalid base64
  }

  try {
    const matches = base64Str.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return base64Str;
    }

    let ext = matches[1];
    if (ext === 'jpeg') ext = 'jpg';
    
    const buffer = Buffer.from(matches[2], 'base64');
    
    // Generate unique filename: prefix_timestamp_random.ext
    const randomStr = crypto.randomBytes(4).toString('hex');
    const filename = `${prefix}_${Date.now()}_${randomStr}.${ext}`;
    const filepath = path.join(UPLOADS_DIR, filename);
    
    fs.writeFileSync(filepath, buffer);
    
    return `/uploads/${filename}`;
  } catch (err) {
    console.error('[ImageHandler] Error saving image to disk:', err);
    // Fallback to base64 if filesystem save fails
    return base64Str;
  }
}

/**
 * Process an array of images.
 */
function processImages(images, prefix = 'img') {
  if (!images || !Array.isArray(images)) return images;
  return images.map(img => processImage(img, prefix));
}

module.exports = {
  processImage,
  processImages
};
