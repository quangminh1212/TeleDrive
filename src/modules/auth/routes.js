const express = require('express');
const { generateLoginLink, verifyLoginToken } = require('./telegram-auth');
const { isAuthenticated } = require('./middleware');
const router = express.Router();

/**
 * @route GET /auth/login
 * @desc Render login page
 */
router.get('/login', (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }
  
  res.render('login');
});

/**
 * @route GET /auth/logout
 * @desc Logout user
 */
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

/**
 * @route GET /api/auth/login-link
 * @desc Generate login link for Telegram authentication
 */
router.get('/api/auth/login-link', (req, res) => {
  const callbackUrl = req.session.returnTo || '/dashboard';
  const loginData = generateLoginLink(callbackUrl);
  
  res.json(loginData);
});

/**
 * @route GET /api/auth/check-login
 * @desc Check if user is logged in with token
 */
router.get('/api/auth/check-login', (req, res) => {
  const { token } = req.query;
  
  if (!token) {
    return res.json({ 
      loggedIn: false,
      error: 'Không tìm thấy mã xác thực'
    });
  }
  
  const loginRequest = verifyLoginToken(token);
  
  if (!loginRequest) {
    return res.json({ 
      loggedIn: false,
      error: 'Mã xác thực không hợp lệ hoặc đã hết hạn. Vui lòng làm mới mã xác thực và thử lại.'
    });
  }
  
  // Token valid but no user yet (waiting for Telegram action)
  if (!loginRequest.user) {
    return res.json({ 
      loggedIn: false,
      waitingForTelegram: true,
      message: 'Vui lòng hoàn thành xác thực trên Telegram'
    });
  }
  
  // Set user in session
  req.session.user = loginRequest.user;
  
  // Return success
  res.json({
    loggedIn: true,
    redirectUrl: loginRequest.callbackUrl,
  });
});

/**
 * @route GET /api/auth/me
 * @desc Get current user data
 */
router.get('/api/auth/me', isAuthenticated, (req, res) => {
  // Return user data without sensitive information
  const user = req.user;
  
  res.json({
    id: user._id,
    telegramId: user.telegramId,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    isAdmin: user.isAdmin,
    isPremium: user.isPremium,
    storageUsed: user.storageUsed,
    storageLimit: user.storageLimit,
    storagePercentage: user.getStoragePercentage(),
    settings: user.settings,
  });
});

module.exports = router; 