const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { authenticate, requireRole } = require('../middleware/auth');
const { upload } = require('../utils/fileUpload');

// Get my profile
router.get('/me', authenticate, profileController.getMyProfile);

// Update my profile
router.put(
  '/me',
  authenticate,
  upload.single('resume'), // Will also handle 'logo' field
  profileController.updateMyProfile
);

// Get user profile by ID (employer/admin only)
router.get(
  '/:user_id',
  authenticate,
  requireRole('employer', 'admin'),
  profileController.getUserProfile
);

module.exports = router;
