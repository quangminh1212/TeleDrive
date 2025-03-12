const express = require('express');
const cors = require('cors');
const path = require('path');
const { Telegraf } = require('telegraf');
require('dotenv').config();
const { v4: uuidv4 } = require('uuid');

// Import Telegram Client và Routes
const telegramClient = require('./telegramClient');
const { router, sessions, files } = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Khởi tạo Telegram Client
let mtproto = null;
let useMTProto = false;
if (process.env.TELEGRAM_API_ID && process.env.TELEGRAM_API_HASH) {
  mtproto = telegramClient.initTelegramClient();
  useMTProto = !!mtproto;
  
  // Kiểm tra trạng thái đăng nhập
  if (mtproto) {
    telegramClient.checkAuth(mtproto)
      .then(result => {
        if (result.success) {
          console.log('[Telegram API] Đã đăng nhập vào Telegram API với tài khoản:', result.user.first_name);
        } else {
          console.log('[Telegram API] Chưa đăng nhập vào Telegram API. Sử dụng giao diện để đăng nhập.');
        }
      })
      .catch(error => {
        console.error('[Telegram API] Lỗi kiểm tra đăng nhập:', error);
      });
  }
}

// Kiểm tra xem BOT_TOKEN đã được cấu hình chưa
let bot;
let useWebUpload = process.env.USE_WEB_CLIENT_UPLOAD === 'true';

if (process.env.BOT_TOKEN && process.env.BOT_TOKEN.includes(':') && !process.env.BOT_TOKEN.includes('1234567890')) {
  bot = new Telegraf(process.env.BOT_TOKEN);
  console.log('Telegram bot initialized');
} else {
  console.warn('BOT_TOKEN không hợp lệ hoặc chưa được cấu hình đúng. Chức năng Telegram sẽ bị hạn chế.');
  // Luôn bật chế độ Web Client Upload nếu không có bot
  useWebUpload = true;
  console.log('Sử dụng Telegram API trực tiếp hoặc Web Client để upload file');
}

// Hiển thị hướng dẫn lấy token nếu không có token hợp lệ
if (!bot && !useMTProto) {
  console.log('Hướng dẫn nhận token: Mở Telegram, chat với @BotFather và làm theo hướng dẫn.');
  console.log('Hoặc đăng ký API_ID và API_HASH tại https://my.telegram.org');
}

// Lưu các đối tượng vào app để routes có thể truy cập
app.set('mtproto', mtproto);
app.set('bot', bot);
app.set('useMTProto', useMTProto);
app.set('useWebUpload', useWebUpload);

// Sử dụng router
app.use('/', router);

// Các trang HTML
app.get('/telegram-login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'telegram-login.html'));
});

app.get('/telegram-api-login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'telegram-api-login.html'));
});

// Telegram API endpoints
app.post('/api/telegram/send-code', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ success: false, error: 'Số điện thoại không được để trống' });
    }
    
    // Xử lý định dạng số điện thoại
    let formattedPhone = phoneNumber.trim();
    
    // Đảm bảo bắt đầu bằng dấu +
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone;
    }
    
    // Loại bỏ tất cả ký tự không phải số sau dấu +
    formattedPhone = '+' + formattedPhone.substring(1).replace(/\D/g, '');
    
    // Xử lý nếu người dùng nhập số 0 sau mã quốc gia (ví dụ: +840...)
    if (formattedPhone.startsWith('+840')) {
      formattedPhone = '+84' + formattedPhone.substring(4);
    }
    
    console.log(`Attempting to send code to phone: ${formattedPhone}`);
    
    // Kiểm tra các thông tin cấu hình Telegram API
    const apiId = parseInt(process.env.TELEGRAM_API_ID);
    const apiHash = process.env.TELEGRAM_API_HASH;
    
    if (!apiId || !apiHash) {
      console.error('Missing Telegram API credentials');
      return res.status(500).json({ 
        success: false, 
        error: 'Chưa cấu hình API Telegram. Vui lòng kiểm tra TELEGRAM_API_ID và TELEGRAM_API_HASH trong file .env',
        details: { apiIdConfigured: !!apiId, apiHashConfigured: !!apiHash }
      });
    }
    
    // Gửi yêu cầu mã xác nhận
    try {
      const result = await telegramClient.sendCode(formattedPhone, apiId, apiHash);
      console.log('Code sent successfully:', result);
      
      return res.json({
        success: true,
        phone_code_hash: result.phone_code_hash
      });
    } catch (apiError) {
      console.error('Telegram API error:', apiError);
      
      // Xử lý các lỗi phổ biến từ Telegram API
      let errorMessage = 'Không thể gửi mã xác nhận';
      let errorDetails = { originalError: apiError.message };
      
      if (apiError.message.includes('PHONE_NUMBER_INVALID')) {
        errorMessage = 'Số điện thoại không hợp lệ. Vui lòng kiểm tra lại.';
        errorDetails.suggestion = 'Đảm bảo số điện thoại bắt đầu bằng mã quốc gia (ví dụ: +84 cho Việt Nam) và không có số 0 đầu.';
      } else if (apiError.message.includes('PHONE_NUMBER_BANNED')) {
        errorMessage = 'Số điện thoại đã bị Telegram chặn.';
      } else if (apiError.message.includes('PHONE_NUMBER_UNOCCUPIED')) {
        errorMessage = 'Số điện thoại này chưa đăng ký Telegram.';
      } else if (apiError.message.includes('FLOOD_WAIT')) {
        const waitTime = apiError.message.match(/FLOOD_WAIT_(\d+)/);
        const seconds = waitTime ? waitTime[1] : 'một khoảng thời gian';
        errorMessage = `Vui lòng đợi ${seconds} giây trước khi thử lại.`;
      } else if (apiError.message.includes('NETWORK_MIGRATION')) {
        errorMessage = 'Lỗi máy chủ Telegram. Vui lòng thử lại sau.';
      } else if (apiError.message.includes('AUTH_KEY_UNREGISTERED')) {
        errorMessage = 'Lỗi xác thực. Vui lòng thử lại.';
      }
      
      return res.status(400).json({
        success: false,
        error: errorMessage,
        details: errorDetails
      });
    }
    
  } catch (error) {
    console.error('Server error in send-code:', error);
    return res.status(500).json({
      success: false,
      error: 'Lỗi máy chủ: ' + error.message
    });
  }
});

app.post('/api/telegram/sign-in', async (req, res) => {
  try {
    const { phoneNumber, code, phoneCodeHash } = req.body;
    
    if (!phoneNumber || !code || !phoneCodeHash) {
      return res.status(400).json({
        success: false,
        error: 'Thiếu thông tin đăng nhập',
        details: {
          phoneProvided: !!phoneNumber,
          codeProvided: !!code,
          hashProvided: !!phoneCodeHash
        }
      });
    }
    
    // Xử lý định dạng số điện thoại
    let formattedPhone = phoneNumber.trim();
    
    // Đảm bảo bắt đầu bằng dấu +
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone;
    }
    
    // Loại bỏ tất cả ký tự không phải số sau dấu +
    formattedPhone = '+' + formattedPhone.substring(1).replace(/\D/g, '');
    
    console.log(`Attempting to sign in with phone: ${formattedPhone} and code: ${code}`);
    
    try {
      const signInResult = await telegramClient.signIn(formattedPhone, phoneCodeHash, code);
      console.log('Sign in successful:', signInResult);
      
      // Tạo id phiên
      const sessionId = uuidv4();
      
      return res.json({
        success: true,
        user: {
          id: signInResult.user.id,
          name: `${signInResult.user.first_name} ${signInResult.user.last_name || ''}`.trim(),
          username: signInResult.user.username || null,
          phone: formattedPhone
        },
        sessionId
      });
    } catch (apiError) {
      console.error('Telegram API sign-in error:', apiError);
      
      // Xử lý các lỗi phổ biến từ Telegram API
      let errorMessage = 'Không thể đăng nhập vào Telegram';
      let errorDetails = { originalError: apiError.message };
      
      if (apiError.message.includes('PHONE_CODE_INVALID')) {
        errorMessage = 'Mã xác nhận không đúng. Vui lòng kiểm tra lại.';
      } else if (apiError.message.includes('PHONE_CODE_EXPIRED')) {
        errorMessage = 'Mã xác nhận đã hết hạn. Vui lòng yêu cầu mã mới.';
      } else if (apiError.message.includes('SESSION_PASSWORD_NEEDED')) {
        return res.json({
          success: false,
          error: 'PASSWORD_NEEDED',
          details: {
            message: 'Tài khoản của bạn được bảo vệ bằng mật khẩu hai lớp. Vui lòng nhập mật khẩu.'
          }
        });
      } else if (apiError.message.includes('FLOOD_WAIT')) {
        const waitTime = apiError.message.match(/FLOOD_WAIT_(\d+)/);
        const seconds = waitTime ? waitTime[1] : 'một khoảng thời gian';
        errorMessage = `Vui lòng đợi ${seconds} giây trước khi thử lại.`;
      }
      
      return res.status(400).json({
        success: false,
        error: errorMessage,
        details: errorDetails
      });
    }
    
  } catch (error) {
    console.error('Server error in sign-in:', error);
    return res.status(500).json({
      success: false,
      error: 'Lỗi máy chủ: ' + error.message
    });
  }
});

// API endpoint để kiểm tra cấu hình Telegram
app.get('/api/telegram/config', (req, res) => {
  const apiId = parseInt(process.env.TELEGRAM_API_ID || 0);
  const apiHash = process.env.TELEGRAM_API_HASH || '';
  const botToken = process.env.BOT_TOKEN || '';
  const chatId = process.env.TELEGRAM_CHAT_ID || '';
  
  res.json({
    useTelegramAPI: true,
    apiConfigured: !!(apiId && apiHash),
    botConfigured: !!botToken,
    chatConfigured: !!chatId
  });
});

// Khởi động server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 