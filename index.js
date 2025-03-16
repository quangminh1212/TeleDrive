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
const CHAT_ID = process.env.CHAT_ID;
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
// Đường dẫn lưu trữ chính
const STORAGE_PATH = __dirname;

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
app.use(cors());

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
let needRestartBot = false;

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
  
  // Đọc lại file .env để đảm bảo có token mới nhất
  try {
    if (fs.existsSync('.env')) {
      const envConfig = dotenv.parse(fs.readFileSync('.env'));
      if (envConfig.BOT_TOKEN) {
        process.env.BOT_TOKEN = envConfig.BOT_TOKEN;
      }
      if (envConfig.CHAT_ID) {
        process.env.CHAT_ID = envConfig.CHAT_ID;
      }
    } else {
      console.error('File .env không tồn tại');
    }
  } catch (e) {
    console.error('Không thể đọc file .env:', e.message);
  }
  
  // Cập nhật biến toàn cục
  const botToken = process.env.BOT_TOKEN;
  
  console.log('Debug - Bot Token read from env:', botToken ? `${botToken.substring(0, 8)}...${botToken.substring(botToken.length - 5)}` : 'not set');
  
  if (!botToken || botToken === 'your_telegram_bot_token') {
    console.log('Bot token chưa được cấu hình. Vui lòng cập nhật file .env');
    return Promise.resolve(null);
  }
  
  try {
    // Kiểm tra kết nối trước khi khởi tạo bot
    console.log('Kiểm tra kết nối với Telegram API...');
    
    // Sử dụng fetch để kiểm tra kết nối
    return fetch(`https://api.telegram.org/bot${botToken}/getMe`)
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
        const newBot = new Telegraf(botToken);
        
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
          const bot = new Telegraf('${botToken}');
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

/**
 * Đảm bảo các thư mục cần thiết tồn tại
 * @param {Array} directories - Danh sách các thư mục cần kiểm tra
 */
function ensureDirectories(directories) {
  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Đã tạo thư mục: ${dir}`);
    }
  });
}

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
      
      // Kiểm tra và cập nhật trạng thái tất cả file trong một lần lặp
      data.forEach(file => {
        // Xác định loại file
        file.fileType = file.fileType || getFileType(file.name);
        
        // Kiểm tra trạng thái file
        if (file.localPath && fs.existsSync(file.localPath)) {
          file.fileStatus = 'local';
        } else if (file.telegramFileId) {
          file.fileStatus = 'telegram';
        } else {
          file.fileStatus = 'missing';
          file.needsSync = true; // Đánh dấu cần đồng bộ nếu file không có ở đâu cả
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
  console.log('===== BẮT ĐẦU QUÁ TRÌNH ĐỒNG BỘ FILES =====');
  // Đọc lại file .env để đảm bảo có token mới nhất
  try {
    if (fs.existsSync('.env')) {
      const envConfig = dotenv.parse(fs.readFileSync('.env'));
      if (envConfig.BOT_TOKEN) {
        process.env.BOT_TOKEN = envConfig.BOT_TOKEN;
        console.log('Đã cập nhật BOT_TOKEN từ file .env');
      }
      if (envConfig.CHAT_ID) {
        process.env.CHAT_ID = envConfig.CHAT_ID;
        console.log('Đã cập nhật CHAT_ID từ file .env');
      }
    }
  } catch (e) {
    console.error('Không thể đọc file .env:', e.message);
  }

  // Kiểm tra bot và khởi tạo lại nếu cần
  if (!bot || !botActive) {
    console.log('Bot Telegram không hoạt động. Thử khởi tạo lại...');
    try {
      bot = await initBot();
      botActive = await checkBotActive();
      
      if (!bot || !botActive) {
        console.error('Không thể đồng bộ files: Bot Telegram không hoạt động sau khi thử khởi tạo lại');
        return 0;
      } else {
        console.log('Đã khởi tạo lại bot Telegram thành công');
      }
    } catch (error) {
      console.error('Lỗi khởi tạo lại bot:', error);
      return 0;
    }
  } else {
    console.log('Bot Telegram đang hoạt động tốt');
  }

  // Cập nhật biến môi trường để đảm bảo đã có giá trị mới nhất
  const chatId = process.env.CHAT_ID;
  
  if (!chatId) {
    console.error('Không thể đồng bộ files: CHAT_ID chưa được cấu hình');
    return 0;
  }

  console.log(`Bắt đầu đồng bộ files với Telegram... (CHAT_ID: ${chatId})`);
  
  try {
    // Đọc dữ liệu file
    let filesData = readFilesDb();
    console.log(`Tổng số files trong database: ${filesData.length}`);
    
    // Lọc các file cần đồng bộ
    let filesToSync = filesData.filter(file => 
      (file.needsSync || !file.telegramFileId) && 
      file.localPath && 
      fs.existsSync(file.localPath)
    );
    
    console.log(`Tìm thấy ${filesToSync.length} file cần đồng bộ`);

    // Hiển thị danh sách file cần đồng bộ (tối đa 5 file)
    if (filesToSync.length > 0) {
      console.log('Danh sách một số file cần đồng bộ:');
      filesToSync.slice(0, 5).forEach((file, index) => {
        console.log(`${index + 1}. ${file.name} (${file.size} bytes)`);
      });
      if (filesToSync.length > 5) {
        console.log(`... và ${filesToSync.length - 5} file khác`);
      }
    }
    
    if (filesToSync.length === 0) {
      // Nếu không có file cần đồng bộ, kiểm tra xem database có rỗng không
      if (filesData.length === 0) {
        console.log('Database rỗng. Thử lấy files từ Telegram...');
        // Thử lấy files từ Telegram nếu database rỗng
        try {
          console.log('Database rỗng, thử lấy files từ Telegram...');
          // Thực hiện logic lấy files từ Telegram ở đây nếu cần
        } catch (error) {
          console.error('Lỗi khi lấy files từ Telegram:', error);
        }
      }
      
      console.log('Không có file nào cần đồng bộ');
      return 0;
    }
    
    let syncedCount = 0;
    let retryCount = 0;
    const maxRetries = 3;
    
    // Với mỗi file cần đồng bộ
    for (const file of filesToSync) {
      try {
        console.log(`Đang đồng bộ file "${file.name}"...`);
        
        // Đảm bảo encode tên file tiếng Việt đúng
        const filePath = Buffer.from(file.localPath, 'utf8').toString();
        console.log(`Đường dẫn file: ${filePath}`);
        
        // Kiểm tra xem file có tồn tại không
        if (!fs.existsSync(filePath)) {
          console.error(`File không tồn tại: ${filePath}`);
          file.syncError = `File không tồn tại tại đường dẫn: ${filePath}`;
          file.needsSync = true;
          continue;
        }
        
        // Kiểm tra kích thước file
        const stats = fs.statSync(filePath);
        console.log(`Kích thước file: ${formatBytes(stats.size)}`);
        
        if (stats.size > MAX_FILE_SIZE) {
          console.error(`File "${file.name}" quá lớn (${formatBytes(stats.size)}) để gửi qua Telegram.`);
          file.syncError = `File quá lớn (${formatBytes(stats.size)}) để đồng bộ với Telegram`;
          file.needsSync = true;
          continue;
        }
        
        // Tạo caption từ tên file
        const caption = `File: ${file.name}`;
        console.log(`Chuẩn bị gửi file lên Telegram với caption: "${caption}"`);
        
        // Gửi file lên Telegram với timeout 2 phút
        console.log(`Đang gửi file "${file.name}" lên Telegram (chatId: ${chatId})...`);
        
        try {
          const sendPromise = (() => {
            // Xác định loại file để gửi đúng cách
            if (file.fileType === 'image') {
              console.log(`Gửi file "${file.name}" như hình ảnh`);
              return bot.telegram.sendPhoto(chatId, { source: filePath }, { caption: caption });
            } else if (file.fileType === 'video') {
              console.log(`Gửi file "${file.name}" như video`);
              return bot.telegram.sendVideo(chatId, { source: filePath }, { caption: caption });
            } else if (file.fileType === 'audio') {
              console.log(`Gửi file "${file.name}" như audio`);
              return bot.telegram.sendAudio(chatId, { source: filePath }, { caption: caption });
            } else {
              console.log(`Gửi file "${file.name}" như document`);
              return bot.telegram.sendDocument(chatId, {
                source: filePath,
                filename: file.name
              }, {
                caption: caption
              });
            }
          })();
          
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout khi gửi file lên Telegram')), 120000); // 2 phút
          });
          
          console.log(`Đang chờ kết quả gửi file "${file.name}"...`);
          const result = await Promise.race([sendPromise, timeoutPromise]);
          
          console.log(`Đã nhận phản hồi từ Telegram cho file "${file.name}"`);
          
          // Lấy file_id dựa trên loại file
          let fileId = null;
          if (result.document) {
            fileId = result.document.file_id;
          } else if (result.photo) {
            fileId = result.photo[result.photo.length - 1].file_id;
          } else if (result.video) {
            fileId = result.video.file_id;
          } else if (result.audio) {
            fileId = result.audio.file_id;
          } else {
            console.warn(`Không tìm thấy file_id cho file "${file.name}"`);
          }
          
          // Cập nhật thông tin file
          file.telegramFileId = fileId;
          file.telegramMessageId = result.message_id;
          file.telegramChatId = chatId;
          file.syncedAt = new Date().toISOString();
          file.needsSync = false;
          file.syncError = null;
          
          syncedCount++;
          console.log(`Đã đồng bộ file "${file.name}" thành công (file_id: ${fileId})`);
        } catch (sendError) {
          console.error(`Lỗi khi gửi file "${file.name}" lên Telegram:`, sendError);
          throw sendError; // Để xử lý ở phần catch bên ngoài
        }
      } catch (error) {
        console.error(`Lỗi đồng bộ file "${file.name}":`, error);
        
        // Thử lại nếu cần
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`Thử lại lần ${retryCount}/${maxRetries} cho file "${file.name}"...`);
          // Chờ 2 giây trước khi thử lại
          await new Promise(resolve => setTimeout(resolve, 2000));
          file.needsSync = true;
          file.syncError = `Lỗi đồng bộ: ${error.message}. Đã thử ${retryCount}/${maxRetries} lần.`;
        } else {
          file.syncError = `Lỗi đồng bộ sau ${maxRetries} lần thử: ${error.message}`;
          file.needsSync = true;
          console.error(`Đã vượt quá số lần thử lại cho file "${file.name}". Bỏ qua file này.`);
        }
      }
    }
    
    // Lưu lại thông tin file
    console.log(`Lưu thông tin ${filesData.length} files vào database...`);
    saveFilesDb(filesData);
    
    console.log(`===== KẾT THÚC QUÁ TRÌNH ĐỒNG BỘ =====`);
    console.log(`Đã đồng bộ thành công ${syncedCount}/${filesToSync.length} files với Telegram`);
    return syncedCount;
  } catch (error) {
    console.error('Lỗi khi đồng bộ files:', error);
    return 0;
  }
}

/**
 * Lấy danh sách file từ Telegram
 */
async function getFilesFromTelegram() {
  try {
    if (!bot || !botActive) {
      console.error('Bot Telegram không hoạt động. Không thể lấy file từ Telegram.');
      return;
    }
    
    console.log('Đang lấy danh sách file từ Telegram...');
    
    // Lấy chat id
    const chatId = CHAT_ID;
    if (!chatId || chatId === 'your_chat_id_here') {
      console.error('CHAT_ID chưa được cấu hình trong file .env.');
      return;
    }
    
    try {
      // Đọc dữ liệu hiện tại
      const filesData = readFilesDb();
      let newFileCount = 0;
      
      // Thử lấy 100 message gần nhất từ chat
      const messages = await bot.telegram.getChatHistory(chatId, { limit: 100 });
      
      if (!messages || messages.length === 0) {
        console.log('Không tìm thấy tin nhắn nào trong chat.');
        return;
      }
      
      console.log(`Tìm thấy ${messages.length} tin nhắn, đang xử lý...`);
      
      // Duyệt qua từng tin nhắn để tìm file
      for (const message of messages) {
        let fileObj = null;
        let fileId = null;
        let fileType = 'document';
        let fileSize = 0;
        let fileName = '';
        
        // Kiểm tra loại file
        if (message.photo && message.photo.length > 0) {
          fileObj = message.photo[message.photo.length - 1];
          fileId = fileObj.file_id;
          fileType = 'image';
          fileSize = fileObj.file_size || 0;
          fileName = message.caption || `photo_${new Date(message.date * 1000).toISOString().replace(/[:.]/g, '-')}.jpg`;
        } else if (message.video) {
          fileObj = message.video;
          fileId = fileObj.file_id;
          fileType = 'video';
          fileSize = fileObj.file_size || 0;
          fileName = message.caption || fileObj.file_name || `video_${new Date(message.date * 1000).toISOString().replace(/[:.]/g, '-')}.mp4`;
        } else if (message.audio) {
          fileObj = message.audio;
          fileId = fileObj.file_id;
          fileType = 'audio';
          fileSize = fileObj.file_size || 0;
          fileName = message.caption || fileObj.file_name || `audio_${new Date(message.date * 1000).toISOString().replace(/[:.]/g, '-')}.mp3`;
        } else if (message.document) {
          fileObj = message.document;
          fileId = fileObj.file_id;
          fileType = getFileType(fileObj.file_name || '');
          fileSize = fileObj.file_size || 0;
          fileName = message.caption || fileObj.file_name || `document_${new Date(message.date * 1000).toISOString().replace(/[:.]/g, '-')}`;
        }
        
        // Nếu tìm thấy file
        if (fileId) {
          // Kiểm tra xem file đã tồn tại trong database chưa
          const existingFile = filesData.find(f => f.telegramFileId === fileId);
          
          if (!existingFile) {
            // Lấy đường dẫn tải xuống
            const fileInfo = await bot.telegram.getFile(fileId);
            let telegramUrl = null;
            
            if (fileInfo && fileInfo.file_path) {
              telegramUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileInfo.file_path}`;
            }
            
            // Thêm file mới vào database
            const newFile = {
              id: uuidv4(),
              name: fileName,
              originalName: fileName,
              size: fileSize,
              mimeType: getMimeType(path.extname(fileName)),
              fileType: fileType,
              telegramFileId: fileId,
              telegramUrl: telegramUrl,
              localPath: null,
              uploadDate: new Date(message.date * 1000).toISOString(),
              fileStatus: 'telegram',
              user: null
            };
            
            filesData.push(newFile);
            newFileCount++;
          }
        }
      }
      
      if (newFileCount > 0) {
        console.log(`Đã tìm thấy ${newFileCount} file mới từ Telegram. Lưu vào database...`);
        saveFilesDb(filesData);
      } else {
        console.log('Không tìm thấy file mới từ Telegram.');
      }
      
      return newFileCount;
    } catch (error) {
      console.error('Lỗi lấy tin nhắn từ Telegram:', error);
    }
  } catch (error) {
    console.error('Lỗi lấy danh sách file từ Telegram:', error);
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
      (!file.telegramFileId)
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
        
        // Lấy link file với timeout
        try {
          const downloadUrl = await getTelegramFileLink(telegramFileId);
          file.telegramUrl = downloadUrl;
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
      !f.telegramFileId || 
      (!f.localPath && !f.telegramUrl)
    ).length;
    
    // Render trang chủ
    res.render('index', {
      title: 'TeleDrive',
      files: formattedFiles,
      botActive: isBotActive,
      storageInfo,
      problemFiles,
      error: null,
      formatBytes: formatBytes,
      formatDate: formatDate
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
      setTimeout(() => reject(new Error('Timeout khi lấy link file từ Telegram')), 30000);
    });
    
    // Sử dụng Promise.race cho cả getFile và timeout
    const fileInfo = await Promise.race([bot.telegram.getFile(fileId), timeoutPromise]);
    
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
          
          if (updatedFile && updatedFile.telegramFileId) {
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
      if (updatedFile && updatedFile.telegramFileId) {
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
      filesData[fileIndex].telegramUrl = null;
      
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
    if (!bot || !botActive) {
      console.log(`Bot Telegram không hoạt động. Không thể tự động đồng bộ file ${file.name}`);
      return false;
    }
    
    console.log(`Tự động đồng bộ file: ${file.name}`);
    
    // Kiểm tra file có tồn tại không
    if (!file.localPath) {
      console.log(`File ${file.name} không có đường dẫn local, không thể đồng bộ.`);
      return false;
    }
    
    // Kiểm tra file có tồn tại trên hệ thống không
    if (!fs.existsSync(file.localPath)) {
      console.log(`File ${file.name} không tồn tại tại đường dẫn ${file.localPath}, không thể đồng bộ.`);
      return false;
    }
    
    // ID chat để gửi file
    let chatId;
    
    if (CHAT_ID && CHAT_ID !== 'your_chat_id_here') {
      // Sử dụng CHAT_ID từ file .env
      chatId = CHAT_ID;
    } else {
      console.error('CHAT_ID chưa được cấu hình trong file .env. Không thể đồng bộ file.');
      return false;
    }
    
    // Gửi file lên Telegram
    let message;
    
    try {
      if (file.fileType === 'image') {
        message = await bot.telegram.sendPhoto(chatId, { source: file.localPath });
      } else if (file.fileType === 'video') {
        message = await bot.telegram.sendVideo(chatId, { source: file.localPath });
      } else if (file.fileType === 'audio') {
        message = await bot.telegram.sendAudio(chatId, { source: file.localPath });
      } else {
        message = await bot.telegram.sendDocument(chatId, { source: file.localPath });
      }
    } catch (err) {
      console.error(`Lỗi tự động đồng bộ file ${file.name}:`, err);
      return false;
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
      console.log(`Không lấy được Telegram File ID sau khi upload file ${file.name}`);
      return false;
    }
    
    // Cập nhật thông tin file
    file.telegramFileId = telegramFileId;
    file.needsSync = false;
    
    // Lấy đường dẫn tải xuống
    const fileInfo = await bot.telegram.getFile(telegramFileId);
    if (fileInfo && fileInfo.file_path) {
      const downloadUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileInfo.file_path}`;
      file.telegramUrl = downloadUrl;
    }
    
    // Đọc danh sách file từ database
    const filesData = readFilesDb();
    
    // Tìm và cập nhật file trong database
    const fileIndex = filesData.findIndex(f => f.id === file.id);
    if (fileIndex !== -1) {
      filesData[fileIndex] = file;
      saveFilesDb(filesData);
      console.log(`Đã tự động đồng bộ file ${file.name} thành công`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Lỗi tự động đồng bộ file ${file.name}:`, error);
    console.log(`Không thể tự động đồng bộ file ${file.name}, sẽ đồng bộ sau`);
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
    
    // Nếu bot hoạt động, thử đồng bộ file với Telegram
    if (botActive && bot && filesData[fileIndex].localPath && fs.existsSync(filesData[fileIndex].localPath)) {
      try {
        console.log(`Đang thử đồng bộ file "${filesData[fileIndex].name}" lên Telegram...`);
        
        // Lấy chat ID
        const botInfo = await bot.telegram.getMe();
        const chatId = botInfo.id;
        
        // Gửi file lên Telegram
        let message;
        if (filesData[fileIndex].fileType === 'image') {
          message = await bot.telegram.sendPhoto(chatId, { source: filesData[fileIndex].localPath });
        } else if (filesData[fileIndex].fileType === 'video') {
          message = await bot.telegram.sendVideo(chatId, { source: filesData[fileIndex].localPath });
        } else if (filesData[fileIndex].fileType === 'audio') {
          message = await bot.telegram.sendAudio(chatId, { source: filesData[fileIndex].localPath });
        } else {
          message = await bot.telegram.sendDocument(chatId, { source: filesData[fileIndex].localPath });
        }
        
        // Lấy file ID
        let telegramFileId = null;
        if (filesData[fileIndex].fileType === 'image' && message.photo && message.photo.length > 0) {
          telegramFileId = message.photo[message.photo.length - 1].file_id;
        } else if (filesData[fileIndex].fileType === 'video' && message.video) {
          telegramFileId = message.video.file_id;
        } else if (filesData[fileIndex].fileType === 'audio' && message.audio) {
          telegramFileId = message.audio.file_id;
        } else if (message.document) {
          telegramFileId = message.document.file_id;
        }
        
        if (telegramFileId) {
          filesData[fileIndex].telegramFileId = telegramFileId;
          
          // Lấy URL
          const fileInfo = await bot.telegram.getFile(telegramFileId);
          if (fileInfo && fileInfo.file_path) {
            const downloadUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileInfo.file_path}`;
            filesData[fileIndex].telegramUrl = downloadUrl;
            saveFilesDb(filesData);
            
            return res.json({
              success: true,
              message: 'Đã sửa thông tin file và đồng bộ lên Telegram thành công',
              downloadUrl: downloadUrl
            });
          }
        }
      } catch (error) {
        console.error('Lỗi đồng bộ file lên Telegram:', error);
      }
    } else if (botActive && bot && filesData[fileIndex].telegramFileId) {
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
      message: 'Đã sửa thông tin file, vui lòng thử đồng bộ hoặc tải lên lại',
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
    console.log('Bắt đầu kiểm tra và sửa dữ liệu file...');
    
    // Đọc danh sách file từ database
    const filesData = readFilesDb();
    
    // Kiểm tra từng file
    let fixedCount = 0;
    let problemCount = 0;
    
    for (const file of filesData) {
      let needFix = false;
      
      // Kiểm tra file có tồn tại không
      const fileExists = file.localPath && fs.existsSync(file.localPath);
      
      // Kiểm tra telegramFileId
      const hasTelegramId = !!file.telegramFileId;
      
      // Đánh dấu file cần đồng bộ nếu không có telegramFileId
      if (!hasTelegramId && fileExists) {
        file.needsSync = true;
        needFix = true;
        problemCount++;
      }
      
      // Đánh dấu file đã bị xóa nếu không tồn tại local và không có telegramFileId
      if (!fileExists && !hasTelegramId) {
        file.deleted = true;
        needFix = true;
        problemCount++;
      }
      
      if (needFix) {
        fixedCount++;
      }
    }
    
    // Lọc bỏ các file đã bị xóa
    const newFilesData = filesData.filter(file => !file.deleted);
    
    // Lưu lại database
    saveFilesDb(newFilesData);
    
    res.json({
      success: true,
      message: `Đã kiểm tra ${filesData.length} file, sửa ${fixedCount} file có vấn đề, xóa ${filesData.length - newFilesData.length} file không tồn tại.`,
      totalFiles: filesData.length,
      fixedCount,
      problemCount,
      deletedCount: filesData.length - newFilesData.length
    });
  } catch (error) {
    console.error('Lỗi kiểm tra file:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi kiểm tra file: ' + error.message
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

// API endpoint để kiểm tra trạng thái hoạt động
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    message: 'TeleDrive API đang hoạt động',
    version: '1.0.0',
    botActive: botActive
  });
});

// Mở rộng dữ liệu file để hỗ trợ thư mục
function createVirtualFolderStructure(files) {
  // Tạo cấu trúc thư mục ảo
  const rootFolder = {
    id: 'root',
    name: 'Root',
    type: 'folder',
    parent: null,
    children: [],
    createdAt: new Date().toISOString()
  };
  
  // Lưu tất cả thư mục bằng ID
  const foldersById = { 'root': rootFolder };
  
  // Trích xuất tất cả thư mục từ đường dẫn file
  files.forEach(file => {
    // Lấy tên file và đường dẫn thư mục
    let filePath = file.name;
    let folders = [];
    
    // Nếu file có dấu / hoặc \, phân tách thành thư mục
    if (filePath.includes('/') || filePath.includes('\\')) {
      // Chuẩn hóa đường dẫn
      const normalizedPath = filePath.replace(/\\/g, '/');
      const parts = normalizedPath.split('/');
      
      // File là phần tử cuối cùng
      const fileName = parts.pop();
      
      // Các phần còn lại là thư mục
      folders = parts;
      
      // Cập nhật tên file không bao gồm đường dẫn
      file.displayName = fileName;
    } else {
      file.displayName = filePath;
    }
    
    // Tạo các thư mục nếu chưa tồn tại
    let currentParent = 'root';
    let currentPath = '';
    
    folders.forEach(folderName => {
      currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;
      const folderId = `folder_${currentPath.replace(/[^a-z0-9]/gi, '_')}`;
      
      if (!foldersById[folderId]) {
        // Tạo thư mục mới
        const newFolder = {
          id: folderId,
          name: folderName,
          type: 'folder',
          parent: currentParent,
          children: [],
          path: currentPath,
          createdAt: new Date().toISOString()
        };
        
        // Thêm vào danh sách thư mục
        foldersById[folderId] = newFolder;
        
        // Thêm vào thư mục cha
        foldersById[currentParent].children.push(folderId);
      }
      
      currentParent = folderId;
    });
    
    // Gán file vào thư mục cha
    file.parent = currentParent;
    file.type = 'file';
    
    // Thêm file vào thư mục cha
    foldersById[currentParent].children.push(file.id);
  });
  
  return {
    rootFolder,
    foldersById,
    folderTree: buildFolderTree(rootFolder, foldersById, files)
  };
}

// Xây dựng cây thư mục từ thư mục gốc
function buildFolderTree(folder, foldersById, files) {
  // Tạo bản sao để tránh thay đổi dữ liệu gốc
  const result = {
    ...folder,
    children: []
  };
  
  // Duyệt qua từng children ID
  folder.children.forEach(childId => {
    // Nếu ID bắt đầu bằng "folder_", đó là thư mục
    if (typeof childId === 'string' && foldersById[childId]) {
      // Đệ quy xây dựng cây con
      const childFolder = buildFolderTree(foldersById[childId], foldersById, files);
      result.children.push(childFolder);
    } else {
      // Đây là file, thêm vào danh sách
      const file = files.find(f => f.id === childId);
      if (file) {
        result.children.push({
          ...file,
          children: []
        });
      }
    }
  });
  
  return result;
}

// API endpoint để lấy cấu trúc thư mục
app.get('/api/folders', (req, res) => {
  try {
    const filesData = readFilesDb();
    const folderStructure = createVirtualFolderStructure(filesData);
    
    res.json({
      success: true,
      folders: folderStructure.folderTree
    });
  } catch (error) {
    console.error('Lỗi lấy cấu trúc thư mục:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy cấu trúc thư mục: ' + error.message
    });
  }
});

// API endpoint để lấy nội dung của thư mục
app.get('/api/folders/:folderId', (req, res) => {
  try {
    const folderId = req.params.folderId;
    const filesData = readFilesDb();
    const folderStructure = createVirtualFolderStructure(filesData);
    
    // Nếu folderId là 'root', trả về thư mục gốc
    if (folderId === 'root') {
      return res.json({
        success: true,
        folder: folderStructure.folderTree
      });
    }
    
    // Tìm thư mục theo ID
    const folder = folderStructure.foldersById[folderId];
    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thư mục'
      });
    }
    
    // Xây dựng cây thư mục từ thư mục này
    const folderTree = buildFolderTree(folder, folderStructure.foldersById, filesData);
    
    res.json({
      success: true,
      folder: folderTree
    });
  } catch (error) {
    console.error('Lỗi lấy nội dung thư mục:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy nội dung thư mục: ' + error.message
    });
  }
});

// API để tìm kiếm file
app.get('/api/search', (req, res) => {
  try {
    const { query, type } = req.query;
    
    if (!query || query.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Từ khóa tìm kiếm không được để trống'
      });
    }
    
    // Đọc database
    const filesData = readFilesDb();
    
    // Tìm kiếm file
    let results;
    
    if (type && type !== 'all') {
      // Tìm theo loại file
      results = filesData.filter(file => 
        (file.name.toLowerCase().includes(query.toLowerCase()) || 
         (file.tags && file.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase())))) &&
        file.fileType === type && 
        !file.isDeleted
      );
    } else {
      // Tìm tất cả loại file
      results = filesData.filter(file => 
        (file.name.toLowerCase().includes(query.toLowerCase()) || 
         (file.tags && file.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase())))) &&
        !file.isDeleted
      );
    }
    
    // Định dạng dữ liệu trước khi gửi đi
    const formattedResults = results.map(file => ({
      id: file.id,
      name: file.name,
      size: file.size,
      formattedSize: formatBytes(file.size),
      uploadDate: file.uploadDate,
      formattedDate: formatDate(file.uploadDate),
      mimeType: file.mimeType,
      fileType: file.fileType,
      localPath: file.localPath ? true : false,
      telegramFileId: file.telegramFileId ? true : false,
      downloadUrl: `/api/files/${file.id}/download`,
      previewUrl: `/api/files/${file.id}/preview`,
      tags: file.tags || []
    }));
    
    // Trả về kết quả
    return res.json({
      success: true,
      count: formattedResults.length,
      results: formattedResults,
      query: query,
      type: type || 'all'
    });
  } catch (error) {
    console.error('Lỗi tìm kiếm file:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi server khi tìm kiếm file'
    });
  }
});

// API để chia sẻ file
app.post('/api/files/:id/share', express.json(), (req, res) => {
  try {
    const fileId = req.params.id;
    const { isPublic, expiryDate } = req.body;
    
    const filesData = readFilesDb();
    const fileIndex = filesData.findIndex(f => f.id === fileId);
    
    if (fileIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'File không tồn tại'
      });
    }
    
    // Tạo mã chia sẻ ngẫu nhiên nếu chưa có
    if (!filesData[fileIndex].shareCode) {
      const shareCode = crypto.randomBytes(6).toString('hex');
      filesData[fileIndex].shareCode = shareCode;
    }
    
    // Cập nhật thông tin chia sẻ
    filesData[fileIndex].isPublic = isPublic === true;
    
    // Đặt ngày hết hạn nếu có
    if (expiryDate) {
      filesData[fileIndex].shareExpiry = new Date(expiryDate).toISOString();
    } else {
      filesData[fileIndex].shareExpiry = null;
    }
    
    // Lưu lại database
    saveFilesDb(filesData);
    
    // Tạo URL chia sẻ
    const shareUrl = `/share/${filesData[fileIndex].shareCode}`;
    
    res.json({
      success: true,
      message: 'Đã cập nhật thiết lập chia sẻ',
      shareInfo: {
        fileId: fileId,
        fileName: filesData[fileIndex].name,
        isPublic: filesData[fileIndex].isPublic,
        shareCode: filesData[fileIndex].shareCode,
        shareUrl: shareUrl,
        expiryDate: filesData[fileIndex].shareExpiry
      }
    });
  } catch (error) {
    console.error('Lỗi cập nhật chia sẻ file:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi cập nhật chia sẻ: ' + error.message
    });
  }
});

// Trang xem file được chia sẻ
app.get('/share/:shareCode', async (req, res) => {
  try {
    const shareCode = req.params.shareCode;
    const filesData = readFilesDb();
    
    // Tìm file theo mã chia sẻ
    const file = filesData.find(f => f.shareCode === shareCode);
    
    if (!file) {
      return res.status(404).render('error', {
        title: 'TeleDrive - Link không tồn tại',
        message: 'Link chia sẻ không tồn tại hoặc đã hết hạn',
        error: { status: 404, stack: 'File không tồn tại hoặc link chia sẻ đã bị xóa' }
      });
    }
    
    // Kiểm tra xem link đã hết hạn chưa
    if (file.shareExpiry) {
      const expiryDate = new Date(file.shareExpiry);
      if (expiryDate < new Date()) {
        return res.status(410).render('error', {
          title: 'TeleDrive - Link hết hạn',
          message: 'Link chia sẻ đã hết hạn',
          error: { status: 410, stack: 'Link chia sẻ này đã quá hạn sử dụng' }
        });
      }
    }
    
    // Kiểm tra xem file có được chia sẻ công khai không
    if (!file.isPublic) {
      return res.status(403).render('error', {
        title: 'TeleDrive - Không có quyền truy cập',
        message: 'File này không được chia sẻ công khai',
        error: { status: 403, stack: 'Bạn không có quyền truy cập file này' }
      });
    }
    
    // Định dạng dữ liệu file
    const formattedFile = {
      id: file.id,
      name: file.name,
      size: file.size,
      formattedSize: formatBytes(file.size),
      uploadDate: file.uploadDate,
      formattedDate: formatDate(file.uploadDate),
      fileType: file.fileType || getFileType(file.name),
      downloadUrl: `/api/files/${file.id}/download?shareCode=${shareCode}`
    };
    
    // Render trang xem file được chia sẻ
    res.render('file-details', {
      title: `TeleDrive - ${file.name}`,
      file: formattedFile,
      isSharedView: true,
      shareCode: shareCode
    });
  } catch (error) {
    console.error('Lỗi xử lý file chia sẻ:', error);
    res.status(500).render('error', {
      title: 'TeleDrive - Lỗi',
      message: 'Lỗi xử lý yêu cầu',
      error: { status: 500, stack: error.message }
    });
  }
});

/**
 * Kiểm tra file .env
 * Nếu file .env không tồn tại, tạo từ file .env.example
 */
function checkEnvFile() {
  try {
    if (!fs.existsSync('.env')) {
      console.log('File .env không tồn tại, tạo từ file .env.example');
      if (fs.existsSync('.env.example')) {
        fs.copyFileSync('.env.example', '.env');
        console.log('Đã tạo file .env từ file .env.example');
      } else {
        console.log('File .env.example không tồn tại, tạo file .env trống');
        fs.writeFileSync('.env', 'PORT=5002\nBOT_TOKEN=\nMAX_FILE_SIZE=1000\n');
      }
    }
  } catch (error) {
    console.error('Lỗi kiểm tra file .env:', error);
  }
}

/**
 * Xử lý các tham số dòng lệnh 
 */
async function handleCommandLineArgs() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    // Không có tham số, khởi động bình thường
    return false;
  }

  const command = args[0].toLowerCase();
  
  switch (command) {
    case 'sync':
      console.log('Đang đồng bộ files với Telegram...');
      try {
        await initBot().then(async (botInstance) => {
          if (botInstance) {
            bot = botInstance;
            botActive = await checkBotActive();
            if (botActive) {
              const syncedCount = await syncFiles();
              console.log(`Đã đồng bộ ${syncedCount} files với Telegram.`);
            } else {
              console.log('Bot không hoạt động, không thể đồng bộ files.');
            }
          } else {
            console.log('Không thể khởi tạo bot, không thể đồng bộ files.');
          }
        });
      } catch (error) {
        console.error('Lỗi đồng bộ files:', error);
      }
      return false;
      
    case 'clean':
      console.log('Đang dọn dẹp uploads...');
      try {
        await initBot().then(async (botInstance) => {
          if (botInstance) {
            bot = botInstance;
            botActive = await checkBotActive();
            if (botActive) {
              const cleanedCount = await cleanUploads();
              console.log(`Đã dọn dẹp ${cleanedCount} files.`);
            } else {
              console.log('Bot không hoạt động, không thể dọn dẹp uploads.');
            }
          } else {
            console.log('Không thể khởi tạo bot, không thể dọn dẹp uploads.');
          }
        });
      } catch (error) {
        console.error('Lỗi dọn dẹp uploads:', error);
      }
      return false;
      
    default:
      console.log(`Lệnh không hợp lệ: ${command}`);
      return false;
  }
}

// Make sure to place this right above the last middleware error handlers
// Move the error and 404 handlers to the very end of routes

app.use((err, req, res, next) => {
  console.error('Lỗi server:', err);
  res.status(500).json({
    success: false,
    error: 'Lỗi server: ' + (err.message || 'Không xác định')
  });
});

// Khởi động chương trình
(async function startApplication() {
  // Thử khởi tạo bot Telegram với tối đa 3 lần
  let botInitAttempts = 0;
  const maxBotInitAttempts = 3;
  
  while (botInitAttempts < maxBotInitAttempts) {
    botInitAttempts++;
    
    try {
      bot = await initBot();
      botActive = await checkBotActive();
      
      if (bot && botActive) {
        console.log(`Khởi tạo bot thành công sau ${botInitAttempts} lần thử.`);
        break;
      } else {
        console.log(`Không thể khởi tạo bot (lần thử ${botInitAttempts}/${maxBotInitAttempts}).`);
        
        if (botInitAttempts < maxBotInitAttempts) {
          // Chờ trước khi thử lại
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    } catch (error) {
      console.error(`Lỗi khởi tạo bot (lần thử ${botInitAttempts}/${maxBotInitAttempts}):`, error);
      
      if (botInitAttempts < maxBotInitAttempts) {
        // Chờ trước khi thử lại
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  
  // Print bot and chat id info for debugging
  console.log('Current BOT_TOKEN:', process.env.BOT_TOKEN ? `${process.env.BOT_TOKEN.substring(0, 8)}...` : 'not set');
  console.log('Current CHAT_ID:', process.env.CHAT_ID || 'not set');
  
  // Xử lý tham số dòng lệnh nếu có
  const shouldExit = await handleCommandLineArgs();
  if (shouldExit) {
    process.exit(0);
  }
  
  // Khởi động server
  try {
    // Middleware xử lý route không tồn tại - đặt trước khi khởi động server
    app.use((req, res) => {
      console.log(`Route không tồn tại: ${req.method} ${req.path}`);
      res.status(404).json({
        success: false,
        error: 'API endpoint không tồn tại'
      });
    });
    
    app.listen(PORT, () => {
      console.log(`TeleDrive đang chạy trên http://localhost:${PORT}`);
      console.log(`Bot Telegram ${botActive ? 'đã kết nối' : 'chưa kết nối'}`);
    });
  } catch (error) {
    if (error.code === 'EADDRINUSE') {
      console.error(`Cổng ${PORT} đã được sử dụng. Vui lòng chọn cổng khác hoặc dừng ứng dụng đang chạy.`);
      process.exit(1);
    } else {
      console.error('Lỗi khởi động server:', error);
      process.exit(1);
    }
  }
})();

// Export các hàm cần thiết
module.exports = {
  syncFiles,
  cleanUploads
};

// API endpoint để lấy cài đặt
app.get('/api/settings', (req, res) => {
  try {
    // Lấy cài đặt từ file .env
    const settings = {
      botToken: BOT_TOKEN || '',
      chatId: CHAT_ID || ''
    };
    
    // Che giấu một phần bot token nếu đã được cài đặt
    if (settings.botToken && settings.botToken !== 'your_telegram_bot_token') {
      // Lấy 8 ký tự đầu và 5 ký tự cuối
      const firstPart = settings.botToken.substring(0, 8);
      const lastPart = settings.botToken.substring(settings.botToken.length - 5);
      settings.botToken = `${firstPart}...${lastPart}`;
    }
    
    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Lỗi lấy cài đặt:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi lấy cài đặt'
    });
  }
});

// API endpoint để cập nhật cài đặt
app.post('/api/settings', (req, res) => {
  try {
    const { botToken, chatId, restartAfterSave } = req.body;
    
    if (!botToken) {
      return res.status(400).json({
        success: false,
        error: 'Bot Token không được để trống'
      });
    }
    
    // Đọc nội dung file .env
    const envPath = path.join(__dirname, '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Cập nhật BOT_TOKEN
    envContent = envContent.replace(/BOT_TOKEN=.*$/m, `BOT_TOKEN=${botToken}`);
    
    // Cập nhật CHAT_ID nếu có
    if (chatId) {
      if (envContent.includes('CHAT_ID=')) {
        envContent = envContent.replace(/CHAT_ID=.*$/m, `CHAT_ID=${chatId}`);
      } else {
        // Thêm CHAT_ID nếu chưa có
        envContent += `\nCHAT_ID=${chatId}\n`;
      }
    }
    
    // Ghi file .env
    fs.writeFileSync(envPath, envContent);
    
    // Đánh dấu cần khởi động lại bot
    needRestartBot = true;
    
    // Nếu cần khởi động lại server
    if (restartAfterSave) {
      // Khởi động lại bot
      setTimeout(async () => {
        try {
          // Khởi động lại bot
          bot = await initBot();
          botActive = await checkBotActive();
        } catch (error) {
          console.error('Lỗi khởi động lại bot:', error);
        }
      }, 1000);
    }
    
    res.json({
      success: true,
      message: 'Đã lưu cài đặt thành công',
      needsRestart: restartAfterSave
    });
  } catch (error) {
    console.error('Lỗi cập nhật cài đặt:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi cập nhật cài đặt'
    });
  }
});

// API endpoint để đồng bộ file
app.post('/api/sync', async (req, res) => {
  console.log('===== API ĐỒNG BỘ FILES =====');
  try {
    if (!bot || !botActive) {
      console.error('API Sync: Bot Telegram không hoạt động');
      return res.status(400).json({
        success: false,
        error: 'Bot Telegram không hoạt động'
      });
    }
    
    // Kiểm tra CHAT_ID
    const chatId = process.env.CHAT_ID;
    if (!chatId) {
      console.error('API Sync: CHAT_ID chưa được cài đặt');
      return res.status(400).json({
        success: false,
        error: 'CHAT_ID chưa được cài đặt'
      });
    }
    
    // Kiểm tra xem có đang đồng bộ không
    let isSyncing = false;
    
    // Đồng bộ files
    console.log('API Sync: Bắt đầu đồng bộ files...');
    isSyncing = true;
    
    // Đọc database trước khi đồng bộ
    const beforeSync = readFilesDb();
    const beforeStats = {
      total: beforeSync.length,
      synced: beforeSync.filter(f => f.telegramFileId && !f.needsSync).length,
      needsSync: beforeSync.filter(f => f.needsSync).length,
      errors: beforeSync.filter(f => f.syncError).length
    };
    
    console.log(`API Sync: Thống kê trước khi đồng bộ: ${JSON.stringify(beforeStats)}`);
    
    const syncStartTime = new Date();
    console.log(`API Sync: Bắt đầu đồng bộ lúc ${syncStartTime.toISOString()}`);
    
    const syncCount = await syncFiles();
    
    const syncEndTime = new Date();
    const syncDuration = (syncEndTime - syncStartTime) / 1000; // Thời gian đồng bộ (giây)
    console.log(`API Sync: Hoàn thành đồng bộ lúc ${syncEndTime.toISOString()} (thời gian: ${syncDuration.toFixed(1)}s)`);
    
    // Đọc lại database để có thông tin mới nhất
    const filesData = readFilesDb();
    
    // Thống kê sau khi đồng bộ
    const afterStats = {
      total: filesData.length,
      synced: filesData.filter(f => f.telegramFileId && !f.needsSync).length,
      needsSync: filesData.filter(f => f.needsSync).length,
      errors: filesData.filter(f => f.syncError).length
    };
    
    console.log(`API Sync: Thống kê sau khi đồng bộ: ${JSON.stringify(afterStats)}`);
    
    // Tính toán thay đổi
    const changes = {
      newSynced: afterStats.synced - beforeStats.synced,
      remainingToSync: afterStats.needsSync,
      newErrors: afterStats.errors - beforeStats.errors,
      totalProcessed: syncCount
    };
    
    console.log(`API Sync: Thay đổi sau khi đồng bộ: ${JSON.stringify(changes)}`);
    
    // Báo cáo lỗi cụ thể nếu có
    // Báo cáo lỗi cụ thể nếu có
    const syncErrors = filesData
      .filter(f => f.syncError)
      .map(f => ({ fileName: f.name, error: f.syncError }))
      .slice(0, 10); // Chỉ lấy 10 lỗi đầu tiên để tránh quá dài
    
    isSyncing = false;
    
    // Trả về kết quả chi tiết
    return res.json({
      success: true,
      message: `Đã đồng bộ ${syncCount} files trong ${syncDuration.toFixed(1)}s`,
      syncedCount: syncCount,
      duration: syncDuration.toFixed(1),
      syncTime: syncEndTime.toISOString(),
      beforeSync: beforeStats,
      afterSync: afterStats,
      changes: changes,
      errors: syncErrors
    });
  } catch (error) {
    console.error('Lỗi API đồng bộ:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi server khi đồng bộ files'
    });
  }
});

// API endpoint để tải file lên Telegram
app.post('/api/clean', async (req, res) => {
  try {
    if (!bot || !botActive) {
      return res.status(400).json({
        success: false,
        error: 'Bot Telegram không hoạt động'
      });
    }
    
    console.log('Đang tải file lên Telegram từ API...');
    const cleanedCount = await cleanUploads();
    
    res.json({
      success: true,
      message: `Đã tải ${cleanedCount} file lên Telegram`,
      cleanedCount
    });
  } catch (error) {
    console.error('Lỗi tải file lên Telegram:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi tải file lên Telegram: ' + error.message
    });
  }
});

// API endpoint để kiểm tra và sửa dữ liệu file
app.get('/api/check-files', async (req, res) => {
  try {
    console.log('Bắt đầu kiểm tra và sửa dữ liệu file...');
    
    // Đọc dữ liệu file hiện tại
    const filesData = readFilesDb();
    let fixedCount = 0;
    let updatedFiles = [];
    
    // Kiểm tra từng file
    for (let i = 0; i < filesData.length; i++) {
      const file = filesData[i];
      let fileFixed = false;
      
      // Kiểm tra và cập nhật trạng thái file
      if (file.localPath && fs.existsSync(file.localPath)) {
        // File tồn tại ở local
        if (file.fileStatus !== 'local' && file.fileStatus !== 'telegram') {
          file.fileStatus = 'local';
          fileFixed = true;
        }
      } else if (file.telegramFileId) {
        // File chỉ tồn tại trên Telegram
        if (file.fileStatus !== 'telegram') {
          file.fileStatus = 'telegram';
          fileFixed = true;
        }
        
        // Kiểm tra và cập nhật URL Telegram nếu cần
        if (!file.telegramUrl && botActive) {
          try {
            // Lấy đường dẫn tải xuống từ Telegram
            const fileInfo = await bot.telegram.getFile(file.telegramFileId);
            if (fileInfo && fileInfo.file_path) {
              file.telegramUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileInfo.file_path}`;
              fileFixed = true;
            }
          } catch (error) {
            console.error(`Lỗi lấy thông tin file từ Telegram: ${file.name}`, error);
          }
        }
      } else {
        // File không tồn tại ở cả local và telegram
        if (file.fileStatus !== 'missing') {
          file.fileStatus = 'missing';
          fileFixed = true;
        }
      }
      
      // Sửa định dạng tên file nếu cần
      if (file.name && file.name.includes('')) {
        // Thử khôi phục tên file từ originalName hoặc từ đường dẫn local
        if (file.originalName && !file.originalName.includes('')) {
          file.name = file.originalName;
          fileFixed = true;
        } else if (file.localPath) {
          const fileName = path.basename(file.localPath);
          if (!fileName.includes('')) {
            file.name = fileName;
            fileFixed = true;
          }
        }
      }
      
      // Kiểm tra và cập nhật loại file dựa vào đuôi file
      if (file.name) {
        const extension = path.extname(file.name).toLowerCase();
        const correctedFileType = getFileType(file.name);
        
        if (correctedFileType !== file.fileType) {
          file.fileType = correctedFileType;
          file.mimeType = getMimeType(extension);
          fileFixed = true;
        }
      }
      
      if (fileFixed) {
        fixedCount++;
        updatedFiles.push(file.id);
      }
    }
    
    // Lưu lại nếu có thay đổi
    if (fixedCount > 0) {
      saveFilesDb(filesData);
      console.log(`Đã sửa ${fixedCount} files trong database.`);
    }
    
    // Trả về kết quả
    return res.json({
      success: true,
      message: `Đã kiểm tra và sửa ${fixedCount} files trong database.`,
      fixedCount,
      updatedFiles
    });
  } catch (error) {
    console.error('Lỗi kiểm tra file:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi server khi kiểm tra file'
    });
  }
});

// API endpoint để tải file từ Telegram
app.get('/api/load-telegram-files', async (req, res) => {
  try {
    if (!bot || !botActive) {
      return res.status(400).json({
        success: false,
        error: 'Bot Telegram không hoạt động'
      });
    }
    
    // Lấy danh sách file từ Telegram
    const newFileCount = await getFilesFromTelegram();
    
    // Trả về kết quả
    return res.json({
      success: true,
      message: `Đã tìm thấy ${newFileCount} file mới từ Telegram.`,
      newFileCount
    });
  } catch (error) {
    console.error('Lỗi load file từ Telegram:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi server khi load file từ Telegram'
    });
  }
});

// API endpoint để khôi phục lại database
app.get('/api/reset-database', async (req, res) => {
  try {
    console.log('Bắt đầu khởi tạo lại database...');
    
    // Tạo database mới
    const newFilesData = [];
    const storagePath = STORAGE_PATH;
    
    // Kiểm tra thư mục uploads
    const uploadsDir = path.join(storagePath, 'uploads');
    if (fs.existsSync(uploadsDir)) {
      console.log('Đang quét thư mục uploads...');
      
      // Quét tất cả các file trong thư mục uploads
      const files = getAllFiles(uploadsDir);
      
      console.log(`Tìm thấy ${files.length} file trong thư mục uploads.`);
      
      // Thêm từng file vào database mới
      for (const filePath of files) {
        try {
          const stats = fs.statSync(filePath);
          if (stats.isFile()) {
            const fileName = path.basename(filePath);
            const fileExtension = path.extname(fileName).toLowerCase();
            const fileType = getFileType(fileName);
            const mimeType = getMimeType(fileExtension);
            
            newFilesData.push({
              id: uuidv4(),
              name: fileName,
              originalName: fileName,
              size: stats.size,
              mimeType: mimeType,
              fileType: fileType,
              localPath: filePath,
              uploadDate: stats.birthtime.toISOString(),
              telegramFileId: null,
              telegramUrl: null,
              fileStatus: 'local',
              needsSync: true,
              user: null
            });
          }
        } catch (error) {
          console.error(`Lỗi xử lý file ${filePath}:`, error);
        }
      }
    }
    
    // Lưu database mới
    saveFilesDb(newFilesData);
    
    console.log(`Đã tạo mới database với ${newFilesData.length} file.`);
    
    // Đồng bộ với Telegram nếu có bot
    let syncResult = { success: false, syncedFiles: 0 };
    
    if (bot && botActive) {
      try {
        console.log('Đang đồng bộ với Telegram...');
        const syncCount = await syncFiles();
        syncResult = { success: true, syncedFiles: syncCount };
      } catch (error) {
        console.error('Lỗi đồng bộ sau khi reset database:', error);
        syncResult = { success: false, error: error.message };
      }
    }
    
    // Trả về kết quả
    return res.json({
      success: true,
      message: 'Đã khởi tạo lại database thành công',
      totalFiles: newFilesData.length,
      sync: syncResult
    });
  } catch (error) {
    console.error('Lỗi reset database:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi server khi reset database'
    });
  }
});

/**
 * Lấy tất cả các file trong thư mục và các thư mục con
 */
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);
  
  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else {
      arrayOfFiles.push(filePath);
    }
  });
  
  return arrayOfFiles;
}

// API endpoint để tạo thư mục mới
app.post('/api/folders', express.json(), (req, res) => {
  try {
    const { folderName, parentFolder } = req.body;
    
    // Validate input
    if (!folderName || folderName.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Tên thư mục không được để trống'
      });
    }
    
    // Kiểm tra tên thư mục hợp lệ (không chứa ký tự đặc biệt)
    if (!/^[a-zA-Z0-9\s_àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệđìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÈÉẺẼẸÊẾỀỂỄỆĐÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴ-]+$/.test(folderName)) {
      return res.status(400).json({
        success: false,
        error: 'Tên thư mục chứa ký tự không hợp lệ'
      });
    }
    
    const baseFolder = path.join(STORAGE_PATH, 'uploads');
    let folderPath;
    
    // Xác định đường dẫn thư mục
    if (!parentFolder || parentFolder === 'root') {
      folderPath = path.join(baseFolder, folderName);
    } else {
      const parentPath = path.join(baseFolder, parentFolder);
      
      // Kiểm tra thư mục cha tồn tại
      if (!fs.existsSync(parentPath) || !fs.statSync(parentPath).isDirectory()) {
        return res.status(404).json({
          success: false,
          error: 'Thư mục cha không tồn tại'
        });
      }
      
      folderPath = path.join(parentPath, folderName);
    }
    
    // Kiểm tra thư mục đã tồn tại chưa
    if (fs.existsSync(folderPath)) {
      return res.status(400).json({
        success: false,
        error: 'Thư mục đã tồn tại'
      });
    }
    
    // Tạo thư mục
    fs.mkdirSync(folderPath, { recursive: true });
    
    // Trả về kết quả
    return res.json({
      success: true,
      message: 'Đã tạo thư mục thành công',
      folder: {
        name: folderName,
        path: path.relative(baseFolder, folderPath),
        created: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Lỗi tạo thư mục:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi server khi tạo thư mục'
    });
  }
});

// API endpoint để đổi tên thư mục
app.put('/api/folders/rename', express.json(), (req, res) => {
  try {
    const { folderPath, newName } = req.body;
    
    // Validate input
    if (!folderPath) {
      return res.status(400).json({
        success: false,
        error: 'Đường dẫn thư mục không được để trống'
      });
    }
    
    if (!newName || newName.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Tên mới không được để trống'
      });
    }
    
    // Kiểm tra tên thư mục hợp lệ
    if (!/^[a-zA-Z0-9\s_àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệđìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÈÉẺẼẸÊẾỀỂỄỆĐÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴ-]+$/.test(newName)) {
      return res.status(400).json({
        success: false,
        error: 'Tên mới chứa ký tự không hợp lệ'
      });
    }
    
    const baseFolder = path.join(STORAGE_PATH, 'uploads');
    const fullFolderPath = path.join(baseFolder, folderPath);
    
    // Kiểm tra thư mục tồn tại
    if (!fs.existsSync(fullFolderPath) || !fs.statSync(fullFolderPath).isDirectory()) {
      return res.status(404).json({
        success: false,
        error: 'Thư mục không tồn tại'
      });
    }
    
    // Tạo đường dẫn mới
    const parentPath = path.dirname(fullFolderPath);
    const newFolderPath = path.join(parentPath, newName);
    
    // Kiểm tra thư mục mới đã tồn tại chưa
    if (fs.existsSync(newFolderPath)) {
      return res.status(400).json({
        success: false,
        error: 'Thư mục mới đã tồn tại'
      });
    }
    
    // Đổi tên thư mục
    fs.renameSync(fullFolderPath, newFolderPath);
    
    // Cập nhật đường dẫn localPath trong database
    const filesData = readFilesDb();
    let updatedFiles = 0;
    
    filesData.forEach(file => {
      if (file.localPath && file.localPath.startsWith(fullFolderPath)) {
        file.localPath = file.localPath.replace(fullFolderPath, newFolderPath);
        updatedFiles++;
      }
    });
    
    if (updatedFiles > 0) {
      saveFilesDb(filesData);
    }
    
    // Trả về kết quả
    return res.json({
      success: true,
      message: 'Đã đổi tên thư mục thành công',
      folder: {
        oldPath: folderPath,
        newPath: path.relative(baseFolder, newFolderPath),
        newName: newName,
        updatedFiles: updatedFiles
      }
    });
  } catch (error) {
    console.error('Lỗi đổi tên thư mục:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi server khi đổi tên thư mục'
    });
  }
});

// API endpoint để xóa thư mục
app.delete('/api/folders', express.json(), (req, res) => {
  try {
    const { folderPath, deleteFiles } = req.body;
    
    // Validate input
    if (!folderPath) {
      return res.status(400).json({
        success: false,
        error: 'Đường dẫn thư mục không được để trống'
      });
    }
    
    const baseFolder = path.join(STORAGE_PATH, 'uploads');
    const fullFolderPath = path.join(baseFolder, folderPath);
    
    // Kiểm tra thư mục tồn tại
    if (!fs.existsSync(fullFolderPath) || !fs.statSync(fullFolderPath).isDirectory()) {
      return res.status(404).json({
        success: false,
        error: 'Thư mục không tồn tại'
      });
    }
    
    // Kiểm tra thư mục có trống không
    const folderContents = fs.readdirSync(fullFolderPath);
    if (folderContents.length > 0 && !deleteFiles) {
      return res.status(400).json({
        success: false,
        error: 'Thư mục không trống. Sử dụng deleteFiles=true để xóa cả nội dung bên trong.',
        filesCount: folderContents.length
      });
    }
    
    // Xóa thư mục và nội dung
    if (deleteFiles) {
      // Lấy danh sách file trong thư mục và cập nhật database
      const filesData = readFilesDb();
      let deletedFiles = 0;
      
      for (let i = filesData.length - 1; i >= 0; i--) {
        const file = filesData[i];
        if (file.localPath && file.localPath.startsWith(fullFolderPath)) {
          if (deleteFiles === 'permanent') {
            // Xóa file vĩnh viễn khỏi database
            filesData.splice(i, 1);
          } else {
            // Đánh dấu file đã bị xóa local
            file.localPath = null;
            file.fileStatus = file.telegramFileId ? 'telegram' : 'missing';
          }
          deletedFiles++;
        }
      }
      
      // Lưu lại database nếu có thay đổi
      if (deletedFiles > 0) {
        saveFilesDb(filesData);
      }
      
      // Xóa thư mục và nội dung
      fs.rmSync(fullFolderPath, { recursive: true, force: true });
      
      // Trả về kết quả
      return res.json({
        success: true,
        message: 'Đã xóa thư mục và nội dung thành công',
        deletedFiles: deletedFiles
      });
    } else {
      // Xóa thư mục trống
      fs.rmdirSync(fullFolderPath);
      
      // Trả về kết quả
      return res.json({
        success: true,
        message: 'Đã xóa thư mục trống thành công'
      });
    }
  } catch (error) {
    console.error('Lỗi xóa thư mục:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi server khi xóa thư mục'
    });
  }
});

// API endpoint để lấy danh sách thư mục
app.get('/api/folders', (req, res) => {
  try {
    // Tạo cấu trúc thư mục ảo từ database file
    const filesData = readFilesDb();
    const folderStructure = createVirtualFolderStructure(filesData);
    
    // Trả về kết quả
    return res.json({
      success: true,
      folders: folderStructure
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách thư mục:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi server khi lấy danh sách thư mục'
    });
  }
});

/**
 * Tạo cấu trúc thư mục ảo từ danh sách file
 */
function createVirtualFolderStructure(files) {
  // Tạo cấu trúc thư mục root
  const rootFolder = {
    id: 'root',
    name: 'Root',
    type: 'folder',
    children: []
  };
  
  // Map để lưu trữ thư mục theo id
  const foldersById = {
    'root': rootFolder
  };
  
  // Tạo danh sách thư mục từ đường dẫn file
  files.forEach(file => {
    if (file.localPath) {
      // Lấy đường dẫn tương đối từ thư mục uploads
      const storagePath = STORAGE_PATH;
      const uploadsDir = path.join(storagePath, 'uploads');
      let relativePath = '';
      
      if (file.localPath.startsWith(uploadsDir)) {
        relativePath = path.relative(uploadsDir, file.localPath);
      } else {
        // Nếu không phải trong thư mục uploads, bỏ qua
        return;
      }
      
      // Tạo các thư mục trong đường dẫn
      const pathParts = relativePath.split(path.sep);
      
      // Bỏ qua phần tử cuối (tên file)
      pathParts.pop();
      
      if (pathParts.length === 0) {
        // File nằm trực tiếp trong thư mục uploads
        // Thêm file vào thư mục root
        rootFolder.children.push({
          id: file.id,
          name: file.name,
          type: 'file',
          fileType: file.fileType,
          size: file.size,
          telegramFileId: file.telegramFileId
        });
      } else {
        // File nằm trong thư mục con
        let currentPath = '';
        let parentFolderId = 'root';
        
        // Tạo các thư mục con nếu chưa tồn tại
        for (let i = 0; i < pathParts.length; i++) {
          const folderName = pathParts[i];
          
          if (currentPath) {
            currentPath = path.join(currentPath, folderName);
          } else {
            currentPath = folderName;
          }
          
          // Tạo id cho thư mục
          const folderId = currentPath;
          
          // Kiểm tra thư mục đã tồn tại chưa
          if (!foldersById[folderId]) {
            // Tạo thư mục mới
            const newFolder = {
              id: folderId,
              name: folderName,
              type: 'folder',
              children: []
            };
            
            // Thêm vào danh sách thư mục
            foldersById[folderId] = newFolder;
            
            // Thêm vào thư mục cha
            foldersById[parentFolderId].children.push(newFolder);
          }
          
          parentFolderId = folderId;
        }
        
        // Thêm file vào thư mục cuối cùng
        foldersById[parentFolderId].children.push({
          id: file.id,
          name: file.name,
          type: 'file',
          fileType: file.fileType,
          size: file.size,
          telegramFileId: file.telegramFileId
        });
      }
    }
  });
  
  return rootFolder;
}

// API endpoint để xem trước file
app.get('/api/files/:id/preview', async (req, res) => {
  try {
    const fileId = req.params.id;
    
    // Validate input
    if (!fileId) {
      return res.status(400).json({
        success: false,
        error: 'ID file không được để trống'
      });
    }
    
    // Đọc database
    const filesData = readFilesDb();
    
    // Tìm file cần xem trước
    const file = filesData.find(f => f.id === fileId);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File không tồn tại'
      });
    }
    
    // Kiểm tra file có thể xem trước không
    const supportedPreviewTypes = ['image', 'video', 'audio', 'pdf', 'text'];
    const isPreviewable = supportedPreviewTypes.includes(file.fileType) || 
                         (file.mimeType && file.mimeType.startsWith('text/'));
    
    if (!isPreviewable) {
      return res.status(400).json({
        success: false,
        error: 'File này không hỗ trợ xem trước',
        fileType: file.fileType,
        mimeType: file.mimeType
      });
    }
    
    // Ưu tiên file local nếu có
    if (file.localPath && fs.existsSync(file.localPath)) {
      // Xử lý xem trước dựa vào loại file
      if (file.fileType === 'image') {
        res.setHeader('Content-Type', file.mimeType || 'image/jpeg');
        return fs.createReadStream(file.localPath).pipe(res);
      } else if (file.fileType === 'video') {
        res.setHeader('Content-Type', file.mimeType || 'video/mp4');
        return fs.createReadStream(file.localPath).pipe(res);
      } else if (file.fileType === 'audio') {
        res.setHeader('Content-Type', file.mimeType || 'audio/mpeg');
        return fs.createReadStream(file.localPath).pipe(res);
      } else if (file.fileType === 'pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        return fs.createReadStream(file.localPath).pipe(res);
      } else if (file.mimeType && file.mimeType.startsWith('text/')) {
        // Đọc file text
        const content = fs.readFileSync(file.localPath, 'utf8');
        
        // Trả về nội dung text
        return res.json({
          success: true,
          content,
          fileType: file.fileType,
          mimeType: file.mimeType
        });
      }
    } else if (file.telegramFileId && file.telegramUrl) {
      // Chuyển hướng đến URL Telegram
      return res.redirect(file.telegramUrl);
    } else {
      return res.status(404).json({
        success: false,
        error: 'File không tồn tại ở cả local và Telegram'
      });
    }
  } catch (error) {
    console.error('Lỗi xem trước file:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi server khi xem trước file'
    });
  }
});

// API endpoint để lấy thông tin chi tiết file
app.get('/api/files/:id', (req, res) => {
  try {
    const fileId = req.params.id;
    
    // Validate input
    if (!fileId) {
      return res.status(400).json({
        success: false,
        error: 'ID file không được để trống'
      });
    }
    
    // Đọc database
    const filesData = readFilesDb();
    
    // Tìm file
    const file = filesData.find(f => f.id === fileId);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File không tồn tại'
      });
    }
    
    // Thêm URL cho file
    const fileInfo = {
      ...file,
      formattedSize: formatBytes(file.size),
      formattedDate: formatDate(file.uploadDate),
      downloadUrl: `/api/files/${file.id}/download`,
      previewUrl: `/api/files/${file.id}/preview`,
      shareUrl: file.shareToken ? `/share/${file.shareToken}` : null,
      exists: {
        local: file.localPath && fs.existsSync(file.localPath),
        telegram: !!file.telegramFileId
      }
    };
    
    // Trả về kết quả
    return res.json({
      success: true,
      file: fileInfo
    });
  } catch (error) {
    console.error('Lỗi lấy thông tin file:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi server khi lấy thông tin file'
    });
  }
});

// API endpoint để tải file
app.get('/api/files/:id/download', async (req, res) => {
  try {
    const fileId = req.params.id;
    
    // Validate input
    if (!fileId) {
      return res.status(400).json({
        success: false,
        error: 'ID file không được để trống'
      });
    }
    
    // Đọc database
    const filesData = readFilesDb();
    
    // Tìm file
    const file = filesData.find(f => f.id === fileId);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File không tồn tại'
      });
    }
    
    // Ưu tiên file local nếu có
    if (file.localPath && fs.existsSync(file.localPath)) {
      // Set header cho việc tải file
      res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
      
      // Stream file
      return fs.createReadStream(file.localPath).pipe(res);
    } else if (file.telegramFileId && file.telegramUrl) {
      // Tải file từ Telegram
      try {
        if (!botActive) {
          return res.status(400).json({
            success: false,
            error: 'Bot Telegram không hoạt động'
          });
        }
        
        // Chuyển hướng đến URL Telegram
        return res.redirect(file.telegramUrl);
      } catch (error) {
        console.error('Lỗi tải file từ Telegram:', error);
        return res.status(500).json({
          success: false,
          error: 'Lỗi tải file từ Telegram: ' + error.message
        });
      }
    } else {
      return res.status(404).json({
        success: false,
        error: 'File không tồn tại ở cả local và Telegram'
      });
    }
  } catch (error) {
    console.error('Lỗi tải file:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi server khi tải file'
    });
  }
});

// API endpoint để chia sẻ file
app.post('/api/files/:id/share', (req, res) => {
  try {
    const fileId = req.params.id;
    const { expiryTime } = req.body;
    
    // Validate input
    if (!fileId) {
      return res.status(400).json({
        success: false,
        error: 'ID file không được để trống'
      });
    }
    
    // Đọc database
    const filesData = readFilesDb();
    
    // Tìm file
    const fileIndex = filesData.findIndex(f => f.id === fileId);
    
    if (fileIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'File không tồn tại'
      });
    }
    
    const file = filesData[fileIndex];
    
    // Tạo token chia sẻ nếu chưa có
    if (!file.shareToken) {
      file.shareToken = uuidv4();
    }
    
    // Tạo hoặc cập nhật thời gian hết hạn
    if (expiryTime) {
      // Chuyển đổi giờ thành milliseconds
      const expiryHours = parseInt(expiryTime);
      if (!isNaN(expiryHours) && expiryHours > 0) {
        file.shareExpiry = new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString();
      } else {
        file.shareExpiry = null; // Không có thời hạn
      }
    } else {
      file.shareExpiry = null; // Không có thời hạn
    }
    
    // Lưu thay đổi
    saveFilesDb(filesData);
    
    // URL chia sẻ
    const shareUrl = `/share/${file.shareToken}`;
    
    console.log(`Đã tạo/cập nhật chia sẻ cho file ${file.name}, URL: ${shareUrl}`);
    
    // Trả về kết quả
    return res.json({
      success: true,
      message: 'Đã tạo chia sẻ thành công',
      shareToken: file.shareToken,
      shareUrl,
      shareExpiry: file.shareExpiry
    });
  } catch (error) {
    console.error('Lỗi chia sẻ file:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi server khi chia sẻ file'
    });
  }
});

// API endpoint để hủy chia sẻ file
app.delete('/api/files/:id/share', (req, res) => {
  try {
    const fileId = req.params.id;
    
    // Validate input
    if (!fileId) {
      return res.status(400).json({
        success: false,
        error: 'ID file không được để trống'
      });
    }
    
    // Đọc database
    const filesData = readFilesDb();
    
    // Tìm file
    const fileIndex = filesData.findIndex(f => f.id === fileId);
    
    if (fileIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'File không tồn tại'
      });
    }
    
    const file = filesData[fileIndex];
    
    // Kiểm tra file có đang được chia sẻ không
    if (!file.shareToken) {
      return res.status(400).json({
        success: false,
        error: 'File chưa được chia sẻ'
      });
    }
    
    // Xóa thông tin chia sẻ
    file.shareToken = null;
    file.shareExpiry = null;
    
    // Lưu thay đổi
    saveFilesDb(filesData);
    
    console.log(`Đã hủy chia sẻ cho file ${file.name}`);
    
    // Trả về kết quả
    return res.json({
      success: true,
      message: 'Đã hủy chia sẻ thành công'
    });
  } catch (error) {
    console.error('Lỗi hủy chia sẻ file:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi server khi hủy chia sẻ file'
    });
  }
});

// Route xử lý chia sẻ file
app.get('/share/:token', (req, res) => {
  try {
    const shareToken = req.params.token;
    
    // Validate input
    if (!shareToken) {
      return res.status(400).send('Link chia sẻ không hợp lệ');
    }
    
    // Đọc database
    const filesData = readFilesDb();
    
    // Tìm file với token chia sẻ
    const file = filesData.find(f => f.shareToken === shareToken);
    
    if (!file) {
      return res.status(404).send('Link chia sẻ không tồn tại hoặc đã hết hạn');
    }
    
    // Kiểm tra thời hạn chia sẻ
    if (file.shareExpiry && new Date(file.shareExpiry) < new Date()) {
      // Xóa thông tin chia sẻ đã hết hạn
      file.shareToken = null;
      file.shareExpiry = null;
      saveFilesDb(filesData);
      
      return res.status(400).send('Link chia sẻ đã hết hạn');
    }
    
    // Redirect đến trang xem trước hoặc tải file
    const isPreviewable = ['image', 'video', 'audio', 'pdf'].includes(file.fileType);
    
    if (isPreviewable) {
      return res.redirect(`/file/${file.id}`);
    } else {
      return res.redirect(`/api/files/${file.id}/download`);
    }
  } catch (error) {
    console.error('Lỗi xử lý chia sẻ file:', error);
    return res.status(500).send('Đã xảy ra lỗi khi xử lý link chia sẻ');
  }
});

// API lấy thống kê sử dụng
app.get('/api/stats', (req, res) => {
  try {
    // Đọc database
    const filesData = readFilesDb();
    
    // Thống kê tổng số file và dung lượng
    const totalFiles = filesData.length;
    const totalSize = filesData.reduce((sum, file) => sum + (file.size || 0), 0);
    
    // Thống kê theo loại file
    const fileTypeStats = {};
    filesData.forEach(file => {
      const type = file.fileType || 'unknown';
      if (!fileTypeStats[type]) {
        fileTypeStats[type] = {
          count: 0,
          size: 0
        };
      }
      fileTypeStats[type].count++;
      fileTypeStats[type].size += (file.size || 0);
    });
    
    // Thống kê số lượng file trên Telegram
    const telegramFiles = filesData.filter(file => file.telegramFileId).length;
    const telegramSize = filesData
      .filter(file => file.telegramFileId)
      .reduce((sum, file) => sum + (file.size || 0), 0);
    
    // Thống kê số lượng file đang được chia sẻ
    const sharedFiles = filesData.filter(file => file.shareToken).length;
    
    // Format dung lượng
    const formattedStats = {
      totalFiles,
      totalSize: formatBytes(totalSize),
      telegramFiles,
      telegramSize: formatBytes(telegramSize),
      sharedFiles,
      fileTypeStats: Object.entries(fileTypeStats).map(([type, stats]) => ({
        type,
        count: stats.count,
        size: formatBytes(stats.size)
      }))
    };
    
    // Trả về kết quả
    return res.json({
      success: true,
      stats: formattedStats
    });
  } catch (error) {
    console.error('Lỗi lấy thống kê:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi server khi lấy thống kê'
    });
  }
});

/**
 * Format date
 * @param {String} dateString 
 */
function formatDate(dateString) {
  try {
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return dateString || '';
  }
}

// ... existing code ...

// API endpoint để kiểm tra và sửa dữ liệu file
app.post('/api/check-files', async (req, res) => {
  try {
    if (!bot || !botActive) {
      return res.status(400).json({
        success: false,
        error: 'Bot Telegram không hoạt động'
      });
    }
    
    // Đọc database
    let filesData = readFilesDb();
    const totalFiles = filesData.length;
    
    // Số lượng file đã sửa
    let fixedCount = 0;
    
    // Kiểm tra từng file
    for (let i = 0; i < filesData.length; i++) {
      const file = filesData[i];
      let isFixed = false;
      
      // Kiểm tra trạng thái file
      if (file.localPath && fs.existsSync(file.localPath)) {
        if (file.fileStatus !== 'local') {
          file.fileStatus = 'local';
          isFixed = true;
        }
      } else if (file.telegramFileId) {
        if (file.fileStatus !== 'telegram') {
          file.fileStatus = 'telegram';
          isFixed = true;
        }
      } else {
        if (file.fileStatus !== 'missing') {
          file.fileStatus = 'missing';
          file.needsSync = true;
          isFixed = true;
        }
      }
      
      // Kiểm tra và sửa tên file nếu có encoding sai
      if (file.name && file.name.includes('%')) {
        try {
          file.name = decodeURIComponent(file.name);
          isFixed = true;
        } catch (e) {
          console.error(`Không thể decode tên file: ${file.name}`, e);
        }
      }
      
      // Kiểm tra và thêm trường mimeType nếu thiếu
      if (!file.mimeType && file.name) {
        file.mimeType = getMimeType(file.name);
        isFixed = true;
      }
      
      // Kiểm tra và thêm trường fileType nếu thiếu
      if (!file.fileType && file.name) {
        file.fileType = getFileType(file.name);
        isFixed = true;
      }
      
      // Đánh dấu đã sửa nếu có thay đổi
      if (isFixed) {
        fixedCount++;
      }
    }
    
    // Lưu lại database nếu có thay đổi
    if (fixedCount > 0) {
      saveFilesDb(filesData);
    }
    
    // Đọc lại database để có thông tin mới nhất
    filesData = readFilesDb();
    
    // Thống kê
    const stats = {
      total: totalFiles,
      fixed: fixedCount,
      local: filesData.filter(f => f.fileStatus === 'local').length,
      telegram: filesData.filter(f => f.fileStatus === 'telegram').length,
      missing: filesData.filter(f => f.fileStatus === 'missing').length,
      needsSync: filesData.filter(f => f.needsSync).length
    };
    
    // Trả về kết quả
    return res.json({
      success: true,
      message: `Đã kiểm tra và sửa ${fixedCount} files`,
      stats: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Lỗi API kiểm tra file:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi server khi kiểm tra files'
    });
  }
});

// ... existing code ...

// API endpoint để lấy nội dung thùng rác
app.get('/api/trash', (req, res) => {
  try {
    // Đọc database
    const filesData = readFilesDb();
    
    // Lọc các file đã xóa
    const trashedFiles = filesData.filter(file => file.isDeleted);
    
    // Định dạng dữ liệu trước khi gửi đi
    const formattedFiles = trashedFiles.map(file => ({
      id: file.id,
      name: file.name,
      size: file.size,
      formattedSize: formatBytes(file.size),
      uploadDate: file.uploadDate,
      formattedDate: formatDate(file.uploadDate),
      deletedDate: file.deletedDate,
      formattedDeletedDate: formatDate(file.deletedDate),
      mimeType: file.mimeType,
      fileType: file.fileType,
      telegramFileId: file.telegramFileId ? true : false,
      restoreUrl: `/api/trash/${file.id}/restore`,
      deleteUrl: `/api/trash/${file.id}/delete`
    }));
    
    // Trả về kết quả
    return res.json({
      success: true,
      count: formattedFiles.length,
      files: formattedFiles
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách thùng rác:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi server khi lấy danh sách thùng rác'
    });
  }
});

// API endpoint để khôi phục file từ thùng rác
app.post('/api/trash/:id/restore', (req, res) => {
  try {
    const fileId = req.params.id;
    
    if (!fileId) {
      return res.status(400).json({
        success: false,
        error: 'ID file không được để trống'
      });
    }
    
    // Đọc database
    const filesData = readFilesDb();
    
    // Tìm file cần khôi phục
    const fileIndex = filesData.findIndex(file => file.id === fileId && file.isDeleted);
    
    if (fileIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'File không tồn tại trong thùng rác'
      });
    }
    
    // Khôi phục file
    filesData[fileIndex].isDeleted = false;
    filesData[fileIndex].deletedDate = null;
    
    // Lưu lại database
    saveFilesDb(filesData);
    
    // Trả về kết quả
    return res.json({
      success: true,
      message: 'Đã khôi phục file thành công',
      file: {
        id: filesData[fileIndex].id,
        name: filesData[fileIndex].name
      }
    });
  } catch (error) {
    console.error('Lỗi khôi phục file:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi server khi khôi phục file'
    });
  }
});

// API endpoint để xóa vĩnh viễn file từ thùng rác
app.delete('/api/trash/:id', (req, res) => {
  try {
    const fileId = req.params.id;
    
    if (!fileId) {
      return res.status(400).json({
        success: false,
        error: 'ID file không được để trống'
      });
    }
    
    // Đọc database
    const filesData = readFilesDb();
    
    // Tìm file cần xóa
    const fileIndex = filesData.findIndex(file => file.id === fileId && file.isDeleted);
    
    if (fileIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'File không tồn tại trong thùng rác'
      });
    }
    
    const file = filesData[fileIndex];
    
    // Xóa file khỏi database
    filesData.splice(fileIndex, 1);
    
    // Lưu lại database
    saveFilesDb(filesData);
    
    // Trả về kết quả
    return res.json({
      success: true,
      message: 'Đã xóa vĩnh viễn file thành công',
      deletedFile: {
        id: file.id,
        name: file.name
      }
    });
  } catch (error) {
    console.error('Lỗi xóa vĩnh viễn file:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi server khi xóa vĩnh viễn file'
    });
  }
});

// API endpoint để làm trống thùng rác
app.delete('/api/trash', (req, res) => {
  try {
    // Đọc database
    let filesData = readFilesDb();
    
    // Đếm số file trong thùng rác
    const trashedCount = filesData.filter(file => file.isDeleted).length;
    
    if (trashedCount === 0) {
      return res.json({
        success: true,
        message: 'Thùng rác đã trống',
        deletedCount: 0
      });
    }
    
    // Xóa tất cả file trong thùng rác
    filesData = filesData.filter(file => !file.isDeleted);
    
    // Lưu lại database
    saveFilesDb(filesData);
    
    // Trả về kết quả
    return res.json({
      success: true,
      message: 'Đã làm trống thùng rác',
      deletedCount: trashedCount
    });
  } catch (error) {
    console.error('Lỗi làm trống thùng rác:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi server khi làm trống thùng rác'
    });
  }
});

// ... existing code ...

// API endpoint để cập nhật cài đặt
app.post('/api/settings', express.json(), async (req, res) => {
  try {
    const { apiKey, chatId, maxFileSize, enableSync } = req.body;
    
    // Đọc file .env
    const envPath = path.join(__dirname, '.env');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    let newEnvContent = envContent;
    let restartAfterSave = false;
    
    // Cập nhật BOT_TOKEN nếu có thay đổi
    if (apiKey && apiKey !== BOT_TOKEN) {
      newEnvContent = newEnvContent.replace(/BOT_TOKEN=.*(\r?\n|$)/, `BOT_TOKEN=${apiKey}$1`);
      if (!newEnvContent.includes('BOT_TOKEN=')) {
        newEnvContent += `\nBOT_TOKEN=${apiKey}\n`;
      }
      restartAfterSave = true;
    }
    
    // Cập nhật CHAT_ID nếu có thay đổi
    if (chatId && chatId !== CHAT_ID) {
      newEnvContent = newEnvContent.replace(/CHAT_ID=.*(\r?\n|$)/, `CHAT_ID=${chatId}$1`);
      if (!newEnvContent.includes('CHAT_ID=')) {
        newEnvContent += `\nCHAT_ID=${chatId}\n`;
      }
      restartAfterSave = true;
    }
    
    // Cập nhật MAX_FILE_SIZE nếu có thay đổi
    if (maxFileSize && maxFileSize !== MAX_FILE_SIZE / (1024 * 1024)) {
      newEnvContent = newEnvContent.replace(/MAX_FILE_SIZE=.*(\r?\n|$)/, `MAX_FILE_SIZE=${maxFileSize}$1`);
      if (!newEnvContent.includes('MAX_FILE_SIZE=')) {
        newEnvContent += `\nMAX_FILE_SIZE=${maxFileSize}\n`;
      }
    }
    
    // Cập nhật ENABLE_SYNC nếu có thay đổi
    if (enableSync !== undefined) {
      const enableSyncValue = enableSync ? 'true' : 'false';
      newEnvContent = newEnvContent.replace(/ENABLE_SYNC=.*(\r?\n|$)/, `ENABLE_SYNC=${enableSyncValue}$1`);
      if (!newEnvContent.includes('ENABLE_SYNC=')) {
        newEnvContent += `\nENABLE_SYNC=${enableSyncValue}\n`;
      }
    }
    
    // Lưu file .env nếu có thay đổi
    if (newEnvContent !== envContent) {
      fs.writeFileSync(envPath, newEnvContent);
      
      // Khởi động lại bot nếu cần
      if (restartAfterSave) {
        setTimeout(async () => {
          try {
            // Khởi động lại bot
            bot = await initBot();
            botActive = await checkBotActive();
          } catch (error) {
            console.error('Lỗi khởi động lại bot:', error);
          }
        }, 1000);
      }
    }
    
    res.json({
      success: true,
      message: 'Đã lưu cài đặt thành công',
      needsRestart: restartAfterSave
    });
  } catch (error) {
    console.error('Lỗi cập nhật cài đặt:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi cập nhật cài đặt'
    });
  }
});

// Middleware xử lý route không tồn tại - phải đặt sau tất cả các routes
app.use((req, res) => {
  console.log(`Route không tồn tại: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    error: 'API endpoint không tồn tại'
  });
});