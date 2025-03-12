const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const telegramClient = require('./telegramClient');

// Tạo router
const router = express.Router();

// Cấu hình multer cho upload file
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // Giới hạn file 50MB
});

// Lưu trữ phiên đăng nhập (memory storage - cho mục đích demo)
const sessions = {};
const files = [];

// =====================
// Các route xử lý API
// =====================

// Kiểm tra trạng thái đăng nhập
router.get('/api/auth/status', (req, res) => {
  const sessionId = req.headers.authorization;
  if (sessionId && sessions[sessionId]) {
    return res.json({
      authenticated: true,
      user: sessions[sessionId].user
    });
  }
  res.json({ authenticated: false });
});

// API endpoint để kiểm tra trạng thái kết nối Telegram
router.get('/api/telegram/status', async (req, res) => {
  const mtproto = req.app.get('mtproto');
  
  const sessionId = req.headers.authorization;
  if (!sessionId || !sessions[sessionId]) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  if (mtproto) {
    try {
      const authStatus = await telegramClient.checkAuth(mtproto);
      return res.json({
        useTelegramAPI: true,
        loggedIn: authStatus.success,
        user: authStatus.success ? authStatus.user : null
      });
    } catch (error) {
      return res.json({
        useTelegramAPI: true,
        loggedIn: false,
        error: error.message
      });
    }
  } else {
    return res.json({
      useTelegramAPI: false,
      useTelegramBot: !!req.app.get('bot')
    });
  }
});

// API endpoint để gửi mã xác nhận
router.post('/api/telegram/send-code', async (req, res) => {
  const mtproto = req.app.get('mtproto');
  const { phoneNumber } = req.body;
  
  if (!phoneNumber) {
    return res.status(400).json({ error: 'Số điện thoại là bắt buộc' });
  }
  
  if (!mtproto) {
    return res.status(400).json({ error: 'Telegram API chưa được khởi tạo' });
  }
  
  try {
    const result = await telegramClient.sendCode(mtproto, phoneNumber);
    
    if (result.success) {
      return res.json({
        success: true,
        phone_code_hash: result.phone_code_hash,
        phone: phoneNumber
      });
    } else {
      return res.status(400).json({ error: result.error, details: result.details });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// API endpoint để đăng nhập với mã xác nhận
router.post('/api/telegram/sign-in', async (req, res) => {
  const mtproto = req.app.get('mtproto');
  const { phoneNumber, code, phoneCodeHash } = req.body;
  
  if (!phoneNumber || !code || !phoneCodeHash) {
    return res.status(400).json({ error: 'Thiếu thông tin đăng nhập' });
  }
  
  if (!mtproto) {
    return res.status(400).json({ error: 'Telegram API chưa được khởi tạo' });
  }
  
  try {
    const result = await telegramClient.signIn(mtproto, {
      phone: phoneNumber,
      code,
      phone_code_hash: phoneCodeHash
    });
    
    if (result.success) {
      // Tạo phiên mới
      const sessionId = 'telegram_' + Date.now();
      sessions[sessionId] = {
        user: {
          id: result.user.id,
          phoneNumber,
          name: result.user.first_name + (result.user.last_name ? ' ' + result.user.last_name : ''),
          avatar: null
        },
        telegramSession: {
          authenticated: true,
          created: new Date()
        }
      };
      
      return res.json({
        success: true,
        sessionId,
        user: sessions[sessionId].user
      });
    } else if (result.error === 'PASSWORD_NEEDED') {
      return res.json({
        success: false,
        error: 'PASSWORD_NEEDED',
        message: 'Tài khoản này được bảo vệ bằng mật khẩu hai lớp. Vui lòng nhập mật khẩu.'
      });
    } else {
      return res.status(400).json({ error: result.error, details: result.details });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Upload file
router.post('/api/upload', upload.single('file'), async (req, res) => {
  const mtproto = req.app.get('mtproto');
  const bot = req.app.get('bot');
  
  const sessionId = req.headers.authorization;
  if (!sessionId || !sessions[sessionId]) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  // Lưu thông tin file
  const fileInfo = {
    id: Date.now().toString(),
    name: req.file.originalname,
    size: req.file.size,
    type: req.file.mimetype,
    path: req.file.path,
    uploadDate: new Date(),
    userId: sessions[sessionId].user.id
  };
  
  files.push(fileInfo);
  
  // Upload file lên Telegram nếu có API hoặc Bot
  let telegramUpload = null;
  
  if (mtproto) {
    // Thử upload bằng API
    try {
      const caption = `File: ${fileInfo.name}`;
      telegramUpload = await telegramClient.uploadFile(mtproto, req.file.path, caption);
      
      if (telegramUpload.success) {
        fileInfo.telegramMessageId = telegramUpload.result.updates[0].id;
      }
    } catch (error) {
      console.error('Lỗi upload qua Telegram API:', error);
    }
  } else if (bot && process.env.TELEGRAM_CHAT_ID) {
    // Upload bằng Bot nếu có
    try {
      const chatId = process.env.TELEGRAM_CHAT_ID;
      const caption = `File: ${fileInfo.name}`;
      
      // Code upload qua Bot
      console.log(`Đang upload file ${fileInfo.name} lên chat ${chatId} qua Bot`);
      
      if (fileInfo.type.startsWith('image/')) {
        // Upload ảnh
        await bot.telegram.sendPhoto(chatId, { source: req.file.path }, { caption });
        console.log('Đã upload ảnh thành công qua Bot');
        fileInfo.telegramUploaded = true;
      } else {
        // Upload document (file khác)
        await bot.telegram.sendDocument(chatId, { source: req.file.path }, { caption });
        console.log('Đã upload file thành công qua Bot');
        fileInfo.telegramUploaded = true;
      }
    } catch (error) {
      console.error('Lỗi upload qua Telegram Bot:', error);
    }
  }
  
  // Trả về thông tin cho người dùng
  res.json({
    success: true,
    file: fileInfo,
    telegramUploaded: telegramUpload ? telegramUpload.success : false
  });
});

// Files list
router.get('/api/files', (req, res) => {
  const sessionId = req.headers.authorization;
  if (!sessionId || !sessions[sessionId]) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const userFiles = files.filter(file => file.userId === sessions[sessionId].user.id);
  res.json(userFiles);
});

// Cung cấp các route và biến cho module khác
module.exports = {
  router,
  sessions,
  files
}; 