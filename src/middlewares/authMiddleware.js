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
  const publicRoutes = ['/login', '/api/auth/login', '/api/auth/telegram'];
  
  if (publicRoutes.includes(req.path)) {
    return next();
  }
  
  // Kiểm tra session
  if (req.session && req.session.isLoggedIn) {
    return next();
  }
  
  // Nếu chưa đăng nhập, chuyển hướng đến trang đăng nhập
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