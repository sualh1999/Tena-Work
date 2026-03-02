const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validateRequest } = require('../utils/validation');
const { upload } = require('../utils/fileUpload');

// Register professional
router.post(
  '/register/professional',
  upload.single('resume'),
  [
    body('email').if(body('data').not().exists()).isEmail().withMessage('Invalid email format'),
    body('password').if(body('data').not().exists()).isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('full_name').if(body('data').not().exists()).notEmpty().withMessage('Full name is required')
  ],
  validateRequest,
  authController.registerProfessional
);

// Register employer
router.post(
  '/register/employer',
  upload.single('logo'),
  [
    body('email').if(body('data').not().exists()).isEmail().withMessage('Invalid email format'),
    body('password').if(body('data').not().exists()).isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('full_name').if(body('data').not().exists()).notEmpty().withMessage('Full name is required'),
    body('company_name').if(body('data').not().exists()).notEmpty().withMessage('Company name is required')
  ],
  validateRequest,
  authController.registerEmployer
);

// Login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Invalid email format'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  validateRequest,
  authController.login
);

// Get current user
router.get('/me', authenticate, authController.getCurrentUser);

module.exports = router;
