/**
 * TeleDrive - Ứng dụng quản lý file với Telegram Bot
 * File chính kết hợp tất cả chức năng: web server, bot Telegram, đồng bộ file và dọn dẹp
 */

// Import các module cần thiết
const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const session = require('express-session');
const bodyParser = require('body-parser');

// Import các module tự tạo
const config = require('./src/config/config');
const fileController = require('./src/controllers/fileController');
const folderController = require('./src/controllers/folderController');
const authController = require('./src/controllers/authController');
const telegramService = require('./src/services/telegramService');
const fileService = require('./src/services/fileService');
const apiRoutes = require('./src/routes/apiRoutes');
const webRoutes = require('./src/routes/webRoutes');
const { formatBytes, formatDate } = require('./src/utils/formatters');
const { ensureDirectories, getMimeType, guessFileType } = require('./src/utils/helpers');

// Load biến môi trường
dotenv.config();

// Đường dẫn lưu trữ và biến toàn cục
const { 
  PORT = 5002, 
  BOT_TOKEN, 
  CHAT_ID, 
  AUTO_SYNC = 'true',
  SESSION_SECRET = 'teledrive-session-secret',
  MAX_FILE_SIZE = 50 * 1024 * 1024,
  STORAGE_PATH = process.cwd()
} = process.env;

// Đường dẫn file và thư mục
const DB_PATH = path.join(STORAGE_PATH, 'db', 'files_db.json');
const UPLOADS_DIR = path.join(STORAGE_PATH, 'uploads');
const TEMP_DIR = path.join(STORAGE_PATH, 'temp');
const DATA_DIR = 'data';

// Đảm bảo các thư mục tồn tại
ensureDirectories([UPLOADS_DIR, TEMP_DIR, path.join(STORAGE_PATH, DATA_DIR), path.join(STORAGE_PATH, 'db')]);

// Tạo application Express
const app = express();

// Cấu hình multer để upload file
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = req.query.folder 
      ? path.join(UPLOADS_DIR, req.query.folder) 
      : UPLOADS_DIR;
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    // Đảm bảo tên file an toàn, tránh lỗi đường dẫn
    const originalName = file.originalname;
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueName = Date.now() + '-' + sanitizedName;
    
    // Lưu tên gốc vào request để sử dụng sau này
    req.originalFileName = originalName;
    
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: parseInt(MAX_FILE_SIZE) } 
});

// Thiết lập view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(morgan('dev'));
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(cors());

// Thiết lập session
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 giờ
}));

// Biến global cho bot
let bot = null;
let botActive = false;
let needRestartBot = false;

// Middleware tự động check xác thực nếu cần
app.use((req, res, next) => {
  // Skip authentication for public routes
  if (req.path === '/login' || req.path.startsWith('/api/auth') || req.path.startsWith('/public')) {
    return next();
  }
  
  // Skip authentication for API routes if they have valid API key
  if (req.path.startsWith('/api/') && req.headers['x-api-key']) {
    // TODO: Implement API key validation
    return next();
  }
  
  // Redirect to login if not authenticated
  if (!req.session || !req.session.authenticated) {
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    } else {
      return res.redirect('/login');
    }
  }
  
  next();
});

// Router API và Web
app.use('/api', apiRoutes);
app.use('/', webRoutes);

// Route upload file API
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'Không có file nào được tải lên'
      });
    }
    
    const originalName = req.originalFileName || file.originalname;
    const relativePath = req.query.folder || '';
    const fullRelativePath = path.join(relativePath, file.filename);
    
    // Extract file info
    const fileInfo = {
      id: 'file_' + Date.now() + '_' + Math.round(Math.random() * 1000000),
      name: originalName,
      originalName: originalName,
      filename: file.filename,
      localPath: file.path,
      relativePath: relativePath,
      size: file.size,
      mimeType: file.mimetype || getMimeType(path.extname(originalName)),
      fileType: guessFileType(file.mimetype || getMimeType(path.extname(originalName))),
      uploadDate: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      needsSync: AUTO_SYNC === 'true',
      fileStatus: 'local',
      shareToken: null,
      shareExpiry: null,
      telegramFileId: null,
      telegramUrl: null,
      isDeleted: false
    };
    
    // Lưu thông tin file vào database
    const filesData = fileService.readFilesDb();
    filesData.push(fileInfo);
    fileService.saveFilesDb(filesData);
    
    // Thử đồng bộ file lên Telegram nếu auto sync được bật
    if (AUTO_SYNC === 'true') {
      // Auto sync sẽ được xử lý bởi service
      fileInfo.syncScheduled = true;
    }
    
    return res.json({
      success: true,
      file: fileInfo
    });
  } catch (error) {
    console.error('Lỗi khi tải file lên:', error);
    return res.status(500).json({
      success: false,
      error: 'Lỗi server: ' + (error.message || 'Không xác định')
    });
  }
});

// Khởi động chương trình
(async function startApplication() {
  // Thử khởi tạo bot Telegram với tối đa 3 lần
  let botInitAttempts = 0;
  const maxBotInitAttempts = 3;
  
  while (botInitAttempts < maxBotInitAttempts) {
    try {
      botInitAttempts++;
      console.log(`Thử khởi tạo bot lần ${botInitAttempts}...`);
      
      if (!BOT_TOKEN || !CHAT_ID) {
        console.log('Chưa cấu hình BOT_TOKEN hoặc CHAT_ID. Bot không được khởi tạo.');
        break;
      }
      
      const result = await telegramService.startBot();
      bot = result.bot;
      botActive = result.botActive;
      
      if (botActive) {
        console.log('Bot Telegram đã được khởi tạo thành công! 🎉');
        break;
      } else {
        console.log('Không thể khởi tạo bot.');
        
        if (botInitAttempts < maxBotInitAttempts) {
          console.log(`Thử lại sau ${botInitAttempts * 2} giây...`);
          await new Promise(resolve => setTimeout(resolve, botInitAttempts * 2000));
        }
      }
    } catch (error) {
      console.error('Lỗi khi khởi tạo bot:', error);
      
      if (botInitAttempts < maxBotInitAttempts) {
        console.log(`Thử lại sau ${botInitAttempts * 2} giây...`);
        await new Promise(resolve => setTimeout(resolve, botInitAttempts * 2000));
      }
    }
  }
  
  // Khởi động server
  const server = app.listen(PORT, () => {
    console.log(`Server đang chạy trên cổng ${PORT}`);
    console.log(`Truy cập: http://localhost:${PORT}`);
  });
  
  // Xử lý tín hiệu để tắt server an toàn
  process.on('SIGTERM', shutDown);
  process.on('SIGINT', shutDown);
  
  function shutDown() {
    console.log('Đang tắt server...');
    server.close(() => {
      console.log('Server đã đóng kết nối.');
      process.exit(0);
    });
    
    // Nếu server không đóng trong 5s thì buộc tắt
    setTimeout(() => {
      console.error('Không thể đóng kết nối server, buộc tắt!');
      process.exit(1);
    }, 5000);
  }
  
  // Bắt đầu đồng bộ file và dọn dẹp
  if (AUTO_SYNC === 'true') {
    setTimeout(async () => {
      try {
        await fileService.syncFiles();
      } catch (error) {
        console.error('Lỗi khi đồng bộ files lần đầu:', error);
      }
    }, 5000);
  }
})();

// Middleware xử lý lỗi
app.use((err, req, res, next) => {
  console.error('Lỗi server:', err);
  res.status(500).json({
    success: false,
    error: 'Lỗi server: ' + (err.message || 'Không xác định')
  });
});

// Middleware xử lý route không tồn tại - phải đặt sau tất cả các routes
app.use((req, res) => {
  console.log(`Route không tồn tại: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    error: 'API endpoint không tồn tại'
  });
});
