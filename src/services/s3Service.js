const { s3, bucketName } = require('../config/s3');
const { ValidationError } = require('../middlewares/errorHandler');
const sharp = require('sharp');
const videoCompressionService = require('./videoCompressionService');
const { v4: uuidv4 } = require('uuid');

class S3Service {
  // Upload image to S3 with Sharp compression
  async uploadImage(file, options = {}) {
    try {
      const folder = options.folder || 'photography-portfolio';
      
      // Create folder if it doesn't exist
      await this.createFolder(folder);
      
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

      // Generate unique filename
      const fileExtension = file.originalname ? file.originalname.split('.').pop() : 'jpg';
      const fileName = `${uuidv4()}.${fileExtension}`;
      const key = `${folder}/${fileName}`;

      // Upload to S3
      const uploadParams = {
        Bucket: bucketName,
        Key: key,
        Body: processedBuffer,
        ContentType: file.mimetype || 'image/jpeg',
        ACL: 'public-read'
      };

      const result = await s3.upload(uploadParams).promise();
      
      return {
        publicId: key,
        url: result.Location,
        width: null, // S3 doesn't provide dimensions directly
        height: null,
        format: fileExtension,
        size: processedBuffer.length
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

  // Upload video to S3 (with automatic compression)
  async uploadVideo(file, options = {}) {
    const { onProgress = null } = options;
    try {
      const folder = options.folder || 'photography-portfolio';
      
      // Create folder if it doesn't exist
      await this.createFolder(folder);
      
      // Handle both file path and buffer uploads
      let uploadBuffer = file.buffer;

      if (file.buffer) {
        // Check if video needs compression
        const needsCompression = await videoCompressionService.shouldCompress(file.buffer, 50);
        
        if (needsCompression) {
          console.log('🎬 Large video detected, applying compression...');
          if (onProgress) {
            onProgress({
              status: 'compressing',
              progress: 0,
              message: 'Starting video compression...'
            });
          }
          try {
            const compressionResult = await videoCompressionService.compressVideoBuffer(file.buffer, {
              targetSizeMB: 50,
              quality: 'medium',
              removeAudio: false, // Keep audio
              onProgress: onProgress
            });
            uploadBuffer = compressionResult.buffer;
            console.log(`✅ Video compressed: ${compressionResult.originalSize}MB → ${compressionResult.compressedSize}MB`);
          } catch (compressionError) {
            console.warn('⚠️ Video compression failed, uploading original:', compressionError.message);
            uploadBuffer = file.buffer;
          }
        }

        // Upload from buffer (multer memory storage)
        if (onProgress) {
          onProgress({
            status: 'uploading',
            progress: 0,
            message: 'Starting upload to S3...'
          });
        }
      } else if (file.path) {
        // Read file from path
        const fs = require('fs');
        uploadBuffer = fs.readFileSync(file.path);
      }

      // Generate unique filename
      const fileExtension = file.originalname ? file.originalname.split('.').pop() : 'mp4';
      const fileName = `${uuidv4()}.${fileExtension}`;
      const key = `${folder}/${fileName}`;

      // Upload to S3
      const uploadParams = {
        Bucket: bucketName,
        Key: key,
        Body: uploadBuffer,
        ContentType: file.mimetype || 'video/mp4',
        ACL: 'public-read'
      };

      const result = await s3.upload(uploadParams).promise();
      
      // Generate thumbnail URL (we'll use a placeholder approach)
      const thumbnailUrl = this.generateThumbnailUrl(key);
      
      return {
        publicId: key,
        url: result.Location,
        width: null, // S3 doesn't provide dimensions directly
        height: null,
        format: fileExtension,
        size: uploadBuffer.length,
        duration: null, // S3 doesn't provide duration directly
        thumbnailUrl: thumbnailUrl
      };
    } catch (error) {
      throw new ValidationError('Failed to upload video: ' + error.message);
    }
  }

  // Upload image from buffer (for direct uploads)
  async uploadImageFromBuffer(buffer, options = {}) {
    try {
      const folder = options.folder || 'photography-portfolio';

      // Process buffer with Sharp before upload
      const processedBuffer = await this.processImageWithSharp(buffer, options);

      // Generate unique filename
      const fileName = `${uuidv4()}.jpg`;
      const key = `${folder}/${fileName}`;

      // Upload to S3
      const uploadParams = {
        Bucket: bucketName,
        Key: key,
        Body: processedBuffer,
        ContentType: 'image/jpeg',
        ACL: 'public-read'
      };

      const result = await s3.upload(uploadParams).promise();

      return {
        publicId: key,
        url: result.Location,
        width: null,
        height: null,
        format: 'jpg',
        size: processedBuffer.length
      };
    } catch (error) {
      throw new ValidationError('Failed to upload image: ' + error.message);
    }
  }

  // Generate optimized URL (S3 doesn't have built-in transformations like Cloudinary)
  generateOptimizedUrl(publicId, options = {}) {
    // For S3, we return the direct URL since we don't have transformation capabilities
    return `https://${bucketName}.s3.amazonaws.com/${publicId}`;
  }

  // Generate thumbnail URL (placeholder - in production you might want to use AWS Lambda for image processing)
  generateThumbnailUrl(publicId, width = 300, height = 200) {
    // For now, return the original URL since S3 doesn't have built-in transformations
    // In production, you might want to implement thumbnail generation via AWS Lambda
    return `https://${bucketName}.s3.amazonaws.com/${publicId}`;
  }

  // Delete image from S3
  async deleteImage(publicId) {
    try {
      const deleteParams = {
        Bucket: bucketName,
        Key: publicId
      };
      
      await s3.deleteObject(deleteParams).promise();
      return true;
    } catch (error) {
      throw new Error('Failed to delete image: ' + error.message);
    }
  }

  // Delete video from S3
  async deleteVideo(publicId) {
    try {
      const deleteParams = {
        Bucket: bucketName,
        Key: publicId
      };
      
      await s3.deleteObject(deleteParams).promise();
      return true;
    } catch (error) {
      throw new Error('Failed to delete video: ' + error.message);
    }
  }

  // Add watermark to image (placeholder - would need additional processing)
  async addWatermark(publicId, watermarkText = 'Manish Photography') {
    try {
      // For S3, we'd need to download, process, and re-upload
      // This is a simplified implementation
      const url = `https://${bucketName}.s3.amazonaws.com/${publicId}`;
      console.warn('Watermark functionality not implemented for S3. Returning original URL:', url);
      return url;
    } catch (error) {
      throw new Error('Failed to add watermark: ' + error.message);
    }
  }

  // Get image info from S3
  async getImageInfo(publicId) {
    try {
      const params = {
        Bucket: bucketName,
        Key: publicId
      };
      
      const result = await s3.headObject(params).promise();
      
      return {
        publicId: publicId,
        url: `https://${bucketName}.s3.amazonaws.com/${publicId}`,
        width: null, // S3 doesn't provide dimensions
        height: null,
        format: publicId.split('.').pop(),
        size: result.ContentLength,
        createdAt: result.LastModified
      };
    } catch (error) {
      throw new Error('Failed to get image info: ' + error.message);
    }
  }

  // Check if folder exists in S3 bucket (helper method)
  async folderExists(folderName) {
    try {
      const params = {
        Bucket: bucketName,
        Prefix: `${folderName}/`,
        MaxKeys: 1
      };
      
      const result = await s3.listObjectsV2(params).promise();
      return result.Contents.length > 0;
    } catch (error) {
      return false;
    }
  }

  // Create folder in S3 bucket (by uploading a placeholder file)
  async createFolder(folderName) {
    try {
      const exists = await this.folderExists(folderName);
      if (exists) {
        console.log(`📁 Folder '${folderName}' already exists in S3 bucket`);
        return;
      }

      // Create folder by uploading a placeholder file
      const params = {
        Bucket: bucketName,
        Key: `${folderName}/.placeholder`,
        Body: '',
        ContentType: 'text/plain'
      };
      
      await s3.upload(params).promise();
      console.log(`📁 Created folder '${folderName}' in S3 bucket`);
    } catch (error) {
      console.warn(`Failed to create folder '${folderName}':`, error.message);
    }
  }
}

module.exports = new S3Service();
