const VideoCompressor = require('./compress-video');
const fs = require('fs');

// Simple test to verify compression works
async function testCompression() {
  console.log('🧪 Testing video compression...\n');
  
  const compressor = new VideoCompressor();
  
  // Check if we have a test video file
  const testVideoPath = process.argv[2];
  
  if (!testVideoPath) {
    console.log('Usage: node test-compression.js <video-file-path>');
    console.log('This will test compression without uploading');
    process.exit(1);
  }
  
  if (!fs.existsSync(testVideoPath)) {
    console.error('❌ Test video file not found:', testVideoPath);
    process.exit(1);
  }
  
  const stats = fs.statSync(testVideoPath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  
  console.log(`📁 Test file: ${testVideoPath}`);
  console.log(`📊 Size: ${sizeMB} MB`);
  
  try {
    console.log('\n🎬 Starting compression test...');
    const result = await compressor.compressForUpload(testVideoPath, {
      targetSizeMB: 50,
      quality: 'medium'
    });
    
    console.log('\n✅ Compression test successful!');
    console.log(`📉 Size reduction: ${result.compressionRatio}%`);
    console.log(`📁 Compressed file: ${result.compressedPath}`);
    
    // Clean up test file
    if (fs.existsSync(result.compressedPath)) {
      fs.unlinkSync(result.compressedPath);
      console.log('🧹 Test file cleaned up');
    }
    
  } catch (error) {
    console.error('❌ Compression test failed:', error.message);
    process.exit(1);
  }
}

testCompression(); 