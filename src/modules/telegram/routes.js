const express = require('express');
const router = express.Router();
const { tdlibStorage } = require('../storage/tdlib-client');
const logger = require('../common/logger');
const { config } = require('../common/config');

/**
 * @route GET /api/telegram/status
 * @desc Lấy trạng thái Telegram hiện tại
 * @access Public
 */
router.get('/status', async (req, res) => {
  try {
    // Lấy trạng thái xác thực từ TDLib
    const authState = await tdlibStorage.getAuthState();
    
    // Thông tin về cấu hình
    const configInfo = {
      api_id_provided: !!config.telegram.apiId,
      api_hash_provided: !!config.telegram.apiHash,
      bot_token_provided: !!config.telegram.botToken,
      chat_id_provided: !!config.telegram.chatId
    };
    
    // Trả về trạng thái
    res.json({
      config: configInfo,
      tdlib: authState,
      using_tdlib: !!authState,
      fallback_to_bot_api: !authState?.isLoggedIn
    });
  } catch (error) {
    logger.error(`Lỗi khi lấy trạng thái Telegram: ${error.message}`);
    res.status(500).json({ error: 'Không thể lấy trạng thái Telegram' });
  }
});

/**
 * @route POST /api/telegram/login/phone
 * @desc Gửi số điện thoại để đăng nhập Telegram
 * @access Public
 */
router.post('/login/phone', async (req, res) => {
  try {
    const { phone } = req.body;
    
    if (!phone) {
      return res.status(400).json({ error: 'Vui lòng nhập số điện thoại' });
    }
    
    // Gửi số điện thoại cho TDLib
    await tdlibStorage.setPhoneNumber(phone);
    
    res.json({ 
      success: true, 
      message: 'Đã gửi số điện thoại, vui lòng nhập mã xác thực' 
    });
  } catch (error) {
    logger.error(`Lỗi khi gửi số điện thoại: ${error.message}`);
    res.status(500).json({ error: error.message || 'Không thể gửi số điện thoại' });
  }
});

/**
 * @route POST /api/telegram/login/code
 * @desc Gửi mã xác thực từ Telegram
 * @access Public
 */
router.post('/login/code', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Vui lòng nhập mã xác thực' });
    }
    
    // Gửi mã xác thực cho TDLib
    await tdlibStorage.checkAuthCode(code);
    
    // Lấy trạng thái hiện tại sau khi nhập mã
    const authState = await tdlibStorage.getAuthState();
    
    res.json({ 
      success: true, 
      message: 'Đã xác thực mã thành công', 
      needPassword: authState.waitingForPassword 
    });
  } catch (error) {
    logger.error(`Lỗi khi gửi mã xác thực: ${error.message}`);
    res.status(500).json({ error: error.message || 'Không thể xác thực mã' });
  }
});

/**
 * @route POST /api/telegram/login/password
 * @desc Gửi mật khẩu 2FA
 * @access Public
 */
router.post('/login/password', async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ error: 'Vui lòng nhập mật khẩu' });
    }
    
    // Gửi mật khẩu cho TDLib
    await tdlibStorage.checkAuthPassword(password);
    
    res.json({ 
      success: true, 
      message: 'Đăng nhập thành công' 
    });
  } catch (error) {
    logger.error(`Lỗi khi gửi mật khẩu: ${error.message}`);
    res.status(500).json({ error: error.message || 'Không thể xác thực mật khẩu' });
  }
});

/**
 * @route POST /api/telegram/logout
 * @desc Đăng xuất khỏi Telegram
 * @access Public
 */
router.post('/logout', async (req, res) => {
  try {
    await tdlibStorage.logout();
    
    res.json({ 
      success: true, 
      message: 'Đã đăng xuất thành công' 
    });
  } catch (error) {
    logger.error(`Lỗi khi đăng xuất: ${error.message}`);
    res.status(500).json({ error: error.message || 'Không thể đăng xuất' });
  }
});

/**
 * @route POST /api/telegram/login/qrcode
 * @desc Yêu cầu đăng nhập bằng QR code
 * @access Public
 */
router.post('/login/qrcode', async (req, res) => {
  try {
    // Lấy trạng thái hiện tại để kiểm tra
    const currentState = await tdlibStorage.getAuthState();
    
    if (!currentState) {
      // Nếu chưa có client hoặc client chưa được khởi tạo, khởi tạo lại
      try {
        const { initTDLib } = require('../storage/tdlib-client');
        await initTDLib();
      } catch (initError) {
        logger.error(`Không thể khởi tạo TDLib client: ${initError.message}`);
        return res.status(500).json({ 
          error: 'Không thể khởi tạo TDLib. Vui lòng kiểm tra API ID và API Hash trong cấu hình.',
          details: initError.message
        });
      }
    }
    
    // Gọi phương thức yêu cầu tạo QR code để đăng nhập
    await tdlibStorage.requestQRCodeAuthentication();
    
    // Lấy trạng thái sau khi yêu cầu QR code
    const authState = await tdlibStorage.getAuthState();
    
    if (authState && authState.qrCodeLink) {
      res.json({ 
        success: true, 
        qrCodeLink: authState.qrCodeLink
      });
    } else {
      res.status(500).json({ error: 'Không thể tạo QR code đăng nhập' });
    }
  } catch (error) {
    logger.error(`Lỗi khi tạo QR code đăng nhập: ${error.message}`);
    res.status(500).json({ error: error.message || 'Không thể tạo QR code đăng nhập' });
  }
});

/**
 * @route GET /api/telegram/login/qrcode/status
 * @desc Kiểm tra trạng thái đăng nhập QR code
 * @access Public
 */
router.get('/login/qrcode/status', async (req, res) => {
  try {
    const authState = await tdlibStorage.getAuthState();
    
    if (authState.isLoggedIn) {
      res.json({ 
        success: true, 
        status: 'authenticated',
        message: 'Đã đăng nhập thành công' 
      });
    } else if (authState.qrCodeLink) {
      res.json({ 
        success: true, 
        status: 'waiting_confirmation',
        qrCodeLink: authState.qrCodeLink,
        message: 'Đang chờ xác nhận từ thiết bị khác' 
      });
    } else {
      res.json({ 
        success: false, 
        status: 'expired',
        message: 'QR code đã hết hạn hoặc không hợp lệ' 
      });
    }
  } catch (error) {
    logger.error(`Lỗi khi kiểm tra trạng thái QR code: ${error.message}`);
    res.status(500).json({ error: error.message || 'Không thể kiểm tra trạng thái QR code' });
  }
});

// Test upload route (development only)
if (config.nodeEnv === 'development') {
  router.post('/test-upload', async (req, res) => {
    try {
      if (!req.body.filePath) {
        return res.status(400).json({ error: 'filePath is required', status: 400 });
      }
      
      const result = await tdlibStorage.uploadFile(req.body.filePath, req.body.caption || 'Test upload');
      res.json({
        success: true,
        fileId: result.fileId,
        messageId: result.messageId,
        fileName: result.fileName,
        size: result.size
      });
    } catch (error) {
      logger.error(`Error in test upload: ${error.message}`);
      res.status(500).json({
        error: error.message,
        status: 500
      });
    }
  });
}

module.exports = router; 