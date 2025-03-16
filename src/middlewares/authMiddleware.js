/**
 * TeleDrive - Auth Middleware
 * Kiểm tra xác thực và cấp quyền
 */

const config = require('../config/config');

/**
 * Middleware xác thực người dùng
 * Kiểm tra xem người dùng đã đăng nhập chưa
 */
function authenticate(req, res, next) {
  // Nếu người dùng đã đăng nhập qua session, cho phép truy cập
  if (req.session && req.session.authenticated) {
    return next();
  }
  
  // Nếu có API key hợp lệ, cho phép truy cập
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  if (apiKey && apiKey === config.API_KEY) {
    return next();
  }
  
  // Nếu người dùng chưa đăng nhập thì gửi lỗi 401
  return res.status(401).json({
    success: false,
    message: 'Unauthorized: Bạn cần đăng nhập trước'
  });
}

/**
 * Middleware xác thực vai trò admin
 * Kiểm tra xem người dùng đăng nhập đã có vai trò admin chưa
 */
function requireAdmin(req, res, next) {
  // Kiểm tra xem người dùng đã đăng nhập chưa
  if (!req.session || !req.session.authenticated) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Bạn cần đăng nhập trước'
    });
  }
  
  // Kiểm tra vai trò admin 
  // Hiện tại mọi người dùng đăng nhập qua Telegram đều được quyền quản trị
  return next();
}

module.exports = {
  authenticate,
  requireAdmin
}; 