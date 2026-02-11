class ApiError extends Error {
  constructor(statusCode, message, details = undefined) {
    super(message)
    this.statusCode = statusCode
    this.details = details
  }
}

function notFound(req, _res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`))
}

function errorHandler(err, _req, res, _next) {
  const statusCode = err?.statusCode || 500
  const message = err?.message || 'Internal Server Error'

  const response = {
    error: true,
    message,
  }

  if (err?.details) response.details = err.details
  if (process.env.NODE_ENV !== 'production') {
    response.stack = err?.stack
    response.original = err?.original || undefined
  }

  res.status(statusCode).json(response)
}

module.exports = { ApiError, notFound, errorHandler }

