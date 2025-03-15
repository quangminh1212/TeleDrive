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
          file.fakeTelegramId = !file.telegramFileId || file.telegramFileId.startsWith('fake_');
        }
        
        if (typeof file.fakeTelegramUrl === 'undefined') {
          file.fakeTelegramUrl = !file.telegramUrl || file.telegramUrl.includes('simulate-download');
        }
        
        // Kiểm tra trạng thái file
        if (file.localPath && fs.existsSync(file.localPath)) {
          file.fileStatus = 'local';
        } else if (file.telegramFileId && !file.fakeTelegramId) {
          file.fileStatus = 'telegram';
        } else {
          file.fileStatus = 'missing';
          
          // Nếu file không có telegramFileId hợp lệ, đánh dấu là cần đồng bộ
          if (!file.telegramFileId || file.fakeTelegramId) {
            file.needsSync = true;
          }
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
app.get('/', (req, res) => {
  try {
    const files = readFilesDb();
    const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);
    
    // Thiết lập trạng thái file
    const processedFiles = files.map(file => {
      let fileStatus = 'missing';
      if (file.localPath && fs.existsSync(file.localPath)) {
        fileStatus = 'local';
      } else if (file.telegramFileId) {
        fileStatus = 'telegram';
      }
      return { ...file, fileStatus };
    });
    
    res.render('index', {
      title: 'TeleDrive',
      files: processedFiles,
      totalSize: totalSize,
      maxSize: MAX_FILE_SIZE,
      error: null,
      storageInfo: {
        used: totalSize,
        total: MAX_FILE_SIZE * 10, // Giả sử tổng dung lượng là 10 lần max file size
        percent: (totalSize / (MAX_FILE_SIZE * 10)) * 100
      },
      formatBytes,
      formatDate
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
      },
      formatBytes,
      formatDate
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

// API endpoint để tải file theo ID - không redirect mà stream trực tiếp
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
      if (file.telegramFileId && !file.fakeTelegramId) {
        return res.status(503).render('error', {
          title: 'TeleDrive - Bot không hoạt động',
          message: 'Bot Telegram đang không hoạt động',
          error: { status: 503, stack: 'Bot cần được kết nối để tải file từ Telegram. Vui lòng thử lại sau.' }
        });
      } else {
        return res.status(404).render('error', {
          title: 'TeleDrive - File không khả dụng',
          message: 'File không có sẵn để tải xuống',
          error: { status: 404, stack: 'File không tồn tại ở local và không có trên Telegram' }
        });
      }
    }
    
    // Nếu file có Telegram File ID hợp lệ
    if (file.telegramFileId && file.fakeTelegramId !== true) {
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
        
        // Thử cập nhật telegramFileId bằng cách đồng bộ
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
          message: 'Lỗi khi tải file từ Telegram',
          error: { status: 500, stack: error.message }
        });
      }
    }
    
    // PHẦN 3: KHÔNG TÌM THẤY FILE
    // Nếu file không có Telegram File ID hợp lệ
    console.log(`File ${fileId} không có Telegram File ID hợp lệ`);
    
    // Thử đồng bộ một lần nữa
    try {
      await syncFiles();
      
      // Kiểm tra lại sau khi đồng bộ
      const updatedFilesData = readFilesDb();
      const updatedFile = updatedFilesData.find(f => f.id === fileId);
      
      if (updatedFile && ((updatedFile.localPath && fs.existsSync(updatedFile.localPath)) || 
          (updatedFile.telegramFileId && !updatedFile.fakeTelegramId))) {
        return res.redirect(`/api/files/${fileId}/download`);
      }
    } catch (syncError) {
      console.error(`Lỗi đồng bộ để cập nhật file: ${syncError.message}`);
    }
    
    return res.status(404).render('error', {
      title: 'TeleDrive - File không khả dụng',
      message: 'File không khả dụng để tải xuống',
      error: { 
        status: 404, 
        stack: 'File không tồn tại ở local và không có trên Telegram. Vui lòng tải lên lại file.' 
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
    const originalName = req.originalFileName || req.file.originalname;
    const filePath = req.file.path; // Sử dụng đường dẫn từ multer thay vì tự tạo
    const fileStats = fs.statSync(filePath);
    const fileExt = path.extname(originalName); // Lấy extension từ tên gốc
    const mimeType = getMimeType(fileExt);
    
    // Thêm vào database
    const filesData = readFilesDb();
    filesData.push({
      id: uuidv4(),
      name: originalName,
      originalName: originalName,
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
      return res.status(400).json({ 
        success: false, 
        error: 'Bot Telegram không hoạt động. Không thể dọn dẹp uploads.' 
      });
    }
    
    try {
      // Gọi hàm dọn dẹp và đợi kết quả
      console.log('Bắt đầu quá trình tải lên Telegram...');
      const processedCount = await cleanUploads();
      
      return res.json({ 
        success: true, 
        message: `Đã hoàn tất quá trình dọn dẹp, xử lý ${processedCount} file` 
      });
    } catch (cleanError) {
      console.error('Lỗi trong quá trình dọn dẹp:', cleanError);
      return res.status(500).json({ 
        success: false, 
        error: `Lỗi trong quá trình tải lên Telegram: ${cleanError.message}` 
      });
    }
  } catch (error) {
    console.error('Lỗi dọn dẹp uploads:', error);
    res.status(500).json({ 
      success: false, 
      error: `Lỗi dọn dẹp uploads: ${error.message}` 
    });
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

// Route xem trước file
app.get('/file/:id', async (req, res) => {
    try {
        const fileId = req.params.id;
        const filesData = readFilesDb();
        const file = filesData.find(f => f.id === fileId);
        
        if (!file) {
            return res.status(404).render('error', { 
                title: 'TeleDrive - Không tìm thấy file',
                message: 'File không tồn tại hoặc đã bị xóa',
                error: { status: 404 } 
            });
        }
        
        // Định dạng thông tin file
        const fileType = getFileType(file.name);
        const formattedFile = {
            ...file,
            fileType,
            formattedSize: formatBytes(file.size),
            formattedDate: formatDate(file.uploadDate || file.createdAt),
            fileId: fileId
        };
        
        // Kiểm tra trạng thái file
        if (formattedFile.localPath && fs.existsSync(formattedFile.localPath)) {
            formattedFile.fileStatus = 'local';
        } else if (formattedFile.telegramFileId && !formattedFile.fakeTelegramId) {
            formattedFile.fileStatus = 'telegram';
            // Thêm URL tải xuống trực tiếp
            formattedFile.directDownloadUrl = `/api/files/${fileId}/direct-download`;
        } else {
            formattedFile.fileStatus = 'missing';
        }
        
        // Thêm URL để reset file
        formattedFile.resetUrl = `/api/files/${fileId}/reset`;

        // Nếu là file text, đọc nội dung
        let fileContent = '';
        if (fileType === 'text' && formattedFile.fileStatus === 'local') {
            try {
                fileContent = fs.readFileSync(formattedFile.localPath, 'utf8');
            } catch (err) {
                console.error('Lỗi đọc file text:', err);
                fileContent = 'Không thể đọc nội dung file';
            }
        }

        // Kiểm tra xem bot có hoạt động không
        const botStatus = {
            active: botActive,
            lastChecked: new Date().toISOString()
        };

        res.render('file-preview', { 
            title: `TeleDrive - ${formattedFile.name}`,
            file: formattedFile,
            fileContent,
            botStatus
        });
    } catch (error) {
        console.error('Lỗi xem trước file:', error);
        res.status(500).render('error', { 
            title: 'TeleDrive - Lỗi server',
            message: 'Lỗi server khi xem trước file',
            error: { status: 500, stack: error.stack }
        });
    }
});

// API tạo mô phỏng cho file từ Telegram khi không thể kết nối hoặc không tồn tại
function createSampleContent(file, isPreview = false) {
  // Tạo nội dung mẫu dựa trên loại file
  const sampleContent = Buffer.alloc(1024, `TeleDrive sample content for ${file.name}`);
  
  return {
    content: sampleContent,
    type: file.mimeType || 'application/octet-stream'
  };
}

// API xem trước file
app.get('/api/files/:id/preview', async (req, res) => {
  try {
    const fileId = req.params.id;
    const filesData = readFilesDb();
    const file = filesData.find(f => f.id === fileId);
    
    if (!file) {
      return res.status(404).send('File không tồn tại');
    }
    
    // Kiểm tra xem file có tồn tại trên server không
    if (file.localPath && fs.existsSync(file.localPath)) {
      console.log(`Xem trước file từ local: ${file.localPath}`);
      // Đặt header cho xem trước
      if (file.mimeType) {
        res.setHeader('Content-Type', file.mimeType);
      }
      
      // Stream file từ local
      const fileStream = fs.createReadStream(file.localPath);
      fileStream.pipe(res);
      return;
    } 
    
    // Kiểm tra bot hoạt động
    if (!botActive || !bot) {
      if (file.telegramFileId && !file.fakeTelegramId) {
        return res.status(503).send('Bot Telegram không hoạt động, không thể xem trước file từ Telegram');
      } else {
        return res.status(404).send('File không tồn tại ở local và không có trên Telegram');
      }
    }
    
    // Nếu file không có trên local nhưng có telegramUrl thật, chuyển hướng đến đó
    if (file.telegramUrl && file.fakeTelegramUrl === false) {
      console.log(`Chuyển hướng xem trước đến Telegram URL: ${file.telegramUrl}`);
      return res.redirect(file.telegramUrl);
    }
    
    // Nếu file không có trên local nhưng có telegramFileId, thử lấy từ Telegram
    if (file.telegramFileId && file.fakeTelegramId === false) {
      try {
        console.log(`Lấy link xem trước từ Telegram với file ID: ${file.telegramFileId}`);
        const downloadUrl = await getTelegramFileLink(file.telegramFileId);
        console.log(`Đã lấy được URL xem trước: ${downloadUrl}`);
        
        // Lưu URL vào database để sử dụng sau này
        file.telegramUrl = downloadUrl;
        file.fakeTelegramUrl = false;
        
        // Cập nhật database
        const fileIndex = filesData.findIndex(f => f.id === fileId);
        if (fileIndex !== -1) {
          filesData[fileIndex].telegramUrl = downloadUrl;
          filesData[fileIndex].fakeTelegramUrl = false;
          saveFilesDb(filesData);
        }
        
        // Chuyển hướng đến URL Telegram
        return res.redirect(downloadUrl);
      } catch (telegramError) {
        console.error(`Lỗi khi lấy file từ Telegram để xem trước: ${telegramError.message}`);
        
        // Thử cập nhật telegramFileId bằng cách đồng bộ
        try {
          await syncFiles();
          
          // Kiểm tra lại sau khi đồng bộ
          const updatedFilesData = readFilesDb();
          const updatedFile = updatedFilesData.find(f => f.id === fileId);
          
          if (updatedFile && updatedFile.telegramFileId && !updatedFile.fakeTelegramId) {
            return res.redirect(`/api/files/${fileId}/preview`);
          }
        } catch (syncError) {
          console.error(`Lỗi đồng bộ để cập nhật file: ${syncError.message}`);
        }
        
        // Trả về lỗi thay vì file mẫu
        return res.status(500).send(`Lỗi khi lấy file từ Telegram: ${telegramError.message}`);
      }
    }
    
    // Thử đồng bộ một lần nữa
    try {
      await syncFiles();
      
      // Kiểm tra lại sau khi đồng bộ
      const updatedFilesData = readFilesDb();
      const updatedFile = updatedFilesData.find(f => f.id === fileId);
      
      if (updatedFile && ((updatedFile.localPath && fs.existsSync(updatedFile.localPath)) || 
          (updatedFile.telegramFileId && !updatedFile.fakeTelegramId))) {
        return res.redirect(`/api/files/${fileId}/preview`);
      }
    } catch (syncError) {
      console.error(`Lỗi đồng bộ để cập nhật file: ${syncError.message}`);
    }
    
    // Nếu không thể lấy file từ đâu, trả về thông báo lỗi
    console.log(`Không thể lấy file ${fileId} từ bất kỳ nguồn nào`);
    return res.status(404).send('File không tồn tại ở local và không có trên Telegram. Vui lòng tải lên lại file.');
    
  } catch (error) {
    console.error('Lỗi xem trước file:', error);
    res.status(500).send('Lỗi server khi xem trước file: ' + error.message);
  }
});

// API tải file từ Telegram
app.get('/api/files/:id/telegram-download', async (req, res) => {
  try {
    const fileId = req.params.id;
    const filesData = readFilesDb();
    const file = filesData.find(f => f.id === fileId);
    
    if (!file) {
      return res.status(404).send('File không tồn tại');
    }
    
    // Nếu file có đường dẫn local, trả về file từ local
    if (file.localPath && fs.existsSync(file.localPath)) {
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
      res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
      
      const fileStream = fs.createReadStream(file.localPath);
      fileStream.pipe(res);
      return;
    }
    
    // Nếu file có telegramUrl thật, chuyển hướng đến đó
    if (file.telegramUrl && !file.fakeTelegramUrl) {
      return res.redirect(file.telegramUrl);
    }
    
    // Nếu file có Telegram File ID và bot đang hoạt động
    if (file.telegramFileId && botActive && bot) {
      try {
        // Kiểm tra nếu là fake ID
        if (file.fakeTelegramId) {
          throw new Error('Fake Telegram ID');
        }
        
        // Lấy link tải xuống từ Telegram
        console.log(`Đang lấy file ID ${file.telegramFileId} từ Telegram để tải xuống`);
        const downloadUrl = await getTelegramFileLink(file.telegramFileId);
        console.log(`Đã lấy được URL: ${downloadUrl}`);
        
        // Cập nhật URL trong database
        file.telegramUrl = downloadUrl;
        file.fakeTelegramUrl = false;
        saveFilesDb(filesData);
        
        // Chuyển hướng người dùng đến URL trực tiếp
        return res.redirect(downloadUrl);
      } catch (error) {
        console.error('Lỗi khi tải file từ Telegram:', error);
      }
    }
    
    // Nếu không thể lấy file từ đâu, trả về file mẫu
    const sample = createSampleContent(file);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
    res.setHeader('Content-Type', sample.type);
    res.setHeader('Content-Length', sample.content.length);
    res.end(sample.content);
    
  } catch (error) {
    console.error('Lỗi khi xử lý request tải file:', error);
    res.status(500).send('Lỗi server khi tải file: ' + error.message);
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

// API reset file status
app.get('/api/files/:id/reset', async (req, res) => {
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
    
    // Reset file status - đánh dấu là file thật từ Telegram
    filesData[fileIndex].fakeTelegramId = false;
    filesData[fileIndex].fakeTelegramUrl = false;
    
    // Xóa telegramUrl để buộc lấy lại từ Telegram
    filesData[fileIndex].telegramUrl = null;
    
    // Lưu lại database
    saveFilesDb(filesData);
    
    // Thử kết nối với Telegram để lấy link thật
    if (botActive && bot && filesData[fileIndex].telegramFileId) {
      try {
        console.log(`Đang lấy link mới cho file ID: ${filesData[fileIndex].telegramFileId}`);
        const downloadUrl = await getTelegramFileLink(filesData[fileIndex].telegramFileId);
        console.log(`Đã lấy được URL: ${downloadUrl}`);
        
        filesData[fileIndex].telegramUrl = downloadUrl;
        saveFilesDb(filesData);
        
        return res.json({
          success: true,
          message: 'Đã reset trạng thái file và lấy URL mới thành công',
          url: downloadUrl
        });
      } catch (error) {
        console.error('Lỗi lấy URL từ Telegram:', error);
        return res.json({
          success: true,
          message: 'Đã reset trạng thái file, nhưng không lấy được URL mới: ' + error.message
        });
      }
    }
    
    return res.json({
      success: true,
      message: 'Đã reset trạng thái file thành công'
    });
  } catch (error) {
    console.error('Lỗi reset file:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi reset trạng thái file: ' + error.message 
    });
  }
});

// API lấy danh sách tất cả file IDs và trạng thái
app.get('/api/file-status', (req, res) => {
  try {
    const filesData = readFilesDb();
    
    // Trích xuất thông tin cần thiết từ mỗi file
    const fileStatuses = filesData.map(file => ({
      id: file.id,
      name: file.name,
      size: formatBytes(file.size),
      fakeTelegramId: file.fakeTelegramId,
      fakeTelegramUrl: file.fakeTelegramUrl,
      hasTelegramFileId: !!file.telegramFileId,
      hasTelegramUrl: !!file.telegramUrl,
      fileStatus: file.fileStatus || 'unknown',
      hasLocalPath: !!file.localPath
    }));
    
    res.json({
      count: fileStatuses.length,
      files: fileStatuses
    });
  } catch (error) {
    console.error('Lỗi lấy trạng thái file:', error);
    res.status(500).json({ 
      error: 'Lỗi khi lấy trạng thái file: ' + error.message 
    });
  }
});

// Hàm lấy link tải xuống từ Telegram với telegramFileId
async function getTelegramFileLink(fileId) {
  if (!bot || !botActive) {
    console.error('Bot không hoạt động khi cố gắng lấy link file');
    throw new Error('Bot không hoạt động hoặc chưa được cấu hình đúng');
  }
  
  // Kiểm tra nếu là fake ID
  if (!fileId || (typeof fileId === 'string' && fileId.startsWith('fake_'))) {
    console.error(`File ID không hợp lệ: ${fileId}`);
    throw new Error('File ID không hợp lệ');
  }
  
  try {
    console.log(`Đang lấy thông tin file ID: ${fileId}`);
    
    // Thiết lập timeout cho việc lấy thông tin file
    const fileInfoPromise = bot.telegram.getFile(fileId);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout khi lấy thông tin file từ Telegram')), 15000);
    });
    
    // Lấy thông tin file từ Telegram với timeout
    const fileInfo = await Promise.race([fileInfoPromise, timeoutPromise]);
    
    if (!fileInfo || !fileInfo.file_path) {
      console.error(`Không thể lấy được file_path từ Telegram cho fileId: ${fileId}`);
      throw new Error('Không thể lấy được thông tin file từ Telegram');
    }
    
    console.log(`Đã lấy được file_path: ${fileInfo.file_path}`);
    
    // Tạo link download trực tiếp
    const downloadUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileInfo.file_path}`;
    console.log(`Đã tạo download URL: ${downloadUrl}`);
    return downloadUrl;
  } catch (error) {
    console.error(`Lỗi khi lấy link download từ Telegram cho fileId ${fileId}:`, error);
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
    },
    formatBytes,
    formatDate
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
    },
    formatBytes,
    formatDate
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

// API để tải trực tiếp file từ Telegram
app.get('/api/files/:id/direct-download', async (req, res) => {
  try {
    const fileId = req.params.id;
    const filesData = readFilesDb();
    const file = filesData.find(f => f.id === fileId);
    
    if (!file) {
      return res.status(404).json({ error: 'File không tồn tại' });
    }
    
    if (!file.telegramFileId || file.fakeTelegramId) {
      return res.status(400).json({ 
        success: false, 
        message: 'File không có Telegram File ID hợp lệ'
      });
    }
    
    if (!botActive || !bot) {
      return res.status(503).json({ 
        success: false, 
        message: 'Bot Telegram không hoạt động'
      });
    }
    
    try {
      console.log(`Đang tải xuống file từ Telegram với ID: ${file.telegramFileId}`);
      const downloadUrl = await getTelegramFileLink(file.telegramFileId);
      
      // Lưu URL vào database để sử dụng sau
      const fileIndex = filesData.findIndex(f => f.id === fileId);
      if (fileIndex !== -1) {
        filesData[fileIndex].telegramUrl = downloadUrl;
        filesData[fileIndex].fakeTelegramUrl = false;
        filesData[fileIndex].fakeTelegramId = false;
        saveFilesDb(filesData);
      }
      
      // Tải file từ Telegram và chuyển tiếp đến client
      try {
        console.log(`Tải nội dung file từ URL: ${downloadUrl}`);
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
      } catch (axiosError) {
        console.error('Lỗi tải file từ Telegram:', axiosError);
        return res.status(500).json({
          success: false,
          message: `Lỗi khi tải file từ Telegram: ${axiosError.message}`
        });
      }
    } catch (error) {
      console.error('Lỗi lấy link file từ Telegram:', error);
      return res.status(500).json({ 
        success: false, 
        message: `Lỗi khi lấy link file từ Telegram: ${error.message}`
      });
    }
  } catch (error) {
    console.error('Lỗi xử lý download trực tiếp:', error);
    res.status(500).json({ 
      success: false, 
      message: `Lỗi server khi tải file: ${error.message}`
    });
  }
});

// API lấy thông tin file từ Telegram dựa vào telegramFileId
app.get('/api/telegram-file-info/:fileId', async (req, res) => {
  try {
    const telegramFileId = req.params.fileId;
    
    if (!telegramFileId) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu Telegram File ID'
      });
    }
    
    if (!botActive || !bot) {
      return res.status(503).json({
        success: false,
        message: 'Bot Telegram không hoạt động'
      });
    }
    
    try {
      // Lấy thông tin file từ Telegram API
      console.log(`Kiểm tra thông tin file Telegram với ID: ${telegramFileId}`);
      const fileInfo = await bot.telegram.getFile(telegramFileId);
      
      if (!fileInfo) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy thông tin file trên Telegram'
        });
      }
      
      // Tạo URL download trực tiếp
      const downloadUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileInfo.file_path}`;
      
      // Trả về thông tin file
      return res.json({
        success: true,
        fileInfo: {
          file_id: fileInfo.file_id,
          file_unique_id: fileInfo.file_unique_id,
          file_size: fileInfo.file_size,
          file_path: fileInfo.file_path,
          downloadUrl: downloadUrl
        }
      });
    } catch (error) {
      console.error(`Lỗi lấy thông tin file từ Telegram: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: `Lỗi lấy thông tin file từ Telegram: ${error.message}`
      });
    }
  } catch (error) {
    console.error(`Lỗi xử lý request: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: `Lỗi server: ${error.message}`
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
  // Chỉ tự động đồng bộ nếu bot đang hoạt động
  if (!botActive || !bot) {
    console.log('Bot không hoạt động, không thể tự động đồng bộ file');
    return false;
  }
  
  try {
    console.log(`Tự động đồng bộ file: ${file.name}`);
    
    // Kiểm tra xem file đã có telegramFileId chưa
    if (file.telegramFileId && !file.fakeTelegramId) {
      console.log(`File ${file.name} đã có Telegram FileID, bỏ qua`);
      return true;
    }
    
    // Kiểm tra xem file có tồn tại trên local không
    if (!file.localPath || !fs.existsSync(file.localPath)) {
      console.log(`File ${file.name} không tồn tại trên local, không thể đồng bộ`);
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
      fakeTelegramId: true,
      fakeTelegramUrl: true,
      localPath: filePath,
      uploadDate: new Date().toISOString(),
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