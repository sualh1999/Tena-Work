const { verifyToken } = require('../utils/jwt');
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');
const EmployerProfile = require('../models/EmployerProfile');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      throw new UnauthorizedError('Invalid or expired token');
    }

    // Attach user info to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      userType: decoded.userType
    };

    next();
  } catch (error) {
    next(error);
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!roles.includes(req.user.userType)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }

    next();
  };
}

async function requireApprovedEmployer(req, res, next) {
  try {
    if (!req.user || req.user.userType !== 'employer') {
      return next(new ForbiddenError('Employer access required'));
    }

    const profile = await EmployerProfile.findByUserId(req.user.id);

    if (!profile) {
      return next(new ForbiddenError('Employer profile not found'));
    }

    if (profile.company_status !== 'approved') {
      return next(new ForbiddenError('Employer account must be approved to perform this action'));
    }

    req.employerProfile = profile;
    next();
  } catch (error) {
    next(error);
  }
}

async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);

      if (decoded) {
        req.user = {
          id: decoded.id,
          email: decoded.email,
          userType: decoded.userType
        };
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
}

module.exports = {
  authenticate,
  requireRole,
  requireApprovedEmployer,
  optionalAuth
};
