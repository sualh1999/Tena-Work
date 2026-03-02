const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

async function hashPassword(password) {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

function validatePasswordStrength(password) {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const minLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  return {
    isValid: minLength && hasUpperCase && hasLowerCase && hasNumber,
    errors: [
      !minLength && 'Password must be at least 8 characters',
      !hasUpperCase && 'Password must contain at least one uppercase letter',
      !hasLowerCase && 'Password must contain at least one lowercase letter',
      !hasNumber && 'Password must contain at least one number'
    ].filter(Boolean)
  };
}

module.exports = {
  hashPassword,
  comparePassword,
  validatePasswordStrength
};
