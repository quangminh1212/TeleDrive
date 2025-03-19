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
  try {
    // Bỏ qua nếu không có session hoặc không có user
    if (!req.session || !req.session.user) {
      return next();
    }
    
    // Lấy thông tin user từ database
    try {
      const user = await User.findById(req.session.user._id);
      
      if (user) {
        req.user = user;
      } else {
        // Nếu không tìm thấy user trong DB, xóa session
        delete req.session.user;
      }
    } catch (dbError) {
      // Lỗi DB nhưng vẫn cho phép request tiếp tục
      logger.error(`Lỗi khi tải thông tin user: ${dbError.message}`);
      
      // Nếu môi trường phát triển, tạo mock user cho thuận tiện test
      if (process.env.NODE_ENV === 'development') {
        req.user = {
          _id: 'mock_user_id',
          firstName: 'Test',
          lastName: 'User',
          username: 'testuser',
          telegramId: '123456789',
          isAdmin: true,
          storageUsed: 0,
          storageLimit: 1024 * 1024 * 1024, // 1GB
          createdAt: new Date(),
          hasEnoughStorage: function(size) { return true; },
          addStorageUsed: function(size) { return; }
        };
        logger.info('Đã tạo mock user cho môi trường phát triển');
      }
    }
    
    next();
  } catch (error) {
    logger.error(`Lỗi middleware loadUser: ${error.message}`);
    next(error);
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