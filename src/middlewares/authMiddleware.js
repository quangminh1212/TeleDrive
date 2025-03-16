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
  // Kiểm tra API key trong header
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'Không có API key'
    });
  }
  
  // So sánh với API key từ config
  const adminUsername = config.ADMIN_USERNAME;
  const adminPassword = config.ADMIN_PASSWORD;
  
  // Tạo API key cơ bản từ username và password
  const validApiKey = Buffer.from(`${adminUsername}:${adminPassword}`).toString('base64');
  
  if (apiKey !== validApiKey) {
    return res.status(401).json({
      success: false,
      error: 'API key không hợp lệ'
    });
  }
  
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
  const publicRoutes = ['/login', '/api/auth/login'];
  
  if (publicRoutes.includes(req.path)) {
    return next();
  }
  
  // Kiểm tra session
  if (req.session && req.session.isLoggedIn) {
    return next();
  }
  
  // Nếu là API request, trả về lỗi 401
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({
      success: false,
      error: 'Chưa đăng nhập'
    });
  }
  
  // Chuyển hướng đến trang đăng nhập
  return res.redirect('/login');
}

/**
 * Middleware xác thực admin
 * @param {Object} req Request object
 * @param {Object} res Response object
 * @param {Function} next Next middleware
 */
function adminAuth(req, res, next) {
  // Kiểm tra quyền admin
  if (req.session && req.session.isLoggedIn && req.session.isAdmin) {
    return next();
  }
  
  // Nếu là API request, trả về lỗi 403
  if (req.path.startsWith('/api/')) {
    return res.status(403).json({
      success: false,
      error: 'Không có quyền admin'
    });
  }
  
  // Chuyển hướng đến trang lỗi
  return res.render('error', {
    error: 'Bạn không có quyền truy cập trang này',
    title: '403 - Cấm truy cập'
  });
}

module.exports = {
  apiAuth,
  webAuth,
  adminAuth
}; 