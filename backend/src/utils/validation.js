const { validationResult } = require('express-validator');

function validateRequest(req, res, next) {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'One or more fields are invalid',
        details: errors.array().map(err => ({
          field: err.path || err.param,
          message: err.msg
        }))
      }
    });
  }
  
  next();
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidPhone(phone) {
  // Ethiopian phone format: +251XXXXXXXXX
  const phoneRegex = /^\+251[0-9]{9}$/;
  return phoneRegex.test(phone);
}

function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  return str.trim();
}

module.exports = {
  validateRequest,
  isValidEmail,
  isValidPhone,
  sanitizeString
};
