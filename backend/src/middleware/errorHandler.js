function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  // Default error
  let statusCode = err.statusCode || 500;
  let errorCode = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'An unexpected error occurred';
  let details = err.details || [];

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
  }

  if (err.code === '23505') { // PostgreSQL unique violation
    statusCode = 409;
    errorCode = 'CONFLICT';
    message = 'Resource already exists';
  }

  if (err.code === '23503') { // PostgreSQL foreign key violation
    statusCode = 400;
    errorCode = 'BAD_REQUEST';
    message = 'Invalid reference to related resource';
  }

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'An unexpected error occurred';
    details = [];
  }

  res.status(statusCode).json({
    error: {
      code: errorCode,
      message,
      details
    }
  });
}

module.exports = errorHandler;
