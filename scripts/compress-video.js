const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');

class VideoCompressor {
  constructor() {
    // Check if ffmpeg is available
    ffmpeg.getAvailableCodecs((err, codecs) => {
      if (err) {
        console.error('❌ FFmpeg not found. Please install FFmpeg first:');
        console.error('   macOS: brew install ffmpeg');
        console.error('   Ubuntu: sudo apt install ffmpeg');
        console.error('   Windows: Download from https://ffmpeg.org/download.html');
        process.exit(1);
      }
    });
  }

  async compressVideo(inputPath, outputPath, options = {}) {
    const {
      targetSizeMB = 50, // Target file size in MB
      maxWidth = 1920,
      maxHeight = 1080,
      quality = 'medium', // low, medium, high
      removeAudio = true,
      fps = 30
    } = options;

    return new Promise((resolve, reject) => {
      console.log(`🎬 Compressing video: ${path.basename(inputPath)}`);
      console.log(`📁 Input: ${inputPath}`);
      console.log(`📁 Output: ${outputPath}`);

      // Get input file size
      const inputStats = fs.statSync(inputPath);
      const inputSizeMB = (inputStats.size / (1024 * 1024)).toFixed(2);
      console.log(`📊 Input size: ${inputSizeMB} MB`);

      // Calculate target bitrate based on desired file size
      const duration = this.getVideoDuration(inputPath);
      const targetBitrate = this.calculateBitrate(targetSizeMB, duration);

      let command = ffmpeg(inputPath)
        .outputOptions([
          `-c:v libx264`,
          `-preset ${this.getPreset(quality)}`,
          `-crf ${this.getCRF(quality)}`,
          `-maxrate ${targetBitrate}k`,
          `-bufsize ${targetBitrate * 2}k`,
          `-vf scale=${maxWidth}:${maxHeight}:force_original_aspect_ratio=decrease`,
          `-r ${fps}`,
          `-movflags +faststart`,
          `-pix_fmt yuv420p`
        ]);

      // Remove audio if requested
      if (removeAudio) {
        command = command.outputOptions(['-an']);
      } else {
        command = command.outputOptions([
          `-c:a aac`,
          `-b:a 128k`
        ]);
      }

      command
        .output(outputPath)
        .on('start', (commandLine) => {
          console.log('🚀 Starting compression...');
          console.log(`⚙️  Command: ${commandLine}`);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`📈 Progress: ${progress.percent.toFixed(1)}%`);
          }
        })
        .on('end', () => {
          const outputStats = fs.statSync(outputPath);
          const outputSizeMB = (outputStats.size / (1024 * 1024)).toFixed(2);
          const compressionRatio = ((inputStats.size - outputStats.size) / inputStats.size * 100).toFixed(1);
          
          console.log('✅ Compression completed!');
          console.log(`📊 Output size: ${outputSizeMB} MB`);
          console.log(`📉 Compression: ${compressionRatio}% reduction`);
          console.log(`🎯 Target: ${targetSizeMB} MB`);
          
          resolve({
            inputSize: inputSizeMB,
            outputSize: outputSizeMB,
            compressionRatio,
            outputPath
          });
        })
        .on('error', (err) => {
          console.error('❌ Compression failed:', err.message);
          reject(err);
        })
        .run();
    });
  }

  getVideoDuration(filePath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(err);
        } else {
          resolve(metadata.format.duration);
        }
      });
    });
  }

  calculateBitrate(targetSizeMB, durationSeconds) {
    // Calculate bitrate in kbps
    // Formula: (targetSize * 8 * 1024) / duration
    const targetSizeBits = targetSizeMB * 8 * 1024 * 1024;
    const bitrateKbps = Math.floor(targetSizeBits / durationSeconds / 1000);
    return Math.max(bitrateKbps, 500); // Minimum 500kbps
  }

  getPreset(quality) {
    const presets = {
      low: 'ultrafast',
      medium: 'fast',
      high: 'medium'
    };
    return presets[quality] || 'fast';
  }

  getCRF(quality) {
    const crfValues = {
      low: 28,
      medium: 23,
      high: 18
    };
    return crfValues[quality] || 23;
  }

  async compressForUpload(inputPath, options = {}) {
    const {
      targetSizeMB = 50,
      quality = 'medium',
      outputDir = './compressed'
    } = options;

    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const inputName = path.basename(inputPath, path.extname(inputPath));
    const outputPath = path.join(outputDir, `${inputName}_compressed.mp4`);

    try {
      const duration = await this.getVideoDuration(inputPath);
      const result = await this.compressVideo(inputPath, outputPath, {
        targetSizeMB,
        quality,
        duration
      });

      return {
        ...result,
        originalPath: inputPath,
        compressedPath: outputPath
      };
    } catch (error) {
      throw new Error(`Compression failed: ${error.message}`);
    }
  }
}

// CLI usage
if (require.main === module) {
  const compressor = new VideoCompressor();
  const inputPath = process.argv[2];
  const targetSize = process.argv[3] || 50;
  const quality = process.argv[4] || 'medium';

  if (!inputPath) {
    console.log('Usage: node compress-video.js <input-video> [target-size-mb] [quality]');
    console.log('Example: node compress-video.js ./large-video.mp4 50 medium');
    console.log('Quality options: low, medium, high');
    process.exit(1);
  }

  if (!fs.existsSync(inputPath)) {
    console.error('❌ Input file not found:', inputPath);
    process.exit(1);
  }

  compressor.compressForUpload(inputPath, {
    targetSizeMB: parseInt(targetSize),
    quality
  })
  .then(result => {
    console.log('\n🎉 Ready for upload!');
    console.log(`📤 Use this file: ${result.compressedPath}`);
  })
  .catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

module.exports = VideoCompressor; 