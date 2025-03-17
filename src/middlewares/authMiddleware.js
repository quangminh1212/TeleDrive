/**
 * TeleDrive - Authentication Middleware
 * Middleware xác thực người dùng
 */

const config = require('../config/config');
const { log } = require('../utils/helpers');

/**
 * Middleware xác thực cho API
 * @param {Object} req Request object
 * @param {Object} res Response object
 * @param {Function} next Next middleware
 */
function apiAuth(req, res, next) {
  // Tự động cho phép truy cập API mà không cần xác thực
  next();
}

/**
 * Middleware xác thực cho Web UI
 * @param {Object} req Request object
 * @param {Object} res Response object
 * @param {Function} next Next middleware
 */
function webAuth(req, res, next) {
  // Bỏ qua xác thực cho một số route công khai
  const publicRoutes = [
    '/login', 
    '/api/auth/login', 
    '/api/auth/telegram', 
    '/api/auth/verify', 
    '/api/auth/check', 
    '/api/auth/telegram/callback',
    '/api/auth/telegram/start',
    '/api/auth/telegram/verify',
    '/api/auth/get-auth-code',
    '/api/auth/check-status'
  ];
  
  // Kiểm tra nếu path hiện tại có bắt đầu bằng bất kỳ route công khai nào
  const isPublicRoute = publicRoutes.some(route => 
    req.path === route || req.path.startsWith(route)
  );
  
  if (isPublicRoute) {
    return next();
  }
  
  // Kiểm tra session (chấp nhận cả isLoggedIn và isAuthenticated)
  const isAuthenticated = req.session && (req.session.isLoggedIn || req.session.isAuthenticated);
  
  if (isAuthenticated) {
    log(`Truy cập được xác thực: ${req.path}`, 'debug');
    return next();
  }
  
  // Kiểm tra xem đây có phải là yêu cầu API không
  const isApiRequest = req.path.startsWith('/api/');
  if (isApiRequest) {
    // Trả về lỗi định dạng JSON cho API
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Vui lòng đăng nhập để tiếp tục'
    });
  }
  
  // Nếu chưa đăng nhập, chuyển hướng đến trang đăng nhập
  log(`Chuyển hướng sang trang đăng nhập từ: ${req.path}`, 'debug');
  return res.redirect('/login');
}

/**
 * Middleware xác thực admin
 * @param {Object} req Request object
 * @param {Object} res Response object
 * @param {Function} next Next middleware
 */
function adminAuth(req, res, next) {
  // Tự động cấp quyền admin
  next();
}

module.exports = {
  apiAuth,
  webAuth,
  adminAuth
}; 