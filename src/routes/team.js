const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');
const multer = require('multer');
const path = require('path');

// Multer config for photo upload
const storage = multer.memoryStorage();
const photoUpload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, webp)'));
    }
  }
});

// Public routes
router.get('/', teamController.getAllTeamMembers);
router.get('/:id', teamController.getTeamMemberById);

// Admin routes
router.post('/', authenticateToken, requireAdmin, photoUpload.single('photo'), teamController.createTeamMember);
router.put('/:id', authenticateToken, requireAdmin, photoUpload.single('photo'), teamController.updateTeamMember);
router.delete('/:id', authenticateToken, requireAdmin, teamController.deleteTeamMember);

module.exports = router; 