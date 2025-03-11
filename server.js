const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Telegraf } = require('telegraf');
require('dotenv').config();

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

// Kiểm tra xem BOT_TOKEN đã được cấu hình chưa
let bot;
if (process.env.BOT_TOKEN) {
  bot = new Telegraf(process.env.BOT_TOKEN);
  console.log('Telegram bot initialized');
} else {
  console.warn('BOT_TOKEN not found in environment variables. Telegram functionality will be limited.');
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
    success: true,
    sessionId,
    user
  });
});

// Lấy danh sách files
app.get('/api/files', (req, res) => {
  const sessionId = req.headers.authorization;
  if (!sessionId || !sessions[sessionId]) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  res.json({ files });
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
    
    // If Telegram bot is configured, send file to Telegram
    if (bot) {
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
      }
    }
    
    files.push(fileData);
    res.json({ success: true, file: fileData });
    
  } catch (error) {
    console.error('Error processing upload:', error);
    res.status(500).json({ error: 'Failed to process upload' });
  }
});

// Download file
app.get('/api/files/:fileId', async (req, res) => {
  const sessionId = req.headers.authorization;
  if (!sessionId || !sessions[sessionId]) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const fileId = parseInt(req.params.fileId);
  const file = files.find(f => f.id === fileId);
  
  if (!file) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  // Nếu file được lưu trên Telegram và có message ID
  if (file.savedToTelegram && file.telegramMessageId && bot) {
    try {
      console.log(`[Telegram] Downloading file: ${file.name}`);
      
      // Tạo đường dẫn tạm thời cho file
      const tempPath = path.join(uploadDir, `temp_${Date.now()}_${file.name}`);
      
      // Tải file từ Telegram
      const fileStream = await bot.telegram.getFileLink(
        await bot.telegram.getFile(
          (await bot.telegram.getMessages(process.env.TELEGRAM_CHAT_ID, [file.telegramMessageId]))[0].document.file_id
        )
      );
      
      // Lưu file vào đường dẫn tạm thời
      const response = await fetch(fileStream.href);
      const buffer = await response.buffer();
      fs.writeFileSync(tempPath, buffer);
      
      // Gửi file cho người dùng
      res.download(tempPath, file.name, (err) => {
        if (err) {
          console.error('Error sending downloaded file:', err);
        }
        // Xóa file tạm sau khi gửi
        try {
          fs.unlinkSync(tempPath);
        } catch (e) {
          console.error('Error deleting temp file:', e);
        }
      });
      
      console.log(`[Telegram] Download completed for: ${file.name}`);
    } catch (error) {
      console.error('Error downloading file from Telegram:', error);
      
      // Nếu không thể tải từ Telegram, thử với file cục bộ
      if (fs.existsSync(file.path)) {
        res.download(file.path, file.name);
      } else {
        res.status(500).json({ error: 'Failed to download file' });
      }
    }
  } else {
    // Nếu không có trên Telegram, gửi file cục bộ
    res.download(file.path, file.name);
  }
});

// Serve the React app for any other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 