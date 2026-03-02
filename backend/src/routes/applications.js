const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const applicationController = require('../controllers/applicationController');
const { authenticate, requireRole } = require('../middleware/auth');
const { validateRequest } = require('../utils/validation');

// Get my applications (professional only)
router.get(
  '/me',
  authenticate,
  requireRole('professional'),
  applicationController.getMyApplications
);

// Update application status (employer only)
router.patch(
  '/:id/status',
  authenticate,
  requireRole('employer'),
  [
    body('status')
      .isIn(['pending', 'viewed', 'shortlisted', 'rejected'])
      .withMessage('Invalid status')
  ],
  validateRequest,
  applicationController.updateApplicationStatus
);

module.exports = router;
