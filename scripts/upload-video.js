const VideoCompressor = require('./compress-video');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

class VideoUploader {
  constructor(baseURL = 'http://localhost:3000') {
    this.baseURL = baseURL;
    this.compressor = new VideoCompressor();
  }

  async uploadVideo(videoPath, options = {}) {
    const {
      title = 'Video Upload',
      subtitle = '',
      description = '',
      type = 'hero',
      orderIndex = 1,
      isActive = true,
      isFeatured = true,
      videoAutoplay = true,
      videoMuted = true,
      videoLoop = true,
      targetSizeMB = 50,
      quality = 'medium',
      authToken = null
    } = options;

    console.log('🎬 Starting video upload process...\n');

    // Check if file exists
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`);
    }

    // Get original file size
    const originalStats = fs.statSync(videoPath);
    const originalSizeMB = (originalStats.size / (1024 * 1024)).toFixed(2);
    console.log(`📊 Original file size: ${originalSizeMB} MB`);

    let finalVideoPath = videoPath;

    // Compress if file is too large
    if (originalStats.size > targetSizeMB * 1024 * 1024) {
      console.log(`📦 File is larger than ${targetSizeMB}MB, compressing...`);
      
      try {
        const compressionResult = await this.compressor.compressForUpload(videoPath, {
          targetSizeMB,
          quality
        });
        
        finalVideoPath = compressionResult.compressedPath;
        console.log(`✅ Compression completed! New size: ${compressionResult.outputSize} MB`);
      } catch (error) {
        throw new Error(`Compression failed: ${error.message}`);
      }
    } else {
      console.log('✅ File size is acceptable, no compression needed');
    }

    // Upload to server
    console.log('\n📤 Uploading to server...');
    
    try {
      const uploadResult = await this.uploadToServer(finalVideoPath, {
        title,
        subtitle,
        description,
        type,
        orderIndex,
        isActive,
        isFeatured,
        videoAutoplay,
        videoMuted,
        videoLoop,
        authToken
      });

      console.log('🎉 Upload successful!');
      console.log(`📋 Element ID: ${uploadResult.id}`);
      console.log(`🔗 Media URL: ${uploadResult.media_url}`);
      
      return uploadResult;
    } catch (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }
  }

  async uploadToServer(videoPath, options) {
    const {
      title,
      subtitle,
      description,
      type,
      orderIndex,
      isActive,
      isFeatured,
      videoAutoplay,
      videoMuted,
      videoLoop,
      authToken
    } = options;

    const form = new FormData();
    
    // Add file
    form.append('media_file', fs.createReadStream(videoPath));
    
    // Add form fields
    form.append('type', type);
    form.append('title', title);
    if (subtitle) form.append('subtitle', subtitle);
    if (description) form.append('description', description);
    form.append('order_index', orderIndex.toString());
    form.append('is_active', isActive.toString());
    form.append('is_featured', isFeatured.toString());
    form.append('video_autoplay', videoAutoplay.toString());
    form.append('video_muted', videoMuted.toString());
    form.append('video_loop', videoLoop.toString());

    const headers = {
      ...form.getHeaders()
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    try {
      const response = await axios.post(
        `${this.baseURL}/api/homepage/elements`,
        form,
        {
          headers,
          timeout: 1800000, // 30 minutes
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
      );

      return response.data;
    } catch (error) {
      if (error.response) {
        const errorMessage = error.response.data?.error?.message || error.response.statusText;
        throw new Error(`Server error (${error.response.status}): ${errorMessage}`);
      } else if (error.request) {
        throw new Error('Network error: Could not connect to server');
      } else {
        throw new Error(`Request error: ${error.message}`);
      }
    }
  }
}

// CLI usage
if (require.main === module) {
  const uploader = new VideoUploader();
  
  const videoPath = process.argv[2];
  const title = process.argv[3] || 'Video Upload';
  const targetSize = process.argv[4] || 50;
  const authToken = process.argv[5] || null;

  if (!videoPath) {
    console.log('Usage: node upload-video.js <video-path> [title] [target-size-mb] [auth-token]');
    console.log('Example: node upload-video.js ./large-video.mp4 "My Video" 50 "your-jwt-token"');
    console.log('\nNote: Auth token is required for admin uploads');
    process.exit(1);
  }

  uploader.uploadVideo(videoPath, {
    title,
    targetSizeMB: parseInt(targetSize),
    authToken
  })
  .then(result => {
    console.log('\n✅ Upload completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Upload failed:', error.message);
    process.exit(1);
  });
}

module.exports = VideoUploader; 