/**
 * TeleDrive - Ứng dụng quản lý file với Telegram Bot
 * File chính kết hợp tất cả chức năng: web server, bot Telegram, đồng bộ file và dọn dẹp
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const dotenv = require('dotenv');
const { Telegraf } = require('telegraf');
const axios = require('axios');
const { spawn } = require('child_process');
const os = require('os');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');

// Đọc cấu hình từ file .env
dotenv.config();

// Biến môi trường
const PORT = process.env.PORT || 5000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '2000', 10) * 1024 * 1024; // Convert MB to bytes
const DATA_DIR = process.env.DATA_DIR || 'data';
const TEMP_DIR = process.env.TEMP_DIR || 'temp';
const UPLOADS_DIR = 'uploads';

// Đường dẫn file và thư mục
const dataDir = path.join(__dirname, DATA_DIR);
const tempDir = path.join(__dirname, TEMP_DIR);
const uploadsDir = path.join(__dirname, UPLOADS_DIR);
const filesDbPath = path.join(dataDir, 'files.json');
const logsDir = path.join(__dirname, 'logs');

// Đảm bảo các thư mục cần thiết tồn tại
ensureDirectories([dataDir, tempDir, uploadsDir, logsDir]);

// Kiểm tra xem file .env có tồn tại không
checkEnvFile();

// Khởi tạo Express
const app = express();

// Cấu hình Multer để xử lý tải file
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueFileName = `${Date.now()}-${uuidv4()}`;
    const originalExt = path.extname(file.originalname);
    const originalName = encodeURIComponent(file.originalname);
    
    cb(null, `${uniqueFileName}${originalExt}?originalName=${originalName}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: MAX_FILE_SIZE }
});

// Cấu hình EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(morgan('dev'));
app.use(helmet({
  contentSecurityPolicy: false // Tắt CSP để tránh lỗi với các resource inline
}));
app.use(cors());

// Khởi tạo bot Telegram nếu có
let bot = null;
let botActive = false;

if (BOT_TOKEN && BOT_TOKEN !== 'your_telegram_bot_token') {
  console.log('Khởi tạo Telegram Bot...');
  try {
    bot = new Telegraf(BOT_TOKEN);
    
    bot.command('start', (ctx) => {
      ctx.reply('Chào mừng đến với TeleDrive! Gửi file và tôi sẽ lưu trữ cho bạn.');
    });
    
    bot.on('document', async (ctx) => {
      try {
        console.log('Nhận file document từ user:', ctx.from.username || ctx.from.id);
        ctx.reply('Đã nhận file của bạn! Đang xử lý...');
        
        // Lưu thông tin vào database
        const filesData = readFilesDb();
        
        // Thêm thông tin file mới
        filesData.push({
          id: uuidv4(),
          name: ctx.message.document.file_name || 'file',
          size: ctx.message.document.file_size || 0,
          mimeType: ctx.message.document.mime_type || 'application/octet-stream',
          uploadDate: new Date().toISOString(),
          user: {
            id: ctx.from.id,
            username: ctx.from.username || null
          }
        });
        
        // Lưu lại vào database
        saveFilesDb(filesData);
        
        ctx.reply('File đã được lưu trữ thành công!');
      } catch (error) {
        console.error('Lỗi xử lý document:', error);
        ctx.reply(`Có lỗi xảy ra: ${error.message}`);
      }
    });
    
    // Bắt đầu bot
    bot.launch()
      .then(() => {
        console.log('Bot Telegram đã khởi động');
        botActive = true;
      })
      .catch(err => {
        console.error('Lỗi khởi động bot:', err);
        botActive = false;
      });
      
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
    
  } catch (error) {
    console.error('Lỗi khởi tạo bot:', error);
    botActive = false;
  }
} else {
  console.log('BOT_TOKEN không hợp lệ. Tính năng Bot không được kích hoạt.');
  botActive = false;
}

/**
 * Đọc dữ liệu file từ database
 * @returns {Array} Danh sách file
 */
function readFilesDb() {
  try {
    if (fs.existsSync(filesDbPath)) {
      const content = fs.readFileSync(filesDbPath, 'utf8');
      return JSON.parse(content);
    }
    // Tạo file mới nếu chưa tồn tại
    fs.writeFileSync(filesDbPath, JSON.stringify([], null, 2), 'utf8');
    return [];
  } catch (error) {
    console.error('Lỗi đọc database:', error);
    return [];
  }
}

/**
 * Lưu dữ liệu file vào database
 * @param {Array} filesData - Dữ liệu file cần lưu
 * @returns {Boolean} Kết quả lưu
 */
function saveFilesDb(filesData) {
  try {
    fs.writeFileSync(filesDbPath, JSON.stringify(filesData, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Lỗi lưu database:', error);
    return false;
  }
}

/**
 * Đoán loại file dựa vào MIME type
 * @param {String} mimeType - MIME type của file
 * @returns {String} Loại file: image, video, audio, document
 */
function guessFileType(mimeType) {
  if (!mimeType) return 'document';
  
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  
  return 'document';
}

/**
 * Lấy MIME type từ phần mở rộng của file
 * @param {String} extension - Phần mở rộng file (ví dụ: .jpg)
 * @returns {String} MIME type
 */
function getMimeType(extension) {
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.mkv': 'video/x-matroska',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed',
    '.7z': 'application/x-7z-compressed',
    '.txt': 'text/plain',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json'
  };
  
  return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
}

/**
 * Chức năng đồng bộ file - Quét thư mục uploads và cập nhật database
 */
async function syncFiles() {
  try {
    console.log('Bắt đầu đồng bộ file...');
    
    // Đọc database hiện tại
    const filesData = readFilesDb();
    
    // Tạo map từ localPath để kiểm tra nhanh
    const filePathMap = new Map();
    filesData.forEach(file => {
      if (file.localPath) {
        filePathMap.set(file.localPath, file);
      }
    });
    
    // Đọc danh sách file trong thư mục uploads
    const files = fs.readdirSync(uploadsDir);
    let newFilesCount = 0;
    
    // Kiểm tra từng file trong thư mục uploads
    for (const fileName of files) {
      const filePath = path.join(uploadsDir, fileName);
      
      // Bỏ qua nếu là thư mục hoặc file .gitkeep
      if (fs.statSync(filePath).isDirectory() || fileName === '.gitkeep') {
        continue;
      }
      
      // Kiểm tra xem file đã có trong database chưa
      if (!filePathMap.has(filePath)) {
        // Thêm file mới vào database
        const fileStats = fs.statSync(filePath);
        const fileExt = path.extname(fileName);
        let originalName = fileName;
        
        // Trích xuất tên gốc nếu có
        const originalNameMatch = fileName.match(/\?originalName=(.+)$/);
        if (originalNameMatch) {
          originalName = decodeURIComponent(originalNameMatch[1]);
        }
        
        // Tạo ID duy nhất cho file
        const fileId = uuidv4();
        
        // Thêm thông tin file mới
        filesData.push({
          id: fileId,
          name: originalName,
          size: fileStats.size,
          mimeType: getMimeType(fileExt),
          fileType: guessFileType(getMimeType(fileExt)),
          localPath: filePath,
          uploadDate: new Date(fileStats.mtime).toISOString(),
          user: null
        });
        
        newFilesCount++;
      }
    }
    
    // Lưu lại database nếu có thay đổi
    if (newFilesCount > 0) {
      saveFilesDb(filesData);
      console.log(`Đã thêm ${newFilesCount} file mới vào database`);
    } else {
      console.log('Không có file mới cần thêm');
    }
    
    console.log('Đồng bộ file hoàn tất');
    return newFilesCount;
  } catch (error) {
    console.error('Lỗi đồng bộ file:', error);
    throw error;
  }
}

/**
 * Chức năng dọn dẹp - Gửi file lên Telegram và xóa khỏi local
 */
async function cleanUploads() {
  if (!bot) {
    console.error('Bot Telegram không khởi động. Không thể dọn dẹp uploads.');
    return;
  }
  
  try {
    console.log('Bắt đầu dọn dẹp thư mục uploads...');
    
    // Đọc database
    const filesData = readFilesDb();
    
    // Lọc các file chỉ lưu ở local
    const localOnlyFiles = filesData.filter(file => file.localPath && !file.telegramFileId);
    
    if (localOnlyFiles.length === 0) {
      console.log('Không có file cần xử lý');
      return;
    }
    
    console.log(`Tìm thấy ${localOnlyFiles.length} file cần gửi lên Telegram`);
    
    // ID chat để gửi file
    let chatId;
    
    try {
      // Lấy ID chat của bot với timeout
      const getMePromise = bot.telegram.getMe();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout khi lấy thông tin bot')), 5000);
      });
      
      const botInfo = await Promise.race([getMePromise, timeoutPromise]);
      chatId = botInfo.id;
    } catch (error) {
      console.error('Không thể lấy thông tin bot:', error);
      return;
    }
    
    // Xử lý từng file
    for (const file of localOnlyFiles) {
      try {
        if (!fs.existsSync(file.localPath)) {
          console.warn(`File không tồn tại: ${file.localPath}`);
          continue;
        }
        
        console.log(`Đang gửi file "${file.name}" lên Telegram...`);
        
        // Gửi file lên Telegram với timeout
        let message;
        const sendFilePromise = (() => {
          if (file.fileType === 'image') {
            return bot.telegram.sendPhoto(chatId, { source: file.localPath });
          } else if (file.fileType === 'video') {
            return bot.telegram.sendVideo(chatId, { source: file.localPath });
          } else if (file.fileType === 'audio') {
            return bot.telegram.sendAudio(chatId, { source: file.localPath });
          } else {
            return bot.telegram.sendDocument(chatId, { source: file.localPath });
          }
        })();
        
        const sendTimeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout khi gửi file lên Telegram')), 30000);
        });
        
        // Sử dụng Promise.race để đặt timeout
        message = await Promise.race([sendFilePromise, sendTimeoutPromise]);
        
        // Lấy ID file tùy thuộc vào loại file
        if (file.fileType === 'image') {
          file.telegramFileId = message.photo[message.photo.length - 1].file_id;
        } else if (file.fileType === 'video') {
          file.telegramFileId = message.video.file_id;
        } else if (file.fileType === 'audio') {
          file.telegramFileId = message.audio.file_id;
        } else {
          file.telegramFileId = message.document.file_id;
        }
        
        // Lấy link file với timeout
        const getLinkPromise = bot.telegram.getFileLink(file.telegramFileId);
        const getLinkTimeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout khi lấy link file')), 5000);
        });
        
        const fileLink = await Promise.race([getLinkPromise, getLinkTimeoutPromise]);
        file.telegramUrl = fileLink.href;
        
        // Xóa file local
        fs.unlinkSync(file.localPath);
        console.log(`Đã xóa file local: ${file.localPath}`);
        
        // Cập nhật thông tin file
        file.localPath = null;
        
        // Lưu lại database sau mỗi file
        saveFilesDb(filesData);
        
        console.log(`Đã xử lý file "${file.name}" thành công`);
      } catch (error) {
        console.error(`Lỗi xử lý file "${file.name}":`, error);
      }
    }
    
    console.log('Quá trình dọn dẹp đã hoàn tất');
  } catch (error) {
    console.error('Lỗi dọn dẹp uploads:', error);
  }
}

/**
 * Routes
 */

// Trang chủ
app.get('/', (req, res) => {
  try {
    const files = readFilesDb();
    const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);
    
    res.render('index', {
      title: 'TeleDrive',
      files: files,
      totalSize: totalSize,
      maxSize: MAX_FILE_SIZE,
      error: null,
      storageInfo: {
        used: totalSize,
        total: MAX_FILE_SIZE * 10, // Giả sử tổng dung lượng là 10 lần max file size
        percent: (totalSize / (MAX_FILE_SIZE * 10)) * 100
      }
    });
  } catch (error) {
    console.error('Lỗi trang chủ:', error);
    res.status(500).render('index', { 
      title: 'TeleDrive - Lỗi',
      files: [],
      totalSize: 0,
      maxSize: MAX_FILE_SIZE,
      error: error.message,
      storageInfo: {
        used: 0,
        total: MAX_FILE_SIZE * 10,
        percent: 0
      }
    });
  }
});

// API endpoint để lấy thông tin files
app.get('/api/files', (req, res) => {
  try {
    const files = readFilesDb();
    res.json(files);
  } catch (error) {
    console.error('Lỗi API files:', error);
    res.status(500).json({ error: error.message });
  }
});

// API status
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'TeleDrive API đang hoạt động', 
    botActive: botActive,
    version: '1.0.0'
  });
});

// API xóa file
app.delete('/api/files/:id', (req, res) => {
  try {
    const fileId = req.params.id;
    let filesData = readFilesDb();
    const fileIndex = filesData.findIndex(f => f.id === fileId);
    
    if (fileIndex === -1) {
      return res.status(404).json({ error: 'File không tồn tại' });
    }
    
    const file = filesData[fileIndex];
    
    // Xóa file local nếu có
    if (file.localPath && fs.existsSync(file.localPath)) {
      try {
        fs.unlinkSync(file.localPath);
      } catch (error) {
        console.error(`Lỗi xóa file local: ${file.localPath}`, error);
      }
    }
    
    // Xóa thông tin file khỏi database
    filesData.splice(fileIndex, 1);
    saveFilesDb(filesData);
    
    res.json({ success: true, message: 'File đã được xóa thành công' });
  } catch (error) {
    console.error('Lỗi khi xóa file:', error);
    res.status(500).json({ error: error.message });
  }
});

// Route upload file qua web
app.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Không có file nào được tải lên' });
    }
    
    // Đồng bộ file mới vào database
    syncFiles()
      .then(() => {
        res.json({ success: true, message: 'File đã được tải lên thành công' });
      })
      .catch(error => {
        console.error('Lỗi đồng bộ sau khi upload:', error);
        res.status(500).json({ error: 'Lỗi xử lý file sau khi upload' });
      });
  } catch (error) {
    console.error('Lỗi upload file:', error);
    res.status(500).json({ error: 'Lỗi xử lý file' });
  }
});

// API đồng bộ file
app.post('/api/sync', async (req, res) => {
  try {
    const newFilesCount = await syncFiles();
    res.json({ success: true, newFiles: newFilesCount });
  } catch (error) {
    console.error('Lỗi đồng bộ file:', error);
    res.status(500).json({ error: 'Lỗi đồng bộ file' });
  }
});

// API dọn dẹp uploads
app.post('/api/clean', async (req, res) => {
  try {
    if (!bot) {
      return res.status(400).json({ error: 'Bot Telegram không hoạt động. Không thể dọn dẹp uploads.' });
    }
    
    // Gọi hàm dọn dẹp không đồng bộ
    cleanUploads()
      .then(() => {
        console.log('Đã hoàn tất quá trình dọn dẹp');
      })
      .catch(error => {
        console.error('Lỗi trong quá trình dọn dẹp:', error);
      });
    
    // Trả về ngay để không chặn request
    res.json({ success: true, message: 'Đã bắt đầu quá trình dọn dẹp' });
  } catch (error) {
    console.error('Lỗi dọn dẹp uploads:', error);
    res.status(500).json({ error: 'Lỗi dọn dẹp uploads' });
  }
});

/**
 * Hàm hỗ trợ
 */

// Đảm bảo các thư mục tồn tại
function ensureDirectories(directories) {
  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Đã tạo thư mục: ${dir}`);
    }
  });
}

// Kiểm tra file .env
function checkEnvFile() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    console.error('Không tìm thấy file .env!');
    console.log('Vui lòng tạo file .env từ .env.example và cấu hình BOT_TOKEN.');
    process.exit(1);
  }
}

// Dọn dẹp thư mục temp định kỳ
function cleanupTempDir() {
  try {
    if (!fs.existsSync(tempDir)) return;
    
    const files = fs.readdirSync(tempDir);
    
    for (const file of files) {
      if (file === '.gitkeep') continue;
      
      const filePath = path.join(tempDir, file);
      const stats = fs.statSync(filePath);
      
      // Xóa file cũ hơn 1 ngày
      const fileAge = Date.now() - stats.mtime.getTime();
      if (fileAge > 24 * 60 * 60 * 1000) {
        fs.unlinkSync(filePath);
        console.log(`Đã xóa file tạm cũ: ${filePath}`);
      }
    }
  } catch (error) {
    console.error('Lỗi dọn dẹp thư mục temp:', error);
  }
}

// Chạy clean temp mỗi 12 giờ
setInterval(cleanupTempDir, 12 * 60 * 60 * 1000);

// Xử lý các routes không tồn tại
app.use('*', (req, res) => {
  res.status(404).render('index', { 
    title: 'TeleDrive - Không tìm thấy',
    files: [],
    totalSize: 0,
    maxSize: MAX_FILE_SIZE,
    error: 'Không tìm thấy trang này',
    storageInfo: {
      used: 0,
      total: MAX_FILE_SIZE * 10,
      percent: 0
    }
  });
});

// Xử lý lỗi
app.use((err, req, res, next) => {
  console.error('Lỗi server:', err);
  res.status(500).render('index', { 
    title: 'TeleDrive - Lỗi server',
    files: [],
    totalSize: 0,
    maxSize: MAX_FILE_SIZE,
    error: err.message || 'Đã xảy ra lỗi không xác định',
    storageInfo: {
      used: 0,
      total: MAX_FILE_SIZE * 10,
      percent: 0
    }
  });
});

// Khởi động server - đảm bảo luôn khởi động được ngay cả khi có lỗi với Telegram Bot
(async () => {
  try {
    // Tự động đồng bộ file khi khởi động
    await syncFiles();
    
    // Khởi động server
    app.listen(PORT, () => {
      console.log(`TeleDrive đang chạy tại http://localhost:${PORT}`);
      console.log('Khởi động hoàn tất!');
    });
  } catch (error) {
    console.error('Lỗi khi khởi động ứng dụng:', error);
    process.exit(1);
  }
})(); 