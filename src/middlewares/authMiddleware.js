/**
 * TeleDrive - Authentication Middleware
 * Middleware xác thực người dùng
 */

const config = require('../config/config');

/**
 * Middleware xác thực cho API
 * @param {Object} req Request object
 * @param {Object} res Response object
 * @param {Function} next Next middleware
 */
function apiAuth(req, res, next) {
  // Tự động cho phép truy cập mà không cần API key
  next();
}

/**
 * Middleware xác thực cho Web UI
 * @param {Object} req Request object
 * @param {Object} res Response object
 * @param {Function} next Next middleware
 */
function webAuth(req, res, next) {
  // Tự động đăng nhập người dùng
  if (!req.session.isLoggedIn) {
    // Thiết lập session đăng nhập tự động
    req.session.isLoggedIn = true;
    req.session.user = {
      username: 'admin',
      isAdmin: true
    };
  }
  
  // Luôn cho phép truy cập
  next();
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