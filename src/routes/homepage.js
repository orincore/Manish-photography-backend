const express = require('express');
const router = express.Router();
const homepageController = require('../controllers/homepageController');
const { authenticateToken, requireAdmin, optionalAuth } = require('../middlewares/auth');
const { 
  homepageElementSchema, 
  updateHomepageElementSchema, 
  toggleActiveSchema, 
  reorderElementsSchema, 
  bulkUploadSchema 
} = require('../utils/validation');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads with different limits for images and videos
const storage = multer.memoryStorage();

// Create separate upload configurations
const imageUpload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB for images
  },
  fileFilter: (req, file, cb) => {
    // Allow only images
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    }
  }
});

const videoUpload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB for videos
  },
  fileFilter: (req, file, cb) => {
    // Allow only videos
    const allowedTypes = /mp4|mov|avi|wmv|flv|webm/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only video files are allowed (mp4, mov, avi, wmv, flv, webm)'));
    }
  }
});

// Universal upload for mixed content
const universalUpload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit for all files
  },
  fileFilter: (req, file, cb) => {
    // Allow images and videos
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|mov|avi|wmv|flv|webm/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed'));
    }
  }
});

// Public routes (no authentication required)
router.get('/elements', homepageController.getHomepageElements);
router.get('/elements/:id', homepageController.getHomepageElementById);
router.get('/elements/type/:type', homepageController.getElementsByType);
router.get('/hero/active', homepageController.getActiveHeroElements);
router.get('/hero/videos', homepageController.getActiveHeroVideos);
router.get('/featured/images', homepageController.getFeaturedImages);
router.get('/instagram/images', homepageController.getInstagramImages);
router.get('/preview', homepageController.getHomepagePreview);

// Validation middleware
const validate = (schema) => (req, res, next) => {
  try {
    console.log('Validating request body:', req.body);
    schema.parse(req.body);
    next();
  } catch (error) {
    console.log('Validation error:', error.errors);
    res.status(400).json({
      error: {
        message: 'Validation failed',
        details: error.errors,
        receivedData: req.body
      }
    });
  }
};

// Multer error handling wrapper
const handleMulterUpload = (uploadMiddleware) => {
  return (req, res, next) => {
    uploadMiddleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          // Determine if it's a video or image based on file extension
          const videoExtensions = /\.(mp4|mov|avi|wmv|flv|webm)$/i;
          const isVideo = videoExtensions.test(req.file?.originalname || '');
          
          const maxSize = isVideo ? '500MB' : '50MB';
          const message = isVideo 
            ? 'Video file too large. Maximum video size is 500MB. Large videos will be automatically compressed.'
            : 'Image file too large. Maximum image size is 50MB.';
          
          return res.status(413).json({
            error: {
              message,
              code: 'FILE_TOO_LARGE',
              maxSize,
              fileType: isVideo ? 'video' : 'image',
              note: isVideo ? 'Large videos are automatically compressed to optimize for web delivery.' : null
            }
          });
        } else if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(413).json({
            error: {
              message: 'Too many files. Maximum 10 files allowed.',
              code: 'TOO_MANY_FILES',
              maxFiles: 10
            }
          });
        } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({
            error: {
              message: 'Unexpected file field.',
              code: 'UNEXPECTED_FILE'
            }
          });
        }
      }
      
      if (err && err.message === 'Only image and video files are allowed') {
        return res.status(400).json({
          error: {
            message: 'Only image and video files are allowed (jpeg, jpg, png, gif, webp, mp4, mov, avi, wmv, flv, webm)',
            code: 'INVALID_FILE_TYPE',
            allowedTypes: ['jpeg', 'jpg', 'png', 'gif', 'webp', 'mp4', 'mov', 'avi', 'wmv', 'flv', 'webm']
          }
        });
      }
      
      if (err) {
        return next(err);
      }
      
      next();
    });
  };
};

// Admin routes (require admin authentication)
router.post('/elements', 
  authenticateToken, 
  requireAdmin, 
  handleMulterUpload(universalUpload.single('media_file')), 
  validate(homepageElementSchema),
  homepageController.createHomepageElement
);

router.put('/elements/:id', 
  authenticateToken, 
  requireAdmin, 
  validate(updateHomepageElementSchema),
  homepageController.updateHomepageElement
);

router.delete('/elements/:id', 
  authenticateToken, 
  requireAdmin, 
  homepageController.deleteHomepageElement
);

router.patch('/elements/:id/toggle-active', 
  authenticateToken, 
  requireAdmin, 
  validate(toggleActiveSchema),
  homepageController.toggleElementActive
);

router.post('/elements/reorder', 
  authenticateToken, 
  requireAdmin, 
  validate(reorderElementsSchema),
  homepageController.reorderElements
);

router.post('/elements/:id/media', 
  authenticateToken, 
  requireAdmin, 
  handleMulterUpload(universalUpload.single('media_file')), 
  homepageController.updateElementMedia
);

router.get('/stats', 
  authenticateToken, 
  requireAdmin, 
  homepageController.getHomepageStats
);

// Test video compression (admin only)
router.post('/test-compression', 
  authenticateToken, 
  requireAdmin, 
  handleMulterUpload(universalUpload.single('video_file')), 
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No video file provided' });
      }

      const videoExtensions = /\.(mp4|mov|avi|wmv|flv|webm)$/i;
      const isVideo = videoExtensions.test(req.file.originalname);
      
      if (!isVideo) {
        return res.status(400).json({ error: 'File must be a video' });
      }

      const originalSize = req.file.size;
      const originalSizeMB = (originalSize / (1024 * 1024)).toFixed(2);

      res.json({
        message: 'Video compression test completed',
        original: {
          filename: req.file.originalname,
          size: originalSizeMB + ' MB',
          bytes: originalSize
        },
        note: 'Video compression is now integrated into the upload process automatically'
      });
    } catch (error) {
      res.status(500).json({ error: 'Test failed: ' + error.message });
    }
  }
);

router.post('/elements/bulk-upload', 
  authenticateToken, 
  requireAdmin, 
  handleMulterUpload(universalUpload.array('files', 10)), // Allow up to 10 files
  validate(bulkUploadSchema),
  homepageController.bulkUploadElements
);

module.exports = router; 