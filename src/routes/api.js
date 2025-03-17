// Route để bắt đầu quá trình xác thực
router.post('/auth/telegram/start', async (req, res) => {
  try {
    const authCode = await telegramService.generateAuthCode();
    
    if (!authCode) {
      return res.status(500).json({
        success: false,
        message: 'Không thể tạo mã xác thực, vui lòng thử lại sau'
      });
    }
    
    return res.json({
      success: true,
      authCode: authCode
    });
  } catch (error) {
    log(`Lỗi khi bắt đầu xác thực Telegram: ${error.message}`, 'error');
    return res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi, vui lòng thử lại sau'
    });
  }
});

// Alias route cho /api/auth/verify để hỗ trợ mã client cũ
router.post('/auth/verify', async (req, res) => {
  try {
    const { authCode } = req.body;
    
    log(`API nhận yêu cầu xác thực với mã: ${authCode}`, 'debug');
    
    if (!authCode) {
      log('Yêu cầu xác thực bị từ chối: Không có mã xác thực', 'warning');
      return res.status(400).json({
        success: false,
        message: 'Không có mã xác thực được cung cấp'
      });
    }
    
    // Loại bỏ tiền tố "auth_" nếu có
    const cleanAuthCode = authCode.replace('auth_', '');
    log(`Xử lý mã xác thực (đã làm sạch): ${cleanAuthCode}`, 'debug');
    
    const authData = await telegramService.verifyAuthRequest(cleanAuthCode);
    
    if (!authData) {
      log(`Xác thực thất bại với mã: ${cleanAuthCode}`, 'warning');
      return res.status(400).json({
        success: false,
        message: 'Mã xác thực không hợp lệ hoặc đã hết hạn'
      });
    }
    
    log(`Xác thực thành công với mã: ${cleanAuthCode}`, 'info');
    
    // Tạo thông tin người dùng giả lập
    const user = {
      id: config.TELEGRAM_CHAT_ID,
      username: 'telegram_user',
      displayName: 'Telegram User',
      photoUrl: 'https://telegram.org/img/t_logo.png',
      isAdmin: true,
      provider: 'telegram'
    };
    
    // Tạo session mới
    req.session.user = user;
    req.session.isLoggedIn = true;
    req.session.isAuthenticated = true; // Thêm cả flag này để đảm bảo tương thích
    
    // Lưu session ngay lập tức
    req.session.save(err => {
      if (err) {
        log(`Lỗi khi lưu session: ${err.message}`, 'error');
      } else {
        log('Đã lưu session thành công', 'debug');
      }
      
      // Thêm thời gian delay nhỏ để đảm bảo session được lưu
      setTimeout(() => {
        return res.json({
          success: true,
          user: user
        });
      }, 300);
    });
  } catch (error) {
    log(`Lỗi khi xác thực Telegram: ${error.message}`, 'error');
    log(error.stack, 'error');
    return res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi khi xác thực',
      error: error.message
    });
  }
});

// Route để lấy mã xác thực
router.get('/auth/get-auth-code', async (req, res) => {
  try {
    const authCode = await telegramService.generateAuthCode();
    
    if (!authCode) {
      return res.status(500).json({
        success: false,
        message: 'Không thể tạo mã xác thực'
      });
    }
    
    return res.json({
      success: true,
      authCode: authCode
    });
  } catch (error) {
    log(`Lỗi khi tạo mã xác thực: ${error.message}`, 'error');
    return res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi khi tạo mã xác thực'
    });
  }
});

// Route để xác thực bằng mã (Telegram)
router.post('/auth/telegram/verify', async (req, res) => {
  try {
    const { authCode } = req.body;
    
    if (!authCode) {
      return res.status(400).json({
        success: false,
        message: 'Không có mã xác thực được cung cấp'
      });
    }
    
    const authData = await telegramService.verifyAuthRequest(authCode);
    
    if (!authData) {
      return res.status(400).json({
        success: false,
        message: 'Mã xác thực không hợp lệ hoặc đã hết hạn'
      });
    }
    
    // Tạo thông tin người dùng giả lập
    const user = {
      id: config.TELEGRAM_CHAT_ID,
      username: 'telegram_user',
      displayName: 'Telegram User',
      photoUrl: 'https://telegram.org/img/t_logo.png',
      isAdmin: true,
      provider: 'telegram'
    };
    
    // Tạo session mới
    req.session.user = user;
    req.session.isLoggedIn = true;
    
    // Lưu session ngay lập tức
    req.session.save(err => {
      if (err) {
        log(`Lỗi khi lưu session: ${err.message}`, 'error');
      }
      
      return res.json({
        success: true,
        user: user
      });
    });
  } catch (error) {
    log(`Lỗi khi xác thực Telegram: ${error.message}`, 'error');
    return res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi khi xác thực'
    });
  }
}); 