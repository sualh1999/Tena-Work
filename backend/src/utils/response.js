function successResponse(res, data, statusCode = 200) {
  return res.status(statusCode).json(data);
}

function createdResponse(res, data) {
  return res.status(201).json(data);
}

function errorResponse(res, error) {
  const statusCode = error.statusCode || 500;
  const code = error.code || 'INTERNAL_ERROR';
  const message = error.message || 'An unexpected error occurred';
  const details = error.details || [];

  return res.status(statusCode).json({
    error: {
      code,
      message,
      details
    }
  });
}

function paginatedResponse(res, items, pagination) {
  return res.status(200).json({
    items,
    pagination
  });
}

module.exports = {
  successResponse,
  createdResponse,
  errorResponse,
  paginatedResponse
};
