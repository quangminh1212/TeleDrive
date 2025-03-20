const logger = require('./logger');
const { config } = require('./config');

/**
 * Express error handler middleware
 */
module.exports = (err, req, res, next) => {
  // Log error details
  logger.error(`Error: ${err.message}`);
  if (err.stack) {
    logger.error(`Stack: ${err.stack}`);
  }
  
  // Đã gửi response trước đó, chuyển cho error handler mặc định của Express
  if (res.headersSent) {
    return next(err);
  }
  
  // Set status code
  const statusCode = err.status || err.statusCode || 500;
  
  // JSON response for API endpoints
  if (req.xhr || req.path.startsWith('/api')) {
    return res.status(statusCode).json({
      error: err.message,
      status: statusCode,
      stack: config.nodeEnv === 'development' ? err.stack : undefined
    });
  }
  
  // HTML response for web views
  res.status(statusCode).render('error', {
    title: 'Lỗi',
    message: err.message,
    status: statusCode,
    stack: config.nodeEnv === 'development' ? err.stack : null
  });
}; 