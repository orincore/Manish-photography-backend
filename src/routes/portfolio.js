const express = require('express');
const router = express.Router();
const multer = require('multer');
const portfolioController = require('../controllers/portfolioController');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');
const { portfolioSchema, paginationSchema, searchSchema, categorySchema } = require('../utils/validation');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  // Remove or increase the fileSize limit to allow larger uploads
  // limits: { fileSize: 10 * 1024 * 1024 }, // Comment out or increase this line
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

// Configure multer for video uploads
const videoUpload = multer({
  storage: storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB for videos
  fileFilter: (req, file, cb) => {
    // Accept video files
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'), false);
    }
  },
});

// Configure multer for mixed media uploads (images and videos)
const mixedUpload = multer({
  storage: storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB for videos
  fileFilter: (req, file, cb) => {
    // Accept both image and video files
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed'), false);
    }
  },
});

// Validation middleware
const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      error: {
        message: 'Validation failed',
        details: error.errors
      }
    });
  }
};

// Public routes (no authentication required)
router.get('/featured', portfolioController.getFeaturedProjects);
router.get('/published', portfolioController.getPublishedProjects);
router.get('/categories', portfolioController.getCategories);

// CRUD routes for packages (move these above dynamic routes)
router.get('/packages', portfolioController.getPackages);
router.post('/packages', portfolioController.createPackage);
router.get('/packages/:id', portfolioController.getPackageById);
router.put('/packages/:id', portfolioController.updatePackage);
router.delete('/packages/:id', portfolioController.deletePackage);

// Specific category routes (must come before dynamic routes)
router.get('/categories/with-projects', portfolioController.getCategoriesWithProjects);
router.get('/categories/all', portfolioController.getAllCategories);
router.get('/categories/with-projects-all', portfolioController.getAllCategoriesWithProjects);
router.get('/cat/all', portfolioController.getAllCategoriesWithProjects);

// Dynamic category routes (must come after specific routes)
router.get('/categories/:subcategorySlug', portfolioController.getProjectsBySubcategorySlug);
router.get('/categories/:categorySlug/:subcategorySlug', portfolioController.getSubcategoryBySlug);

router.get('/search', portfolioController.searchProjects);
router.get('/tags', portfolioController.getProjectsByTags);
router.get('/admin/all', portfolioController.getAllProjects);
router.get('/admin/stats', portfolioController.getProjectStats);

// Public route to get a single project by ID (must come after all specific routes)
router.get('/project/:projectId', portfolioController.getProjectById);
router.get('/:projectId', portfolioController.getProjectById);

// Helper to wrap async middleware for Express compatibility
function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Category management (admin only)
router.post('/categories', validate(categorySchema), portfolioController.createCategory);
router.put('/categories/:categoryId', validate(portfolioSchema), portfolioController.updateCategory);
// router.delete('/categories/:categoryId', portfolioController.deleteCategory); // Removed: No such function in controller

// Subcategory management (admin only)
router.post('/subcategories', 
  upload.single('coverImage'),
  validate(portfolioSchema),
  portfolioController.createSubcategory
);
router.put('/subcategories/:subcategoryId',
  upload.single('coverImage'),
  validate(portfolioSchema),
  portfolioController.updateSubcategory
);
router.delete('/subcategories/:subcategoryId', portfolioController.deleteSubcategory);

// Create new project (with image upload)
router.post('/', 
  authenticateToken, requireAdmin,
  upload.array('images', 10),
  validate(portfolioSchema),
  portfolioController.createProject
);

// Create new project with mixed media (images and/or videos)
router.post('/with-media', 
  authenticateToken, requireAdmin,
  mixedUpload.array('media', 10),
  validate(portfolioSchema),
  portfolioController.createProjectWithMedia
);

// Update project (with optional image upload)
router.put('/:projectId',
  upload.single('image'),
  validate(portfolioSchema),
  portfolioController.updateProject
);

// Admin-only delete routes
router.delete('/project/:projectId', authenticateToken, requireAdmin, portfolioController.deleteProject);
router.delete('/category/:slug', authenticateToken, requireAdmin, portfolioController.deleteCategoryBySlug);
// Optionally keep the public delete by projectId (not recommended for production)
// router.delete('/:projectId', portfolioController.deleteProject);

// Toggle publish status
router.patch('/:projectId/publish', portfolioController.togglePublishStatus);

// Delete a specific image from a project (admin only)
router.delete('/:projectId/images/:imageId', authenticateToken, requireAdmin, portfolioController.deleteProjectImage);

// Video management routes
// Upload single video to project (admin only)
router.post('/:projectId/videos', 
  authenticateToken, 
  requireAdmin,
  videoUpload.single('video'),
  portfolioController.uploadProjectVideo
);

// Get project videos (public)
router.get('/:projectId/videos', portfolioController.getProjectVideos);

// Update project video (admin only)
router.put('/videos/:videoId', 
  authenticateToken, 
  requireAdmin,
  portfolioController.updateProjectVideo
);

// Delete project video (admin only)
router.delete('/videos/:videoId', 
  authenticateToken, 
  requireAdmin,
  portfolioController.deleteProjectVideo
);

// Reorder project videos (admin only)
router.put('/:projectId/videos/reorder', 
  authenticateToken, 
  requireAdmin,
  portfolioController.reorderProjectVideos
);

// Bulk upload videos to project (admin only)
router.post('/:projectId/videos/bulk', 
  authenticateToken, 
  requireAdmin,
  videoUpload.array('videos', 10),
  portfolioController.bulkUploadProjectVideos
);

module.exports = router; 