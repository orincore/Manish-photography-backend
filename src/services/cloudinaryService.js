const { cloudinary } = require('../config');
const { ValidationError } = require('../middlewares/errorHandler');
const sharp = require('sharp');
const videoCompressionService = require('./videoCompressionService');

class CloudinaryService {
  // Upload image to Cloudinary with Sharp compression
  async uploadImage(file, options = {}) {
    try {
      const uploadOptions = {
        folder: options.folder || 'photography-portfolio',
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [
          { quality: 'auto:good' },
          { fetch_format: 'auto' }
        ],
        ...options
      };

      // Process image with Sharp before upload
      let processedBuffer;
      if (file.buffer) {
        processedBuffer = await this.processImageWithSharp(file.buffer, options);
      } else {
        // Read file from path and process
        const fs = require('fs');
        const fileBuffer = fs.readFileSync(file.path);
        processedBuffer = await this.processImageWithSharp(fileBuffer, options);
      }

      // Upload processed image
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }).end(processedBuffer);
      });
      
      return {
        publicId: result.public_id,
        url: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
        size: result.bytes
      };
    } catch (error) {
      throw new ValidationError('Failed to upload image: ' + error.message);
    }
  }

  // Process image with Sharp for compression and optimization
  async processImageWithSharp(buffer, options = {}) {
    try {
      const {
        maxWidth = 1920,
        maxHeight = 1080,
        quality = 80,
        format = 'jpeg'
      } = options;

      let sharpInstance = sharp(buffer)
        .resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality });

      // Convert to specified format
      if (format === 'webp') {
        sharpInstance = sharpInstance.webp({ quality });
      } else if (format === 'png') {
        sharpInstance = sharpInstance.png({ quality });
      }

      return await sharpInstance.toBuffer();
    } catch (error) {
      throw new Error('Failed to process image: ' + error.message);
    }
  }

  // Upload video to Cloudinary (with automatic compression)
  async uploadVideo(file, options = {}) {
    try {
      const uploadOptions = {
        folder: options.folder || 'photography-portfolio',
        resource_type: 'video',
        allowed_formats: ['mp4', 'mov', 'avi', 'wmv', 'flv', 'webm'],
        chunk_size: 6000000, // 6MB chunks for large files
        eager: [
          { 
            width: 1920, 
            height: 1080, 
            crop: 'scale', 
            format: 'mp4',
            quality: 'auto:good',
            bit_rate: '1000k'
          },
          { 
            width: 1280, 
            height: 720, 
            crop: 'scale', 
            format: 'mp4',
            quality: 'auto:good',
            bit_rate: '800k'
          },
          { 
            width: 854, 
            height: 480, 
            crop: 'scale', 
            format: 'mp4',
            quality: 'auto:good',
            bit_rate: '500k'
          }
        ],
        eager_async: true,
        // Generate thumbnail
        thumbnail: {
          width: 400,
          height: 300,
          crop: 'fill',
          gravity: 'auto'
        },
        ...options
      };

      // Handle both file path and buffer uploads
      let result;
      let uploadBuffer = file.buffer;

      if (file.buffer) {
        // Check if video needs compression
        const needsCompression = await videoCompressionService.shouldCompress(file.buffer, 50);
        
        if (needsCompression) {
          console.log('🎬 Large video detected, applying compression...');
          try {
            const compressionResult = await videoCompressionService.compressVideoBuffer(file.buffer, {
              targetSizeMB: 50,
              quality: 'medium',
              removeAudio: true
            });
            uploadBuffer = compressionResult.buffer;
            console.log(`✅ Video compressed: ${compressionResult.originalSize}MB → ${compressionResult.compressedSize}MB`);
          } catch (compressionError) {
            console.warn('⚠️ Video compression failed, uploading original:', compressionError.message);
            uploadBuffer = file.buffer;
          }
        }

        // Upload from buffer (multer memory storage)
        result = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }).end(uploadBuffer);
        });
      } else {
        // Upload from file path (multer disk storage)
        result = await cloudinary.uploader.upload(file.path, uploadOptions);
      }
      
      // Generate thumbnail URL
      const thumbnailUrl = cloudinary.url(result.public_id, {
        resource_type: 'video',
        transformation: [
          { width: 400, height: 300, crop: 'fill', gravity: 'auto' },
          { quality: 'auto:good' }
        ],
        secure: true
      });
      
      return {
        publicId: result.public_id,
        url: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
        size: result.bytes,
        duration: result.duration,
        thumbnailUrl: thumbnailUrl
      };
    } catch (error) {
      throw new ValidationError('Failed to upload video: ' + error.message);
    }
  }

  // Upload image from buffer (for direct uploads)
  async uploadImageFromBuffer(buffer, options = {}) {
    try {
      const uploadOptions = {
        folder: options.folder || 'photography-portfolio',
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [
          { quality: 'auto:good' },
          { fetch_format: 'auto' }
        ],
        ...options
      };

      // Process buffer with Sharp before upload
      const processedBuffer = await this.processImageWithSharp(buffer, options);

      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }).end(processedBuffer);
      });

      return {
        publicId: result.public_id,
        url: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
        size: result.bytes
      };
    } catch (error) {
      throw new ValidationError('Failed to upload image: ' + error.message);
    }
  }

  // Generate optimized URL with transformations
  generateOptimizedUrl(publicId, options = {}) {
    const defaultOptions = {
      quality: 'auto:good',
      fetch_format: 'auto',
      width: 800,
      height: 600,
      crop: 'fill',
      gravity: 'auto'
    };

    const transformationOptions = { ...defaultOptions, ...options };
    
    return cloudinary.url(publicId, {
      transformation: [transformationOptions],
      secure: true
    });
  }

  // Generate thumbnail URL
  generateThumbnailUrl(publicId, width = 300, height = 200) {
    return cloudinary.url(publicId, {
      transformation: [
        { width, height, crop: 'fill', gravity: 'auto' },
        { quality: 'auto:good' }
      ],
      secure: true
    });
  }

  // Delete image from Cloudinary
  async deleteImage(publicId) {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === 'ok';
    } catch (error) {
      throw new Error('Failed to delete image: ' + error.message);
    }
  }

  // Add watermark to image
  async addWatermark(publicId, watermarkText = 'Manish Photography') {
    try {
      const result = await cloudinary.uploader.upload(publicId, {
        transformation: [
          { overlay: { font_family: 'Arial', font_size: 40, text: watermarkText } },
          { color: 'white', opacity: 70, x: 20, y: 20 }
        ]
      });
      return result.secure_url;
    } catch (error) {
      throw new Error('Failed to add watermark: ' + error.message);
    }
  }

  // Get image info
  async getImageInfo(publicId) {
    try {
      const result = await cloudinary.api.resource(publicId);
      return {
        publicId: result.public_id,
        url: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
        size: result.bytes,
        createdAt: result.created_at
      };
    } catch (error) {
      throw new Error('Failed to get image info: ' + error.message);
    }
  }
}

module.exports = new CloudinaryService(); 