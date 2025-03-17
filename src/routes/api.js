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

// Route callback từ Telegram Login Widget
router.get('/auth/telegram/callback', async (req, res) => {
  try {
    log('Nhận callback từ Telegram Login Widget', 'info');
    const data = req.query;
    
    // Kiểm tra xem có dữ liệu không
    if (!data || !data.id) {
      log('Không có dữ liệu người dùng từ Telegram', 'warning');
      return res.redirect('/login?error=Không nhận được dữ liệu từ Telegram');
    }
    
    log(`Nhận dữ liệu đăng nhập từ Telegram cho người dùng: ${data.username || data.id}`, 'info');
    
    // Tạo thông tin người dùng từ dữ liệu Telegram
    const user = {
      id: data.id,
      username: data.username || String(data.id),
      displayName: data.first_name + (data.last_name ? ' ' + data.last_name : ''),
      photoUrl: data.photo_url || 'https://telegram.org/img/t_logo.png',
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
        return res.redirect('/login?error=Lỗi khi xử lý đăng nhập');
      }
      
      log(`Người dùng ${user.username} đã đăng nhập thành công qua Widget`, 'info');
      return res.redirect('/');
    });
  } catch (error) {
    log(`Lỗi khi xử lý callback Telegram: ${error.message}`, 'error');
    return res.redirect('/login?error=Lỗi hệ thống, vui lòng thử lại sau');
  }
});

// API kiểm tra trạng thái xác thực
router.post('/auth/check-status', async (req, res) => {
  try {
    const { authCode } = req.body;
    
    if (!authCode) {
      return res.status(400).json({
        success: false,
        message: 'Không có mã xác thực được cung cấp'
      });
    }
    
    // Kiểm tra trong database
    const db = await telegramService.loadDb('auth_requests', []);
    const cleanAuthCode = authCode.replace('auth_', '');
    
    // Sử dụng cả 2 cách: so sánh chính xác và so sánh không phân biệt hoa thường
    const request = db.find(r => r.code === cleanAuthCode || r.code.toLowerCase() === cleanAuthCode.toLowerCase());
    
    if (!request) {
      return res.json({
        success: false,
        status: 'not_found',
        message: 'Mã xác thực không tồn tại'
      });
    }
    
    // Kiểm tra trạng thái xác thực
    if (request.verified) {
      // Đã xác thực thành công
      
      // Tạo thông tin người dùng
      const user = {
        id: request.telegramId || config.TELEGRAM_CHAT_ID,
        username: request.username || 'telegram_user',
        displayName: request.firstName + (request.lastName ? ' ' + request.lastName : '') || 'Telegram User',
        photoUrl: request.photoUrl || 'https://telegram.org/img/t_logo.png',
        isAdmin: true,
        provider: 'telegram'
      };
      
      // Tạo session mới
      req.session.user = user;
      req.session.isLoggedIn = true;
      req.session.isAuthenticated = true;
      
      // Lưu session
      req.session.save(err => {
        if (err) {
          log(`Lỗi khi lưu session: ${err.message}`, 'error');
        }
        
        // Xóa yêu cầu đã sử dụng
        const newDb = db.filter(r => r.code !== cleanAuthCode);
        telegramService.saveDb('auth_requests', newDb);
        
        return res.json({
          success: true,
          status: 'verified',
          message: 'Xác thực thành công',
          user: user
        });
      });
    } else {
      // Chưa xác thực
      return res.json({
        success: false,
        status: 'pending',
        message: 'Đang đợi xác thực từ Telegram'
      });
    }
  } catch (error) {
    log(`Lỗi khi kiểm tra trạng thái xác thực: ${error.message}`, 'error');
    return res.status(500).json({
      success: false,
      status: 'error',
      message: 'Đã xảy ra lỗi khi kiểm tra trạng thái xác thực'
    });
  }
}); 