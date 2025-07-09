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
// Public route to get all projects for a snug (by slug) -- must come before the old category route
router.get('/categories/:subcategorySlug', portfolioController.getProjectsBySubcategorySlug);

// Comment out or remove the old category route to avoid conflict
// router.get('/categories/:categorySlug', portfolioController.getCategoryBySlug);
router.get('/categories/:categorySlug/:subcategorySlug', portfolioController.getSubcategoryBySlug);
router.get('/search', portfolioController.searchProjects);
router.get('/tags', portfolioController.getProjectsByTags);
router.get('/admin/all', portfolioController.getAllProjects);
router.get('/admin/stats', portfolioController.getProjectStats);
router.get('/:projectId', portfolioController.getProjectById);
// Public route to get only categories with projects (for client)
router.get('/categories/with-projects', portfolioController.getCategoriesWithProjects);

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

module.exports = router; 