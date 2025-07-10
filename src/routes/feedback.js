const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { authenticateToken, requireAdmin, requireClient, optionalAuth } = require('../middlewares/auth');
const { feedbackSchema, updateFeedbackSchema, updateUserFeedbackSchema } = require('../utils/validation');

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
router.get('/approved', feedbackController.getApprovedFeedback);
router.get('/summary', feedbackController.getFeedbackSummary);
router.get('/project/:projectId', optionalAuth, feedbackController.getProjectFeedback);
router.get('/:feedbackId', feedbackController.getFeedbackById);

// Admin routes (require admin authentication) - must come before client routes
router.get('/admin/all', authenticateToken, requireAdmin, feedbackController.getAllFeedback);
router.get('/admin/stats', authenticateToken, requireAdmin, feedbackController.getFeedbackStats);
router.get('/admin/stats/detailed', authenticateToken, requireAdmin, feedbackController.getAdminFeedbackStats);

router.put('/:feedbackId', authenticateToken, requireAdmin, validate(updateFeedbackSchema), feedbackController.updateFeedback);
router.delete('/:feedbackId', authenticateToken, requireAdmin, feedbackController.deleteFeedback);

router.patch('/:feedbackId/moderate', authenticateToken, requireAdmin, feedbackController.moderateFeedback);
router.post('/bulk/moderate', authenticateToken, requireAdmin, feedbackController.bulkModerateFeedback);

// Client routes (require client authentication)
router.post('/', authenticateToken, requireClient, validate(feedbackSchema), feedbackController.createFeedback);
router.get('/user/me', authenticateToken, requireClient, feedbackController.getUserFeedback);
router.put('/:feedbackId/user', authenticateToken, requireClient, validate(updateUserFeedbackSchema), feedbackController.updateUserFeedback);
router.delete('/:feedbackId/user', authenticateToken, requireClient, feedbackController.deleteUserFeedback);

module.exports = router; 