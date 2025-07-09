const express = require('express');
const router = express.Router();
const instagramController = require('../controllers/instagramController');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');

// Public routes (no authentication required)
router.get('/profile', instagramController.getUserProfile);
router.get('/posts', instagramController.getPosts);
router.get('/homepage', instagramController.getHomepageFeed);
router.get('/search', instagramController.searchPosts);
router.get('/type', instagramController.getPostsByType);
router.get('/stories', instagramController.getStories);
router.get('/post/:postId', instagramController.getPostById);

// Admin routes (require authentication and admin role)
router.use(authenticateToken, requireAdmin);

router.get('/post/:postId/insights', instagramController.getPostInsights);
router.post('/refresh-token', instagramController.refreshToken);

module.exports = router; 