const logger = require('../common/logger');
const User = require('../db/models/User');

/**
 * Middleware to check if user is authenticated
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  
  // Store original URL for redirection after login
  req.session.returnTo = req.originalUrl;
  
  return res.redirect('/login');
};

/**
 * Middleware to check if user is admin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const isAdmin = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.isAdmin) {
    return next();
  }
  
  return res.status(403).render('error', {
    title: 'Access Denied',
    message: 'Bạn không có quyền truy cập trang này',
    error: { status: 403, stack: '' },
  });
};

/**
 * Middleware to load user data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const loadUser = async (req, res, next) => {
  // Skip if no user in session
  if (!req.session || !req.session.user) {
    return next();
  }
  
  try {
    // Find user by ID
    const user = await User.findById(req.session.user._id);
    
    if (!user) {
      // Clear invalid session
      req.session.destroy();
      return res.redirect('/login');
    }
    
    // Update last seen
    user.updateLastSeen();
    
    // Store user data in request
    req.user = user;
    res.locals.user = user;
    
    return next();
  } catch (error) {
    logger.error(`Error loading user: ${error.message}`);
    return next(error);
  }
};

/**
 * Middleware to log requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const logRequest = (req, res, next) => {
  const userId = req.session && req.session.user ? req.session.user._id : 'anonymous';
  logger.info(`[${req.method}] ${req.path} - ${userId}`);
  next();
};

/**
 * Middleware to handle share tokens
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const handleShareToken = (req, res, next) => {
  // Store share token in session if present in query
  if (req.query.token) {
    req.session.shareToken = req.query.token;
  }
  
  next();
};

module.exports = {
  isAuthenticated,
  isAdmin,
  loadUser,
  logRequest,
  handleShareToken,
}; 