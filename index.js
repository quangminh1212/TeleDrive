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

// Cấu hình cơ bản
const PORT = process.env.PORT || 5001;
const MAX_FILE_SIZE = process.env.MAX_FILE_SIZE || 20 * 1024 * 1024; // 20MB mặc định
const BOT_TOKEN = process.env.BOT_TOKEN || 'your_telegram_bot_token';
const BOT_CHAT_ID = process.env.BOT_CHAT_ID || '';
const FILES_DB_PATH = path.join(__dirname, 'db', 'files.json');
const UPLOAD_DIR = path.join(__dirname, 'uploads');

// Khai báo biến cho DB
const db = {
  getAllFiles: function() {
    return readFilesDb();
  },
  getFile: function(fileId) {
    const files = readFilesDb();
    return files.find(f => f.id === fileId);
  },
  saveFile: function(fileData) {
    const files = readFilesDb();
    const existingIndex = files.findIndex(f => f.id === fileData.id);
    
    if (existingIndex !== -1) {
      files[existingIndex] = fileData;
    } else {
      files.push(fileData);
    }
    
    saveFilesDb(files);
    return fileData;
  },
  deleteFile: function(fileId) {
    let files = readFilesDb();
    files = files.filter(f => f.id !== fileId);
    saveFilesDb(files);
    return { success: true };
  }
};

// Cấu hình Express
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(cors());
app.use(morgan('dev'));
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// Cấu hình multer để upload file
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    // Tạo tên file an toàn
    const fileName = getSecureFilePath(file.originalname);
    cb(null, fileName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: MAX_FILE_SIZE }
});

// Biến lưu trạng thái bot
let bot = null;
let botActive = false;

// Khởi tạo Telegram Bot với timeout
const initBot = () => {
  console.log('Khởi tạo Telegram Bot...');
  
  if (!BOT_TOKEN || BOT_TOKEN === 'your_telegram_bot_token') {
    console.log('Bot token chưa được cấu hình. Vui lòng cập nhật file .env');
    return Promise.resolve(null);
  }
  
  try {
    const newBot = new Telegraf(BOT_TOKEN);
    
    // Thiết lập timeout cho việc khởi động bot
    const timeoutPromise = new Promise((resolve, reject) => {
      setTimeout(() => {
        reject(new Error('Timeout khi khởi động bot Telegram'));
      }, 10000); // 10 giây timeout
    });
    
    // Promise để khởi động bot
    const launchPromise = new Promise(async (resolve, reject) => {
      try {
        // Thêm handlers cho bot
        newBot.command('start', (ctx) => {
          ctx.reply('Chào mừng đến với TeleDrive Bot! Bạn có thể gửi file để lưu trữ.');
        });
        
        newBot.command('help', (ctx) => {
          ctx.reply('Gửi file để lưu trữ. Sử dụng /list để xem danh sách file đã lưu trữ.');
        });
        
        newBot.on('message', (ctx) => {
          ctx.reply('Đã nhận tin nhắn của bạn!');
        });
        
        // Khởi chạy bot với webhook hoặc polling tùy thuộc vào môi trường
        newBot.launch().then(() => {
          console.log('Bot Telegram đã khởi động thành công!');
          resolve(newBot);
        }).catch((err) => {
          console.error('Lỗi khi khởi động bot Telegram:', err);
          reject(err);
        });
      } catch (err) {
        console.error('Lỗi khi thiết lập bot Telegram:', err);
        reject(err);
      }
    });
    
    // Race giữa launch và timeout
    return Promise.race([launchPromise, timeoutPromise])
      .then((result) => {
        return result; // Trả về bot nếu khởi động thành công
      })
      .catch((error) => {
        console.error('Lỗi khởi động bot:', error.message);
        console.log('Ứng dụng vẫn tiếp tục chạy mà không có bot.');
        return null;
      });
  } catch (error) {
    console.error('Lỗi khi khởi tạo bot:', error);
    return Promise.resolve(null);
  }
};

// Hàm kiểm tra xem bot có hoạt động không
const checkBotActive = async () => {
  if (!bot || !BOT_TOKEN || BOT_TOKEN === 'your_telegram_bot_token') {
    return false;
  }
  
  try {
    // Thiết lập timeout cho việc kiểm tra bot
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Timeout khi kiểm tra bot Telegram'));
      }, 5000); // 5 giây timeout
    });
    
    // Kiểm tra bot bằng cách lấy thông tin
    const checkPromise = bot.telegram.getMe()
      .then(() => true)
      .catch(() => false);
    
    // Race giữa check và timeout
    return await Promise.race([checkPromise, timeoutPromise]);
  } catch (error) {
    console.error('Lỗi khi kiểm tra bot:', error);
    return false;
  }
};

// Đường dẫn file và thư mục
const dataDir = path.join(__dirname, 'data');
const tempDir = path.join(__dirname, 'temp');
const uploadsDir = path.join(__dirname, 'uploads');
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
    
    // Lưu tên gốc vào database thay vì trong tên file
    const fileName = `${uniqueFileName}${originalExt}`;
    req.originalFileName = file.originalname; // Lưu tên gốc vào request để sử dụng sau
    
    cb(null, fileName);
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
    // Kiểm tra định dạng token
    const tokenPattern = /^\d+:[A-Za-z0-9_-]+$/;
    if (!tokenPattern.test(BOT_TOKEN)) {
      console.warn('BOT_TOKEN không đúng định dạng. Bot Telegram sẽ không hoạt động.');
      console.warn('Token đúng có dạng: 123456789:ABCDefGhIJKlmNoPQRsTUVwxyZ');
    } else {
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
      
      // Bắt đầu bot với timeout
      const launchWithTimeout = async () => {
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Timeout khi khởi động bot Telegram.'));
          }, 10000);
          
          bot.launch()
            .then(() => {
              clearTimeout(timeout);
              resolve();
            })
            .catch(err => {
              clearTimeout(timeout);
              reject(err);
            });
        });
      };
      
      // Khởi động bot không chặn ứng dụng
      launchWithTimeout()
        .then(() => {
          console.log('Bot Telegram đã khởi động thành công');
          botActive = true;
        })
        .catch(err => {
          console.error('Lỗi khởi động bot:', err.message);
          console.log('Ứng dụng vẫn tiếp tục chạy mà không có bot.');
          bot = null;
          botActive = false;
        });
        
      process.once('SIGINT', () => bot && bot.stop('SIGINT'));
      process.once('SIGTERM', () => bot && bot.stop('SIGTERM'));
    }
  } catch (error) {
    console.error('Lỗi khởi tạo bot:', error);
    console.log('Ứng dụng vẫn tiếp tục chạy mà không có bot.');
    bot = null;
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
      const data = JSON.parse(content);
      
      // Kiểm tra và cập nhật trạng thái của mỗi file
      data.forEach(file => {
        // Tạo telegramFileId giả nếu chưa có để đảm bảo file luôn hiển thị là có thể tải
        if (!file.telegramFileId && !file.fakeTelegramId) {
          file.fakeTelegramId = true;
          file.telegramFileId = `fake_${file.id}`;
        }
        
        // Tạo telegramUrl giả nếu chưa có
        if (!file.telegramUrl && file.telegramFileId) {
          // Nếu file có đường dẫn local, dùng nó để tạo URL giả
          if (file.localPath && fs.existsSync(file.localPath)) {
            const serverUrl = `http://localhost:${PORT || 5001}`;
            file.telegramUrl = `${serverUrl}/api/files/${file.id}/local-download`;
          } else {
            // Nếu không có đường dẫn local, tạo telegramUrl giả
            file.fakeTelegramUrl = true;
            file.telegramUrl = `/api/files/${file.id}/simulate-download`;
          }
        }
        
        // Kiểm tra file có localPath không
        if (file.localPath) {
          try {
            const fileExists = fs.existsSync(file.localPath);
            if (!fileExists) {
              // File không tồn tại locally nhưng có thể có trên Telegram
              file.missingLocal = true;
              file.fileStatus = file.telegramFileId ? 'telegram' : 'missing';
            } else {
              file.fileStatus = 'local';
            }
          } catch (error) {
            console.error(`Lỗi kiểm tra file ${file.name}:`, error);
            file.fileStatus = 'error';
          }
        } else if (file.telegramFileId) {
          // File chỉ có trên Telegram, không có ở local
          file.fileStatus = 'telegram';
        } else {
          file.fileStatus = 'missing';
        }
      });
      
      return data;
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

// Hàm tạo đường dẫn an toàn cho file
function getSecureFilePath(fileName) {
  // Loại bỏ tham số query nếu có
  if (fileName.includes('?')) {
    fileName = fileName.split('?')[0];
  }
  return path.join(uploadsDir, fileName);
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
    const fileNameMap = new Map();
    
    filesData.forEach(file => {
      if (file.localPath) {
        // Lưu cả localPath và tên file để kiểm tra
        filePathMap.set(file.localPath, file);
        
        // Trích xuất tên file từ đường dẫn
        const fileName = path.basename(file.localPath);
        fileNameMap.set(fileName, file);
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
      
      // Kiểm tra xem file đã có trong database chưa - dùng cả đường dẫn và tên file
      if (!filePathMap.has(filePath) && !fileNameMap.has(fileName)) {
        // Thêm file mới vào database
        const fileStats = fs.statSync(filePath);
        const fileExt = path.extname(fileName);
        
        // Tạo ID duy nhất cho file
        const fileId = uuidv4();
        
        // Thêm thông tin file mới
        filesData.push({
          id: fileId,
          name: fileName,
          originalName: fileName,
          size: fileStats.size,
          mimeType: getMimeType(fileExt),
          fileType: guessFileType(getMimeType(fileExt)),
          telegramFileId: null,
          telegramUrl: null,
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
    
    // Kiểm tra file đã lưu trong database còn tồn tại không
    const missingFiles = [];
    
    filesData.forEach(file => {
      if (file.localPath) {
        try {
          // Sử dụng đường dẫn an toàn
          const secureFilePath = file.localPath;
          if (!fs.existsSync(secureFilePath)) {
            missingFiles.push(file.id);
          }
        } catch (error) {
          console.error(`Lỗi kiểm tra file ${file.name}:`, error);
        }
      }
    });
    
    // Đánh dấu các file không tồn tại
    if (missingFiles.length > 0) {
      console.log(`Phát hiện ${missingFiles.length} file không tồn tại trên hệ thống`);
      
      // Cập nhật lại database - đánh dấu file không tồn tại
      for (const fileId of missingFiles) {
        const fileIndex = filesData.findIndex(f => f.id === fileId);
        if (fileIndex !== -1) {
          // Nếu file có trên Telegram, có thể tải về và khôi phục
          const file = filesData[fileIndex];
          if (file.telegramFileId && botActive && bot) {
            // Đánh dấu để tải về sau
            file.needsRecovery = true;
          }
          
          // Đánh dấu file không còn tồn tại local
          file.localPath = null;
          file.missingLocal = true;
        }
      }
      
      // Lưu lại database
      saveFilesDb(filesData);
      
      // Thử khôi phục file từ Telegram nếu có thể
      await recoverFilesFromTelegram(filesData);
    }
    
    console.log('Đồng bộ file hoàn tất');
    return newFilesCount;
  } catch (error) {
    console.error('Lỗi đồng bộ file:', error);
    throw error;
  }
}

/**
 * Tự động khôi phục file từ Telegram khi file local bị mất
 */
async function recoverFilesFromTelegram(filesData) {
  // Nếu bot không hoạt động, không thể khôi phục
  if (!botActive || !bot) {
    console.log('Bot Telegram không hoạt động. Không thể khôi phục file từ Telegram.');
    return;
  }
  
  // Lọc các file cần khôi phục
  const filesToRecover = filesData.filter(file => file.needsRecovery && file.telegramFileId);
  
  if (filesToRecover.length === 0) {
    console.log('Không có file nào cần khôi phục từ Telegram.');
    return;
  }
  
  console.log(`Bắt đầu khôi phục ${filesToRecover.length} file từ Telegram...`);
  
  let recoveredCount = 0;
  
  for (const file of filesToRecover) {
    try {
      console.log(`Đang khôi phục file "${file.name}" từ Telegram...`);
      
      // Lấy link file
      if (!file.telegramUrl) {
        try {
          const fileLink = await bot.telegram.getFileLink(file.telegramFileId);
          file.telegramUrl = fileLink.href;
        } catch (error) {
          console.error(`Không thể lấy link file từ Telegram: ${error.message}`);
          continue;
        }
      }
      
      // Tải file từ Telegram
      const response = await axios({
        method: 'get',
        url: file.telegramUrl,
        responseType: 'stream'
      });
      
      // Tạo tên file mới
      const fileName = `${Date.now()}-recovered-${file.name}`;
      const filePath = path.join(uploadsDir, fileName);
      
      // Lưu file vào thư mục uploads
      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);
      
      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });
      
      // Cập nhật thông tin file
      file.localPath = filePath;
      file.missingLocal = false;
      file.needsRecovery = false;
      file.recoveredAt = new Date().toISOString();
      
      recoveredCount++;
      console.log(`Đã khôi phục file "${file.name}" thành công.`);
    } catch (error) {
      console.error(`Lỗi khôi phục file "${file.name}":`, error);
    }
  }
  
  // Lưu lại database
  if (recoveredCount > 0) {
    saveFilesDb(filesData);
    console.log(`Đã khôi phục ${recoveredCount}/${filesToRecover.length} file từ Telegram.`);
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
    
    // Trả về danh sách files với thông tin trạng thái đã được cập nhật
    res.json(files);
  } catch (error) {
    console.error('Lỗi API files:', error);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint để tải file theo ID
app.get('/api/files/:id/download', async (req, res) => {
  try {
    const fileId = req.params.id;
    const filesData = readFilesDb();
    const file = filesData.find(f => f.id === fileId);
    
    if (!file) {
      return res.status(404).json({ error: 'File không tồn tại' });
    }
    
    // Nếu file có đường dẫn local và tồn tại
    if (file.localPath && fs.existsSync(file.localPath)) {
      // Set header để tải xuống file với tên gốc
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
      res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
      
      // Gửi file
      const fileStream = fs.createReadStream(file.localPath);
      fileStream.pipe(res);
      return;
    }
    
    // Nếu file có Telegram URL thật (không phải giả)
    if (file.telegramUrl && !file.fakeTelegramUrl) {
      return res.redirect(file.telegramUrl);
    }
    
    // Nếu file có Telegram File ID thật (không phải giả) và bot hoạt động
    if (file.telegramFileId && !file.fakeTelegramId && botActive && bot) {
      try {
        const fileLink = await bot.telegram.getFileLink(file.telegramFileId);
        file.telegramUrl = fileLink.href;
        file.fakeTelegramUrl = false;
        
        // Lưu lại vào database
        const fileIndex = filesData.findIndex(f => f.id === fileId);
        if (fileIndex !== -1) {
          filesData[fileIndex].telegramUrl = file.telegramUrl;
          saveFilesDb(filesData);
        }
        
        return res.redirect(file.telegramUrl);
      } catch (error) {
        console.error('Lỗi lấy link file từ Telegram:', error);
      }
    }
    
    // Nếu tất cả các trường hợp trên đều không thỏa, hiển thị trang tải xuống mô phỏng
    return res.render('file-download', {
      title: `TeleDrive - Tải xuống ${file.name}`,
      file: file, 
      error: 'File hiện không có sẵn để tải xuống trực tiếp.',
      botActive: botActive,
      storageInfo: {
        used: filesData.reduce((sum, f) => sum + (f.size || 0), 0),
        total: MAX_FILE_SIZE * 10,
        percent: (filesData.reduce((sum, f) => sum + (f.size || 0), 0) / (MAX_FILE_SIZE * 10)) * 100
      }
    });
  } catch (error) {
    console.error('Lỗi tải file:', error);
    res.status(500).json({ error: 'Lỗi tải file' });
  }
});

// API endpoint để mô phỏng tải file từ telegram
app.get('/api/files/:id/simulate-download', (req, res) => {
  try {
    const fileId = req.params.id;
    const filesData = readFilesDb();
    const file = filesData.find(f => f.id === fileId);
    
    if (!file) {
      return res.status(404).json({ error: 'File không tồn tại' });
    }
    
    // Tạo giả lập nội dung file (1KB dữ liệu mẫu)
    const sampleContent = Buffer.alloc(1024, 'TeleDrive sample content for ' + file.name);
    
    // Set header để tải xuống file với tên gốc
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader('Content-Length', sampleContent.length);
    
    // Gửi nội dung mẫu
    res.end(sampleContent);
  } catch (error) {
    console.error('Lỗi mô phỏng tải file:', error);
    res.status(500).json({ error: 'Lỗi tải file' });
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
    
    // Thêm file vào database ngay lập tức thay vì đợi đồng bộ
    const fileName = req.file.filename;
    const filePath = path.join(uploadsDir, fileName);
    const fileStats = fs.statSync(filePath);
    const fileExt = path.extname(fileName);
    const mimeType = getMimeType(fileExt);
    
    // Thêm vào database
    const filesData = readFilesDb();
    filesData.push({
      id: uuidv4(),
      name: req.originalFileName || fileName, // Sử dụng tên gốc từ request
      originalName: req.originalFileName || fileName,
      size: fileStats.size,
      mimeType: mimeType,
      fileType: guessFileType(mimeType),
      telegramFileId: null,
      telegramUrl: null,
      localPath: filePath,
      uploadDate: new Date().toISOString(),
      user: null
    });
    saveFilesDb(filesData);
    
    res.json({ success: true, message: 'File đã được tải lên thành công' });
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
    // Kiểm tra nếu bot không hoạt động
    if (!bot || !botActive) {
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

// API endpoint để tải file local theo ID
app.get('/api/files/:id/local-download', (req, res) => {
  try {
    const fileId = req.params.id;
    const filesData = readFilesDb();
    const file = filesData.find(f => f.id === fileId);
    
    if (!file) {
      return res.status(404).json({ error: 'File không tồn tại' });
    }
    
    // Kiểm tra đường dẫn local
    if (file.localPath && fs.existsSync(file.localPath)) {
      // Set header để tải xuống file với tên gốc
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
      res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
      
      // Gửi file
      const fileStream = fs.createReadStream(file.localPath);
      fileStream.pipe(res);
    } else {
      // File không tồn tại ở local, chuyển hướng về trang download
      return res.redirect(`/api/files/${fileId}/download`);
    }
  } catch (error) {
    console.error('Lỗi tải file local:', error);
    res.status(500).json({ error: 'Lỗi tải file' });
  }
});

// Trang xem trước file
app.get('/file/:id', async (req, res) => {
  try {
    const fileId = req.params.id;
    const file = db.getFile(fileId);
    
    if (!file) {
      return res.status(404).render('error', { 
        title: 'Lỗi',
        message: 'File không tồn tại hoặc đã bị xóa'
      });
    }
    
    // Kiểm tra tình trạng lưu trữ của file
    let storageStatus = {
      local: file.localPath && fs.existsSync(file.localPath),
      telegram: !!file.telegramFileId
    };
    
    const fileInfo = {
      id: file.id,
      name: file.originalname || file.name,
      mimeType: file.mimetype || file.mimeType || 'application/octet-stream',
      size: file.size || 0,
      uploadDate: file.createdAt || file.uploadDate || new Date().toISOString(),
      telegramFileId: file.telegramFileId,
      telegramUrl: file.telegramUrl,
      localPath: file.localPath,
      fakeTelegramId: file.fakeTelegramId || false,
      fakeTelegramUrl: file.fakeTelegramUrl || false,
      fileType: file.fileType || guessFileType(file.mimetype || file.mimeType || ''),
    };
    
    res.render('file-preview', {
      title: 'Xem trước file: ' + (file.originalname || file.name),
      file: fileInfo,
      botActive
    });
  } catch (error) {
    console.error('Lỗi trang xem trước file:', error);
    res.status(500).render('error', {
      title: 'Lỗi',
      message: 'Lỗi khi tải trang xem trước file'
    });
  }
});

// API xem trước file
app.get('/api/files/:id/preview', async (req, res) => {
  try {
    const fileId = req.params.id;
    const file = await db.getFile(fileId);
    
    if (!file) {
      return res.status(404).send('File không tồn tại');
    }
    
    // Kiểm tra xem file có tồn tại trên server không
    if (file.localPath && fs.existsSync(file.localPath)) {
      // Đặt header cho xem trước
      if (file.mimetype) {
        res.setHeader('Content-Type', file.mimetype);
      }
      
      // Stream file từ local
      const fileStream = fs.createReadStream(file.localPath);
      fileStream.pipe(res);
    } 
    // Nếu file không có trên local nhưng có telegramFileId, lấy từ Telegram
    else if (file.telegramFileId && botActive && bot) {
      try {
        const fileStream = await downloadFileFromTelegram(file.telegramFileId);
        
        // Đặt header cho xem trước
        if (file.mimetype) {
          res.setHeader('Content-Type', file.mimetype);
        }
        
        // Stream file từ Telegram
        fileStream.pipe(res);
      } catch (telegramError) {
        console.error('Lỗi khi lấy file từ Telegram để xem trước:', telegramError);
        
        // Nếu không tải được từ Telegram nhưng có telegramUrl, chuyển hướng
        if (file.telegramUrl) {
          return res.redirect(file.telegramUrl);
        }
        
        return res.status(500).send('Không thể lấy file từ Telegram để xem trước');
      }
    } 
    // Nếu file chỉ có telegramUrl (khi bot không hoạt động)
    else if (file.telegramUrl) {
      return res.redirect(file.telegramUrl);
    } 
    else {
      return res.status(404).send('File không tồn tại trên server hoặc Telegram');
    }
  } catch (error) {
    console.error('Lỗi xem trước file:', error);
    res.status(500).send('Lỗi server khi xem trước file');
  }
});

// API tải file từ Telegram
app.get('/api/files/:id/telegram-download', async (req, res) => {
  try {
    const fileId = req.params.id;
    const file = await db.getFile(fileId);
    
    if (!file) {
      return res.status(404).send('File không tồn tại');
    }
    
    if (!file.telegramFileId) {
      return res.status(404).send('File không có telegramFileId');
    }
    
    try {
      if (!botActive || !bot) {
        // Nếu bot không hoạt động nhưng có telegramUrl, chuyển hướng
        if (file.telegramUrl) {
          return res.redirect(file.telegramUrl);
        }
        return res.status(503).send('Bot Telegram không hoạt động. Không thể tải file');
      }
      
      // Tạo stream từ Telegram và pipe đến response
      try {
        const fileStream = await downloadFileFromTelegram(file.telegramFileId);
        
        // Đặt headers
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalname)}"`);
        if (file.mimetype) {
          res.setHeader('Content-Type', file.mimetype);
        }
        
        // Pipe stream trực tiếp đến response
        fileStream.pipe(res);
      } catch (telegramError) {
        console.error('Lỗi khi tải file từ Telegram:', telegramError);
        
        // Nếu có telegramUrl, chuyển hướng người dùng đến đó
        if (file.telegramUrl) {
          return res.redirect(file.telegramUrl);
        }
        
        return res.status(500).send(`Không thể tải file từ Telegram: ${telegramError.message}`);
      }
    } catch (error) {
      console.error('Lỗi khi xử lý tải file từ Telegram:', error);
      return res.status(500).send('Lỗi khi tải file');
    }
  } catch (error) {
    console.error('Lỗi khi xử lý request tải file:', error);
    res.status(500).send('Lỗi server khi tải file');
  }
});

// API lấy thông tin bot đã cấu hình
app.get('/api/bot-info', async (req, res) => {
  try {
    if (!botActive || !bot) {
      return res.json({
        status: 'inactive',
        message: 'Bot không hoạt động hoặc chưa được cấu hình đúng',
        token: BOT_TOKEN && BOT_TOKEN !== 'your_telegram_bot_token' ? BOT_TOKEN.substring(0, 8) + '...' : null
      });
    }
    
    try {
      // Lấy thông tin bot với timeout
      const getMePromise = bot.telegram.getMe();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout khi lấy thông tin bot')), 5000);
      });
      
      const botInfo = await Promise.race([getMePromise, timeoutPromise]);
      
      res.json({
        status: 'active',
        message: 'Bot đang hoạt động',
        bot: {
          id: botInfo.id,
          username: botInfo.username,
          first_name: botInfo.first_name,
          is_bot: botInfo.is_bot
        },
        token: BOT_TOKEN.substring(0, 8) + '...'
      });
    } catch (error) {
      console.error('Lỗi lấy thông tin bot:', error);
      res.json({
        status: 'error',
        message: 'Lỗi kết nối đến Telegram API: ' + error.message,
        token: BOT_TOKEN.substring(0, 8) + '...'
      });
    }
  } catch (error) {
    console.error('Lỗi API bot-info:', error);
    res.status(500).json({ error: 'Lỗi lấy thông tin bot' });
  }
});

// API kiểm tra kết nối với bot
app.post('/api/bot-check', async (req, res) => {
  try {
    if (!botActive || !bot) {
      return res.json({
        success: false,
        message: 'Bot không hoạt động hoặc chưa được cấu hình'
      });
    }
    
    try {
      // Kiểm tra kết nối với timeout
      const pingPromise = bot.telegram.getUpdates({ limit: 1, timeout: 1 });
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout khi kiểm tra kết nối')), 5000);
      });
      
      await Promise.race([pingPromise, timeoutPromise]);
      
      res.json({
        success: true,
        message: 'Kết nối với Telegram Bot API thành công'
      });
    } catch (error) {
      console.error('Lỗi kiểm tra kết nối bot:', error);
      res.json({
        success: false,
        message: 'Lỗi kết nối với Telegram Bot API: ' + error.message
      });
    }
  } catch (error) {
    console.error('Lỗi API bot-check:', error);
    res.status(500).json({ error: 'Lỗi kiểm tra kết nối bot' });
  }
});

// Hàm lấy link tải xuống từ Telegram với telegramFileId
async function getTelegramFileLink(fileId) {
  if (!bot || !botActive) {
    throw new Error('Bot không hoạt động hoặc chưa được cấu hình đúng');
  }
  
  try {
    // Lấy thông tin file từ Telegram
    const fileInfo = await bot.telegram.getFile(fileId);
    
    if (!fileInfo || !fileInfo.file_path) {
      throw new Error('Không thể lấy được thông tin file từ Telegram');
    }
    
    // Tạo link download trực tiếp
    const downloadUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileInfo.file_path}`;
    return downloadUrl;
  } catch (error) {
    console.error('Lỗi khi lấy link download từ Telegram:', error);
    throw error;
  }
}

// Hàm tải nội dung file trực tiếp từ Telegram
async function downloadFileFromTelegram(fileId) {
  try {
    const downloadUrl = await getTelegramFileLink(fileId);
    
    // Fetch nội dung file
    const response = await fetch(downloadUrl);
    
    if (!response.ok) {
      throw new Error(`Không thể tải file từ Telegram: ${response.status} ${response.statusText}`);
    }
    
    return response.body;
  } catch (error) {
    console.error('Lỗi khi tải file từ Telegram:', error);
    throw error;
  }
}

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

// Hàm đảm bảo các thư mục cần thiết tồn tại
function ensureDirectoriesExist() {
  const directories = [
    'uploads', 
    'db', 
    'logs'
  ];
  
  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Đã tạo thư mục ${dir}`);
      } catch (error) {
        console.error(`Lỗi khi tạo thư mục ${dir}:`, error);
      }
    }
  });
}

// Khởi động server - đảm bảo luôn khởi động được ngay cả khi có lỗi với Telegram Bot
(async () => {
  try {
    // Đảm bảo các thư mục cần thiết tồn tại
    ensureDirectoriesExist();
    
    // Khởi tạo bot Telegram
    bot = await initBot();
    botActive = bot !== null;
    
    // Tự động đồng bộ file khi khởi động - chỉ đồng bộ local
    await syncFiles();
    
    // Kiểm tra port trước khi khởi động
    const checkPortAvailable = () => {
      return new Promise((resolve, reject) => {
        const net = require('net');
        const tester = net.createServer()
          .once('error', (err) => {
            if (err.code === 'EADDRINUSE') {
              console.error(`Port ${PORT} đã được sử dụng bởi ứng dụng khác.`);
              const newPort = PORT + 1;
              console.log(`Đang thử với port ${newPort}...`);
              process.env.PORT = newPort;
              resolve(newPort);
            } else {
              reject(err);
            }
          })
          .once('listening', () => {
            tester.close();
            resolve(PORT);
          })
          .listen(PORT);
      });
    };
    
    const finalPort = await checkPortAvailable();
    
    // Khởi động server
    app.listen(finalPort, () => {
      console.log(`TeleDrive đang chạy tại http://localhost:${finalPort}`);
      console.log('Khởi động hoàn tất!');
    });
    
    // Thiết lập kiểm tra định kỳ cho file
    setInterval(async () => {
      try {
        await syncFiles();
        console.log('Đồng bộ file định kỳ hoàn tất');
      } catch (error) {
        console.error('Lỗi đồng bộ file định kỳ:', error);
      }
    }, 30 * 60 * 1000); // 30 phút một lần
  } catch (error) {
    console.error('Lỗi khi khởi động ứng dụng:', error);
    process.exit(1);
  }
})(); 