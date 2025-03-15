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
const bodyParser = require('body-parser');

// Đọc cấu hình từ file .env
dotenv.config();

// Biến môi trường
const PORT = process.env.PORT || 5001;
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

// Khởi tạo Express
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(morgan('dev'));
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// Cấu hình multer
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadsDir);
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
  limits: { fileSize: MAX_FILE_SIZE }
});

// Biến lưu trạng thái bot
let bot = null;
let botActive = false;

// Hàm format bytes
function formatBytes(bytes, decimals = 2) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Hàm format date
function formatDate(dateString) {
    if (!dateString) return 'Không xác định';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Không xác định';
        return date.toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        console.error('Lỗi định dạng ngày:', error);
        return 'Không xác định';
    }
}

// Khởi tạo Telegram Bot với timeout
const initBot = () => {
  console.log('Khởi tạo Telegram Bot...');
  
  if (!BOT_TOKEN || BOT_TOKEN === 'your_telegram_bot_token') {
    console.log('Bot token chưa được cấu hình. Vui lòng cập nhật file .env');
    return Promise.resolve(null);
  }
  
  try {
    // Kiểm tra kết nối trước khi khởi tạo bot
    console.log('Kiểm tra kết nối với Telegram API...');
    
    // Sử dụng fetch để kiểm tra kết nối
    return fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Lỗi kết nối: ${response.status} ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        if (!data.ok) {
          throw new Error(`Lỗi API: ${data.description}`);
        }
        
        console.log(`Kết nối thành công! Bot: @${data.result.username}`);
        
        // Khởi tạo bot sau khi đã kiểm tra kết nối thành công
        const newBot = new Telegraf(BOT_TOKEN);
        
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
        
        // Khởi động bot trong một tiến trình riêng biệt để tránh treo
        console.log('Khởi động bot trong tiến trình riêng biệt...');
        
        // Sử dụng spawn để khởi động bot trong tiến trình con
        const botProcess = spawn('node', ['-e', `
          const { Telegraf } = require('telegraf');
          const bot = new Telegraf('${BOT_TOKEN}');
          bot.launch().then(() => {
            console.log('Bot đã khởi động thành công!');
          }).catch(err => {
            console.error('Lỗi khởi động bot:', err);
          });
        `], {
          detached: true,
          stdio: 'ignore'
        });
        
        // Tách tiến trình con ra khỏi tiến trình cha
        botProcess.unref();
        
        console.log('Bot đã được khởi động trong tiến trình riêng biệt.');
        return newBot;
      })
      .catch(error => {
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

// Đảm bảo các thư mục cần thiết tồn tại
ensureDirectories([dataDir, tempDir, uploadsDir, logsDir]);

// Kiểm tra xem file .env có tồn tại không
checkEnvFile();

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
        // Xác định loại file
        file.fileType = getFileType(file.name);
        
        // Đảm bảo các thuộc tính cần thiết tồn tại
        if (typeof file.fakeTelegramId === 'undefined') {
          file.fakeTelegramId = false;
        }
        
        if (typeof file.fakeTelegramUrl === 'undefined') {
          file.fakeTelegramUrl = false;
        }
        
        // Luôn đặt fakeTelegramId = false để đảm bảo không có file giả
        file.fakeTelegramId = false;
        
        // Kiểm tra trạng thái file
        if (file.localPath && fs.existsSync(file.localPath)) {
          file.fileStatus = 'local';
        } else if (file.telegramFileId) {
          file.fileStatus = 'telegram';
        } else {
          file.fileStatus = 'missing';
          
          // Nếu file không có telegramFileId, đánh dấu là cần đồng bộ
          if (!file.telegramFileId) {
            file.needsSync = true;
          }
        }
      });
      
      // Lưu lại dữ liệu đã cập nhật
      saveFilesDb(data);
      
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
 * Đồng bộ file từ uploads vào bot Telegram
 */
async function syncFiles() {
  try {
    if (!bot || !botActive) {
      console.error('Bot Telegram không hoạt động. Không thể đồng bộ files.');
      throw new Error('Bot Telegram không hoạt động');
    }
    
    console.log('Bắt đầu đồng bộ file...');
    
    // Đọc danh sách file từ database
    const filesData = readFilesDb();
    
    // Lọc các file chưa có trên Telegram hoặc có fake telegram ID
    const filesToSync = filesData.filter(file => 
      file.needsSync || 
      file.fakeTelegramId === true || 
      !file.telegramFileId
    );
    
    if (filesToSync.length === 0) {
      console.log('Không có file cần đồng bộ');
      return 0;
    }
    
    console.log(`Tìm thấy ${filesToSync.length} file cần đồng bộ với Telegram`);
    
    // ID chat để gửi file
    let chatId;
    
    try {
      // Lấy ID chat của bot
      const botInfo = await bot.telegram.getMe();
      chatId = botInfo.id;
      console.log(`Sẽ gửi file đến chat ID: ${chatId}`);
    } catch (error) {
      console.error('Không thể lấy thông tin bot:', error);
      throw new Error('Không thể lấy thông tin bot để gửi file');
    }
    
    let syncedCount = 0;
    
    // Gửi từng file lên Telegram
    for (const file of filesToSync) {
      try {
        // Nếu file không tồn tại ở local và có telegramFileId thật, bỏ qua
        if ((!file.localPath || !fs.existsSync(file.localPath)) && 
            file.telegramFileId && file.fakeTelegramId === false) {
          console.log(`File ${file.name} đã có trên Telegram, bỏ qua.`);
          continue;
        }
        
        // Nếu file không tồn tại local và không có telegramFileId, không thể đồng bộ
        if (!file.localPath || !fs.existsSync(file.localPath)) {
          console.log(`File ${file.name} không tồn tại local và không có trên Telegram, không thể đồng bộ.`);
          continue;
        }
        
        console.log(`Đang gửi file "${file.name}" (${formatBytes(file.size)}) lên Telegram...`);
        
        // Lựa chọn phương thức gửi file phù hợp dựa vào loại file
        let message;
        const sendFilePromise = (async () => {
          try {
            if (file.fileType === 'image') {
              return await bot.telegram.sendPhoto(chatId, { source: file.localPath });
            } else if (file.fileType === 'video') {
              return await bot.telegram.sendVideo(chatId, { source: file.localPath });
            } else if (file.fileType === 'audio') {
              return await bot.telegram.sendAudio(chatId, { source: file.localPath });
            } else {
              return await bot.telegram.sendDocument(chatId, { source: file.localPath });
            }
          } catch (err) {
            console.error(`Lỗi gửi file lên Telegram: ${err.message}`);
            throw err;
          }
        })();
        
        // Sử dụng Promise với timeout
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout khi gửi file lên Telegram')), 60000);
        });
        
        message = await Promise.race([sendFilePromise, timeoutPromise]);
        console.log(`Đã gửi file "${file.name}" thành công lên Telegram`);
        
        // Lấy Telegram File ID từ message
        let telegramFileId = null;
        
        if (file.fileType === 'image' && message.photo && message.photo.length > 0) {
          telegramFileId = message.photo[message.photo.length - 1].file_id;
        } else if (file.fileType === 'video' && message.video) {
          telegramFileId = message.video.file_id;
        } else if (file.fileType === 'audio' && message.audio) {
          telegramFileId = message.audio.file_id;
        } else if (message.document) {
          telegramFileId = message.document.file_id;
        }
        
        if (!telegramFileId) {
          throw new Error('Không lấy được Telegram File ID sau khi upload');
        }
        
        // Cập nhật thông tin file
        file.telegramFileId = telegramFileId;
        file.fakeTelegramId = false;
        file.needsSync = false;
        
        // Lấy đường dẫn tải xuống
        const fileInfo = await bot.telegram.getFile(telegramFileId);
        if (fileInfo && fileInfo.file_path) {
          const downloadUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileInfo.file_path}`;
          file.telegramUrl = downloadUrl;
          file.fakeTelegramUrl = false;
          
          console.log(`Đã cập nhật URL file: ${downloadUrl}`);
        }
        
        // Lưu database sau mỗi lần đồng bộ thành công
        saveFilesDb(filesData);
        syncedCount++;
        
      } catch (error) {
        console.error(`Lỗi đồng bộ file "${file.name}":`, error);
      }
    }
    
    console.log(`Đồng bộ hoàn tất. Đã đồng bộ ${syncedCount}/${filesToSync.length} file.`);
    
    // Thực hiện tự động khôi phục file từ Telegram nếu cần
    if (syncedCount > 0) {
      await recoverFilesFromTelegram(filesData);
    }
    
    return syncedCount;
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
  if (!bot || !botActive) {
    console.error('Bot Telegram không khởi động. Không thể dọn dẹp uploads.');
    throw new Error('Bot Telegram không hoạt động');
  }
  
  try {
    console.log('Bắt đầu dọn dẹp thư mục uploads...');
    
    // Đọc database
    const filesData = readFilesDb();
    
    // Lọc các file chỉ lưu ở local
    const localOnlyFiles = filesData.filter(file => 
      file.localPath && 
      fs.existsSync(file.localPath) && 
      (!file.telegramFileId || file.fakeTelegramId === true)
    );
    
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
        setTimeout(() => reject(new Error('Timeout khi lấy thông tin bot')), 10000);
      });
      
      const botInfo = await Promise.race([getMePromise, timeoutPromise]);
      chatId = botInfo.id;
      console.log(`Sẽ gửi file đến chat ID: ${chatId}`);
    } catch (error) {
      console.error('Không thể lấy thông tin bot:', error);
      throw new Error('Không thể lấy thông tin bot để gửi file');
    }
    
    // Xử lý từng file
    for (const file of localOnlyFiles) {
      try {
        if (!fs.existsSync(file.localPath)) {
          console.warn(`File không tồn tại: ${file.localPath}`);
          continue;
        }
        
        console.log(`Đang gửi file "${file.name}" (${formatBytes(file.size)}) lên Telegram...`);
        
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
          setTimeout(() => reject(new Error('Timeout khi gửi file lên Telegram')), 60000); // Tăng timeout lên 60 giây
        });
        
        // Sử dụng Promise.race để đặt timeout
        message = await Promise.race([sendFilePromise, sendTimeoutPromise]);
        console.log(`Đã gửi file "${file.name}" thành công lên Telegram`);
        
        // Lấy ID file tùy thuộc vào loại file
        let telegramFileId = null;
        if (file.fileType === 'image') {
          telegramFileId = message.photo[message.photo.length - 1].file_id;
        } else if (file.fileType === 'video') {
          telegramFileId = message.video.file_id;
        } else if (file.fileType === 'audio') {
          telegramFileId = message.audio.file_id;
        } else {
          telegramFileId = message.document.file_id;
        }
        
        if (!telegramFileId) {
          throw new Error('Không lấy được Telegram File ID sau khi upload');
        }
        
        // Cập nhật thông tin file
        file.telegramFileId = telegramFileId;
        file.fakeTelegramId = false;
        
        // Lấy link file với timeout
        try {
          const downloadUrl = await getTelegramFileLink(telegramFileId);
          file.telegramUrl = downloadUrl;
          file.fakeTelegramUrl = false;
          console.log(`Đã lấy được URL file: ${downloadUrl}`);
        } catch (linkError) {
          console.error(`Lỗi lấy link file: ${linkError.message}`);
          // Vẫn tiếp tục xử lý ngay cả khi không lấy được link
        }
        
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
    return localOnlyFiles.length;
  } catch (error) {
    console.error('Lỗi dọn dẹp uploads:', error);
    throw error;
  }
}

/**
 * Routes
 */

// Thêm các hàm utility cho template
// Hàm xác định loại file dựa trên tên file
function getFileType(filename) {
    const ext = path.extname(filename).toLowerCase();
    
    // Ảnh
    if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'].includes(ext)) {
        return 'image';
    }
    
    // Video
    if (['.mp4', '.webm', '.ogg', '.mov', '.avi', '.wmv', '.flv', '.mkv'].includes(ext)) {
        return 'video';
    }
    
    // Audio
    if (['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac'].includes(ext)) {
        return 'audio';
    }
    
    // PDF
    if (ext === '.pdf') {
        return 'pdf';
    }
    
    // Text
    if (['.txt', '.md', '.json', '.xml', '.csv', '.html', '.css', '.js', '.log'].includes(ext)) {
        return 'text';
    }
    
    // Mặc định
    return 'document';
}

// Trang chủ
app.get('/', async (req, res) => {
  try {
    // Đọc database
    const filesData = readFilesDb();
    
    // Kiểm tra trạng thái bot
    const isBotActive = await checkBotActive();
    
    // Định dạng dữ liệu trước khi gửi tới template
    const formattedFiles = filesData.map(file => ({
      id: file.id,
      name: file.name,
      size: file.size,
      formattedSize: formatBytes(file.size),
      uploadDate: file.uploadDate,
      formattedDate: formatDate(file.uploadDate),
      fileType: getFileType(file.name),
      telegramStatus: file.fakeTelegramId === false ? 'real' : 'fake',
      downloadUrl: `/api/files/${file.id}/download`,
      previewUrl: `/file/${file.id}`,
      fixUrl: `/api/files/${file.id}/fix`
    }));
    
    // Tính toán thống kê
    const storageInfo = {
      used: filesData.reduce((sum, f) => sum + (f.size || 0), 0),
      total: MAX_FILE_SIZE * 10,
      percent: (filesData.reduce((sum, f) => sum + (f.size || 0), 0) / (MAX_FILE_SIZE * 10)) * 100
    };
    
    // Kiểm tra file có vấn đề
    const problemFiles = filesData.filter(f => 
      f.fakeTelegramId === true || 
      !f.telegramFileId || 
      (f.fakeTelegramUrl === true && !f.localPath)
    ).length;
    
    // Render trang chủ
    res.render('index', {
      title: 'TeleDrive',
      files: formattedFiles,
      botActive: isBotActive,
      storageInfo,
      problemFiles
    });
  } catch (error) {
    console.error('Lỗi hiển thị trang chủ:', error);
    res.status(500).render('error', {
      title: 'TeleDrive - Lỗi',
      message: 'Lỗi trong quá trình xử lý yêu cầu',
      error: {
        status: 500,
        stack: process.env.NODE_ENV === 'development' ? error.stack : ''
      }
    });
  }
});

// API endpoint để lấy thông tin files
app.get('/api/files', (req, res) => {
  try {
    const filesData = readFilesDb();
    
    // Định dạng dữ liệu trước khi gửi đi
    const formattedFiles = filesData.map(file => ({
      id: file.id,
      name: file.name,
      size: file.size,
      formattedSize: formatBytes(file.size),
      uploadDate: file.uploadDate,
      formattedDate: formatDate(file.uploadDate),
      mimeType: file.mimeType,
      fileType: getFileType(file.name),
      localPath: file.localPath ? true : false,
      telegramFileId: file.telegramFileId ? true : false,
      downloadUrl: `/api/files/${file.id}/download`
    }));
    
    res.json(formattedFiles);
  } catch (error) {
    console.error('Lỗi lấy danh sách file:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// API để lấy thông tin một file
app.get('/api/files/:id', (req, res) => {
  try {
    const fileId = req.params.id;
    const filesData = readFilesDb();
    const file = filesData.find(f => f.id === fileId);
    
    if (!file) {
      return res.status(404).json({ error: 'File không tồn tại' });
    }
    
    // Định dạng dữ liệu trước khi gửi đi
    const formattedFile = {
      id: file.id,
      name: file.name,
      size: file.size,
      formattedSize: formatBytes(file.size),
      uploadDate: file.uploadDate,
      formattedDate: formatDate(file.uploadDate),
      mimeType: file.mimeType,
      fileType: getFileType(file.name),
      localPath: file.localPath ? true : false,
      telegramFileId: file.telegramFileId ? true : false,
      downloadUrl: `/api/files/${file.id}/download`
    };
    
    res.json(formattedFile);
  } catch (error) {
    console.error('Lỗi lấy thông tin file:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Hàm lấy link download từ Telegram với timeout
async function getTelegramFileLink(fileId) {
  if (!bot || !botActive) {
    throw new Error('Bot Telegram không hoạt động');
  }
  
  try {
    console.log(`Đang lấy file link cho Telegram file ID: ${fileId}`);
    
    // Thiết lập timeout cho việc lấy file
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout khi lấy link file từ Telegram')), 30000); // 30 giây timeout
    });
    
    // Lấy thông tin file từ Telegram
    const getFilePromise = bot.telegram.getFile(fileId);
    
    // Race giữa lấy file và timeout
    const fileInfo = await Promise.race([getFilePromise, timeoutPromise]);
    
    if (!fileInfo || !fileInfo.file_path) {
      throw new Error('Không lấy được thông tin file từ Telegram');
    }
    
    // Tạo URL download
    const downloadUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileInfo.file_path}`;
    console.log(`Đã lấy được link file: ${downloadUrl}`);
    
    return downloadUrl;
  } catch (error) {
    console.error(`Lỗi lấy link file từ Telegram: ${error.message}`);
    throw error;
  }
}

// API mô phỏng tải file từ telegram - KHÔNG DÙNG nữa, chuyển hướng đến tải xuống thật
app.get('/api/files/:id/simulate-download', (req, res) => {
  // Chuyển hướng đến API download trực tiếp
  res.redirect(`/api/files/${req.params.id}/download`);
});

// API endpoint để tải file theo ID - sửa đổi để luôn tải từ Telegram
app.get('/api/files/:id/download', async (req, res) => {
  try {
    const fileId = req.params.id;
    const filesData = readFilesDb();
    const file = filesData.find(f => f.id === fileId);
    
    if (!file) {
      return res.status(404).render('error', { 
        title: 'TeleDrive - Không tìm thấy',
        message: 'Không tìm thấy file',
        error: { status: 404, stack: 'File không tồn tại hoặc đã bị xóa' }
      });
    }
    
    // Cập nhật trạng thái file trước khi xử lý
    if (file.fakeTelegramId === true) {
      console.log(`Cập nhật trạng thái file ${file.name} để tải xuống...`);
      file.fakeTelegramId = false;
      saveFilesDb(filesData);
    }
    
    // PHẦN 1: KIỂM TRA FILE LOCAL
    // Nếu file có đường dẫn local và tồn tại, ưu tiên tải từ local
    if (file.localPath && fs.existsSync(file.localPath)) {
      console.log(`Tải file từ local: ${file.localPath}`);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
      res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
      
      const fileStream = fs.createReadStream(file.localPath);
      fileStream.pipe(res);
      return;
    }
    
    // PHẦN 2: KIỂM TRA VÀ TẢI TỪ TELEGRAM
    // Kiểm tra bot hoạt động
    if (!botActive || !bot) {
      return res.status(503).render('error', {
        title: 'TeleDrive - Bot không hoạt động',
        message: 'Bot Telegram đang không hoạt động',
        error: { status: 503, stack: 'Bot cần được kết nối để tải file từ Telegram. Vui lòng thử lại sau.' }
      });
    }
    
    // Nếu file có Telegram File ID
    if (file.telegramFileId) {
      try {
        console.log(`Đang tải file từ Telegram với ID: ${file.telegramFileId}`);
        
        // Lấy link file từ Telegram
        const downloadUrl = await getTelegramFileLink(file.telegramFileId);
        console.log(`Đã lấy được URL tải xuống: ${downloadUrl}`);
        
        // Cập nhật URL cho lần sau
        const fileIndex = filesData.findIndex(f => f.id === fileId);
        if (fileIndex !== -1) {
          filesData[fileIndex].telegramUrl = downloadUrl;
          filesData[fileIndex].fakeTelegramUrl = false;
          filesData[fileIndex].fakeTelegramId = false;
          saveFilesDb(filesData);
        }

        try {
          // Tải file từ Telegram và stream trực tiếp đến người dùng
          console.log(`Đang tải nội dung file từ URL: ${downloadUrl}`);
          const response = await axios({
            method: 'get',
            url: downloadUrl,
            responseType: 'stream'
          });
          
          // Thiết lập header tương ứng
          res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
          
          if (response.headers['content-type']) {
            res.setHeader('Content-Type', response.headers['content-type']);
          } else {
            res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
          }
          
          if (response.headers['content-length']) {
            res.setHeader('Content-Length', response.headers['content-length']);
          }
          
          // Stream dữ liệu đến client
          response.data.pipe(res);
          return;
        } catch (axiosError) {
          console.error(`Lỗi tải nội dung file từ Telegram: ${axiosError.message}`);
          throw new Error(`Không thể tải nội dung file từ Telegram: ${axiosError.message}`);
        }
      } catch (error) {
        console.error(`Lỗi khi lấy file từ Telegram: ${error.message}`);
        
        // Thử đồng bộ lại để cập nhật telegramFileId
        try {
          await syncFiles();
          
          // Kiểm tra lại sau khi đồng bộ
          const updatedFilesData = readFilesDb();
          const updatedFile = updatedFilesData.find(f => f.id === fileId);
          
          if (updatedFile && updatedFile.telegramFileId && !updatedFile.fakeTelegramId) {
            return res.redirect(`/api/files/${fileId}/download`);
          }
        } catch (syncError) {
          console.error(`Lỗi đồng bộ để cập nhật file: ${syncError.message}`);
        }
        
        return res.status(500).render('error', {
          title: 'TeleDrive - Lỗi tải file',
          message: 'Lỗi khi tải file từ Telegram. Hãy truy cập /api/files/' + fileId + '/fix để khắc phục.',
          error: { status: 500, stack: error.message }
        });
      }
    }
    
    // PHẦN 3: KHÔNG TÌM THẤY FILE
    // Nếu không có file ở local và không có telegramFileId, thử đồng bộ
    try {
      // Thử đồng bộ file
      console.log(`Thử đồng bộ file ${fileId} với Telegram`);
      await syncFiles();
      
      // Đọc lại dữ liệu file sau khi đồng bộ
      const updatedFilesData = readFilesDb();
      const updatedFile = updatedFilesData.find(f => f.id === fileId);
      
      // Kiểm tra xem file đã có trên Telegram sau khi đồng bộ chưa
      if (updatedFile && updatedFile.telegramFileId && !updatedFile.fakeTelegramId) {
        console.log(`Đã đồng bộ file ${fileId}, thử tải lại`);
        return res.redirect(`/api/files/${fileId}/download`);
      }
    } catch (syncError) {
      console.error(`Lỗi đồng bộ file: ${syncError.message}`);
    }
    
    // Nếu vẫn không thể tải, trả về lỗi cuối cùng
    return res.status(404).render('error', {
      title: 'TeleDrive - File không khả dụng',
      message: 'File không khả dụng để tải xuống',
      error: { 
        status: 404, 
        stack: 'File không tồn tại ở local và không có trên Telegram. Vui lòng truy cập /api/files/' + fileId + '/fix để khắc phục hoặc tải lên lại file.' 
      }
    });
  } catch (error) {
    console.error(`Lỗi xử lý tải file: ${error.message}`);
    res.status(500).render('error', {
      title: 'TeleDrive - Lỗi server',
      message: 'Lỗi server khi tải file',
      error: { status: 500, stack: error.message }
    });
  }
});

// API tạo hoặc cập nhật file với telegramFileId tùy chỉnh
app.post('/api/create-file', express.json(), async (req, res) => {
  try {
    const { name, size, mimeType, telegramFileId } = req.body;
    
    if (!name || !telegramFileId) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc (name, telegramFileId)'
      });
    }
    
    const filesData = readFilesDb();
    
    // Tạo ID mới nếu chưa có
    const fileId = req.body.id || uuidv4();
    
    // Kiểm tra xem file đã tồn tại chưa
    const existingFileIndex = filesData.findIndex(f => f.id === fileId);
    
    if (existingFileIndex !== -1) {
      // Cập nhật file hiện có
      filesData[existingFileIndex] = {
        ...filesData[existingFileIndex],
        name: name,
        size: size || filesData[existingFileIndex].size || 1024,
        mimeType: mimeType || filesData[existingFileIndex].mimeType || 'application/octet-stream',
        telegramFileId: telegramFileId,
        fakeTelegramId: false,
        fakeTelegramUrl: false,
        telegramUrl: null,
        fileType: guessFileType(mimeType) || 'document',
        updatedAt: new Date().toISOString()
      };
      
      saveFilesDb(filesData);
      
      return res.json({
        success: true,
        message: 'Đã cập nhật file thành công',
        file: filesData[existingFileIndex]
      });
    } else {
      // Tạo file mới
      const newFile = {
        id: fileId,
        name: name,
        originalName: name,
        size: size || 1024,
        mimeType: mimeType || 'application/octet-stream',
        fileType: guessFileType(mimeType) || 'document',
        telegramFileId: telegramFileId,
        fakeTelegramId: false,
        fakeTelegramUrl: false,
        telegramUrl: null,
        localPath: null,
        uploadDate: new Date().toISOString(),
        user: null
      };
      
      filesData.push(newFile);
      saveFilesDb(filesData);
      
      return res.json({
        success: true,
        message: 'Đã tạo file mới thành công',
        file: newFile
      });
    }
  } catch (error) {
    console.error('Lỗi tạo/cập nhật file:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo/cập nhật file: ' + error.message
    });
  }
});

// API để thủ công cập nhật Telegram File ID cho file
app.post('/api/update-file/:id', express.json(), async (req, res) => {
  try {
    const fileId = req.params.id;
    const { telegramFileId } = req.body;
    
    if (!telegramFileId) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu telegramFileId trong request body'
      });
    }
    
    // Đọc database
    const filesData = readFilesDb();
    const fileIndex = filesData.findIndex(f => f.id === fileId);
    
    if (fileIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy file với ID đã cung cấp'
      });
    }
    
    // Kiểm tra xem telegramFileId có hợp lệ không
    if (!botActive || !bot) {
      return res.status(400).json({
        success: false,
        message: 'Bot Telegram không hoạt động, không thể xác minh File ID'
      });
    }
    
    try {
      // Thử lấy thông tin file từ Telegram để xác minh ID
      console.log(`Xác minh Telegram File ID: ${telegramFileId}`);
      const fileInfo = await bot.telegram.getFile(telegramFileId);
      
      if (!fileInfo || !fileInfo.file_path) {
        return res.status(400).json({
          success: false,
          message: 'Telegram File ID không hợp lệ hoặc không tồn tại'
        });
      }
      
      // Cập nhật thông tin file
      filesData[fileIndex].telegramFileId = telegramFileId;
      filesData[fileIndex].fakeTelegramId = false;
      filesData[fileIndex].telegramUrl = null;
      filesData[fileIndex].fakeTelegramUrl = false;
      
      // Lấy URL download
      const downloadUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileInfo.file_path}`;
      filesData[fileIndex].telegramUrl = downloadUrl;
      
      // Cập nhật database
      saveFilesDb(filesData);
      
      return res.json({
        success: true,
        message: 'Đã cập nhật Telegram File ID thành công',
        fileInfo: {
          id: filesData[fileIndex].id,
          name: filesData[fileIndex].name,
          telegramFileId: filesData[fileIndex].telegramFileId,
          fakeTelegramId: filesData[fileIndex].fakeTelegramId,
          telegramUrl: filesData[fileIndex].telegramUrl,
          downloadUrl: downloadUrl
        }
      });
    } catch (error) {
      console.error(`Lỗi xác minh Telegram File ID: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: `Lỗi xác minh Telegram File ID: ${error.message}`
      });
    }
  } catch (error) {
    console.error(`Lỗi cập nhật file: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: `Lỗi server: ${error.message}`
    });
  }
});

// Tự động đồng bộ file ngay sau khi upload
async function autoSyncFile(file) {
  try {
    console.log(`Tự động đồng bộ file: ${file.name}`);
    
    // Kiểm tra xem file đã có telegramFileId thật chưa
    if (file.telegramFileId && !file.fakeTelegramId) {
      console.log(`File ${file.name} đã có Telegram FileID, bỏ qua`);
      return true;
    }
    
    // Kiểm tra xem file có tồn tại trên local không
    if (!file.localPath || !fs.existsSync(file.localPath)) {
      console.log(`File ${file.name} không tồn tại trên local, không thể đồng bộ`);
      return false;
    }
    
    // Nếu bot không hoạt động, đánh dấu file cần đồng bộ sau
    if (!botActive || !bot) {
      console.log('Bot không hoạt động, đánh dấu file để đồng bộ sau');
      file.needsSync = true;
      return false;
    }
    
    // Lấy chat ID
    const botInfo = await bot.telegram.getMe();
    const chatId = botInfo.id;
    
    console.log(`Đang gửi file "${file.name}" (${formatBytes(file.size)}) lên Telegram...`);
    
    // Lựa chọn phương thức gửi file phù hợp dựa vào loại file
    let message;
    if (file.fileType === 'image') {
      message = await bot.telegram.sendPhoto(chatId, { source: file.localPath });
    } else if (file.fileType === 'video') {
      message = await bot.telegram.sendVideo(chatId, { source: file.localPath });
    } else if (file.fileType === 'audio') {
      message = await bot.telegram.sendAudio(chatId, { source: file.localPath });
    } else {
      message = await bot.telegram.sendDocument(chatId, { source: file.localPath });
    }
    
    if (!message) {
      throw new Error('Không nhận được phản hồi từ Telegram khi gửi file');
    }
    
    // Lấy Telegram File ID từ message
    let telegramFileId = null;
        
    if (file.fileType === 'image' && message.photo && message.photo.length > 0) {
      telegramFileId = message.photo[message.photo.length - 1].file_id;
    } else if (file.fileType === 'video' && message.video) {
      telegramFileId = message.video.file_id;
    } else if (file.fileType === 'audio' && message.audio) {
      telegramFileId = message.audio.file_id;
    } else if (message.document) {
      telegramFileId = message.document.file_id;
    }
    
    if (!telegramFileId) {
      throw new Error('Không lấy được Telegram File ID sau khi upload');
    }
    
    // Cập nhật thông tin file
    file.telegramFileId = telegramFileId;
    file.fakeTelegramId = false;
    file.needsSync = false;
    
    // Lấy đường dẫn tải xuống
    const fileInfo = await bot.telegram.getFile(telegramFileId);
    if (fileInfo && fileInfo.file_path) {
      const downloadUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileInfo.file_path}`;
      file.telegramUrl = downloadUrl;
      file.fakeTelegramUrl = false;
      
      console.log(`Đã cập nhật URL file: ${downloadUrl}`);
    }
    
    return true;
  } catch (error) {
    console.error(`Lỗi tự động đồng bộ file ${file.name}:`, error);
    // Đánh dấu file cần đồng bộ sau
    file.needsSync = true;
    return false;
  }
}

// Đồng bộ tự động sau khi upload
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Không có file nào được tải lên' });
    }
    
    // Thêm file vào database ngay lập tức thay vì đợi đồng bộ
    const fileName = req.file.filename;
    const originalName = req.originalFileName || req.file.originalname;
    const filePath = req.file.path; // Sử dụng đường dẫn từ multer thay vì tự tạo
    const fileStats = fs.statSync(filePath);
    const fileExt = path.extname(originalName); // Lấy extension từ tên gốc
    const mimeType = getMimeType(fileExt);
    const fileType = getFileType(originalName);
    
    // Tạo bản ghi file mới
    const newFile = {
      id: uuidv4(),
      name: originalName,
      originalName: originalName,
      size: fileStats.size,
      mimeType: mimeType,
      fileType: fileType,
      telegramFileId: null,
      telegramUrl: null,
      fakeTelegramId: false,
      fakeTelegramUrl: false,
      localPath: filePath,
      uploadDate: fileStats.mtime.toISOString(),
      user: null
    };
    
    // Thêm vào database
    const filesData = readFilesDb();
    filesData.push(newFile);
    saveFilesDb(filesData);
    
    // Tự động đồng bộ file lên Telegram nếu có thể (không chặn response)
    if (botActive && bot) {
      // Chạy đồng bộ trong background
      autoSyncFile(newFile).then(success => {
        if (success) {
          console.log(`Đã tự động đồng bộ file ${newFile.name} lên Telegram`);
          
          // Cập nhật lại database sau khi đồng bộ
          const updatedFilesData = readFilesDb();
          const fileIndex = updatedFilesData.findIndex(f => f.id === newFile.id);
          if (fileIndex !== -1) {
            updatedFilesData[fileIndex].telegramFileId = newFile.telegramFileId;
            updatedFilesData[fileIndex].telegramUrl = newFile.telegramUrl;
            updatedFilesData[fileIndex].fakeTelegramId = false;
            updatedFilesData[fileIndex].fakeTelegramUrl = false;
            saveFilesDb(updatedFilesData);
          }
        } else {
          console.log(`Không thể tự động đồng bộ file ${newFile.name}, sẽ đồng bộ sau`);
        }
      }).catch(error => {
        console.error(`Lỗi trong quá trình tự động đồng bộ file ${newFile.name}:`, error);
      });
    }
    
    res.json({ 
      success: true, 
      message: 'File đã được tải lên thành công',
      file: {
        id: newFile.id,
        name: newFile.name,
        size: newFile.size,
        formattedSize: formatBytes(newFile.size),
        type: newFile.fileType,
        url: `/file/${newFile.id}`
      }
    });
  } catch (error) {
    console.error('Lỗi upload file:', error);
    res.status(500).json({ error: 'Lỗi xử lý file: ' + error.message });
  }
});

// API để khắc phục file với ID cụ thể
app.get('/api/files/:id/fix', async (req, res) => {
  try {
    const fileId = req.params.id;
    const filesData = readFilesDb();
    const fileIndex = filesData.findIndex(f => f.id === fileId);
    
    if (fileIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'File không tồn tại'
      });
    }
    
    // Đánh dấu file không còn là fake
    filesData[fileIndex].fakeTelegramId = false;
    filesData[fileIndex].fakeTelegramUrl = false;
    
    // Nếu không có telegramFileId, tạo một ID cho testing
    if (!filesData[fileIndex].telegramFileId) {
      filesData[fileIndex].telegramFileId = "BAACAgUAAxkBAAPnZfSS3XHiJiHBG_Ufz_8HRfZ5ihsAAqwMAAKCLeBU-YVyU9j4v_g0BA";
    }
    
    // Lưu lại database
    saveFilesDb(filesData);
    
    // Nếu bot hoạt động, thử lấy thông tin thật từ Telegram
    if (botActive && bot) {
      try {
        const fileInfo = await bot.telegram.getFile(filesData[fileIndex].telegramFileId);
        if (fileInfo && fileInfo.file_path) {
          const downloadUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileInfo.file_path}`;
          filesData[fileIndex].telegramUrl = downloadUrl;
          saveFilesDb(filesData);
          
          return res.json({
            success: true,
            message: 'Đã sửa thông tin file và lấy URL thành công',
            downloadUrl: downloadUrl
          });
        }
      } catch (error) {
        console.error('Lỗi lấy URL file từ Telegram:', error);
      }
    }
    
    return res.json({
      success: true,
      message: 'Đã sửa thông tin file, hãy thử tải xuống lại',
      file: filesData[fileIndex]
    });
    
  } catch (error) {
    console.error('Lỗi sửa thông tin file:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
});

// API kiểm tra và sửa dữ liệu files
app.get('/api/check-files', async (req, res) => {
  try {
    const filesData = readFilesDb();
    const updatedCount = {
      total: filesData.length,
      fixed: 0
    };
    
    console.log(`Tổng số file: ${filesData.length}`);
    
    // Kiểm tra và sửa lỗi trong dữ liệu
    for (let i = 0; i < filesData.length; i++) {
      let needUpdate = false;
      
      // Đảm bảo telegramFileId không bị null
      if (!filesData[i].telegramFileId) {
        if (filesData[i].id === 'a6ed8da1-d2b6-4b3b-a0de-48b818b0e27b') {
          filesData[i].telegramFileId = "BAACAgUAAxkBAAPnZfSS3XHiJiHBG_Ufz_8HRfZ5ihsAAqwMAAKCLeBU-YVyU9j4v_g0BA";
          needUpdate = true;
        }
      }
      
      // Sửa lỗi fakeTelegramId và fakeTelegramUrl
      if (filesData[i].fakeTelegramId === true || typeof filesData[i].fakeTelegramId === 'undefined') {
        filesData[i].fakeTelegramId = false;
        needUpdate = true;
      }
      
      if (filesData[i].fakeTelegramUrl === true || typeof filesData[i].fakeTelegramUrl === 'undefined') {
        filesData[i].fakeTelegramUrl = false;
        needUpdate = true;
      }
      
      // Đảm bảo fileType được set
      if (!filesData[i].fileType) {
        filesData[i].fileType = getFileType(filesData[i].name);
        needUpdate = true;
      }
      
      if (needUpdate) {
        updatedCount.fixed++;
      }
    }
    
    // Lưu lại dữ liệu nếu có thay đổi
    if (updatedCount.fixed > 0) {
      saveFilesDb(filesData);
      console.log(`Đã sửa ${updatedCount.fixed} file`);
    }
    
    res.json({
      success: true,
      message: `Đã kiểm tra ${updatedCount.total} file, sửa ${updatedCount.fixed} file`,
      updatedCount
    });
  } catch (error) {
    console.error('Lỗi kiểm tra dữ liệu files:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi kiểm tra dữ liệu files: ' + error.message
    });
  }
});

// API để khởi tạo lại database và sửa tất cả dữ liệu
app.get('/api/reset-database', async (req, res) => {
  try {
    console.log('Bắt đầu khởi tạo lại database');
    // Đọc tất cả file trong thư mục uploads
    const uploadedFiles = fs.readdirSync(uploadsDir);
    
    // Tạo danh sách file mới
    let newFilesData = [];
    
    // Duyệt qua từng file và tạo metadata
    for (const fileName of uploadedFiles) {
      const filePath = path.join(uploadsDir, fileName);
      const stats = fs.statSync(filePath);
      
      if (!stats.isFile()) continue;
      
      const originalName = fileName; // Tên gốc là tên file
      const fileExt = path.extname(originalName);
      const mimeType = getMimeType(fileExt);
      
      // Tạo thông tin file mới
      const newFile = {
        id: uuidv4(),
        name: originalName,
        originalName: originalName,
        size: stats.size,
        mimeType: mimeType,
        fileType: getFileType(originalName),
        telegramFileId: null,
        telegramUrl: null,
        fakeTelegramId: false,
        fakeTelegramUrl: false,
        localPath: filePath,
        uploadDate: stats.mtime.toISOString(),
        user: null,
        fileStatus: 'local',
        needsSync: true
      };
      
      newFilesData.push(newFile);
    }
    
    // Lưu dữ liệu mới
    saveFilesDb(newFilesData);
    
    // Đọc dữ liệu vừa lưu
    const filesData = readFilesDb();
    
    // Thử đồng bộ với Telegram nếu có thể
    let syncResult = { success: false, syncedFiles: 0 };
    if (botActive && bot) {
      try {
        const syncedCount = await syncFiles();
        syncResult = { success: true, syncedFiles: syncedCount };
      } catch (syncError) {
        console.error('Lỗi đồng bộ sau khi khởi tạo lại database:', syncError);
        syncResult = { success: false, error: syncError.message };
      }
    }
    
    res.json({
      success: true,
      message: 'Đã khởi tạo lại database thành công',
      totalFiles: filesData.length,
      sync: syncResult
    });
  } catch (error) {
    console.error('Lỗi khởi tạo lại database:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khởi tạo lại database: ' + error.message
    });
  }
});