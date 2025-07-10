const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');
const { contactSchema } = require('../utils/validation');

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
router.post('/', validate(contactSchema), contactController.createContactSubmission);

// Admin routes (require admin authentication)
router.use(authenticateToken, requireAdmin);

router.get('/admin/all', contactController.getAllContactSubmissions);
router.get('/admin/stats', contactController.getContactStats);
router.get('/admin/unread-count', contactController.getUnreadCount);
router.get('/admin/export', contactController.exportContacts);

router.get('/admin/:contactId', contactController.getContactSubmissionById);
router.patch('/admin/:contactId/read', contactController.markAsRead);
router.patch('/admin/:contactId/unread', contactController.markAsUnread);
router.patch('/admin/:contactId/resolved', contactController.markAsResolved);
router.patch('/admin/:contactId/waste', contactController.markAsWaste);
router.delete('/admin/:contactId', contactController.deleteContactSubmission);

router.get('/admin/search', contactController.searchContactSubmissions);
router.get('/admin/email/:email', contactController.getContactsByEmail);

router.post('/admin/bulk/read', contactController.bulkMarkAsRead);
router.post('/admin/bulk/resolved', contactController.bulkMarkAsResolved);
router.post('/admin/bulk/waste', contactController.bulkMarkAsWaste);
router.post('/admin/bulk/delete', contactController.bulkDelete);

module.exports = router; 