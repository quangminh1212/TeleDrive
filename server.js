const express = require('express');
const cors = require('cors');
const path = require('path');
const { Telegraf } = require('telegraf');
require('dotenv').config();

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

// Khởi động server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 