const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Telegraf } = require('telegraf');
const fetch = require('node-fetch');
require('dotenv').config();

// Import Telegram Client
const telegramClient = require('./telegramClient');

// Tạo thư mục uploads nếu chưa tồn tại
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Cấu hình storage cho multer
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

// Saved Sessions (simulated database)
const sessions = {};
const files = [];

// Routes
app.get('/api/auth/status', (req, res) => {
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
app.get('/api/telegram/status', async (req, res) => {
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
      useTelegramBot: !!bot
    });
  }
});

// API endpoint để gửi mã xác nhận
app.post('/api/telegram/send-code', async (req, res) => {
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
      return res.status(400).json({ error: result.error });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// API endpoint để đăng nhập với mã xác nhận
app.post('/api/telegram/sign-in', async (req, res) => {
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
      return res.status(400).json({ error: result.error });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Đăng nhập với Telegram (simulated)
app.post('/api/auth/telegram', (req, res) => {
  const { phoneNumber } = req.body;
  
  if (!phoneNumber) {
    return res.status(400).json({ error: 'Phone number is required' });
  }
  
  // Simulated authentication
  const sessionId = 'session_' + Date.now();
  const user = {
    id: Date.now(),
    phoneNumber,
    name: 'User ' + phoneNumber.substring(phoneNumber.length - 4),
    avatar: null
  };
  
  sessions[sessionId] = {
    user,
    telegramSession: {
      // Here would be the actual Telegram session data
      authenticated: true,
      created: new Date()
    }
  };
  
  res.json({
    sessionId,
    user
  });
});

// Upload file
app.post('/api/upload', upload.single('file'), async (req, res) => {
  const sessionId = req.headers.authorization;
  if (!sessionId || !sessions[sessionId]) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  try {
    const fileData = {
      id: Date.now(),
      name: req.file.originalname,
      size: req.file.size,
      path: req.file.path,
      mimeType: req.file.mimetype,
      uploaded: new Date(),
      userId: sessions[sessionId].user.id
    };
    
    // Nếu đã kết nối Telegram API và đã đăng nhập, tự động upload
    if (mtproto) {
      console.log(`[Telegram API] Đang tự động upload file: ${fileData.name}`);
      
      try {
        const uploadResult = await telegramClient.uploadFile(mtproto, fileData.path, `File: ${fileData.name}`);
        
        if (uploadResult.success) {
          console.log(`[Telegram API] Upload thành công: ${fileData.name}`);
          fileData.savedToTelegram = true;
        } else {
          console.error(`[Telegram API] Lỗi upload: ${uploadResult.error}`);
          fileData.savedToTelegram = false;
          fileData.uploadError = uploadResult.error;
        }
      } catch (error) {
        console.error('[Telegram API] Exception khi upload file:', error);
        fileData.savedToTelegram = false;
        fileData.uploadError = error.message;
      }
    }
    // If Telegram bot is configured, send file to Telegram
    else if (bot) {
      try {
        console.log(`[Telegram] Uploading file: ${fileData.name}`);
        
        // Thực hiện upload file lên Telegram
        const message = await bot.telegram.sendDocument(process.env.TELEGRAM_CHAT_ID, {
          source: fs.readFileSync(fileData.path),
          filename: fileData.name
        });
        
        fileData.telegramMessageId = message.message_id;
        fileData.savedToTelegram = true;
        console.log(`[Telegram] Upload completed. Message ID: ${message.message_id}`);
      } catch (error) {
        console.error('Error sending file to Telegram:', error);
        fileData.savedToTelegram = false;
        
        // Thêm hướng dẫn chi tiết về lỗi
        if (error.message && error.message.includes('Unauthorized')) {
          console.warn('[Telegram] Lỗi ủy quyền. Vui lòng kiểm tra lại BOT_TOKEN trong file .env');
          console.warn('[Telegram] Hướng dẫn nhận token: Mở Telegram, chat với @BotFather và làm theo hướng dẫn.');
        } else if (error.message && error.message.includes('chat not found')) {
          console.warn('[Telegram] Không tìm thấy chat. Vui lòng kiểm tra lại TELEGRAM_CHAT_ID trong file .env');
          console.warn('[Telegram] Đảm bảo bot đã được thêm vào chat/channel cần lưu trữ file.');
        } else {
          console.warn('[Telegram] Có lỗi xảy ra. File sẽ chỉ được lưu cục bộ.');
          console.warn('[Telegram] Thử khởi động lại ứng dụng sau khi cập nhật cấu hình .env');
        }
      }
    } else if (useWebUpload) {
      // Web client upload
      console.log(`[Telegram Web] File lưu cục bộ: ${fileData.path}`);
      console.log(`[Telegram Web] Người dùng sẽ tự đồng bộ lên Telegram bằng tài khoản web đã đăng nhập`);
      
      fileData.webClientUpload = true;
      fileData.savedToTelegram = false;
      
      // Tự động mở modal hướng dẫn upload lên Telegram
      fileData.showTelegramGuide = true;
    } else {
      console.log(`[Local] File lưu cục bộ: ${fileData.path} (Telegram không được cấu hình)`);
      fileData.savedToTelegram = false;
    }
    
    files.push(fileData);
    res.json({ success: true, file: fileData });
    
  } catch (error) {
    console.error('Error processing upload:', error);
    res.status(500).json({ error: 'Failed to process upload' });
  }
});

// Get user files
app.get('/api/files', (req, res) => {
  const sessionId = req.headers.authorization;
  if (!sessionId || !sessions[sessionId]) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const userId = sessions[sessionId].user.id;
  const userFiles = files.filter(file => file.userId === userId);
  
  res.json(userFiles);
});

// Delete file
app.delete('/api/files/:id', (req, res) => {
  const sessionId = req.headers.authorization;
  if (!sessionId || !sessions[sessionId]) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const fileId = parseInt(req.params.id);
  const fileIndex = files.findIndex(file => file.id === fileId);
  
  if (fileIndex === -1) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  const file = files[fileIndex];
  
  // Kiểm tra quyền xóa file
  if (file.userId !== sessions[sessionId].user.id) {
    return res.status(403).json({ error: 'Permission denied' });
  }
  
  // Xóa file trên disk
  try {
    fs.unlinkSync(file.path);
  } catch (error) {
    console.error('Error deleting file:', error);
    // Ignore errors (file might not exist)
  }
  
  // Xóa file từ Telegram nếu cần (Telegram không hỗ trợ xóa file)
  if (file.savedToTelegram) {
    console.log(`[Telegram] Warning: Cannot delete file ${file.name} from Telegram.`);
  }
  
  // Xóa file từ danh sách
  files.splice(fileIndex, 1);
  
  res.json({ success: true });
});

// Download file
app.get('/api/download/:id', (req, res) => {
  const sessionId = req.headers.authorization;
  if (!sessionId || !sessions[sessionId]) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const fileId = parseInt(req.params.id);
  const file = files.find(file => file.id === fileId);
  
  if (!file) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  // Kiểm tra quyền truy cập file
  if (file.userId !== sessions[sessionId].user.id) {
    return res.status(403).json({ error: 'Permission denied' });
  }
  
  // Phân tích file path
  const tempPath = path.join(uploadDir, `temp_${Date.now()}_${file.name}`);
  
  // Nếu file có trên Telegram, download từ Telegram
  if (file.savedToTelegram && bot) {
    // TODO: Implement Telegram file download
    res.download(file.path, file.name);
  } else {
    // File chỉ lưu cục bộ
    res.download(file.path, file.name);
  }
});

// Endpoint cho đăng nhập Telegram Web
app.get('/telegram-login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'telegram-login.html'));
});

// API endpoint để kiểm tra cấu hình Telegram
app.get('/api/telegram/config', (req, res) => {
  const uploadPath = path.join(__dirname, 'uploads');
  
  res.json({
    useTelegramBot: !!bot,
    useTelegramAPI: useMTProto,
    useWebClientUpload: useWebUpload,
    uploadPath: uploadPath.replace(/\\/g, '/')
  });
});

// Serve the React app for any other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Cleanup function for graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down server...');
  process.exit(0);
}); 