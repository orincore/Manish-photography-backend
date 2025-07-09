# Video Compression Integration

## Overview

The backend now includes automatic video compression for large video uploads. This feature helps optimize video files for web delivery by reducing file sizes while maintaining good quality.

## Features

### ✅ Automatic Compression
- **Large videos** (>50MB) are automatically compressed before upload
- **Target size**: 50MB (configurable)
- **Quality**: Medium (good balance of size and quality)
- **Audio removal**: Automatically removed for web optimization

### ✅ Smart Detection
- Only compresses videos that exceed the size limit
- Preserves original quality for smaller videos
- Supports multiple video formats: MP4, MOV, AVI, WMV, FLV, WebM

### ✅ Seamless Integration
- No changes needed to existing API calls
- Compression happens transparently during upload
- Progress logging for monitoring compression status

## How It Works

### 1. Upload Process
```
Large Video (200MB+) → Compression Service → Compressed Video (50MB) → Cloudinary Upload
```

### 2. Compression Settings
- **Codec**: H.264 (libx264)
- **Preset**: Fast (good balance of speed and quality)
- **CRF**: 23 (medium quality)
- **Resolution**: Max 1920x1080 (maintains aspect ratio)
- **Frame Rate**: 30 FPS
- **Audio**: Removed (optimized for web)

### 3. File Size Limits
- **Videos**: Up to 500MB (compressed to 50MB if larger)
- **Images**: Up to 50MB
- **Request timeout**: 30 minutes for large uploads

## API Usage

### Upload with Automatic Compression
```bash
POST /api/homepage/elements
Content-Type: multipart/form-data
Authorization: Bearer <token>

# Form data:
- media_file: <video-file>
- type: hero
- title: "My Video"
- video_autoplay: true
- video_muted: true
- video_loop: true
```

### Test Compression (Admin Only)
```bash
POST /api/homepage/test-compression
Content-Type: multipart/form-data
Authorization: Bearer <admin-token>

# Form data:
- video_file: <video-file>
```

## Compression Results

### Typical Results
- **200MB → 50MB**: ~75% reduction
- **100MB → 50MB**: ~50% reduction
- **Quality maintained**: Good visual quality for web
- **Loading speed**: Significantly faster

### Quality Options
- **Low**: CRF 28, ultrafast preset (smallest size)
- **Medium**: CRF 23, fast preset (recommended)
- **High**: CRF 18, medium preset (larger size)

## Error Handling

### Compression Failures
If compression fails, the system will:
1. Log the error
2. Upload the original video
3. Continue with normal processing

### File Size Errors
- Clear error messages with size limits
- Suggestions for compression
- File type validation

## Monitoring

### Console Logs
```
🎬 Large video detected, applying compression...
🚀 Starting video compression...
📈 Compression progress: 45.2%
✅ Video compressed: 200.5MB → 48.3MB (75.9% reduction)
```

### Response Headers
- Compression status included in response
- Original and compressed sizes logged
- Processing time tracked

## Configuration

### Environment Variables
```env
# Video compression settings (optional)
VIDEO_COMPRESSION_TARGET_SIZE=50  # MB
VIDEO_COMPRESSION_QUALITY=medium  # low, medium, high
VIDEO_COMPRESSION_REMOVE_AUDIO=true
```

### Service Configuration
```javascript
// In videoCompressionService.js
const options = {
  targetSizeMB: 50,
  quality: 'medium',
  removeAudio: true,
  maxWidth: 1920,
  maxHeight: 1080,
  fps: 30
};
```

## Best Practices

### For Large Videos
1. **Upload directly**: Let the system handle compression
2. **Monitor logs**: Check compression progress
3. **Test quality**: Verify compressed video quality
4. **Consider pre-compression**: For very large files (>500MB)

### For Optimal Results
1. **Use MP4 format**: Best compatibility
2. **Keep aspect ratio**: System maintains it automatically
3. **Remove audio**: Better for web use
4. **Test on target devices**: Ensure playback works

## Troubleshooting

### Common Issues

#### Compression Fails
- Check FFmpeg installation
- Verify file format support
- Check available disk space
- Review error logs

#### Quality Issues
- Adjust quality setting (low/medium/high)
- Increase target size limit
- Check original video quality

#### Upload Timeouts
- Increase server timeout settings
- Use smaller target size
- Check network connection

### Debug Commands
```bash
# Check FFmpeg installation
ffmpeg -version

# Test compression manually
node scripts/test-compression.js <video-file>

# Check server logs
tail -f logs/app.log
```

## Performance Impact

### Server Resources
- **CPU**: Moderate during compression
- **Memory**: Temporary buffer usage
- **Disk**: Temporary file storage
- **Network**: Reduced upload time

### Benefits
- **Faster uploads**: Smaller files upload faster
- **Better performance**: Optimized for web delivery
- **Cost savings**: Reduced storage and bandwidth
- **User experience**: Faster page loads

## Future Enhancements

### Planned Features
- [ ] Adaptive quality based on content
- [ ] Multiple compression profiles
- [ ] Background compression queue
- [ ] Compression progress API
- [ ] Custom compression settings per upload

### Integration Options
- [ ] Webhook notifications
- [ ] Compression analytics
- [ ] Quality comparison tools
- [ ] Batch compression support 