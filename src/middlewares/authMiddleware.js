/**
 * TeleDrive - Auth Middleware
 * File này chứa middleware xác thực
 */

const config = require('../config/config');

/**
 * Middleware xác thực
 * Kiểm tra xem user đã đăng nhập chưa hoặc có API key hợp lệ không
 */
exports.authenticate = (req, res, next) => {
  // Nếu đây là route đăng nhập thì cho đi tiếp
  if (req.path === '/auth/login') {
    return next();
  }
  
  // Kiểm tra API key
  const apiKey = req.query.apiKey || req.headers['x-api-key'];
  if (apiKey && apiKey === config.API_KEY) {
    return next();
  }
  
  // Kiểm tra session đăng nhập
  if (!req.session || !req.session.authenticated) {
    return res.status(401).json({
      success: false,
      message: 'Không có quyền truy cập. Vui lòng đăng nhập.'
    });
  }
  
  // Đã đăng nhập, cho đi tiếp
  next();
};

/**
 * Middleware kiểm tra quyền admin
 * Xác minh rằng user hiện tại là admin
 */
exports.requireAdmin = (req, res, next) => {
  // Kiểm tra quyền admin
  if (!req.session || !req.session.authenticated || req.session.username !== config.ADMIN_USERNAME) {
    return res.status(403).json({
      success: false,
      message: 'Yêu cầu quyền quản trị viên để thực hiện thao tác này'
    });
  }
  
  // Là admin, cho đi tiếp
  next();
}; 