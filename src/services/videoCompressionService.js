const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);
const fs = require('fs');
const path = require('path');
const os = require('os');

class VideoCompressionService {
  constructor() {
    this.tempDir = path.join(os.tmpdir(), 'photography-backend');
    this.ensureTempDir();
  }

  ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async compressVideoBuffer(buffer, options = {}) {
    const {
      targetSizeMB = 50,
      maxWidth = 1920,
      maxHeight = 1080,
      quality = 'medium',
      removeAudio = false, // Keep audio by default
      fps = 30,
      onProgress = null
    } = options;

    return new Promise((resolve, reject) => {
      // Create temporary input and output files
      const inputPath = path.join(this.tempDir, `input_${Date.now()}.mp4`);
      const outputPath = path.join(this.tempDir, `output_${Date.now()}.mp4`);

      // Write buffer to temporary file
      fs.writeFileSync(inputPath, buffer);

      const originalSize = buffer.length;
      const originalSizeMB = (originalSize / (1024 * 1024)).toFixed(2);

      console.log(`🎬 Compressing video: ${originalSizeMB}MB → target: ${targetSizeMB}MB`);

      // Calculate target bitrate (rough estimate)
      const targetBitrate = this.calculateBitrate(targetSizeMB, 60); // Assume 60 seconds if unknown

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
        .on('start', () => {
          console.log('🚀 Starting video compression...');
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`📈 Compression progress: ${progress.percent.toFixed(1)}%`);
            if (onProgress) {
              onProgress({
                status: 'compressing',
                progress: progress.percent,
                message: `Compressing video: ${progress.percent.toFixed(1)}%`
              });
            }
          }
        })
        .on('end', () => {
          try {
            // Read compressed file
            const compressedBuffer = fs.readFileSync(outputPath);
            const compressedSizeMB = (compressedBuffer.length / (1024 * 1024)).toFixed(2);
            const compressionRatio = ((originalSize - compressedBuffer.length) / originalSize * 100).toFixed(1);

            console.log(`✅ Compression completed: ${originalSizeMB}MB → ${compressedSizeMB}MB (${compressionRatio}% reduction)`);

            // Clean up temporary files
            this.cleanupTempFiles([inputPath, outputPath]);

            resolve({
              buffer: compressedBuffer,
              originalSize: originalSizeMB,
              compressedSize: compressedSizeMB,
              compressionRatio
            });
          } catch (error) {
            this.cleanupTempFiles([inputPath, outputPath]);
            reject(new Error(`Failed to read compressed file: ${error.message}`));
          }
        })
        .on('error', (err) => {
          this.cleanupTempFiles([inputPath, outputPath]);
          console.error('❌ Video compression failed:', err.message);
          reject(new Error(`Video compression failed: ${err.message}`));
        })
        .run();
    });
  }

  async shouldCompress(buffer, targetSizeMB = 50) {
    const sizeMB = buffer.length / (1024 * 1024);
    return sizeMB > targetSizeMB;
  }

  calculateBitrate(targetSizeMB, durationSeconds) {
    // Calculate bitrate in kbps
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

  cleanupTempFiles(filePaths) {
    filePaths.forEach(filePath => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (error) {
        console.warn(`Warning: Could not delete temp file ${filePath}:`, error.message);
      }
    });
  }

  // Get video info from buffer
  async getVideoInfo(buffer) {
    return new Promise((resolve, reject) => {
      const tempPath = path.join(this.tempDir, `info_${Date.now()}.mp4`);
      
      try {
        fs.writeFileSync(tempPath, buffer);
        
        ffmpeg.ffprobe(tempPath, (err, metadata) => {
          this.cleanupTempFiles([tempPath]);
          
          if (err) {
            reject(new Error(`Failed to get video info: ${err.message}`));
          } else {
            resolve({
              duration: metadata.format.duration,
              width: metadata.streams[0]?.width,
              height: metadata.streams[0]?.height,
              format: metadata.format.format_name,
              size: metadata.format.size
            });
          }
        });
      } catch (error) {
        this.cleanupTempFiles([tempPath]);
        reject(new Error(`Failed to write temp file: ${error.message}`));
      }
    });
  }
}

module.exports = new VideoCompressionService(); 