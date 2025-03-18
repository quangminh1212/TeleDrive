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
  
  // Log for debugging
  console.log(`Checking login for token: ${token.substring(0, 10)}...`);
  
  const loginRequest = verifyLoginToken(token);
  
  if (!loginRequest) {
    console.log(`Token không hợp lệ hoặc hết hạn: ${token.substring(0, 10)}...`);
    return res.json({ 
      loggedIn: false,
      error: 'Mã xác thực không hợp lệ hoặc đã hết hạn. Vui lòng làm mới mã xác thực và thử lại.'
    });
  }
  
  // Log login request state
  console.log(`Login request state: token=${token.substring(0, 10)}..., used=${loginRequest.used}, hasUser=${!!loginRequest.user}`);
  
  // Token valid but no user yet (waiting for Telegram action)
  if (!loginRequest.user) {
    return res.json({ 
      loggedIn: false,
      waitingForTelegram: true,
      message: 'Vui lòng hoàn thành xác thực trên Telegram'
    });
  }
  
  // Set user in session if not already set
  if (!req.session.user) {
    console.log(`Setting user in session: ${loginRequest.user.firstName} (${loginRequest.user.telegramId})`);
    req.session.user = loginRequest.user;
    
    // Save session explicitly to ensure it's stored
    req.session.save(err => {
      if (err) {
        console.error(`Error saving session: ${err.message}`);
      }
    });
  }
  
  // Return success
  console.log(`Login successful. Redirecting to: ${loginRequest.callbackUrl}`);
  return res.json({
    loggedIn: true,
    redirectUrl: loginRequest.callbackUrl,
    user: {
      firstName: loginRequest.user.firstName,
      lastName: loginRequest.user.lastName,
      telegramId: loginRequest.user.telegramId
    }
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

/**
 * @route GET /api/auth/debug
 * @desc Debug API for troubleshooting auth issues
 */
router.get('/api/auth/debug', (req, res) => {
  const { token } = req.query;
  
  if (!token) {
    return res.json({
      status: 'error',
      message: 'Token is required'
    });
  }
  
  // Kiểm tra token trong login requests
  const loginRequest = verifyLoginToken(token);
  
  if (!loginRequest) {
    return res.json({
      status: 'error',
      message: 'Token không hợp lệ hoặc đã hết hạn',
      tokenFound: false
    });
  }
  
  // Trả về thông tin về token để debug
  return res.json({
    status: 'success',
    tokenFound: true,
    tokenInfo: {
      expiresAt: new Date(loginRequest.expiresAt).toISOString(),
      expired: loginRequest.expiresAt < Date.now(),
      used: loginRequest.used,
      hasUser: !!loginRequest.user,
      userInfo: loginRequest.user ? {
        telegramId: loginRequest.user.telegramId,
        firstName: loginRequest.user.firstName
      } : null
    }
  });
});

/**
 * @route POST /api/auth/force-login
 * @desc Force login with a valid token (for recovery when normal flow fails)
 */
router.post('/api/auth/force-login', (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    return res.json({
      success: false,
      message: 'Token is required'
    });
  }
  
  // Kiểm tra token
  const loginRequest = verifyLoginToken(token);
  
  if (!loginRequest) {
    return res.json({
      success: false,
      message: 'Token không hợp lệ hoặc đã hết hạn'
    });
  }
  
  // Kiểm tra xem token đã có user (đã xác thực qua Telegram) chưa
  if (!loginRequest.user) {
    return res.json({
      success: false,
      message: 'Người dùng chưa xác thực qua Telegram với token này'
    });
  }
  
  // Thiết lập session
  req.session.user = loginRequest.user;
  
  // Lưu session
  req.session.save(err => {
    if (err) {
      console.error(`Error saving session: ${err.message}`);
      return res.json({
        success: false,
        message: 'Lỗi khi lưu phiên đăng nhập'
      });
    }
    
    // Trả về thành công
    return res.json({
      success: true,
      message: 'Đã đăng nhập thành công',
      redirectUrl: loginRequest.callbackUrl || '/dashboard'
    });
  });
});

module.exports = router; 