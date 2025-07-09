const cloudinary = require('cloudinary').v2;

const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'placeholder';
const apiKey = process.env.CLOUDINARY_API_KEY || 'placeholder';
const apiSecret = process.env.CLOUDINARY_API_SECRET || 'placeholder';

// Only throw error in production
if (process.env.NODE_ENV === 'production' && (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET)) {
  throw new Error('Missing Cloudinary environment variables');
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

module.exports = cloudinary; 