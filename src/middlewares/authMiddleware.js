/**
 * TeleDrive - Auth Middleware
 * Kiểm tra xác thực và cấp quyền
 */

const config = require('../config/config');

/**
 * Middleware xác thực: Kiểm tra xem người dùng đã đăng nhập hay chưa
 */
function authenticate(req, res, next) {
  // Các đường dẫn không cần xác thực
  const publicPaths = [
    '/login',
    '/api/auth/telegram',
    '/api/auth/telegram-callback'
  ];
  
  // Kiểm tra nếu đường dẫn là public
  if (publicPaths.includes(req.path) || req.path.startsWith('/images/') || req.path.startsWith('/css/') || req.path.startsWith('/js/')) {
    return next();
  }
  
  // Kiểm tra session
  if (req.session && (req.session.isLoggedIn || req.session.authenticated)) {
    return next();
  }
  
  // Nếu là API request, trả về lỗi 401
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ 
      success: false, 
      error: 'Unauthorized' 
    });
  }
  
  // Chuyển hướng đến trang login
  res.redirect('/login');
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