const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const jobController = require('../controllers/jobController');
const applicationController = require('../controllers/applicationController');
const { authenticate, requireRole, requireApprovedEmployer } = require('../middleware/auth');
const { validateRequest } = require('../utils/validation');

// Get recommended jobs (professional only)
router.get(
  '/recommended',
  authenticate,
  requireRole('professional'),
  jobController.getRecommendedJobs
);

// Get my jobs (employer only)
router.get(
  '/me',
  authenticate,
  requireRole('employer'),
  jobController.getMyJobs
);

// Create job (approved employer only)
router.post(
  '/',
  authenticate,
  requireRole('employer'),
  requireApprovedEmployer,
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('location').notEmpty().withMessage('Location is required')
  ],
  validateRequest,
  jobController.createJob
);

// Get job by ID
router.get('/:id', authenticate, jobController.getJobById);

// Apply to job (professional only)
router.post(
  '/:id/apply',
  authenticate,
  requireRole('professional'),
  [
    body('cover_letter').optional().isString().withMessage('Cover letter must be a string')
  ],
  validateRequest,
  applicationController.applyToJob
);

// Get job applicants (employer only)
router.get(
  '/:id/applicants',
  authenticate,
  requireRole('employer'),
  applicationController.getJobApplicants
);

// Update job status (employer only)
router.patch(
  '/:id/status',
  authenticate,
  requireRole('employer'),
  [
    body('status').isIn(['active', 'closed']).withMessage('Status must be active or closed')
  ],
  validateRequest,
  jobController.updateJobStatus
);

// Get recommended candidates for job (employer only)
router.get(
  '/:id/recommendations',
  authenticate,
  requireRole('employer'),
  jobController.getRecommendedCandidates
);

module.exports = router;
