const express = require('express');
const cors = require('cors');
const path = require('path');
const { Telegraf } = require('telegraf');
require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

// Import Telegram Client và Routes
const telegramClient = require('./telegramClient');
const { router, sessions, files } = require('./routes');
const telegramWebUploader = require('./telegramWebUploader');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Khởi tạo Telegram Client
let useMTProto = false;
if (process.env.TELEGRAM_API_ID && process.env.TELEGRAM_API_HASH) {
  console.log('[TelegramClient] Đang khởi tạo...');
  console.log(`[TelegramClient] API_ID: ${process.env.TELEGRAM_API_ID}, API_HASH: ${process.env.TELEGRAM_API_HASH.substring(0,5)}...`);
  useMTProto = true;
  
  // Kiểm tra trạng thái đăng nhập
  telegramClient.checkAuth()
    .then(result => {
      console.log('[TelegramClient] Kết quả kiểm tra đăng nhập:', JSON.stringify(result, null, 2));
      if (result.authorized) {
        console.log('[Telegram API] Đã đăng nhập vào Telegram API với tài khoản:', result.user.name);
      } else {
        console.log('[Telegram API] Chưa đăng nhập vào Telegram API. Sử dụng giao diện để đăng nhập.');
        if (result.error) {
          console.log('[Telegram API] Chi tiết lỗi:', result.error);
          
          // Nếu lỗi AUTH_KEY_UNREGISTERED, hiển thị hướng dẫn
          if (result.error.includes('AUTH_KEY_UNREGISTERED') && process.env.USE_WEB_CLIENT_UPLOAD === 'true') {
            console.log('[Telegram API] Bạn có thể truy cập http://localhost:' + PORT + '/telegram-api-login.html để đăng nhập');
            console.log('[Telegram API] Hoặc trích xuất auth key từ Telegram Web thông qua giao diện');
          }
        }
      }
    })
    .catch(error => {
      console.error('[Telegram API] Lỗi kiểm tra đăng nhập:', error);
      console.error('[Telegram API] Stack trace:', error.stack);
    });
} else {
  console.log('[TelegramClient] Không tìm thấy thông tin API_ID hoặc API_HASH. Vui lòng kiểm tra file .env');
  console.log('[TelegramClient] TELEGRAM_API_ID:', process.env.TELEGRAM_API_ID);
  console.log('[TelegramClient] TELEGRAM_API_HASH có giá trị:', !!process.env.TELEGRAM_API_HASH);
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
app.set('useMTProto', useMTProto);
app.set('telegramClient', telegramClient);
app.set('useWebUpload', useWebUpload);
app.set('bot', bot);

// Sử dụng router
app.use('/', router);

// Các trang HTML
app.get('/telegram-login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'telegram-login.html'));
});

app.get('/telegram-api-login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'telegram-api-login.html'));
});

app.get('/telegram-api-config', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'telegram-api-config.html'));
});

// Endpoint cập nhật thông tin API
app.post('/api/telegram/update-api-credentials', async (req, res) => {
  try {
    const { api_id, api_hash } = req.body;
    
    if (!api_id || !api_hash) {
      return res.status(400).json({ 
        success: false, 
        error: 'API ID và API Hash không được để trống' 
      });
    }
    
    // Đọc file .env hiện tại
    const envPath = path.join(__dirname, '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Cập nhật API ID và API Hash
    envContent = envContent.replace(/TELEGRAM_API_ID=.*$/m, `TELEGRAM_API_ID=${api_id}`);
    envContent = envContent.replace(/TELEGRAM_API_HASH=.*$/m, `TELEGRAM_API_HASH=${api_hash}`);
    
    // Ghi lại file .env
    fs.writeFileSync(envPath, envContent, 'utf8');
    
    console.log('Đã cập nhật thông tin API Telegram');
    
    // Thông báo cần khởi động lại ứng dụng
    return res.json({ 
      success: true, 
      message: 'Đã cập nhật thông tin API. Vui lòng khởi động lại ứng dụng để áp dụng thay đổi.' 
    });
  } catch (error) {
    console.error('Error updating API credentials:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Lỗi khi cập nhật thông tin API: ' + error.message 
    });
  }
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
    
    // Xử lý riêng cho số Việt Nam (+84): nếu có số 0 sau mã quốc gia, loại bỏ nó
    if (formattedPhone.startsWith('+840')) {
      console.log('Phát hiện số Việt Nam bắt đầu bằng 0, đang định dạng lại...');
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
        phone_code_hash: result.phone_code_hash,
        formatted_phone: result.phone // Trả về số điện thoại đã định dạng cho client
      });
    } catch (apiError) {
      console.error('Telegram API error:', apiError);
      
      // Xử lý các lỗi phổ biến từ Telegram API
      let errorMessage = 'Không thể gửi mã xác nhận';
      let errorDetails = { originalError: apiError.message };
      
      if (apiError.message.includes('PHONE_NUMBER_INVALID')) {
        errorMessage = 'Số điện thoại không hợp lệ. Vui lòng kiểm tra lại.';
        errorDetails.suggestion = 'Đảm bảo số điện thoại đúng định dạng: +84xxxxxxxxx cho Việt Nam (có thể nhập cả số 0 đầu).';
        errorDetails.formattedPhone = formattedPhone;
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

// API endpoint để trích xuất auth key từ Telegram Web
app.post('/api/telegram/extract-web-auth', async (req, res) => {
  try {
    if (process.env.USE_WEB_CLIENT_UPLOAD !== 'true') {
      return res.status(400).json({
        success: false,
        error: 'Tính năng upload qua web client không được bật. Vui lòng bật USE_WEB_CLIENT_UPLOAD trong file .env'
      });
    }
    
    console.log('[API] Đang thử trích xuất thông tin xác thực từ Telegram Web...');
    console.log('[API] Truy cập http://web.telegram.org/k/ trong trình duyệt của bạn và đăng nhập');
    console.log('[API] Sau đó quay lại đây để trích xuất thông tin xác thực');
    
    return res.json({
      success: false,
      message: 'Vui lòng truy cập http://web.telegram.org/k/ trong trình duyệt để đăng nhập Telegram Web trước.',
      needManualLogin: true,
      telegramWebUrl: 'http://web.telegram.org/k/'
    });
  } catch (error) {
    console.error('[API] Lỗi khi trích xuất thông tin xác thực:', error);
    return res.status(500).json({
      success: false,
      error: 'Lỗi khi trích xuất thông tin xác thực: ' + error.message
    });
  }
});

// API endpoint để mở Telegram Web trực tiếp
app.post('/api/telegram/open-web', async (req, res) => {
  try {
    if (process.env.USE_WEB_CLIENT_UPLOAD !== 'true') {
      return res.status(400).json({
        success: false,
        error: 'Tính năng upload qua web client không được bật. Vui lòng bật USE_WEB_CLIENT_UPLOAD trong file .env'
      });
    }
    
    console.log('[API] Yêu cầu mở Telegram Web trực tiếp...');
    console.log('[API] Người dùng cần truy cập http://web.telegram.org/k/ trong trình duyệt');
    
    return res.json({
      success: true,
      message: 'Vui lòng truy cập Telegram Web trong trình duyệt của bạn.',
      url: 'http://web.telegram.org/k/'
    });
  } catch (error) {
    console.error('[API] Lỗi khi xử lý yêu cầu mở Telegram Web:', error);
    return res.status(500).json({
      success: false,
      error: 'Lỗi khi xử lý yêu cầu mở Telegram Web: ' + error.message
    });
  }
});

// Khởi động server
app.listen(PORT, () => {
  console.log(`\n====================================`);
  console.log(`  TeleDrive đang chạy thành công!`);
  console.log(`  URL truy cập:`)
  console.log(`    - Trang chủ:    http://localhost:${PORT}/`);
  console.log(`    - Đăng nhập:    http://localhost:${PORT}/telegram-api-login.html`);
  console.log(`    - Cấu hình API: http://localhost:${PORT}/telegram-api-config.html`);
  console.log(`====================================\n`);
}); 