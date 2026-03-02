const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const adminController = require('../controllers/adminController');
const { authenticate, requireRole } = require('../middleware/auth');
const { validateRequest } = require('../utils/validation');

// Get pending employers
router.get(
  '/employers/pending',
  authenticate,
  requireRole('admin'),
  adminController.getPendingEmployers
);

// Update employer status
router.put(
  '/employers/:id/status',
  authenticate,
  requireRole('admin'),
  [
    body('status').isIn(['approved', 'rejected']).withMessage('Status must be approved or rejected'),
    body('reason').if(body('status').equals('rejected')).notEmpty().withMessage('Reason is required when rejecting')
  ],
  validateRequest,
  adminController.updateEmployerStatus
);

// Get platform statistics
router.get(
  '/stats',
  authenticate,
  requireRole('admin'),
  adminController.getPlatformStats
);

module.exports = router;
