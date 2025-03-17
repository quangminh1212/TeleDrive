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

// Route để xác thực bằng mã
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
    req.session.isAuthenticated = true;
    
    return res.json({
      success: true,
      user: user
    });
  } catch (error) {
    log(`Lỗi khi xác thực Telegram: ${error.message}`, 'error');
    return res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi khi xác thực'
    });
  }
}); 