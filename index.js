/**
 * TeleDrive - á»¨ng dụng quáº£n lÃ½ file vá»›i Telegram Bot
 * File chÃ­nh káº¿t há»£p táº¥t cả chá»©c nÄƒng: web server, bot Telegram, Ä‘á»“ng bá»™ file vÃ dá»n dáº¹p
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

// Load environment variables from .env file
dotenv.config();

// Äá»‹nh nghÄ©a Ä‘Æ°á»ng dáº«n lÆ°u trá»¯ vÃ biáº¿n toÃ n cá»¥c
const DB_PATH = path.join(__dirname, 'files_db.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const LOGS_DIR = path.join(__dirname, 'logs');
const TEMP_DIR = path.join(__dirname, 'temp');
const PORT = process.env.PORT || 3000;
let BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '2000', 10) * 1024 * 1024; // Convert MB to bytes
const DATA_DIR = process.env.DATA_DIR || 'data';

// ÄÆ°á»ng dáº«n file vÃ thư mục
const dataDir = path.join(__dirname, DATA_DIR);
const tempDir = TEMP_DIR;  // Sử dụng Ä‘Æ°á»ng dáº«n Ä‘Ã£ Ä‘á»‹nh nghÄ©a
const uploadsDir = UPLOADS_DIR; // Sử dụng Ä‘Æ°á»ng dáº«n Ä‘Ã£ Ä‘á»‹nh nghÄ©a
const logsDir = LOGS_DIR; // Sử dụng Ä‘Æ°á»ng dáº«n Ä‘Ã£ Ä‘á»‹nh nghÄ©a
const filesDbPath = path.join(dataDir, 'files.json');

// ÄÆ°á»ng dáº«n lÆ°u trá»¯ chÃ­nh
const STORAGE_PATH = __dirname;

// Khá»Ÿi táº¡o Express
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

// Cáº¥u hÃ¬nh multer
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function(req, file, cb) {
    // Äáº£m báº£o tên file an toÃ n, trÃ¡nh lá»—i Ä‘Æ°á»ng dáº«n
    const originalName = file.originalname;
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueName = Date.now() + '-' + sanitizedName;
    
    // LÆ°u tên gá»‘c vÃ o request Ä‘á»ƒ sá»­ dụng sau nÃ y
    req.originalFileName = originalName;
    
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: MAX_FILE_SIZE }
});

// Biáº¿n lÆ°u tráº¡ng thÃ¡i bot
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
        console.error('Lỗi Ä‘á»‹nh dáº¡ng ngÃ y:', error);
        return 'Không xác định';
    }
}

// Khá»Ÿi táº¡o Telegram Bot vá»›i timeout
const initBot = () => {
  console.log('===== KHá»žI Táº O TELEGRAM BOT =====');
  
  // Äá»c láº¡i file .env Ä‘á»ƒ Ä‘áº£m báº£o cÃ³ token má»›i nháº¥t
  try {
    if (fs.existsSync('.env')) {
      console.log('Äá»c cáº¥u hÃ¬nh tá»« file .env');
      const envConfig = dotenv.parse(fs.readFileSync('.env'));
      if (envConfig.BOT_TOKEN) {
        process.env.BOT_TOKEN = envConfig.BOT_TOKEN;
        console.log('ÄÃ£ cáº­p nháº­t BOT_TOKEN tá»« file .env');
      } else {
        console.warn('BOT_TOKEN không tÃ¬m tháº¥y trong file .env');
      }
      if (envConfig.CHAT_ID) {
        process.env.CHAT_ID = envConfig.CHAT_ID;
        console.log('ÄÃ£ cáº­p nháº­t CHAT_ID tá»« file .env');
      } else {
        console.warn('CHAT_ID không tÃ¬m tháº¥y trong file .env');
      }
    } else {
      console.error('File .env không tá»“n táº¡i');
    }
  } catch (e) {
    console.error('Không thá»ƒ Ä‘á»c file .env:', e.message);
  }
  
  // Cáº­p nháº­t biáº¿n toÃ n cá»¥c
  const botToken = process.env.BOT_TOKEN;
  
  console.log('Debug - Bot Token read from env:', botToken ? `${botToken.substring(0, 8)}...${botToken.substring(botToken.length - 5)}` : 'not set');
  
  if (!botToken || botToken === 'your_telegram_bot_token') {
    console.log('Bot token chÆ°a Ä‘Æ°á»£c cáº¥u hÃ¬nh. Vui lÃ²ng cáº­p nháº­t file .env');
    return Promise.resolve(null);
  }
  
  try {
    BOT_TOKEN = botToken;
    console.log('Kiá»ƒm tra káº¿t ná»‘i vá»›i Telegram API...');
    
    // Táº¡o Ä‘á»‘i tÆ°á»£ng bot vá»›i timeout cho telegram api
    const newBot = new Telegraf(botToken, {
      telegram: { 
        apiRoot: 'https://api.telegram.org',
        timeout: 30000 // TÄƒng timeout lÃªn 30 giÃ¢y
      }
    });
    
    // Khi bot Ä‘Ã£ sáºµn sÃ ng
    newBot.launch()
      .then(async () => {
        const me = await newBot.telegram.getMe();
        console.log(`Káº¿t ná»‘i thÃ nh công! Bot: @${me.username}`);
        
        console.log('Khá»Ÿi Ä‘á»™ng bot trong tiáº¿n trÃ¬nh riÃªng biá»‡t...');
        
        // Khá»Ÿi Ä‘á»™ng bot trong tiáº¿n trÃ¬nh riÃªng biá»‡t Ä‘á»ƒ không block main thread
        try {
          newBot.botInfo = me;
          console.log('Bot Ä‘Ã£ Ä‘Æ°á»£c khá»Ÿi Ä‘á»™ng trong tiáº¿n trÃ¬nh riÃªng biá»‡t.');
          return newBot;
        } catch (error) {
          console.error('Lỗi khi khá»Ÿi Ä‘á»™ng bot trong tiáº¿n trÃ¬nh riÃªng:', error);
          return newBot;
        }
      })
      .catch(error => {
        console.error('Lỗi khá»Ÿi Ä‘á»™ng bot:', error.message);
        if (error.code === 401) {
          console.error('Token không há»£p lá»‡ hoáº·c Ä‘Ã£ bá»‹ thu há»“i. Vui lÃ²ng kiá»ƒm tra BOT_TOKEN trong file .env');
        } else if (error.code === 'ETIMEOUT') {
          console.error('Timeout khi káº¿t ná»‘i Ä‘áº¿n Telegram API. Vui lÃ²ng kiá»ƒm tra káº¿t ná»‘i máº¡ng');
        }
        console.log('á»¨ng dụng váº«n tiáº¿p tá»¥c cháº¡y mÃ  không cÃ³ bot.');
        return null;
      });
    
    return Promise.resolve(newBot);
  } catch (error) {
    console.error('Lỗi khi khá»Ÿi táº¡o bot:', error);
    return Promise.resolve(null);
  }
};

// HÃ m kiá»ƒm tra xem bot cÃ³ hoáº¡t Ä‘á»™ng không
const checkBotActive = async () => {
  console.log('Kiá»ƒm tra tráº¡ng thÃ¡i hoáº¡t Ä‘á»™ng cá»§a bot...');
  
  if (!bot || !BOT_TOKEN || BOT_TOKEN === 'your_telegram_bot_token') {
    console.log('Bot không tá»“n táº¡i hoáº·c token chÆ°a Ä‘Æ°á»£c cáº¥u hÃ¬nh');
    return false;
  }
  
  try {
    // Thiáº¿t láº­p timeout cho viá»‡c kiá»ƒm tra bot
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Timeout khi kiá»ƒm tra bot Telegram'));
      }, 5000); // 5 giÃ¢y timeout
    });
    
    console.log('Gá»­i yÃªu cáº§u kiá»ƒm tra Ä‘áº¿n Telegram...');
    
    // Kiá»ƒm tra bot báº±ng cÃ¡ch láº¥y thÃ´ng tin
    const checkPromise = bot.telegram.getMe()
      .then((botInfo) => {
        console.log(`Bot hoáº¡t Ä‘á»™ng bÃ¬nh thưá»ng: @${botInfo.username}`);
        return true;
      })
      .catch((error) => {
        console.error('Lỗi khi kiá»ƒm tra bot:', error.message);
        return false;
      });
    
    // Race giá»¯a check vÃ  timeout
    const result = await Promise.race([checkPromise, timeoutPromise]);
    console.log(`Káº¿t quáº£ kiá»ƒm tra bot: ${result ? 'Hoáº¡t Ä‘á»™ng' : 'Không hoáº¡t Ä‘á»™ng'}`);
    return result;
  } catch (error) {
    console.error('Lỗi khi kiá»ƒm tra bot:', error);
    return false;
  }
};

/**
 * Äáº£m báº£o cÃ¡c thư mục cáº§n thiáº¿t tá»“n táº¡i
 * @param {Array} directories - Danh sÃ¡ch cÃ¡c thư mục cáº§n kiá»ƒm tra
 */
function ensureDirectories(directories) {
  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`ÄÃ£ táº¡o thư mục: ${dir}`);
    }
  });
}

// Äáº£m báº£o cÃ¡c thư mục cáº§n thiáº¿t tá»“n táº¡i
ensureDirectories([dataDir, tempDir, uploadsDir, logsDir]);

// Kiá»ƒm tra xem file .env cÃ³ tá»“n táº¡i không
checkEnvFile();

/**
 * Äá»c dá»¯ liá»‡u file tá»« database
 * @returns {Array} Danh sÃ¡ch file
 */
function readFilesDb() {
  try {
    if (fs.existsSync(filesDbPath)) {
      const content = fs.readFileSync(filesDbPath, 'utf8');
      const data = JSON.parse(content);
      
      // Kiá»ƒm tra vÃ  cáº­p nháº­t tráº¡ng thÃ¡i táº¥t cả file trong má»™t láº§n láº·p
      data.forEach(file => {
        // XÃ¡c Ä‘á»‹nh loáº¡i file
        file.fileType = file.fileType || getFileType(file.name);
        
        // Kiá»ƒm tra tráº¡ng thÃ¡i file
        if (file.localPath && fs.existsSync(file.localPath)) {
          file.fileStatus = 'local';
        } else if (file.telegramFileId) {
          file.fileStatus = 'telegram';
        } else {
          file.fileStatus = 'missing';
          file.needsSync = true; // ÄÃ¡nh dáº¥u cáº§n Ä‘á»“ng bá»™ náº¿u file không cÃ³ á»Ÿ Ä‘Ã¢u cả
        }
      });
      
      // LÆ°u láº¡i dá»¯ liá»‡u Ä‘Ã£ cáº­p nháº­t
      saveFilesDb(data);
      
      return data;
    }
    
    // Táº¡o file má»›i náº¿u chÆ°a tá»“n táº¡i
    fs.writeFileSync(filesDbPath, JSON.stringify([], null, 2), 'utf8');
    return [];
  } catch (error) {
    console.error('Lỗi Ä‘á»c database:', error);
    return [];
  }
}

/**
 * LÆ°u dá»¯ liá»‡u file vÃ o database
 * @param {Array} filesData - Dá»¯ liá»‡u file cáº§n lÆ°u
 * @returns {Boolean} Káº¿t quáº£ lÆ°u
 */
function saveFilesDb(filesData) {
  try {
    fs.writeFileSync(filesDbPath, JSON.stringify(filesData, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Lỗi lÆ°u database:', error);
    return false;
  }
}

/**
 * ÄoÃ¡n loáº¡i file dá»±a vÃ o MIME type
 * @param {String} mimeType - MIME type cá»§a file
 * @returns {String} Loáº¡i file: image, video, audio, document
 */
function guessFileType(mimeType) {
  if (!mimeType) return 'document';
  
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  
  return 'document';
}

/**
 * Láº¥y MIME type tá»« pháº§n má»Ÿ rá»™ng cá»§a file
 * @param {String} extension - Pháº§n má»Ÿ rá»™ng file (vÃ­ dá»¥: .jpg)
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

// HÃ m táº¡o Ä‘Æ°á»ng dáº«n an toÃ n cho file
function getSecureFilePath(fileName) {
  // Loáº¡i bá» tham sá»‘ query náº¿u cÃ³
  if (fileName.includes('?')) {
    fileName = fileName.split('?')[0];
  }
  return path.join(uploadsDir, fileName);
}

/**
 * Äá»“ng bá»™ file tá»« uploads vÃ o bot Telegram
 */
async function syncFiles() {
  console.log('===== Báº®T Äáº¦U Äá»’NG Bá»˜ FILES =====');
  
  try {
    if (!bot || !botActive) {
      console.log('Bot không hoáº¡t Ä‘á»™ng hoáº·c chÆ°a káº¿t ná»‘i, không thá»ƒ Ä‘á»“ng bá»™ files');
      console.log('BOT_TOKEN:', BOT_TOKEN ? `${BOT_TOKEN.substring(0, 8)}...` : 'không cÃ³');
      console.log('CHAT_ID:', CHAT_ID || 'không cÃ³');
      console.log('Bot status:', botActive ? 'active' : 'inactive');
      return {
        success: false,
        error: 'Bot không hoáº¡t Ä‘á»™ng hoáº·c chÆ°a káº¿t ná»‘i'
      };
    }
    
    let filesData = readFilesDb();
    if (!filesData || !Array.isArray(filesData)) {
      console.log('Dá»¯ liá»‡u file không há»£p lá»‡, táº¡o má»›i');
      filesData = [];
    }
    
    console.log(`Tá»•ng sá»‘ files trong database: ${filesData.length}`);
    
    // Lá»c cÃ¡c file cáº§n Ä‘á»“ng bá»™ (chÆ°a cÃ³ fileId hoáº·c cáº§n Ä‘á»“ng bá»™ láº¡i)
    const filesToSync = filesData.filter(file => {
      const needsSync = file.needsSync || !file.telegramFileId;
      const hasLocalPath = !!file.localPath;
      const fileExists = hasLocalPath && fs.existsSync(file.localPath);
      
      if (needsSync && !fileExists) {
        console.log(`File "${file.name}" cáº§n Ä‘á»“ng bá»™ nhÆ°ng không tá»“n táº¡i táº¡i Ä‘Æ°á»ng dáº«n: ${file.localPath}`);
        // ÄÃ¡nh dáº¥u file lÃ  Ä‘Ã£ xóa náº¿u không tÃ¬m tháº¥y
        file.deleted = true;
        file.needsSync = false;
      }
      
      return needsSync && fileExists;
    });
    
    console.log(`TÃ¬m tháº¥y ${filesToSync.length} file cáº§n Ä‘á»“ng bá»™ vÃ  tá»“n táº¡i trÃªn á»• Ä‘Ä©a`);
    
    if (filesToSync.length > 0) {
      console.log('Danh sÃ¡ch má»™t sá»‘ file cáº§n Ä‘á»“ng bá»™:');
      filesToSync.slice(0, 5).forEach((file, index) => {
        console.log(`${index + 1}. ${file.name} (${file.size} bytes)`);
        console.log(`   - ÄÆ°á»ng dáº«n: ${file.localPath}`);
        console.log(`   - Tráº¡ng thÃ¡i: ${file.needsSync ? 'Cáº§n Ä‘á»“ng bá»™' : 'ChÆ°a cÃ³ fileId'}`);
        console.log(`   - Loáº¡i file: ${file.fileType}`);
      });
    } else {
      console.log('Không cÃ³ file nÃ o cáº§n Ä‘á»“ng bá»™');
      return {
        success: true,
        syncedCount: 0,
        totalFiles: filesData.length,
        filesNeedingSync: 0
      };
    }
    
    let syncedCount = 0;
    let retryCount = 0;
    const maxRetries = 3;
    
    // Vá»›i má»—i file cáº§n Ä‘á»“ng bá»™
    for (const file of filesToSync) {
      try {
        console.log(`Äang Ä‘á»“ng bá»™ file "${file.name}"...`);
        
        // Äáº£m báº£o encode tên file tiáº¿ng Viá»‡t Ä‘Ãºng
        const filePath = Buffer.from(file.localPath, 'utf8').toString();
        console.log(`ÄÆ°á»ng dáº«n file: ${filePath}`);
        
        // Kiá»ƒm tra xem file cÃ³ tá»“n táº¡i không
        if (!fs.existsSync(filePath)) {
          console.error(`File không tá»“n táº¡i: ${filePath}`);
          file.syncError = `File không tá»“n táº¡i táº¡i Ä‘Æ°á»ng dáº«n: ${filePath}`;
          file.needsSync = true;
          continue;
        }
        
        // Kiá»ƒm tra kÃ­ch thưá»›c file
        const stats = fs.statSync(filePath);
        console.log(`KÃ­ch thưá»›c file: ${formatBytes(stats.size)}`);
        
        if (stats.size > MAX_FILE_SIZE) {
          console.error(`File "${file.name}" quÃ¡ lá»›n (${formatBytes(stats.size)}) Ä‘á»ƒ gá»­i qua Telegram.`);
          file.syncError = `File quÃ¡ lá»›n (${formatBytes(stats.size)}) Ä‘á»ƒ Ä‘á»“ng bá»™ vá»›i Telegram`;
          file.needsSync = true;
          continue;
        }
        
        // Táº¡o caption tá»« tên file
        const caption = `File: ${file.name}`;
        console.log(`Chuáº©n bá»‹ gá»­i file lÃªn Telegram vá»›i caption: "${caption}"`);
        
        // Gá»­i file lÃªn Telegram vá»›i timeout 2 phÃºt
        console.log(`Äang gá»­i file "${file.name}" lÃªn Telegram (chatId: ${CHAT_ID})...`);
        
        try {
          // Gá»­i file lÃªn Telegram dá»±a vÃ o loáº¡i file
          const sendFilePromise = (async () => {
            // Táº¡o caption vá»›i tên file Ä‘Ã£ Ä‘Æ°á»£c giáº£i mÃ£ UTF-8 Ä‘Ãºng
            let normalizedFileName = file.name;
            try {
              // Thá»­ normalize tên file Unicode
              normalizedFileName = decodeURIComponent(escape(file.name));
            } catch(e) {
              console.log(`Không thá»ƒ chuáº©n hÃ³a tên file: ${file.name}, sá»­ dụng tên gá»‘c`);
            }
            
            const caption = `File: ${normalizedFileName}`;
            const fileOptions = {
              source: filePath,
              filename: normalizedFileName
            };
            
            // Gá»­i táº¥t cả file dÆ°á»›i dáº¡ng document Ä‘á»ƒ trÃ¡nh lá»—i PHOTO_INVALID_DIMENSIONS
            console.log(`Gá»­i file "${file.name}" nhÆ° document Ä‘á»ƒ trÃ¡nh lá»—i format`);
            return bot.telegram.sendDocument(CHAT_ID, fileOptions, { caption: caption });
            
            /* Không cÃ²n sá»­ dụng code nÃ y Ä‘á»ƒ trÃ¡nh lá»—i
            if (file.fileType === 'image') {
              console.log(`Gá»­i file "${file.name}" nhÆ° hÃ¬nh áº£nh`);
              try {
                return bot.telegram.sendPhoto(CHAT_ID, { source: filePath }, { caption: caption });
              } catch (error) {
                // Náº¿u gáº·p lá»—i PHOTO_INVALID_DIMENSIONS, thá»­ gá»­i nhÆ° document
                if (error.message && error.message.includes('PHOTO_INVALID_DIMENSIONS')) {
                  console.log(`Không thá»ƒ gá»­i "${file.name}" nhÆ° hÃ¬nh áº£nh, thá»­ gá»­i nhÆ° document`);
                  return bot.telegram.sendDocument(CHAT_ID, {
                    source: filePath,
                    filename: file.name
                  }, { caption: caption });
                }
                throw error;
              }
            } else if (file.fileType === 'video') {
              console.log(`Gá»­i file "${file.name}" nhÆ° video`);
              try {
                return bot.telegram.sendVideo(CHAT_ID, { source: filePath }, { caption: caption });
              } catch (error) {
                // Náº¿u gáº·p lá»—i khi gá»­i video, thá»­ gá»­i nhÆ° document
                console.log(`Không thá»ƒ gá»­i "${file.name}" nhÆ° video, thá»­ gá»­i nhÆ° document`);
                return bot.telegram.sendDocument(CHAT_ID, {
                  source: filePath,
                  filename: file.name
                }, { caption: caption });
              }
            } else if (file.fileType === 'audio') {
              console.log(`Gá»­i file "${file.name}" nhÆ° audio`);
              try {
                return bot.telegram.sendAudio(CHAT_ID, { source: filePath }, { caption: caption });
              } catch (error) {
                // Náº¿u gáº·p lá»—i khi gá»­i audio, thá»­ gá»­i nhÆ° document
                console.log(`Không thá»ƒ gá»­i "${file.name}" nhÆ° audio, thá»­ gá»­i nhÆ° document`);
                return bot.telegram.sendDocument(CHAT_ID, {
                  source: filePath,
                  filename: file.name
                }, { caption: caption });
              }
            } else {
              console.log(`Gá»­i file "${file.name}" nhÆ° document`);
              return bot.telegram.sendDocument(CHAT_ID, {
                source: filePath,
                filename: file.name
              }, { caption: caption });
            }
            */
          })();
          
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout khi gá»­i file lÃªn Telegram')), 120000); // 2 phÃºt
          });
          
          console.log(`Äang chá» káº¿t quáº£ gá»­i file "${file.name}"...`);
          const result = await Promise.race([sendFilePromise, timeoutPromise]);
          
          console.log(`ÄÃ£ nháº­n pháº£n há»“i tá»« Telegram cho file "${file.name}"`);
          
          // Láº¥y file_id dá»±a trÃªn loáº¡i file
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
            console.warn(`Không tÃ¬m tháº¥y file_id cho file "${file.name}"`);
          }
          
          // Cáº­p nháº­t thÃ´ng tin file
          file.telegramFileId = fileId;
          file.telegramMessageId = result.message_id;
          file.telegramChatId = CHAT_ID;
          file.syncedAt = new Date().toISOString();
          file.needsSync = false;
          file.syncError = null;
          
          syncedCount++;
          console.log(`ÄÃ£ Ä‘á»“ng bá»™ file "${file.name}" thÃ nh công (file_id: ${fileId})`);
        } catch (sendError) {
          console.error(`Lỗi khi gá»­i file "${file.name}" lÃªn Telegram:`, sendError);
          throw sendError; // Äá»ƒ xá»­ lÃ½ á»Ÿ pháº§n catch bên ngoÃ i
        }
      } catch (error) {
        console.error(`Lỗi Ä‘á»“ng bá»™ file "${file.name}":`, error);
        
        // Thá»­ láº¡i náº¿u cáº§n
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`Thá»­ láº¡i láº§n ${retryCount}/${maxRetries} cho file "${file.name}"...`);
          // Chá» 2 giÃ¢y trÆ°á»›c khi thá»­ láº¡i
          await new Promise(resolve => setTimeout(resolve, 2000));
          file.needsSync = true;
          file.syncError = `Lỗi Ä‘á»“ng bá»™: ${error.message}. ÄÃ£ thá»­ ${retryCount}/${maxRetries} láº§n.`;
        } else {
          file.syncError = `Lỗi Ä‘á»“ng bá»™ sau ${maxRetries} láº§n thá»­: ${error.message}`;
          file.needsSync = true;
          console.error(`ÄÃ£ vÆ°á»£t quÃ¡ sá»‘ láº§n thá»­ láº¡i cho file "${file.name}". Bá» qua file nÃ y.`);
        }
      }
    }
    
    // LÆ°u láº¡i thÃ´ng tin file
    console.log(`LÆ°u thÃ´ng tin ${filesData.length} files vÃ o database...`);
    saveFilesDb(filesData);
    
    console.log(`===== Káº¾T THÃšC QUÃ TRÃŒNH Äá»’NG Bá»˜ =====`);
    console.log(`ÄÃ£ Ä‘á»“ng bá»™ thÃ nh công ${syncedCount}/${filesToSync.length} files vá»›i Telegram`);
    return {
      success: true,
      syncedCount: syncedCount,
      totalFiles: filesData.length,
      filesNeedingSync: filesToSync.length
    };
  } catch (error) {
    console.error('Lỗi Ä‘á»“ng bá»™ files:', error);
    return {
      success: false,
      error: error.message || 'Lỗi server khi Ä‘á»“ng bá»™ files'
    };
  }
}

/**
 * Láº¥y danh sÃ¡ch file tá»« Telegram
 */
async function getFilesFromTelegram() {
  try {
    if (!bot || !botActive) {
      console.error('Bot Telegram không hoáº¡t Ä‘á»™ng. Không thá»ƒ láº¥y file tá»« Telegram.');
      return;
    }
    
    console.log('Äang láº¥y danh sÃ¡ch file tá»« Telegram...');
    
    // Láº¥y chat id
    const chatId = CHAT_ID;
    if (!chatId || chatId === 'your_chat_id_here') {
      console.error('CHAT_ID chÆ°a Ä‘Æ°á»£c cáº¥u hÃ¬nh trong file .env.');
      return;
    }
    
    try {
      // Äá»c dá»¯ liá»‡u hiá»‡n táº¡i
      const filesData = readFilesDb();
      let newFileCount = 0;
      
      // Thá»­ láº¥y 100 message gáº§n nháº¥t tá»« chat
      const messages = await bot.telegram.getChatHistory(chatId, { limit: 100 });
      
      if (!messages || messages.length === 0) {
        console.log('Không tÃ¬m tháº¥y tin nháº¯n nÃ o trong chat.');
        return;
      }
      
      console.log(`TÃ¬m tháº¥y ${messages.length} tin nháº¯n, Ä‘ang xá»­ lÃ½...`);
      
      // Duyá»‡t qua tá»«ng tin nháº¯n Ä‘á»ƒ tÃ¬m file
      for (const message of messages) {
        let fileObj = null;
        let fileId = null;
        let fileType = 'document';
        let fileSize = 0;
        let fileName = '';
        
        // Kiá»ƒm tra loáº¡i file
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
        
        // Náº¿u tÃ¬m tháº¥y file
        if (fileId) {
          // Kiá»ƒm tra xem file Ä‘Ã£ tá»“n táº¡i trong database chÆ°a
          const existingFile = filesData.find(f => f.telegramFileId === fileId);
          
          if (!existingFile) {
            // Láº¥y Ä‘Æ°á»ng dáº«n táº£i xuá»‘ng
            const fileInfo = await bot.telegram.getFile(fileId);
            let telegramUrl = null;
            
            if (fileInfo && fileInfo.file_path) {
              telegramUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileInfo.file_path}`;
            }
            
            // ThÃªm file má»›i vÃ o database
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
        console.log(`ÄÃ£ tÃ¬m tháº¥y ${newFileCount} file má»›i tá»« Telegram. LÆ°u vÃ o database...`);
        saveFilesDb(filesData);
      } else {
        console.log('Không tÃ¬m tháº¥y file má»›i tá»« Telegram.');
      }
      
      return newFileCount;
    } catch (error) {
      console.error('Lỗi láº¥y tin nháº¯n tá»« Telegram:', error);
    }
  } catch (error) {
    console.error('Lỗi láº¥y danh sÃ¡ch file tá»« Telegram:', error);
  }
}

/**
 * Tá»± Ä‘á»™ng khÃ´i phá»¥c file tá»« Telegram khi file local bá»‹ máº¥t
 */
async function recoverFilesFromTelegram(filesData) {
  // Náº¿u bot không hoáº¡t Ä‘á»™ng, không thá»ƒ khÃ´i phá»¥c
  if (!botActive || !bot) {
    console.log('Bot Telegram không hoáº¡t Ä‘á»™ng. Không thá»ƒ khÃ´i phá»¥c file tá»« Telegram.');
    return;
  }
  
  // Lá»c cÃ¡c file cáº§n khÃ´i phá»¥c
  const filesToRecover = filesData.filter(file => file.needsRecovery && file.telegramFileId);
  
  if (filesToRecover.length === 0) {
    console.log('Không cÃ³ file nÃ o cáº§n khÃ´i phá»¥c tá»« Telegram.');
    return;
  }
  
  console.log(`Báº¯t Ä‘áº§u khÃ´i phá»¥c ${filesToRecover.length} file tá»« Telegram...`);
  
  let recoveredCount = 0;
  
  for (const file of filesToRecover) {
    try {
      console.log(`Äang khÃ´i phá»¥c file "${file.name}" tá»« Telegram...`);
      
      // Láº¥y link file
      if (!file.telegramUrl) {
        try {
          const fileLink = await bot.telegram.getFileLink(file.telegramFileId);
          file.telegramUrl = fileLink.href;
        } catch (error) {
          console.error(`Không thá»ƒ láº¥y link file tá»« Telegram: ${error.message}`);
          continue;
        }
      }
      
      // Táº£i file tá»« Telegram
      const response = await axios({
        method: 'get',
        url: file.telegramUrl,
        responseType: 'stream'
      });
      
      // Táº¡o tên file má»›i
      const fileName = `${Date.now()}-recovered-${file.name}`;
      const filePath = path.join(uploadsDir, fileName);
      
      // LÆ°u file vÃ o thư mục uploads
      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);
      
      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });
      
      // Cáº­p nháº­t thÃ´ng tin file
      file.localPath = filePath;
      file.missingLocal = false;
      file.needsRecovery = false;
      file.recoveredAt = new Date().toISOString();
      
      recoveredCount++;
      console.log(`ÄÃ£ khÃ´i phá»¥c file "${file.name}" thÃ nh công.`);
    } catch (error) {
      console.error(`Lỗi khÃ´i phá»¥c file "${file.name}":`, error);
    }
  }
  
  // LÆ°u láº¡i database
  if (recoveredCount > 0) {
    saveFilesDb(filesData);
    console.log(`ÄÃ£ khÃ´i phá»¥c ${recoveredCount}/${filesToRecover.length} file tá»« Telegram.`);
  }
}

/**
 * Chá»©c nÄƒng dá»n dáº¹p - Gá»­i file lÃªn Telegram vÃ  xóa khá»i local
 */
async function cleanUploads() {
  if (!bot || !botActive) {
    console.error('Bot Telegram không khá»Ÿi Ä‘á»™ng. Không thá»ƒ dá»n dáº¹p uploads.');
    throw new Error('Bot Telegram không hoáº¡t Ä‘á»™ng');
  }
  
  try {
    console.log('Báº¯t Ä‘áº§u dá»n dáº¹p thư mục uploads...');
    
    // Äá»c database
    const filesData = readFilesDb();
    
    // Lá»c cÃ¡c file chá»‰ lÆ°u á»Ÿ local
    const localOnlyFiles = filesData.filter(file => 
      file.localPath && 
      fs.existsSync(file.localPath) && 
      (!file.telegramFileId)
    );
    
    if (localOnlyFiles.length === 0) {
      console.log('Không cÃ³ file cáº§n xá»­ lÃ½');
      return;
    }
    
    console.log(`TÃ¬m tháº¥y ${localOnlyFiles.length} file cáº§n gá»­i lÃªn Telegram`);
    
    // ID chat Ä‘á»ƒ gá»­i file
    let chatId;
    
    try {
      // Láº¥y ID chat cá»§a bot vá»›i timeout
      const getMePromise = bot.telegram.getMe();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout khi láº¥y thÃ´ng tin bot')), 10000);
      });
      
      const botInfo = await Promise.race([getMePromise, timeoutPromise]);
      chatId = botInfo.id;
      console.log(`Sáº½ gá»­i file Ä‘áº¿n chat ID: ${chatId}`);
    } catch (error) {
      console.error('Không thá»ƒ láº¥y thÃ´ng tin bot:', error);
      throw new Error('Không thá»ƒ láº¥y thÃ´ng tin bot Ä‘á»ƒ gá»­i file');
    }
    
    // Xá»­ lÃ½ tá»«ng file
    for (const file of localOnlyFiles) {
      try {
        if (!fs.existsSync(file.localPath)) {
          console.warn(`File không tá»“n táº¡i: ${file.localPath}`);
          continue;
        }
        
        console.log(`Äang gá»­i file "${file.name}" (${formatBytes(file.size)}) lÃªn Telegram...`);
        
        // Gá»­i file lÃªn Telegram vá»›i timeout
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
          setTimeout(() => reject(new Error('Timeout khi gá»­i file lÃªn Telegram')), 60000); // TÄƒng timeout lÃªn 60 giÃ¢y
        });
        
        // Sử dụng Promise.race Ä‘á»ƒ Ä‘áº·t timeout
        message = await Promise.race([sendFilePromise, sendTimeoutPromise]);
        console.log(`ÄÃ£ gá»­i file "${file.name}" thÃ nh công lÃªn Telegram`);
        
        // Láº¥y ID file tÃ¹y thuá»™c vÃ o loáº¡i file
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
          throw new Error('Không láº¥y Ä‘Æ°á»£c Telegram File ID sau khi upload');
        }
        
        // Cáº­p nháº­t thÃ´ng tin file
        file.telegramFileId = telegramFileId;
        
        // Láº¥y link file vá»›i timeout
        try {
          const downloadUrl = await getTelegramFileLink(telegramFileId);
          file.telegramUrl = downloadUrl;
          console.log(`ÄÃ£ láº¥y Ä‘Æ°á»£c URL file: ${downloadUrl}`);
        } catch (linkError) {
          console.error(`Lỗi láº¥y link file: ${linkError.message}`);
          // Váº«n tiáº¿p tá»¥c xá»­ lÃ½ ngay cả khi không láº¥y Ä‘Æ°á»£c link
        }
        
        // XÃ³a file local
        fs.unlinkSync(file.localPath);
        console.log(`ÄÃ£ xóa file local: ${file.localPath}`);
        
        // Cáº­p nháº­t thÃ´ng tin file
        file.localPath = null;
        
        // LÆ°u láº¡i database sau má»—i file
        saveFilesDb(filesData);
        
        console.log(`ÄÃ£ xá»­ lÃ½ file "${file.name}" thÃ nh công`);
      } catch (error) {
        console.error(`Lỗi xá»­ lÃ½ file "${file.name}":`, error);
      }
    }
    
    console.log('QuÃ¡ trÃ¬nh dá»n dáº¹p Ä‘Ã£ hoÃ n táº¥t');
    return localOnlyFiles.length;
  } catch (error) {
    console.error('Lỗi dá»n dáº¹p uploads:', error);
    throw error;
  }
}

/**
 * Routes
 */

// ThÃªm cÃ¡c hÃ m utility cho template
// HÃ m xác Ä‘á»‹nh loáº¡i file dá»±a trÃªn tên file
function getFileType(filename) {
    const ext = path.extname(filename).toLowerCase();
    
    // áº¢nh
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
    
    // Máº·c Ä‘á»‹nh
    return 'document';
}

// Trang chá»§
app.get('/', async (req, res) => {
  try {
    // Äá»c database
    const filesData = readFilesDb();
    
    // Kiá»ƒm tra tráº¡ng thÃ¡i bot
    const isBotActive = await checkBotActive();
    
    // Äá»‹nh dáº¡ng dá»¯ liá»‡u trÆ°á»›c khi gá»­i tá»›i template
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
    
    // TÃ­nh toÃ¡n thá»‘ng kÃª
    const storageInfo = {
      used: filesData.reduce((sum, f) => sum + (f.size || 0), 0),
      total: MAX_FILE_SIZE * 10,
      percent: (filesData.reduce((sum, f) => sum + (f.size || 0), 0) / (MAX_FILE_SIZE * 10)) * 100
    };
    
    // Kiá»ƒm tra file cÃ³ váº¥n Ä‘á»
    const problemFiles = filesData.filter(f => 
      !f.telegramFileId || 
      (!f.localPath && !f.telegramUrl)
    ).length;
    
    // Render trang chá»§
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
    console.error('Lỗi hiá»ƒn thá»‹ trang chá»§:', error);
    res.status(500).render('error', {
      title: 'TeleDrive - Lỗi',
      message: 'Lỗi trong quÃ¡ trÃ¬nh xá»­ lÃ½ yÃªu cáº§u',
      error: {
        status: 500,
        stack: process.env.NODE_ENV === 'development' ? error.stack : ''
      }
    });
  }
});

// API endpoint Ä‘á»ƒ láº¥y thÃ´ng tin files
app.get('/api/files', (req, res) => {
  try {
    const filesData = readFilesDb();
    
    // Äá»‹nh dáº¡ng dá»¯ liá»‡u trÆ°á»›c khi gá»­i Ä‘i
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
    console.error('Lỗi láº¥y danh sÃ¡ch file:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// API Ä‘á»ƒ láº¥y thÃ´ng tin má»™t file
app.get('/api/files/:id', (req, res) => {
  try {
    const fileId = req.params.id;
    const filesData = readFilesDb();
    const file = filesData.find(f => f.id === fileId);
    
    if (!file) {
      return res.status(404).json({ error: 'File không tá»“n táº¡i' });
    }
    
    // Äá»‹nh dáº¡ng dá»¯ liá»‡u trÆ°á»›c khi gá»­i Ä‘i
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
    console.error('Lỗi láº¥y thÃ´ng tin file:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// HÃ m láº¥y link download tá»« Telegram vá»›i timeout
async function getTelegramFileLink(fileId) {
  if (!bot || !botActive) {
    throw new Error('Bot Telegram không hoáº¡t Ä‘á»™ng');
  }
  
  try {
    console.log(`Äang láº¥y file link cho Telegram file ID: ${fileId}`);
    
    // Thiáº¿t láº­p timeout cho viá»‡c láº¥y file
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout khi láº¥y link file tá»« Telegram')), 30000);
    });
    
    // Sử dụng Promise.race cho cả getFile vÃ  timeout
    const fileInfo = await Promise.race([bot.telegram.getFile(fileId), timeoutPromise]);
    
    if (!fileInfo || !fileInfo.file_path) {
      throw new Error('Không láº¥y Ä‘Æ°á»£c thÃ´ng tin file tá»« Telegram');
    }
    
    // Táº¡o URL download
    const downloadUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileInfo.file_path}`;
    console.log(`ÄÃ£ láº¥y Ä‘Æ°á»£c link file: ${downloadUrl}`);
    
    return downloadUrl;
  } catch (error) {
    console.error(`Lỗi láº¥y link file tá»« Telegram: ${error.message}`);
    throw error;
  }
}

// API endpoint Ä‘á»ƒ táº£i file theo ID - sá»­a Ä‘á»•i Ä‘á»ƒ luÃ´n táº£i tá»« Telegram
app.get('/api/files/:id/download', async (req, res) => {
  try {
    const fileId = req.params.id;
    const filesData = readFilesDb();
    const file = filesData.find(f => f.id === fileId);
    
    if (!file) {
      return res.status(404).render('error', { 
        title: 'TeleDrive - Không tÃ¬m tháº¥y',
        message: 'Không tÃ¬m tháº¥y file',
        error: { status: 404, stack: 'File không tá»“n táº¡i hoáº·c Ä‘Ã£ bá»‹ xóa' }
      });
    }
    
    // PHáº¦N 1: KIá»‚M TRA FILE LOCAL
    // Náº¿u file cÃ³ Ä‘Æ°á»ng dáº«n local vÃ  tá»“n táº¡i, Æ°u tiÃªn táº£i tá»« local
    if (file.localPath && fs.existsSync(file.localPath)) {
      console.log(`Táº£i file tá»« local: ${file.localPath}`);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
      res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
      
      const fileStream = fs.createReadStream(file.localPath);
      fileStream.pipe(res);
      return;
    }
    
    // PHáº¦N 2: KIá»‚M TRA VÃ€ Táº¢I Tá»ª TELEGRAM
    // Kiá»ƒm tra bot hoáº¡t Ä‘á»™ng
    if (!botActive || !bot) {
      return res.status(503).render('error', {
        title: 'TeleDrive - Bot không hoáº¡t Ä‘á»™ng',
        message: 'Bot Telegram Ä‘ang không hoáº¡t Ä‘á»™ng',
        error: { status: 503, stack: 'Bot cáº§n Ä‘Æ°á»£c káº¿t ná»‘i Ä‘á»ƒ táº£i file tá»« Telegram. Vui lÃ²ng thá»­ láº¡i sau.' }
      });
    }
    
    // Náº¿u file cÃ³ Telegram File ID
    if (file.telegramFileId) {
      try {
        console.log(`Äang táº£i file tá»« Telegram vá»›i ID: ${file.telegramFileId}`);
        
        // Láº¥y link file tá»« Telegram
        const downloadUrl = await getTelegramFileLink(file.telegramFileId);
        console.log(`ÄÃ£ láº¥y Ä‘Æ°á»£c URL táº£i xuá»‘ng: ${downloadUrl}`);
        
        // Cáº­p nháº­t URL cho láº§n sau
        const fileIndex = filesData.findIndex(f => f.id === fileId);
        if (fileIndex !== -1) {
          filesData[fileIndex].telegramUrl = downloadUrl;
          saveFilesDb(filesData);
        }

        try {
          // Táº£i file tá»« Telegram vÃ  stream trá»±c tiáº¿p Ä‘áº¿n ngÆ°á»i dÃ¹ng
          console.log(`Äang táº£i nội dung file tá»« URL: ${downloadUrl}`);
          const response = await axios({
            method: 'get',
            url: downloadUrl,
            responseType: 'stream'
          });
          
          // Thiáº¿t láº­p header tÆ°Æ¡ng á»©ng
          res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
          
          if (response.headers['content-type']) {
            res.setHeader('Content-Type', response.headers['content-type']);
          } else {
            res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
          }
          
          if (response.headers['content-length']) {
            res.setHeader('Content-Length', response.headers['content-length']);
          }
          
          // Stream dá»¯ liá»‡u Ä‘áº¿n client
          response.data.pipe(res);
          return;
        } catch (axiosError) {
          console.error(`Lỗi táº£i nội dung file tá»« Telegram: ${axiosError.message}`);
          throw new Error(`Không thá»ƒ táº£i nội dung file tá»« Telegram: ${axiosError.message}`);
        }
      } catch (error) {
        console.error(`Lỗi khi láº¥y file tá»« Telegram: ${error.message}`);
        
        // Thá»­ Ä‘á»“ng bá»™ láº¡i Ä‘á»ƒ cáº­p nháº­t telegramFileId
        try {
          await syncFiles();
          
          // Kiá»ƒm tra láº¡i sau khi Ä‘á»“ng bá»™
          const updatedFilesData = readFilesDb();
          const updatedFile = updatedFilesData.find(f => f.id === fileId);
          
          if (updatedFile && updatedFile.telegramFileId) {
            return res.redirect(`/api/files/${fileId}/download`);
          }
        } catch (syncError) {
          console.error(`Lỗi Ä‘á»“ng bá»™ Ä‘á»ƒ cáº­p nháº­t file: ${syncError.message}`);
        }
        
        return res.status(500).render('error', {
          title: 'TeleDrive - Lỗi táº£i file',
          message: 'Lỗi khi táº£i file tá»« Telegram. HÃ£y truy cáº­p /api/files/' + fileId + '/fix Ä‘á»ƒ kháº¯c phá»¥c.',
          error: { status: 500, stack: error.message }
        });
      }
    }
    
    // PHáº¦N 3: KHÃ”NG TÃŒM THáº¤Y FILE
    // Náº¿u không cÃ³ file á»Ÿ local vÃ  không cÃ³ telegramFileId, thá»­ Ä‘á»“ng bá»™
    try {
      // Thá»­ Ä‘á»“ng bá»™ file
      console.log(`Thá»­ Ä‘á»“ng bá»™ file ${fileId} vá»›i Telegram`);
      await syncFiles();
      
      // Äá»c láº¡i dá»¯ liá»‡u file sau khi Ä‘á»“ng bá»™
      const updatedFilesData = readFilesDb();
      const updatedFile = updatedFilesData.find(f => f.id === fileId);
      
      // Kiá»ƒm tra xem file Ä‘Ã£ cÃ³ trÃªn Telegram sau khi Ä‘á»“ng bá»™ chÆ°a
      if (updatedFile && updatedFile.telegramFileId) {
        console.log(`ÄÃ£ Ä‘á»“ng bá»™ file ${fileId}, thá»­ táº£i láº¡i`);
        return res.redirect(`/api/files/${fileId}/download`);
      }
    } catch (syncError) {
      console.error(`Lỗi Ä‘á»“ng bá»™ file: ${syncError.message}`);
    }
    
    // Náº¿u váº«n không thá»ƒ táº£i, tráº£ vá» lá»—i cuá»‘i cÃ¹ng
    return res.status(404).render('error', {
      title: 'TeleDrive - File không kháº£ dụng',
      message: 'File không kháº£ dụng Ä‘á»ƒ táº£i xuá»‘ng',
      error: { 
        status: 404, 
        stack: 'File không tá»“n táº¡i á»Ÿ local vÃ  không cÃ³ trÃªn Telegram. Vui lÃ²ng truy cáº­p /api/files/' + fileId + '/fix Ä‘á»ƒ kháº¯c phá»¥c hoáº·c táº£i lÃªn láº¡i file.' 
      }
    });
  } catch (error) {
    console.error(`Lỗi xá»­ lÃ½ táº£i file: ${error.message}`);
    res.status(500).render('error', {
      title: 'TeleDrive - Lỗi server',
      message: 'Lỗi server khi táº£i file',
      error: { status: 500, stack: error.message }
    });
  }
});

// API táº¡o hoáº·c cáº­p nháº­t file vá»›i telegramFileId tÃ¹y chá»‰nh
app.post('/api/create-file', express.json(), async (req, res) => {
  try {
    const { name, size, mimeType, telegramFileId } = req.body;
    
    if (!name || !telegramFileId) {
      return res.status(400).json({
        success: false,
        message: 'Thiáº¿u thÃ´ng tin báº¯t buá»™c (name, telegramFileId)'
      });
    }
    
    const filesData = readFilesDb();
    
    // Táº¡o ID má»›i náº¿u chÆ°a cÃ³
    const fileId = req.body.id || uuidv4();
    
    // Kiá»ƒm tra xem file Ä‘Ã£ tá»“n táº¡i chÆ°a
    const existingFileIndex = filesData.findIndex(f => f.id === fileId);
    
    if (existingFileIndex !== -1) {
      // Cáº­p nháº­t file hiá»‡n cÃ³
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
        message: 'ÄÃ£ cáº­p nháº­t file thÃ nh công',
        file: filesData[existingFileIndex]
      });
    } else {
      // Táº¡o file má»›i
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
        message: 'ÄÃ£ táº¡o file má»›i thÃ nh công',
        file: newFile
      });
    }
  } catch (error) {
    console.error('Lỗi táº¡o/cáº­p nháº­t file:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi táº¡o/cáº­p nháº­t file: ' + error.message
    });
  }
});

// API Ä‘á»ƒ thá»§ công cáº­p nháº­t Telegram File ID cho file
app.post('/api/update-file/:id', express.json(), async (req, res) => {
  try {
    const fileId = req.params.id;
    const { telegramFileId } = req.body;
    
    if (!telegramFileId) {
      return res.status(400).json({
        success: false,
        message: 'Thiáº¿u telegramFileId trong request body'
      });
    }
    
    // Äá»c database
    const filesData = readFilesDb();
    const fileIndex = filesData.findIndex(f => f.id === fileId);
    
    if (fileIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Không tÃ¬m tháº¥y file vá»›i ID Ä‘Ã£ cung cáº¥p'
      });
    }
    
    // Kiá»ƒm tra xem telegramFileId cÃ³ há»£p lá»‡ không
    if (!botActive || !bot) {
      return res.status(400).json({
        success: false,
        message: 'Bot Telegram không hoáº¡t Ä‘á»™ng, không thá»ƒ xác minh File ID'
      });
    }
    
    try {
      // Thá»­ láº¥y thÃ´ng tin file tá»« Telegram Ä‘á»ƒ xác minh ID
      console.log(`XÃ¡c minh Telegram File ID: ${telegramFileId}`);
      const fileInfo = await bot.telegram.getFile(telegramFileId);
      
      if (!fileInfo || !fileInfo.file_path) {
        return res.status(400).json({
          success: false,
          message: 'Telegram File ID không há»£p lá»‡ hoáº·c không tá»“n táº¡i'
        });
      }
      
      // Cáº­p nháº­t thÃ´ng tin file
      filesData[fileIndex].telegramFileId = telegramFileId;
      filesData[fileIndex].telegramUrl = null;
      
      // Láº¥y URL download
      const downloadUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileInfo.file_path}`;
      filesData[fileIndex].telegramUrl = downloadUrl;
      
      // Cáº­p nháº­t database
      saveFilesDb(filesData);
      
      return res.json({
        success: true,
        message: 'ÄÃ£ cáº­p nháº­t Telegram File ID thÃ nh công',
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
    console.error(`Lỗi cáº­p nháº­t file: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: `Lỗi server: ${error.message}`
    });
  }
});

// Tá»± Ä‘á»™ng Ä‘á»“ng bá»™ file ngay sau khi upload
async function autoSyncFile(file) {
  try {
    if (!bot || !botActive) {
      console.log(`Bot Telegram không hoáº¡t Ä‘á»™ng. Không thá»ƒ tá»± Ä‘á»™ng Ä‘á»“ng bá»™ file ${file.name}`);
      return false;
    }
    
    console.log(`Tá»± Ä‘á»™ng Ä‘á»“ng bá»™ file: ${file.name}`);
    
    // Kiá»ƒm tra file cÃ³ tá»“n táº¡i không
    if (!file.localPath) {
      console.log(`File ${file.name} không cÃ³ Ä‘Æ°á»ng dáº«n local, không thá»ƒ Ä‘á»“ng bá»™.`);
      return false;
    }
    
    // Kiá»ƒm tra file cÃ³ tá»“n táº¡i trÃªn há»‡ thá»‘ng không
    if (!fs.existsSync(file.localPath)) {
      console.log(`File ${file.name} không tá»“n táº¡i táº¡i Ä‘Æ°á»ng dáº«n ${file.localPath}, không thá»ƒ Ä‘á»“ng bá»™.`);
      return false;
    }
    
    // ID chat Ä‘á»ƒ gá»­i file
    let chatId;
    
    if (CHAT_ID && CHAT_ID !== 'your_chat_id_here') {
      // Sử dụng CHAT_ID tá»« file .env
      chatId = CHAT_ID;
    } else {
      console.error('CHAT_ID chÆ°a Ä‘Æ°á»£c cáº¥u hÃ¬nh trong file .env. Không thá»ƒ Ä‘á»“ng bá»™ file.');
      return false;
    }
    
    // Gá»­i file lÃªn Telegram
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
      console.error(`Lỗi tá»± Ä‘á»™ng Ä‘á»“ng bá»™ file ${file.name}:`, err);
      return false;
    }
    
    // Láº¥y Telegram File ID tá»« message
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
      console.log(`Không láº¥y Ä‘Æ°á»£c Telegram File ID sau khi upload file ${file.name}`);
      return false;
    }
    
    // Cáº­p nháº­t thÃ´ng tin file
    file.telegramFileId = telegramFileId;
    file.needsSync = false;
    
    // Láº¥y Ä‘Æ°á»ng dáº«n táº£i xuá»‘ng
    const fileInfo = await bot.telegram.getFile(telegramFileId);
    if (fileInfo && fileInfo.file_path) {
      const downloadUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileInfo.file_path}`;
      file.telegramUrl = downloadUrl;
    }
    
    // Äá»c danh sÃ¡ch file tá»« database
    const filesData = readFilesDb();
    
    // TÃ¬m vÃ  cáº­p nháº­t file trong database
    const fileIndex = filesData.findIndex(f => f.id === file.id);
    if (fileIndex !== -1) {
      filesData[fileIndex] = file;
      saveFilesDb(filesData);
      console.log(`ÄÃ£ tá»± Ä‘á»™ng Ä‘á»“ng bá»™ file ${file.name} thÃ nh công`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Lỗi tá»± Ä‘á»™ng Ä‘á»“ng bá»™ file ${file.name}:`, error);
    console.log(`Không thá»ƒ tá»± Ä‘á»™ng Ä‘á»“ng bá»™ file ${file.name}, sáº½ Ä‘á»“ng bá»™ sau`);
    return false;
  }
}

// Äá»“ng bá»™ tá»± Ä‘á»™ng sau khi upload
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Không cÃ³ file nÃ o Ä‘Æ°á»£c táº£i lÃªn' });
    }
    
    // ThÃªm file vÃ o database ngay láº­p tá»©c thay vÃ¬ Ä‘á»£i Ä‘á»“ng bá»™
    const fileName = req.file.filename;
    const originalName = req.originalFileName || req.file.originalname;
    const filePath = req.file.path; // Sử dụng Ä‘Æ°á»ng dáº«n tá»« multer thay vÃ¬ tá»± táº¡o
    const fileStats = fs.statSync(filePath);
    const fileExt = path.extname(originalName); // Láº¥y extension tá»« tên gá»‘c
    const mimeType = getMimeType(fileExt);
    const fileType = getFileType(originalName);
    
    // Táº¡o báº£n ghi file má»›i
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
    
    // ThÃªm vÃ o database
    const filesData = readFilesDb();
    filesData.push(newFile);
    saveFilesDb(filesData);
    
    // Tá»± Ä‘á»™ng Ä‘á»“ng bá»™ file lÃªn Telegram náº¿u cÃ³ thá»ƒ (không cháº·n response)
    if (botActive && bot) {
      // Cháº¡y Ä‘á»“ng bá»™ trong background
      autoSyncFile(newFile).then(success => {
        if (success) {
          console.log(`ÄÃ£ tá»± Ä‘á»™ng Ä‘á»“ng bá»™ file ${newFile.name} lÃªn Telegram`);
          
          // Cáº­p nháº­t láº¡i database sau khi Ä‘á»“ng bá»™
          const updatedFilesData = readFilesDb();
          const fileIndex = updatedFilesData.findIndex(f => f.id === newFile.id);
          if (fileIndex !== -1) {
            updatedFilesData[fileIndex].telegramFileId = newFile.telegramFileId;
            updatedFilesData[fileIndex].telegramUrl = newFile.telegramUrl;
            saveFilesDb(updatedFilesData);
          }
        } else {
          console.log(`Không thá»ƒ tá»± Ä‘á»™ng Ä‘á»“ng bá»™ file ${newFile.name}, sáº½ Ä‘á»“ng bá»™ sau`);
        }
      }).catch(error => {
        console.error(`Lỗi trong quÃ¡ trÃ¬nh tá»± Ä‘á»™ng Ä‘á»“ng bá»™ file ${newFile.name}:`, error);
      });
    }
    
    res.json({ 
      success: true, 
      message: 'File Ä‘Ã£ Ä‘Æ°á»£c táº£i lÃªn thÃ nh công',
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
    res.status(500).json({ error: 'Lỗi xá»­ lÃ½ file: ' + error.message });
  }
});

// API Ä‘á»ƒ kháº¯c phá»¥c file vá»›i ID cá»¥ thá»ƒ
app.get('/api/files/:id/fix', async (req, res) => {
  try {
    const fileId = req.params.id;
    const filesData = readFilesDb();
    const fileIndex = filesData.findIndex(f => f.id === fileId);
    
    if (fileIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'File không tá»“n táº¡i'
      });
    }
    
    // Náº¿u bot hoáº¡t Ä‘á»™ng, thá»­ Ä‘á»“ng bá»™ file vá»›i Telegram
    if (botActive && bot && filesData[fileIndex].localPath && fs.existsSync(filesData[fileIndex].localPath)) {
      try {
        console.log(`Äang thá»­ Ä‘á»“ng bá»™ file "${filesData[fileIndex].name}" lÃªn Telegram...`);
        
        // Láº¥y chat ID
        const botInfo = await bot.telegram.getMe();
        const chatId = botInfo.id;
        
        // Gá»­i file lÃªn Telegram
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
        
        // Láº¥y file ID
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
          
          // Láº¥y URL
          const fileInfo = await bot.telegram.getFile(telegramFileId);
          if (fileInfo && fileInfo.file_path) {
            const downloadUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileInfo.file_path}`;
            filesData[fileIndex].telegramUrl = downloadUrl;
            saveFilesDb(filesData);
            
            return res.json({
              success: true,
              message: 'ÄÃ£ sá»­a thÃ´ng tin file vÃ  Ä‘á»“ng bá»™ lÃªn Telegram thÃ nh công',
              downloadUrl: downloadUrl
            });
          }
        }
      } catch (error) {
        console.error('Lỗi Ä‘á»“ng bá»™ file lÃªn Telegram:', error);
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
            message: 'ÄÃ£ sá»­a thÃ´ng tin file vÃ  láº¥y URL thÃ nh công',
            downloadUrl: downloadUrl
          });
        }
      } catch (error) {
        console.error('Lỗi láº¥y URL file tá»« Telegram:', error);
      }
    }
    
    return res.json({
      success: true,
      message: 'ÄÃ£ sá»­a thÃ´ng tin file, vui lÃ²ng thá»­ Ä‘á»“ng bá»™ hoáº·c táº£i lÃªn láº¡i',
      file: filesData[fileIndex]
    });
  } catch (error) {
    console.error('Lỗi sá»­a thÃ´ng tin file:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
});

// API kiá»ƒm tra vÃ  sá»­a dá»¯ liá»‡u files
app.get('/api/check-files', async (req, res) => {
  try {
    console.log('Báº¯t Ä‘áº§u kiá»ƒm tra vÃ  sá»­a dá»¯ liá»‡u file...');
    
    // Äá»c danh sÃ¡ch file tá»« database
    const filesData = readFilesDb();
    
    // Kiá»ƒm tra tá»«ng file
    let fixedCount = 0;
    let problemCount = 0;
    
    for (const file of filesData) {
      let needFix = false;
      
      // Kiá»ƒm tra file cÃ³ tá»“n táº¡i không
      const fileExists = file.localPath && fs.existsSync(file.localPath);
      
      // Kiá»ƒm tra telegramFileId
      const hasTelegramId = !!file.telegramFileId;
      
      // ÄÃ¡nh dáº¥u file cáº§n Ä‘á»“ng bá»™ náº¿u không cÃ³ telegramFileId
      if (!hasTelegramId && fileExists) {
        file.needsSync = true;
        needFix = true;
        problemCount++;
      }
      
      // ÄÃ¡nh dáº¥u file Ä‘Ã£ bá»‹ xóa náº¿u không tá»“n táº¡i local vÃ  không cÃ³ telegramFileId
      if (!fileExists && !hasTelegramId) {
        file.deleted = true;
        needFix = true;
        problemCount++;
      }
      
      if (needFix) {
        fixedCount++;
      }
    }
    
    // Lá»c bá» cÃ¡c file Ä‘Ã£ bá»‹ xóa
    const newFilesData = filesData.filter(file => !file.deleted);
    
    // LÆ°u láº¡i database
    saveFilesDb(newFilesData);
    
    res.json({
      success: true,
      message: `ÄÃ£ kiá»ƒm tra ${filesData.length} file, sá»­a ${fixedCount} file cÃ³ váº¥n Ä‘á», xóa ${filesData.length - newFilesData.length} file không tá»“n táº¡i.`,
      totalFiles: filesData.length,
      fixedCount,
      problemCount,
      deletedCount: filesData.length - newFilesData.length
    });
  } catch (error) {
    console.error('Lỗi kiá»ƒm tra file:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi kiá»ƒm tra file: ' + error.message
    });
  }
});

// API Ä‘á»ƒ khá»Ÿi táº¡o láº¡i database vÃ  sá»­a táº¥t cả dá»¯ liá»‡u
app.get('/api/reset-database', async (req, res) => {
  try {
    console.log('Báº¯t Ä‘áº§u khá»Ÿi táº¡o láº¡i database');
    // Äá»c táº¥t cả file trong thư mục uploads
    const uploadedFiles = fs.readdirSync(uploadsDir);
    
    // Táº¡o danh sÃ¡ch file má»›i
    let newFilesData = [];
    
    // Duyá»‡t qua tá»«ng file vÃ  táº¡o metadata
    for (const fileName of uploadedFiles) {
      const filePath = path.join(uploadsDir, fileName);
      const stats = fs.statSync(filePath);
      
      if (!stats.isFile()) continue;
      
      const originalName = fileName; // TÃªn gá»‘c lÃ  tên file
      const fileExt = path.extname(originalName);
      const mimeType = getMimeType(fileExt);
      
      // Táº¡o thÃ´ng tin file má»›i
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
    
    // LÆ°u dá»¯ liá»‡u má»›i
    saveFilesDb(newFilesData);
    
    // Äá»c dá»¯ liá»‡u vá»«a lÆ°u
    const filesData = readFilesDb();
    
    // Thá»­ Ä‘á»“ng bá»™ vá»›i Telegram náº¿u cÃ³ thá»ƒ
    let syncResult = { success: false, syncedFiles: 0 };
    if (botActive && bot) {
      try {
        const syncedCount = await syncFiles();
        syncResult = { success: true, syncedFiles: syncedCount };
      } catch (syncError) {
        console.error('Lỗi Ä‘á»“ng bá»™ sau khi khá»Ÿi táº¡o láº¡i database:', syncError);
        syncResult = { success: false, error: syncError.message };
      }
    }
    
    res.json({
      success: true,
      message: 'ÄÃ£ khá»Ÿi táº¡o láº¡i database thÃ nh công',
      totalFiles: filesData.length,
      sync: syncResult
    });
  } catch (error) {
    console.error('Lỗi khá»Ÿi táº¡o láº¡i database:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khá»Ÿi táº¡o láº¡i database: ' + error.message
    });
  }
});

// API endpoint Ä‘á»ƒ kiá»ƒm tra tráº¡ng thÃ¡i hoáº¡t Ä‘á»™ng
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    message: 'TeleDrive API Ä‘ang hoáº¡t Ä‘á»™ng',
    version: '1.0.0',
    botActive: botActive
  });
});

// Má»Ÿ rá»™ng dá»¯ liá»‡u file Ä‘á»ƒ há»— trá»£ thư mục
function createVirtualFolderStructure(files) {
  // Táº¡o cáº¥u trÃºc thư mục áº£o
  const rootFolder = {
    id: 'root',
    name: 'Root',
    type: 'folder',
    parent: null,
    children: [],
    createdAt: new Date().toISOString()
  };
  
  // LÆ°u táº¥t cả thư mục báº±ng ID
  const foldersById = { 'root': rootFolder };
  
  // TrÃ­ch xuáº¥t táº¥t cả thư mục tá»« Ä‘Æ°á»ng dáº«n file
  files.forEach(file => {
    // Láº¥y tên file vÃ  Ä‘Æ°á»ng dáº«n thư mục
    let filePath = file.name;
    let folders = [];
    
    // Náº¿u file cÃ³ dáº¥u / hoáº·c \, phÃ¢n tÃ¡ch thÃ nh thư mục
    if (filePath.includes('/') || filePath.includes('\\')) {
      // Chuáº©n hÃ³a Ä‘Æ°á»ng dáº«n
      const normalizedPath = filePath.replace(/\\/g, '/');
      const parts = normalizedPath.split('/');
      
      // File lÃ  pháº§n tá»­ cuá»‘i cÃ¹ng
      const fileName = parts.pop();
      
      // CÃ¡c pháº§n cÃ²n láº¡i lÃ  thư mục
      folders = parts;
      
      // Cáº­p nháº­t tên file không bao gá»“m Ä‘Æ°á»ng dáº«n
      file.displayName = fileName;
    } else {
      file.displayName = filePath;
    }
    
    // Táº¡o cÃ¡c thư mục náº¿u chÆ°a tá»“n táº¡i
    let currentParent = 'root';
    let currentPath = '';
    
    folders.forEach(folderName => {
      currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;
      const folderId = `folder_${currentPath.replace(/[^a-z0-9]/gi, '_')}`;
      
      if (!foldersById[folderId]) {
        // Táº¡o thư mục má»›i
        const newFolder = {
          id: folderId,
          name: folderName,
          type: 'folder',
          parent: currentParent,
          children: [],
          path: currentPath,
          createdAt: new Date().toISOString()
        };
        
        // ThÃªm vÃ o danh sÃ¡ch thư mục
        foldersById[folderId] = newFolder;
        
        // ThÃªm vÃ o thư mục cha
        foldersById[currentParent].children.push(folderId);
      }
      
      currentParent = folderId;
    });
    
    // GÃ¡n file vÃ o thư mục cha
    file.parent = currentParent;
    file.type = 'file';
    
    // ThÃªm file vÃ o thư mục cha
    foldersById[currentParent].children.push(file.id);
  });
  
  return {
    rootFolder,
    foldersById,
    folderTree: buildFolderTree(rootFolder, foldersById, files)
  };
}

// XÃ¢y dá»±ng cÃ¢y thư mục tá»« thư mục gá»‘c
function buildFolderTree(folder, foldersById, files) {
  // Táº¡o báº£n sao Ä‘á»ƒ trÃ¡nh thay Ä‘á»•i dá»¯ liá»‡u gá»‘c
  const result = {
    ...folder,
    children: []
  };
  
  // Duyá»‡t qua tá»«ng children ID
  folder.children.forEach(childId => {
    // Náº¿u ID báº¯t Ä‘áº§u báº±ng "folder_", Ä‘Ã³ lÃ  thư mục
    if (typeof childId === 'string' && foldersById[childId]) {
      // Äá»‡ quy xÃ¢y dá»±ng cÃ¢y con
      const childFolder = buildFolderTree(foldersById[childId], foldersById, files);
      result.children.push(childFolder);
    } else {
      // ÄÃ¢y lÃ  file, thÃªm vÃ o danh sÃ¡ch
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

// API endpoint Ä‘á»ƒ láº¥y cáº¥u trÃºc thư mục
app.get('/api/folders', (req, res) => {
  try {
    const filesData = readFilesDb();
    const folderStructure = createVirtualFolderStructure(filesData);
    
    res.json({
      success: true,
      folders: folderStructure.folderTree
    });
  } catch (error) {
    console.error('Lỗi láº¥y cáº¥u trÃºc thư mục:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi láº¥y cáº¥u trÃºc thư mục: ' + error.message
    });
  }
});

// API endpoint Ä‘á»ƒ láº¥y nội dung cá»§a thư mục
app.get('/api/folders/:folderId', (req, res) => {
  try {
    const folderId = req.params.folderId;
    const filesData = readFilesDb();
    const folderStructure = createVirtualFolderStructure(filesData);
    
    // Náº¿u folderId lÃ  'root', tráº£ vá» thư mục gá»‘c
    if (folderId === 'root') {
      return res.json({
        success: true,
        folder: folderStructure.folderTree
      });
    }
    
    // TÃ¬m thư mục theo ID
    const folder = folderStructure.foldersById[folderId];
    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Không tÃ¬m tháº¥y thư mục'
      });
    }
    
    // XÃ¢y dá»±ng cÃ¢y thư mục tá»« thư mục nÃ y
    const folderTree = buildFolderTree(folder, folderStructure.foldersById, filesData);
    
    res.json({
      success: true,
      folder: folderTree
    });
  } catch (error) {
    console.error('Lỗi láº¥y nội dung thư mục:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi láº¥y nội dung thư mục: ' + error.message
    });
  }
});

// API Ä‘á»ƒ tÃ¬m kiáº¿m file
app.get('/api/search', (req, res) => {
  try {
    const { query, type } = req.query;
    
    if (!query || query.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Tá»« khÃ³a tÃ¬m kiáº¿m không Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng'
      });
    }
    
    // Äá»c database
    const filesData = readFilesDb();
    
    // TÃ¬m kiáº¿m file
    let results;
    
    if (type && type !== 'all') {
      // TÃ¬m theo loáº¡i file
      results = filesData.filter(file => 
        (file.name.toLowerCase().includes(query.toLowerCase()) || 
         (file.tags && file.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase())))) &&
        file.fileType === type && 
        !file.isDeleted
      );
    } else {
      // TÃ¬m táº¥t cả loáº¡i file
      results = filesData.filter(file => 
        (file.name.toLowerCase().includes(query.toLowerCase()) || 
         (file.tags && file.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase())))) &&
        !file.isDeleted
      );
    }
    
    // Äá»‹nh dáº¡ng dá»¯ liá»‡u trÆ°á»›c khi gá»­i Ä‘i
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
    
    // Tráº£ vá» káº¿t quáº£
    return res.json({
      success: true,
      count: formattedResults.length,
      results: formattedResults,
      query: query,
      type: type || 'all'
    });
  } catch (error) {
    console.error('Lỗi tÃ¬m kiáº¿m file:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi server khi tÃ¬m kiáº¿m file'
    });
  }
});

// API Ä‘á»ƒ chia sáº» file
app.post('/api/files/:id/share', express.json(), (req, res) => {
  try {
    const fileId = req.params.id;
    const { isPublic, expiryDate } = req.body;
    
    const filesData = readFilesDb();
    const fileIndex = filesData.findIndex(f => f.id === fileId);
    
    if (fileIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'File không tá»“n táº¡i'
      });
    }
    
    // Táº¡o mÃ£ chia sáº» ngáº«u nhiÃªn náº¿u chÆ°a cÃ³
    if (!filesData[fileIndex].shareCode) {
      const shareCode = crypto.randomBytes(6).toString('hex');
      filesData[fileIndex].shareCode = shareCode;
    }
    
    // Cáº­p nháº­t thÃ´ng tin chia sáº»
    filesData[fileIndex].isPublic = isPublic === true;
    
    // Äáº·t ngÃ y háº¿t háº¡n náº¿u cÃ³
    if (expiryDate) {
      filesData[fileIndex].shareExpiry = new Date(expiryDate).toISOString();
    } else {
      filesData[fileIndex].shareExpiry = null;
    }
    
    // LÆ°u láº¡i database
    saveFilesDb(filesData);
    
    // Táº¡o URL chia sáº»
    const shareUrl = `/share/${filesData[fileIndex].shareCode}`;
    
    res.json({
      success: true,
      message: 'ÄÃ£ cáº­p nháº­t thiáº¿t láº­p chia sáº»',
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
    console.error('Lỗi cáº­p nháº­t chia sáº» file:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi cáº­p nháº­t chia sáº»: ' + error.message
    });
  }
});

// Trang xem file Ä‘Æ°á»£c chia sáº»
app.get('/share/:shareCode', async (req, res) => {
  try {
    const shareCode = req.params.shareCode;
    const filesData = readFilesDb();
    
    // TÃ¬m file theo mÃ£ chia sáº»
    const file = filesData.find(f => f.shareCode === shareCode);
    
    if (!file) {
      return res.status(404).render('error', {
        title: 'TeleDrive - Link không tá»“n táº¡i',
        message: 'Link chia sáº» không tá»“n táº¡i hoáº·c Ä‘Ã£ háº¿t háº¡n',
        error: { status: 404, stack: 'File không tá»“n táº¡i hoáº·c link chia sáº» Ä‘Ã£ bá»‹ xóa' }
      });
    }
    
    // Kiá»ƒm tra xem link Ä‘Ã£ háº¿t háº¡n chÆ°a
    if (file.shareExpiry) {
      const expiryDate = new Date(file.shareExpiry);
      if (expiryDate < new Date()) {
        return res.status(410).render('error', {
          title: 'TeleDrive - Link háº¿t háº¡n',
          message: 'Link chia sáº» Ä‘Ã£ háº¿t háº¡n',
          error: { status: 410, stack: 'Link chia sáº» nÃ y Ä‘Ã£ quÃ¡ háº¡n sá»­ dụng' }
        });
      }
    }
    
    // Kiá»ƒm tra xem file cÃ³ Ä‘Æ°á»£c chia sáº» công khai không
    if (!file.isPublic) {
      return res.status(403).render('error', {
        title: 'TeleDrive - Không cÃ³ quyá»n truy cáº­p',
        message: 'File nÃ y không Ä‘Æ°á»£c chia sáº» công khai',
        error: { status: 403, stack: 'Báº¡n không cÃ³ quyá»n truy cáº­p file nÃ y' }
      });
    }
    
    // Äá»‹nh dáº¡ng dá»¯ liá»‡u file
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
    
    // Render trang xem file Ä‘Æ°á»£c chia sáº»
    res.render('file-details', {
      title: `TeleDrive - ${file.name}`,
      file: formattedFile,
      isSharedView: true,
      shareCode: shareCode
    });
  } catch (error) {
    console.error('Lỗi xá»­ lÃ½ file chia sáº»:', error);
    res.status(500).render('error', {
      title: 'TeleDrive - Lỗi',
      message: 'Lỗi xá»­ lÃ½ yÃªu cáº§u',
      error: { status: 500, stack: error.message }
    });
  }
});

/**
 * Kiá»ƒm tra file .env
 * Náº¿u file .env không tá»“n táº¡i, táº¡o tá»« file .env.example
 */
function checkEnvFile() {
  try {
    if (!fs.existsSync('.env')) {
      console.log('File .env không tá»“n táº¡i, táº¡o tá»« file .env.example');
      if (fs.existsSync('.env.example')) {
        fs.copyFileSync('.env.example', '.env');
        console.log('ÄÃ£ táº¡o file .env tá»« file .env.example');
      } else {
        console.log('File .env.example không tá»“n táº¡i, táº¡o file .env trá»‘ng');
        fs.writeFileSync('.env', 'PORT=5002\nBOT_TOKEN=\nMAX_FILE_SIZE=1000\n');
      }
    }
  } catch (error) {
    console.error('Lỗi kiá»ƒm tra file .env:', error);
  }
}

/**
 * Xá»­ lÃ½ cÃ¡c tham sá»‘ dÃ²ng lá»‡nh 
 */
async function handleCommandLineArgs() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    // Không cÃ³ tham sá»‘, khá»Ÿi Ä‘á»™ng bÃ¬nh thưá»ng
    return false;
  }

  const command = args[0].toLowerCase();
  
  switch (command) {
    case 'sync':
      console.log('Äang Ä‘á»“ng bá»™ files vá»›i Telegram...');
      try {
        await initBot().then(async (botInstance) => {
          if (botInstance) {
            bot = botInstance;
            botActive = await checkBotActive();
            if (botActive) {
              const syncedCount = await syncFiles();
              console.log(`ÄÃ£ Ä‘á»“ng bá»™ ${syncedCount} files vá»›i Telegram.`);
            } else {
              console.log('Bot không hoáº¡t Ä‘á»™ng, không thá»ƒ Ä‘á»“ng bá»™ files.');
            }
          } else {
            console.log('Không thá»ƒ khá»Ÿi táº¡o bot, không thá»ƒ Ä‘á»“ng bá»™ files.');
          }
        });
      } catch (error) {
        console.error('Lỗi Ä‘á»“ng bá»™ files:', error);
      }
      return false;
      
    case 'clean':
      console.log('Äang dá»n dáº¹p uploads...');
      try {
        await initBot().then(async (botInstance) => {
          if (botInstance) {
            bot = botInstance;
            botActive = await checkBotActive();
            if (botActive) {
              const cleanedCount = await cleanUploads();
              console.log(`ÄÃ£ dá»n dáº¹p ${cleanedCount} files.`);
            } else {
              console.log('Bot không hoáº¡t Ä‘á»™ng, không thá»ƒ dá»n dáº¹p uploads.');
            }
          } else {
            console.log('Không thá»ƒ khá»Ÿi táº¡o bot, không thá»ƒ dá»n dáº¹p uploads.');
          }
        });
      } catch (error) {
        console.error('Lỗi dá»n dáº¹p uploads:', error);
      }
      return false;
      
    default:
      console.log(`Lá»‡nh không há»£p lá»‡: ${command}`);
      return false;
  }
}

// Make sure to place this right above the last middleware error handlers
// Move the error and 404 handlers to the very end of routes

  console.error('Lỗi server:', err);
  res.status(500).json({
    success: false,
    error: 'Lỗi server: ' + (err.message || 'Không xác Ä‘á»‹nh')
  });

// Khá»Ÿi Ä‘á»™ng chÆ°Æ¡ng trÃ¬nh
(async function startApplication() {
  // Thá»­ khá»Ÿi táº¡o bot Telegram vá»›i tá»‘i Ä‘a 3 láº§n
  let botInitAttempts = 0;
  const maxBotInitAttempts = 3;
  
  while (botInitAttempts < maxBotInitAttempts) {
    botInitAttempts++;
    
    try {
      bot = await initBot();
      botActive = await checkBotActive();
      
      if (bot && botActive) {
        console.log(`Khá»Ÿi táº¡o bot thÃ nh công sau ${botInitAttempts} láº§n thá»­.`);
        break;
      } else {
        console.log(`Không thá»ƒ khá»Ÿi táº¡o bot (láº§n thá»­ ${botInitAttempts}/${maxBotInitAttempts}).`);
        
        if (botInitAttempts < maxBotInitAttempts) {
          // Chá» trÆ°á»›c khi thá»­ láº¡i
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    } catch (error) {
      console.error(`Lỗi khá»Ÿi táº¡o bot (láº§n thá»­ ${botInitAttempts}/${maxBotInitAttempts}):`, error);
      
      if (botInitAttempts < maxBotInitAttempts) {
        // Chá» trÆ°á»›c khi thá»­ láº¡i
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  
  // Print bot and chat id info for debugging
  console.log('Current BOT_TOKEN:', process.env.BOT_TOKEN ? `${process.env.BOT_TOKEN.substring(0, 8)}...` : 'not set');
  console.log('Current CHAT_ID:', process.env.CHAT_ID || 'not set');
  
  // Xá»­ lÃ½ tham sá»‘ dÃ²ng lá»‡nh náº¿u cÃ³
  const shouldExit = await handleCommandLineArgs();
  if (shouldExit) {
    process.exit(0);
  }
  
  // Khá»Ÿi Ä‘á»™ng server
  try {
    // Error handler middleware - Ä‘áº·t trÆ°á»›c 404 middleware
    app.use((err, req, res, next) => {
      console.error('Lỗi server:', err);
      res.status(500).json({
        success: false,
        error: 'Lỗi server: ' + (err.message || 'Không xác Ä‘á»‹nh')
      });
    });
    
    // Middleware xá»­ lÃ½ route không tá»“n táº¡i - Ä‘áº·t sau error handler vÃ  trÆ°á»›c khi khá»Ÿi Ä‘á»™ng server
    app.use((req, res) => {
      console.log(`Route không tá»“n táº¡i: ${req.method} ${req.path}`);
      res.status(404).json({
        success: false,
        error: 'API endpoint không tá»“n táº¡i'
      });
    });
    
    app.listen(PORT, () => {
      console.log(`TeleDrive Ä‘ang cháº¡y trÃªn http://localhost:${PORT}`);
      console.log(`Bot Telegram ${botActive ? 'Ä‘Ã£ káº¿t ná»‘i' : 'chÆ°a káº¿t ná»‘i'}`);
    });
  } catch (error) {
    if (error.code === 'EADDRINUSE') {
      console.error(`Cá»•ng ${PORT} Ä‘Ã£ Ä‘Æ°á»£c sá»­ dụng. Vui lÃ²ng chá»n cá»•ng khÃ¡c hoáº·c dá»«ng á»©ng dụng Ä‘ang cháº¡y.`);
      process.exit(1);
    } else {
      console.error('Lỗi khá»Ÿi Ä‘á»™ng server:', error);
      process.exit(1);
    }
  }
})();

// Export cÃ¡c hÃ m cáº§n thiáº¿t
module.exports = {
  syncFiles,
  cleanUploads
};

// API endpoint Ä‘á»ƒ láº¥y cÃ i Ä‘áº·t
app.get('/api/settings', (req, res) => {
  try {
    // Láº¥y cÃ i Ä‘áº·t tá»« file .env
    const settings = {
      botToken: BOT_TOKEN || '',
      chatId: CHAT_ID || ''
    };
    
    // Che giáº¥u má»™t pháº§n bot token náº¿u Ä‘Ã£ Ä‘Æ°á»£c cÃ i Ä‘áº·t
    if (settings.botToken && settings.botToken !== 'your_telegram_bot_token') {
      // Láº¥y 8 kÃ½ tá»± Ä‘áº§u vÃ  5 kÃ½ tá»± cuá»‘i
      const firstPart = settings.botToken.substring(0, 8);
      const lastPart = settings.botToken.substring(settings.botToken.length - 5);
      settings.botToken = `${firstPart}...${lastPart}`;
    }
    
    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Lỗi láº¥y cÃ i Ä‘áº·t:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi láº¥y cÃ i Ä‘áº·t'
    });
  }
});

// API endpoint Ä‘á»ƒ cáº­p nháº­t cÃ i Ä‘áº·t
app.post('/api/settings', (req, res) => {
  try {
    const { botToken, chatId, restartAfterSave } = req.body;
    
    if (!botToken) {
      return res.status(400).json({
        success: false,
        error: 'Bot Token không Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng'
      });
    }
    
    // Äá»c nội dung file .env
    const envPath = path.join(__dirname, '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Cáº­p nháº­t BOT_TOKEN
    envContent = envContent.replace(/BOT_TOKEN=.*$/m, `BOT_TOKEN=${botToken}`);
    
    // Cáº­p nháº­t CHAT_ID náº¿u cÃ³
    if (chatId) {
      if (envContent.includes('CHAT_ID=')) {
        envContent = envContent.replace(/CHAT_ID=.*$/m, `CHAT_ID=${chatId}`);
      } else {
        // ThÃªm CHAT_ID náº¿u chÆ°a cÃ³
        envContent += `\nCHAT_ID=${chatId}\n`;
      }
    }
    
    // Ghi file .env
    fs.writeFileSync(envPath, envContent);
    
    // ÄÃ¡nh dáº¥u cáº§n khá»Ÿi Ä‘á»™ng láº¡i bot
    needRestartBot = true;
    
    // Náº¿u cáº§n khá»Ÿi Ä‘á»™ng láº¡i server
    if (restartAfterSave) {
      // Khá»Ÿi Ä‘á»™ng láº¡i bot
      setTimeout(async () => {
        try {
          // Khá»Ÿi Ä‘á»™ng láº¡i bot
          bot = await initBot();
          botActive = await checkBotActive();
        } catch (error) {
          console.error('Lỗi khá»Ÿi Ä‘á»™ng láº¡i bot:', error);
        }
      }, 1000);
    }
    
    res.json({
      success: true,
      message: 'ÄÃ£ lÆ°u cÃ i Ä‘áº·t thÃ nh công',
      needsRestart: restartAfterSave
    });
  } catch (error) {
    console.error('Lỗi cáº­p nháº­t cÃ i Ä‘áº·t:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi cáº­p nháº­t cÃ i Ä‘áº·t'
    });
  }
});

// API endpoint Ä‘á»ƒ Ä‘á»“ng bá»™ file
app.post('/api/sync', async (req, res) => {
  console.log('===== API SYNC REQUEST =====');
  try {
    console.log('Kiá»ƒm tra tráº¡ng thÃ¡i bot trÆ°á»›c khi Ä‘á»“ng bá»™...');
    if (!bot || !botActive) {
      console.log('Bot không hoáº¡t Ä‘á»™ng, thá»­ khá»Ÿi táº¡o láº¡i...');
      bot = await initBot();
      botActive = await checkBotActive();
      
      if (!bot || !botActive) {
        console.log('Không thá»ƒ khá»Ÿi táº¡o bot, không thá»ƒ Ä‘á»“ng bá»™');
        return res.status(500).json({
          success: false,
          error: 'Bot Telegram không hoáº¡t Ä‘á»™ng, không thá»ƒ Ä‘á»“ng bá»™'
        });
      }
    }
    
    console.log('Báº¯t Ä‘áº§u Ä‘á»“ng bá»™ files...');
    const result = await syncFiles();
    console.log('Káº¿t quáº£ Ä‘á»“ng bá»™:', result);
    
    // Äáº¿m tá»•ng sá»‘ file vÃ  sá»‘ file cáº§n Ä‘á»“ng bá»™
    const filesData = readFilesDb();
    const stats = {
      totalFiles: filesData.length,
      syncedFiles: filesData.filter(f => f.telegramFileId).length,
      needsSync: filesData.filter(f => f.needsSync || !f.telegramFileId).length
    };
    
    return res.json({
      success: result.success,
      message: result.success 
        ? `ÄÃ£ Ä‘á»“ng bá»™ thÃ nh công ${result.syncedCount} files` 
        : `Lỗi Ä‘á»“ng bá»™: ${result.error}`,
      stats: stats,
      details: result
    });
  } catch (error) {
    console.error('Lỗi endpoint /api/sync:', error);
    return res.status(500).json({
      success: false,
      error: 'Lỗi server: ' + (error.message || 'Không xác Ä‘á»‹nh')
    });
  }
});

// API endpoint Ä‘á»ƒ táº£i file lÃªn Telegram
app.post('/api/clean', async (req, res) => {
  try {
    if (!bot || !botActive) {
      return res.status(400).json({
        success: false,
        error: 'Bot Telegram không hoáº¡t Ä‘á»™ng'
      });
    }
    
    console.log('Äang táº£i file lÃªn Telegram tá»« API...');
    const cleanedCount = await cleanUploads();
    
    res.json({
      success: true,
      message: `ÄÃ£ táº£i ${cleanedCount} file lÃªn Telegram`,
      cleanedCount
    });
  } catch (error) {
    console.error('Lỗi táº£i file lÃªn Telegram:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi táº£i file lÃªn Telegram: ' + error.message
    });
  }
});

// API endpoint Ä‘á»ƒ kiá»ƒm tra vÃ  sá»­a dá»¯ liá»‡u file
app.get('/api/check-files', async (req, res) => {
  try {
    console.log('Báº¯t Ä‘áº§u kiá»ƒm tra vÃ  sá»­a dá»¯ liá»‡u file...');
    
    // Äá»c dá»¯ liá»‡u file hiá»‡n táº¡i
    const filesData = readFilesDb();
    let fixedCount = 0;
    let updatedFiles = [];
    
    // Kiá»ƒm tra tá»«ng file
    for (let i = 0; i < filesData.length; i++) {
      const file = filesData[i];
      let fileFixed = false;
      
      // Kiá»ƒm tra vÃ  cáº­p nháº­t tráº¡ng thÃ¡i file
      if (file.localPath && fs.existsSync(file.localPath)) {
        // File tá»“n táº¡i á»Ÿ local
        if (file.fileStatus !== 'local' && file.fileStatus !== 'telegram') {
          file.fileStatus = 'local';
          fileFixed = true;
        }
      } else if (file.telegramFileId) {
        // File chá»‰ tá»“n táº¡i trÃªn Telegram
        if (file.fileStatus !== 'telegram') {
          file.fileStatus = 'telegram';
          fileFixed = true;
        }
        
        // Kiá»ƒm tra vÃ  cáº­p nháº­t URL Telegram náº¿u cáº§n
        if (!file.telegramUrl && botActive) {
          try {
            // Láº¥y Ä‘Æ°á»ng dáº«n táº£i xuá»‘ng tá»« Telegram
            const fileInfo = await bot.telegram.getFile(file.telegramFileId);
            if (fileInfo && fileInfo.file_path) {
              file.telegramUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileInfo.file_path}`;
              fileFixed = true;
            }
          } catch (error) {
            console.error(`Lỗi láº¥y thÃ´ng tin file tá»« Telegram: ${file.name}`, error);
          }
        }
      } else {
        // File không tá»“n táº¡i á»Ÿ cả local vÃ  telegram
        if (file.fileStatus !== 'missing') {
          file.fileStatus = 'missing';
          fileFixed = true;
        }
      }
      
      // Sửa Ä‘á»‹nh dáº¡ng tên file náº¿u cáº§n
      if (file.name && file.name.includes('')) {
        // Thá»­ khÃ´i phá»¥c tên file tá»« originalName hoáº·c tá»« Ä‘Æ°á»ng dáº«n local
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
      
      // Kiá»ƒm tra vÃ  cáº­p nháº­t loáº¡i file dá»±a vÃ o Ä‘uÃ´i file
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
    
    // LÆ°u láº¡i náº¿u cÃ³ thay Ä‘á»•i
    if (fixedCount > 0) {
      saveFilesDb(filesData);
      console.log(`ÄÃ£ sá»­a ${fixedCount} files trong database.`);
    }
    
    // Tráº£ vá» káº¿t quáº£
    return res.json({
      success: true,
      message: `ÄÃ£ kiá»ƒm tra vÃ  sá»­a ${fixedCount} files trong database.`,
      fixedCount,
      updatedFiles
    });
  } catch (error) {
    console.error('Lỗi kiá»ƒm tra file:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi server khi kiá»ƒm tra file'
    });
  }
});

// API endpoint Ä‘á»ƒ táº£i file tá»« Telegram
app.get('/api/load-telegram-files', async (req, res) => {
  try {
    if (!bot || !botActive) {
      return res.status(400).json({
        success: false,
        error: 'Bot Telegram không hoáº¡t Ä‘á»™ng'
      });
    }
    
    // Láº¥y danh sÃ¡ch file tá»« Telegram
    const newFileCount = await getFilesFromTelegram();
    
    // Tráº£ vá» káº¿t quáº£
    return res.json({
      success: true,
      message: `ÄÃ£ tÃ¬m tháº¥y ${newFileCount} file má»›i tá»« Telegram.`,
      newFileCount
    });
  } catch (error) {
    console.error('Lỗi load file tá»« Telegram:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi server khi load file tá»« Telegram'
    });
  }
});

// API endpoint Ä‘á»ƒ khÃ´i phá»¥c láº¡i database
app.get('/api/reset-database', async (req, res) => {
  try {
    console.log('Báº¯t Ä‘áº§u khá»Ÿi táº¡o láº¡i database...');
    
    // Táº¡o database má»›i
    const newFilesData = [];
    const storagePath = STORAGE_PATH;
    
    // Kiá»ƒm tra thư mục uploads
    const uploadsDir = path.join(storagePath, 'uploads');
    if (fs.existsSync(uploadsDir)) {
      console.log('Äang quÃ©t thư mục uploads...');
      
      // QuÃ©t táº¥t cả cÃ¡c file trong thư mục uploads
      const files = getAllFiles(uploadsDir);
      
      console.log(`TÃ¬m tháº¥y ${files.length} file trong thư mục uploads.`);
      
      // ThÃªm tá»«ng file vÃ o database má»›i
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
          console.error(`Lỗi xá»­ lÃ½ file ${filePath}:`, error);
        }
      }
    }
    
    // LÆ°u database má»›i
    saveFilesDb(newFilesData);
    
    console.log(`ÄÃ£ táº¡o má»›i database vá»›i ${newFilesData.length} file.`);
    
    // Äá»“ng bá»™ vá»›i Telegram náº¿u cÃ³ bot
    let syncResult = { success: false, syncedFiles: 0 };
    
    if (bot && botActive) {
      try {
        console.log('Äang Ä‘á»“ng bá»™ vá»›i Telegram...');
        const syncCount = await syncFiles();
        syncResult = { success: true, syncedFiles: syncCount };
      } catch (error) {
        console.error('Lỗi Ä‘á»“ng bá»™ sau khi reset database:', error);
        syncResult = { success: false, error: error.message };
      }
    }
    
    // Tráº£ vá» káº¿t quáº£
    return res.json({
      success: true,
      message: 'ÄÃ£ khá»Ÿi táº¡o láº¡i database thÃ nh công',
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
 * Láº¥y táº¥t cả cÃ¡c file trong thư mục vÃ  cÃ¡c thư mục con
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

// API endpoint Ä‘á»ƒ táº¡o thư mục má»›i
app.post('/api/folders', express.json(), (req, res) => {
  try {
    const { folderName, parentFolder } = req.body;
    
    // Validate input
    if (!folderName || folderName.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'TÃªn thư mục không Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng'
      });
    }
    
    // Kiá»ƒm tra tên thư mục há»£p lá»‡ (không chá»©a kÃ½ tá»± Ä‘áº·c biá»‡t)
    if (!/^[a-zA-Z0-9\s_Ã Ã¡áº£Ã£áº¡Äƒáº¯áº±áº³áºµáº·Ã¢áº¥áº§áº©áº«áº­Ã¨Ã©áº»áº½áº¹Ãªáº¿á»á»ƒá»…á»‡Ä‘Ã¬Ã­á»‰Ä©á»‹Ã²Ã³á»Ãµá»Ã´á»‘á»“á»•á»—á»™Æ¡á»›á»á»Ÿá»¡á»£Ã¹Ãºá»§Å©á»¥Æ°á»©á»«á»­á»¯á»±á»³Ã½á»·á»¹á»µÃ€Ãáº¢Ãƒáº Ä‚áº®áº°áº²áº´áº¶Ã‚áº¤áº¦áº¨áºªáº¬ÃˆÃ‰áººáº¼áº¸ÃŠáº¾á»€á»‚á»„á»†ÄÃŒÃá»ˆÄ¨á»ŠÃ’Ã“á»ŽÃ•á»ŒÃ"á»á»'á»"á»–á»˜Æ á»šá»œá»žá» á»¢Ã™Ãšá»¦Å¨á»¤Æ¯á»¨á»ªá»¬á»®á»°á»²Ãá»¶á»¸á»´-]+$/.test(folderName)) {
      return res.status(400).json({
        success: false,
        error: 'TÃªn thư mục chá»©a kÃ½ tá»± không há»£p lá»‡'
      });
    }
    
    const baseFolder = path.join(STORAGE_PATH, 'uploads');
    let folderPath;
    
    // XÃ¡c Ä‘á»‹nh Ä‘Æ°á»ng dáº«n thư mục
    if (!parentFolder || parentFolder === 'root') {
      folderPath = path.join(baseFolder, folderName);
    } else {
      const parentPath = path.join(baseFolder, parentFolder);
      
      // Kiá»ƒm tra thư mục cha tá»“n táº¡i
      if (!fs.existsSync(parentPath) || !fs.statSync(parentPath).isDirectory()) {
        return res.status(404).json({
          success: false,
          error: 'ThÆ° mục cha không tá»“n táº¡i'
        });
      }
      
      folderPath = path.join(parentPath, folderName);
    }
    
    // Kiá»ƒm tra thư mục Ä‘Ã£ tá»“n táº¡i chÆ°a
    if (fs.existsSync(folderPath)) {
      return res.status(400).json({
        success: false,
        error: 'ThÆ° mục Ä‘Ã£ tá»“n táº¡i'
      });
    }
    
    // Táº¡o thư mục
    fs.mkdirSync(folderPath, { recursive: true });
    
    // Tráº£ vá» káº¿t quáº£
    return res.json({
      success: true,
      message: 'ÄÃ£ táº¡o thư mục thÃ nh công',
      folder: {
        name: folderName,
        path: path.relative(baseFolder, folderPath),
        created: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Lỗi táº¡o thư mục:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi server khi táº¡o thư mục'
    });
  }
});

// API endpoint Ä‘á»ƒ Ä‘á»•i tên thư mục
app.put('/api/folders/rename', express.json(), (req, res) => {
  try {
    const { folderPath, newName } = req.body;
    
    // Validate input
    if (!folderPath) {
      return res.status(400).json({
        success: false,
        error: 'ÄÆ°á»ng dáº«n thư mục không Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng'
      });
    }
    
    if (!newName || newName.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'TÃªn má»›i không Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng'
      });
    }
    
    // Kiá»ƒm tra tên thư mục há»£p lá»‡
    if (!/^[a-zA-Z0-9\s_Ã Ã¡áº£Ã£áº¡Äƒáº¯áº±áº³áºµáº·Ã¢áº¥áº§áº©áº«áº­Ã¨Ã©áº»áº½áº¹Ãªáº¿á»á»ƒá»…á»‡Ä'Ã¬Ã­á»‰Ä©á»‹Ã²Ã³á»Ãµá»Ã´á»‘á»"á»•á»—á»™Æ¡á»›á»á»Ÿá»¡á»£Ã¹Ãºá»§Å©á»¥Æ°á»©á»«á»­á»¯á»±á»³Ã½á»·á»¹á»µÃ€Ãáº¢Ãƒáº Ä‚áº®áº°áº²áº´áº¶Ã‚áº¤áº¦áº¨áºªáº¬ÃˆÃ‰áººáº¼áº¸ÃŠáº¾á»€á»‚á»„á»†ÄÃŒÃá»ˆÄ¨á»ŠÃ'Ã"á»ŽÃ•á»ŒÃ"á»á»'á»"á»–á»˜Æ á»šá»œá»žá» á»¢Ã™Ãšá»¦Å¨á»¤Æ¯á»¨á»ªá»¬á»®á»°á»²Ãá»¶á»¸á»´-]+$/.test(newName)) {
      return res.status(400).json({
        success: false,
        error: 'TÃªn má»›i chá»©a kÃ½ tá»± không há»£p lá»‡'
      });
    }
    
    const baseFolder = path.join(STORAGE_PATH, 'uploads');
    const fullFolderPath = path.join(baseFolder, folderPath);
    
    // Kiá»ƒm tra thư mục tá»“n táº¡i
    if (!fs.existsSync(fullFolderPath) || !fs.statSync(fullFolderPath).isDirectory()) {
      return res.status(404).json({
        success: false,
        error: 'ThÆ° mục không tá»“n táº¡i'
      });
    }
    
    // Táº¡o Ä‘Æ°á»ng dáº«n má»›i
    const parentPath = path.dirname(fullFolderPath);
    const newFolderPath = path.join(parentPath, newName);
    
    // Kiá»ƒm tra thư mục má»›i Ä‘Ã£ tá»“n táº¡i chÆ°a
    if (fs.existsSync(newFolderPath)) {
      return res.status(400).json({
        success: false,
        error: 'ThÆ° mục má»›i Ä‘Ã£ tá»"n táº¡i'
      });
    }
    
    // Äá»•i tên thư mục
    fs.renameSync(fullFolderPath, newFolderPath);
    
    // Cáº­p nháº­t Ä‘Æ°á»ng dáº«n localPath trong database
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
    
    // Tráº£ vá» káº¿t quáº£
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

// API endpoint Ä‘á»ƒ xóa thư mục
app.delete('/api/folders', express.json(), (req, res) => {
  try {
    const { folderPath, deleteFiles } = req.body;
    
    // Validate input
    if (!folderPath) {
      return res.status(400).json({
        success: false,
        error: 'ÄÆ°á»ng dáº«n thư mục không Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng'
      });
    }
    
    const baseFolder = path.join(STORAGE_PATH, 'uploads');
    const fullFolderPath = path.join(baseFolder, folderPath);
    
    // Kiá»ƒm tra thư mục tá»“n táº¡i
    if (!fs.existsSync(fullFolderPath) || !fs.statSync(fullFolderPath).isDirectory()) {
      return res.status(404).json({
        success: false,
        error: 'ThÆ° mục không tá»"n táº¡i'
      });
    }
    
    // Kiá»ƒm tra thư mục cÃ³ trá»‘ng không
    const folderContents = fs.readdirSync(fullFolderPath);
    if (folderContents.length > 0 && !deleteFiles) {
      return res.status(400).json({
        success: false,
        error: 'ThÆ° mục không trá»"ng. Sử dụng deleteFiles=true để xóa cả nội dung bên trong.',
        filesCount: folderContents.length
      });
    }
    
    // XÃ³a thư mục vÃ  nội dung
    if (deleteFiles) {
      // Láº¥y danh sÃ¡ch file trong thư mục vÃ  cáº­p nháº­t database
      const filesData = readFilesDb();
      let deletedFiles = 0;
      
      for (let i = filesData.length - 1; i >= 0; i--) {
        const file = filesData[i];
        if (file.localPath && file.localPath.startsWith(fullFolderPath)) {
          if (deleteFiles === 'permanent') {
            // XÃ³a file vÄ©nh viá»…n khá»i database
            filesData.splice(i, 1);
          } else {
            // ÄÃ¡nh dáº¥u file Ä'Ã£ bá»‹ xóa local
            file.localPath = null;
            file.fileStatus = file.telegramFileId ? 'telegram' : 'missing';
          }
          deletedFiles++;
        }
      }
      
      // LÆ°u láº¡i database náº¿u cÃ³ thay đổi
      if (deletedFiles > 0) {
        saveFilesDb(filesData);
      }
      
      // XÃ³a thư mục vÃ  nội dung
      fs.rmSync(fullFolderPath, { recursive: true, force: true });
      
      // Tráº£ vá» káº¿t quáº£
      return res.json({
        success: true,
        message: 'ÄÃ£ xóa thư mục vÃ  nội dung thÃ nh công',
        deletedFiles: deletedFiles
      });
    } else {
      // XÃ³a thư mục trá»"ng
      fs.rmdirSync(fullFolderPath);
      
      // Tráº£ vá» káº¿t quáº£
      return res.json({
        success: true,
        message: 'ÄÃ£ xóa thư mục trá»"ng thÃ nh công'
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

// API endpoint Ä‘á»ƒ láº¥y danh sÃ¡ch thư mục
app.get('/api/folders', (req, res) => {
  try {
    // Táº¡o cáº¥u trÃºc thư mục áº£o tá»« database file
    const filesData = readFilesDb();
    const folderStructure = createVirtualFolderStructure(filesData);
    
    // Tráº£ vá» káº¿t quáº£
    return res.json({
      success: true,
      folders: folderStructure
    });
  } catch (error) {
    console.error('Lỗi láº¥y danh sÃ¡ch thư mục:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi server khi láº¥y danh sÃ¡ch thư mục'
    });
  }
});

/**
 * Táº¡o cáº¥u trÃºc thư mục áº£o tá»« danh sÃ¡ch file
 */
function createVirtualFolderStructure(files) {
  // Táº¡o cáº¥u trÃºc thư mục root
  const rootFolder = {
    id: 'root',
    name: 'Root',
    type: 'folder',
    children: []
  };
  
  // Map Ä‘á»ƒ lÆ°u trá»¯ thư mục theo id
  const foldersById = {
    'root': rootFolder
  };
  
  // Táº¡o danh sÃ¡ch thư mục tá»« Ä‘Æ°á»ng dáº«n file
  files.forEach(file => {
    if (file.localPath) {
      // Láº¥y Ä‘Æ°á»ng dáº«n tÆ°Æ¡ng Ä‘á»‘i tá»« thư mục uploads
      const storagePath = STORAGE_PATH;
      const uploadsDir = path.join(storagePath, 'uploads');
      let relativePath = '';
      
      if (file.localPath.startsWith(uploadsDir)) {
        relativePath = path.relative(uploadsDir, file.localPath);
      } else {
        // Náº¿u không pháº£i trong thư mục uploads, bá» qua
        return;
      }
      
      // Táº¡o cÃ¡c thư mục trong Ä‘Æ°á»ng dáº«n
      const pathParts = relativePath.split(path.sep);
      
      // Bá» qua pháº§n tá»­ cuá»'i (tên file)
      pathParts.pop();
      
      if (pathParts.length === 0) {
        // File náº±m trá»±c tiáº¿p trong thư mục uploads
        // ThÃªm file vÃ o thư mục root
        rootFolder.children.push({
          id: file.id,
          name: file.name,
          type: 'file',
          fileType: file.fileType,
          size: file.size,
          telegramFileId: file.telegramFileId
        });
      } else {
        // File náº±m trong thư mục con
        let currentPath = '';
        let parentFolderId = 'root';
        
        // Táº¡o cÃ¡c thư mục con náº¿u chÆ°a tá»"n táº¡i
        for (let i = 0; i < pathParts.length; i++) {
          const folderName = pathParts[i];
          
          if (currentPath) {
            currentPath = path.join(currentPath, folderName);
          } else {
            currentPath = folderName;
          }
          
          // Táº¡o id cho thư mục
          const folderId = currentPath;
          
          // Kiá»ƒm tra thư mục Ä'Ã£ tá»"n táº¡i chÆ°a
          if (!foldersById[folderId]) {
            // Táº¡o thư mục má»›i
            const newFolder = {
              id: folderId,
              name: folderName,
              type: 'folder',
              children: []
            };
            
            // ThÃªm vÃ o danh sÃ¡ch thư mục
            foldersById[folderId] = newFolder;
            
            // ThÃªm vÃ o thư mục cha
            foldersById[parentFolderId].children.push(newFolder);
          }
          
          parentFolderId = folderId;
        }
        
        // ThÃªm file vÃ o thư mục cuá»'i cÃ¹ng
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

// API endpoint Ä‘á»ƒ xem trÆ°á»›c file
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
    
    // Äá»c database
    const filesData = readFilesDb();
    
    // TÃ¬m file cáº§n xem trÆ°á»›c
    const file = filesData.find(f => f.id === fileId);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File không tá»"n táº¡i'
      });
    }
    
    // Kiá»ƒm tra file cÃ³ thá»ƒ xem trÆ°á»›c không
    const supportedPreviewTypes = ['image', 'video', 'audio', 'pdf', 'text'];
    const isPreviewable = supportedPreviewTypes.includes(file.fileType) || 
                         (file.mimeType && file.mimeType.startsWith('text/'));
    
    if (!isPreviewable) {
      return res.status(400).json({
        success: false,
        error: 'File nÃ y không há»— trá»£ xem trÆ°á»›c',
        fileType: file.fileType,
        mimeType: file.mimeType
      });
    }
    
    // Æ¯u tiÃªn file local náº¿u cÃ³
    if (file.localPath && fs.existsSync(file.localPath)) {
      // Xá»­ lÃ½ xem trÆ°á»›c dá»±a vÃ o loáº¡i file
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
        // Äá»c file text
        const content = fs.readFileSync(file.localPath, 'utf8');
        
        // Tráº£ vá» nội dung text
        return res.json({
          success: true,
          content,
          fileType: file.fileType,
          mimeType: file.mimeType
        });
      }
    } else if (file.telegramFileId && file.telegramUrl) {
      // Chuyá»ƒn hÆ°á»›ng Ä'áº¿n URL Telegram
      return res.redirect(file.telegramUrl);
    } else {
      return res.status(404).json({
        success: false,
        error: 'File không tá»"n táº¡i á»Ÿ cả local vÃ  Telegram'
      });
    }
  } catch (error) {
    console.error('Lỗi xem trÆ°á»›c file:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi server khi xem trÆ°á»›c file'
    });
  }
});

// API endpoint để láº¥y thÃ´ng tin chi tiáº¿t file
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
    
    // Äá»c database
    const filesData = readFilesDb();
    
    // TÃ¬m file
    const file = filesData.find(f => f.id === fileId);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File không tá»"n táº¡i'
      });
    }
    
    // ThÃªm URL cho file
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
    
    // Tráº£ vá» káº¿t quáº£
    return res.json({
      success: true,
      file: fileInfo
    });
  } catch (error) {
    console.error('Lỗi láº¥y thÃ´ng tin file:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi server khi láº¥y thÃ´ng tin file'
    });
  }
});

// API endpoint để táº£i file
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
    
    // Äá»c database
    const filesData = readFilesDb();
    
    // TÃ¬m file
    const file = filesData.find(f => f.id === fileId);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File không tá»"n táº¡i'
      });
    }
    
    // Æ¯u tiÃªn file local náº¿u cÃ³
    if (file.localPath && fs.existsSync(file.localPath)) {
      // Set header cho viá»‡c táº£i file
      res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
      
      // Stream file
      return fs.createReadStream(file.localPath).pipe(res);
    } else if (file.telegramFileId && file.telegramUrl) {
      // Táº£i file tá»« Telegram
      try {
        if (!botActive) {
          return res.status(400).json({
            success: false,
            error: 'Bot Telegram không hoạt động'
          });
        }
        
        // Chuyá»ƒn hÆ°á»›ng Ä'áº¿n URL Telegram
        return res.redirect(file.telegramUrl);
      } catch (error) {
        console.error('Lỗi táº£i file tá»« Telegram:', error);
        return res.status(500).json({
          success: false,
          error: 'Lỗi táº£i file tá»« Telegram: ' + error.message
        });
      }
    } else {
      return res.status(404).json({
        success: false,
        error: 'File không tá»"n táº¡i á»Ÿ cả local vÃ  Telegram'
      });
    }
  } catch (error) {
    console.error('Lỗi táº£i file:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi server khi táº£i file'
    });
  }
});

// API endpoint để chia sáº» file
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
    
    // Äá»c database
    const filesData = readFilesDb();
    
    // TÃ¬m file
    const fileIndex = filesData.findIndex(f => f.id === fileId);
    
    if (fileIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'File không tá»"n táº¡i'
      });
    }
    
    const file = filesData[fileIndex];
    
    // Táº¡o token chia sáº» náº¿u chÆ°a cÃ³
    if (!file.shareToken) {
      file.shareToken = uuidv4();
    }
    
    // Táº¡o hoáº·c cáº­p nháº­t thá»i gian háº¿t háº¡n
    if (expiryTime) {
      // Chuyá»ƒn đổi giá» thÃ nh milliseconds
      const expiryHours = parseInt(expiryTime);
      if (!isNaN(expiryHours) && expiryHours > 0) {
        file.shareExpiry = new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString();
      } else {
        file.shareExpiry = null; // Không cÃ³ thá»i háº¡n
      }
    } else {
      file.shareExpiry = null; // Không cÃ³ thá»i háº¡n
    }
    
    // LÆ°u thay đổi
    saveFilesDb(filesData);
    
    // URL chia sáº»
    const shareUrl = `/share/${file.shareToken}`;
    
    console.log(`ÄÃ£ táº¡o/cáº­p nháº­t chia sáº» cho file ${file.name}, URL: ${shareUrl}`);
    
    // Tráº£ vá» káº¿t quáº£
    return res.json({
      success: true,
      message: 'ÄÃ£ táº¡o chia sáº» thÃ nh công',
      shareToken: file.shareToken,
      shareUrl,
      shareExpiry: file.shareExpiry
    });
  } catch (error) {
    console.error('Lỗi chia sáº» file:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi server khi chia sáº» file'
    });
  }
});

// API endpoint để há»§y chia sáº» file
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
    
    // Äá»c database
    const filesData = readFilesDb();
    
    // TÃ¬m file
    const fileIndex = filesData.findIndex(f => f.id === fileId);
    
    if (fileIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'File không tá»"n táº¡i'
      });
    }
    
    const file = filesData[fileIndex];
    
    
    // Kiá»ƒm tra file cÃ³ Ä‘ang Ä‘Æ°á»£c chia sáº» không
    if (!file.shareToken) {
      return res.status(400).json({
        success: false,
        error: 'File chÆ°a Ä‘Æ°á»£c chia sáº»'
      });
    }
    
    // XÃ³a thÃ´ng tin chia sáº»
    file.shareToken = null;
    file.shareExpiry = null;
    
    // LÆ°u thay Ä‘á»•i
    saveFilesDb(filesData);
    
    console.log(`ÄÃ£ há»§y chia sáº» cho file ${file.name}`);
    
    // Tráº£ vá» káº¿t quáº£
    return res.json({
      success: true,
      message: 'ÄÃ£ há»§y chia sáº» thÃ nh công'
    });
  } catch (error) {
    console.error('Lỗi há»§y chia sáº» file:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi server khi há»§y chia sáº» file'
    });
  }
});

// Route xá»­ lÃ½ chia sáº» file
app.get('/share/:token', (req, res) => {
  try {
    const shareToken = req.params.token;
    
    // Validate input
    if (!shareToken) {
      return res.status(400).send('Link chia sáº» không há»£p lá»‡');
    }
    
    // Äá»c database
    const filesData = readFilesDb();
    
    // TÃ¬m file vá»›i token chia sáº»
    const file = filesData.find(f => f.shareToken === shareToken);
    
    if (!file) {
      return res.status(404).send('Link chia sáº» không tá»“n táº¡i hoáº·c Ä‘Ã£ háº¿t háº¡n');
    }
    
    // Kiá»ƒm tra thá»i háº¡n chia sáº»
    if (file.shareExpiry && new Date(file.shareExpiry) < new Date()) {
      // XÃ³a thÃ´ng tin chia sáº» Ä‘Ã£ háº¿t háº¡n
      file.shareToken = null;
      file.shareExpiry = null;
      saveFilesDb(filesData);
      
      return res.status(400).send('Link chia sáº» Ä‘Ã£ háº¿t háº¡n');
    }
    
    // Redirect Ä‘áº¿n trang xem trÆ°á»›c hoáº·c táº£i file
    const isPreviewable = ['image', 'video', 'audio', 'pdf'].includes(file.fileType);
    
    if (isPreviewable) {
      return res.redirect(`/file/${file.id}`);
    } else {
      return res.redirect(`/api/files/${file.id}/download`);
    }
  } catch (error) {
    console.error('Lỗi xá»­ lÃ½ chia sáº» file:', error);
    return res.status(500).send('ÄÃ£ xáº£y ra lá»—i khi xá»­ lÃ½ link chia sáº»');
  }
});

// API láº¥y thá»‘ng kÃª sá»­ dụng
app.get('/api/stats', (req, res) => {
  try {
    // Äá»c database
    const filesData = readFilesDb();
    
    // Thá»‘ng kÃª tá»•ng sá»‘ file vÃ  dung lÆ°á»£ng
    const totalFiles = filesData.length;
    const totalSize = filesData.reduce((sum, file) => sum + (file.size || 0), 0);
    
    // Thá»‘ng kÃª theo loáº¡i file
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
    
    // Thá»‘ng kÃª sá»‘ lÆ°á»£ng file trÃªn Telegram
    const telegramFiles = filesData.filter(file => file.telegramFileId).length;
    const telegramSize = filesData
      .filter(file => file.telegramFileId)
      .reduce((sum, file) => sum + (file.size || 0), 0);
    
    // Thá»‘ng kÃª sá»‘ lÆ°á»£ng file Ä‘ang Ä‘Æ°á»£c chia sáº»
    const sharedFiles = filesData.filter(file => file.shareToken).length;
    
    // Format dung lÆ°á»£ng
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
    
    // Tráº£ vá» káº¿t quáº£
    return res.json({
      success: true,
      stats: formattedStats
    });
  } catch (error) {
    console.error('Lỗi láº¥y thá»‘ng kÃª:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi server khi láº¥y thá»‘ng kÃª'
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

// API endpoint Ä‘á»ƒ kiá»ƒm tra vÃ  sá»­a dá»¯ liá»‡u file
app.post('/api/check-files', async (req, res) => {
  try {
    console.log('===== KIá»‚M TRA VÃ€ Sá»¬A Dá»® LIá»†U FILES =====');
    const files = readFilesDb();
    
    // Thá»‘ng kÃª ban Ä‘áº§u
    const stats = {
      total: files.length,
      fixed: 0,
      local: 0,
      telegram: 0,
      missing: 0,
      needsSync: 0
    };
    
    // Kiá»ƒm tra tá»«ng file
    for (const file of files) {
      // Kiá»ƒm tra file local
      const hasLocalFile = file.localPath && fs.existsSync(file.localPath);
      if (hasLocalFile) {
        stats.local++;
        file.fileStatus = 'local';
        
        // Náº¿u file tá»“n táº¡i á»Ÿ local nhÆ°ng chÆ°a cÃ³ trÃªn Telegram, Ä‘Ã¡nh dáº¥u cáº§n Ä‘á»“ng bá»™
        if (!file.telegramFileId) {
          file.needsSync = true;
          stats.needsSync++;
          stats.fixed++;
          console.log(`ÄÃ¡nh dáº¥u file "${file.name}" cáº§n Ä‘á»“ng bá»™ lÃªn Telegram`);
        }
      } else {
        if (file.localPath) {
          console.log(`File "${file.name}" không tá»“n táº¡i táº¡i Ä‘Æ°á»ng dáº«n: ${file.localPath}`);
        } else {
          console.log(`File "${file.name}" không cÃ³ Ä‘Æ°á»ng dáº«n local`);
        }
        
        // Náº¿u file cÃ³ trÃªn Telegram, Ä‘Ã¡nh dáº¥u lÃ  telegram-only
        if (file.telegramFileId) {
          file.fileStatus = 'telegram';
          stats.telegram++;
        } else {
          // Náº¿u file không cÃ³ á»Ÿ cả local vÃ  Telegram, Ä‘Ã¡nh dáº¥u lÃ  missing
          file.fileStatus = 'missing';
          stats.missing++;
        }
      }
      
      // Äá»“ng bá»™ ngay láº­p tá»©c cÃ¡c file cáº§n thiáº¿t
      if (file.needsSync && hasLocalFile) {
        console.log(`Thá»±c hiá»‡n Ä‘á»“ng bá»™ file "${file.name}" ngay láº­p tá»©c`);
        try {
          await autoSyncFile(file);
          stats.fixed++;
          console.log(`ÄÃ£ Ä‘á»“ng bá»™ thÃ nh công file "${file.name}"`);
        } catch (error) {
          console.error(`Lỗi khi Ä‘á»“ng bá»™ file "${file.name}":`, error);
        }
      }
    }
    
    // LÆ°u láº¡i dá»¯ liá»‡u Ä‘Ã£ cáº­p nháº­t
    saveFilesDb(files);
    console.log(`ÄÃ£ kiá»ƒm tra vÃ  sá»­a ${stats.fixed} files`);
    
    res.json({
      success: true,
      message: `ÄÃ£ kiá»ƒm tra vÃ  sá»­a ${stats.fixed} files`,
      stats: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Lỗi khi kiá»ƒm tra files:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Lỗi server khi kiá»ƒm tra files'
    });
  }
});
// ... existing code ...

// API endpoint Ä‘á»ƒ láº¥y nội dung thÃ¹ng rÃ¡c
app.get('/api/trash', (req, res) => {
  try {
    // Äá»c database
    const filesData = readFilesDb();
    
    // Lá»c cÃ¡c file Ä‘Ã£ xóa
    const trashedFiles = filesData.filter(file => file.isDeleted);
    
    // Äá»‹nh dáº¡ng dá»¯ liá»‡u trÆ°á»›c khi gá»­i Ä‘i
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
    
    // Tráº£ vá» káº¿t quáº£
    return res.json({
      success: true,
      count: formattedFiles.length,
      files: formattedFiles
    });
  } catch (error) {
    console.error('Lỗi láº¥y danh sÃ¡ch thÃ¹ng rÃ¡c:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi server khi láº¥y danh sÃ¡ch thÃ¹ng rÃ¡c'
    });
  }
});

// API endpoint Ä‘á»ƒ khÃ´i phá»¥c file tá»« thÃ¹ng rÃ¡c
app.post('/api/trash/:id/restore', (req, res) => {
  try {
    const fileId = req.params.id;
    
    if (!fileId) {
      return res.status(400).json({
        success: false,
        error: 'ID file không Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng'
      });
    }
    
    // Äá»c database
    const filesData = readFilesDb();
    
    // TÃ¬m file cáº§n khÃ´i phá»¥c
    const fileIndex = filesData.findIndex(file => file.id === fileId && file.isDeleted);
    
    if (fileIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'File không tá»“n táº¡i trong thÃ¹ng rÃ¡c'
      });
    }
    
    // KhÃ´i phá»¥c file
    filesData[fileIndex].isDeleted = false;
    filesData[fileIndex].deletedDate = null;
    
    // LÆ°u láº¡i database
    saveFilesDb(filesData);
    
    // Tráº£ vá» káº¿t quáº£
    return res.json({
      success: true,
      message: 'ÄÃ£ khÃ´i phá»¥c file thÃ nh công',
      file: {
        id: filesData[fileIndex].id,
        name: filesData[fileIndex].name
      }
    });
  } catch (error) {
    console.error('Lỗi khÃ´i phá»¥c file:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi server khi khÃ´i phá»¥c file'
    });
  }
});

// API endpoint Ä‘á»ƒ xóa vÄ©nh viá»…n file tá»« thÃ¹ng rÃ¡c
app.delete('/api/trash/:id', (req, res) => {
  try {
    const fileId = req.params.id;
    
    if (!fileId) {
      return res.status(400).json({
        success: false,
        error: 'ID file không Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng'
      });
    }
    
    // Äá»c database
    const filesData = readFilesDb();
    
    // TÃ¬m file cáº§n xóa
    const fileIndex = filesData.findIndex(file => file.id === fileId && file.isDeleted);
    
    if (fileIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'File không tá»“n táº¡i trong thÃ¹ng rÃ¡c'
      });
    }
    
    const file = filesData[fileIndex];
    
    // XÃ³a file khá»i database
    filesData.splice(fileIndex, 1);
    
    // LÆ°u láº¡i database
    saveFilesDb(filesData);
    
    // Tráº£ vá» káº¿t quáº£
    return res.json({
      success: true,
      message: 'ÄÃ£ xóa vÄ©nh viá»…n file thÃ nh công',
      deletedFile: {
        id: file.id,
        name: file.name
      }
    });
  } catch (error) {
    console.error('Lỗi xóa vÄ©nh viá»…n file:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi server khi xóa vÄ©nh viá»…n file'
    });
  }
});

// API endpoint Ä‘á»ƒ lÃ m trá»‘ng thÃ¹ng rÃ¡c
app.delete('/api/trash', (req, res) => {
  try {
    // Äá»c database
    let filesData = readFilesDb();
    
    // Äáº¿m sá»‘ file trong thÃ¹ng rÃ¡c
    const trashedCount = filesData.filter(file => file.isDeleted).length;
    
    if (trashedCount === 0) {
      return res.json({
        success: true,
        message: 'ThÃ¹ng rÃ¡c Ä‘Ã£ trá»‘ng',
        deletedCount: 0
      });
    }
    
    // XÃ³a táº¥t cả file trong thÃ¹ng rÃ¡c
    filesData = filesData.filter(file => !file.isDeleted);
    
    // LÆ°u láº¡i database
    saveFilesDb(filesData);
    
    // Tráº£ vá» káº¿t quáº£
    return res.json({
      success: true,
      message: 'ÄÃ£ lÃ m trá»‘ng thÃ¹ng rÃ¡c',
      deletedCount: trashedCount
    });
  } catch (error) {
    console.error('Lỗi lÃ m trá»‘ng thÃ¹ng rÃ¡c:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi server khi lÃ m trá»‘ng thÃ¹ng rÃ¡c'
    });
  }
});

// ... existing code ...

// API endpoint Ä‘á»ƒ cáº­p nháº­t cÃ i Ä‘áº·t
app.post('/api/settings', express.json(), async (req, res) => {
  try {
    const { apiKey, chatId, maxFileSize, enableSync } = req.body;
    
    // Äá»c file .env
    const envPath = path.join(__dirname, '.env');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    let newEnvContent = envContent;
    let restartAfterSave = false;
    
    // Cáº­p nháº­t BOT_TOKEN náº¿u cÃ³ thay Ä‘á»•i
    if (apiKey && apiKey !== BOT_TOKEN) {
      newEnvContent = newEnvContent.replace(/BOT_TOKEN=.*(\r?\n|$)/, `BOT_TOKEN=${apiKey}$1`);
      if (!newEnvContent.includes('BOT_TOKEN=')) {
        newEnvContent += `\nBOT_TOKEN=${apiKey}\n`;
      }
      restartAfterSave = true;
    }
    
    // Cáº­p nháº­t CHAT_ID náº¿u cÃ³ thay Ä‘á»•i
    if (chatId && chatId !== CHAT_ID) {
      newEnvContent = newEnvContent.replace(/CHAT_ID=.*(\r?\n|$)/, `CHAT_ID=${chatId}$1`);
      if (!newEnvContent.includes('CHAT_ID=')) {
        newEnvContent += `\nCHAT_ID=${chatId}\n`;
      }
      restartAfterSave = true;
    }
    
    // Cáº­p nháº­t MAX_FILE_SIZE náº¿u cÃ³ thay Ä‘á»•i
    if (maxFileSize && maxFileSize !== MAX_FILE_SIZE / (1024 * 1024)) {
      newEnvContent = newEnvContent.replace(/MAX_FILE_SIZE=.*(\r?\n|$)/, `MAX_FILE_SIZE=${maxFileSize}$1`);
      if (!newEnvContent.includes('MAX_FILE_SIZE=')) {
        newEnvContent += `\nMAX_FILE_SIZE=${maxFileSize}\n`;
      }
    }
    
    // Cáº­p nháº­t ENABLE_SYNC náº¿u cÃ³ thay Ä‘á»•i
    if (enableSync !== undefined) {
      const enableSyncValue = enableSync ? 'true' : 'false';
      newEnvContent = newEnvContent.replace(/ENABLE_SYNC=.*(\r?\n|$)/, `ENABLE_SYNC=${enableSyncValue}$1`);
      if (!newEnvContent.includes('ENABLE_SYNC=')) {
        newEnvContent += `\nENABLE_SYNC=${enableSyncValue}\n`;
      }
    }
    
    // LÆ°u file .env náº¿u cÃ³ thay Ä‘á»•i
    if (newEnvContent !== envContent) {
      fs.writeFileSync(envPath, newEnvContent);
      
      // Khá»Ÿi Ä‘á»™ng láº¡i bot náº¿u cáº§n
      if (restartAfterSave) {
        setTimeout(async () => {
          try {
            // Khá»Ÿi Ä‘á»™ng láº¡i bot
            bot = await initBot();
            botActive = await checkBotActive();
          } catch (error) {
            console.error('Lỗi khá»Ÿi Ä‘á»™ng láº¡i bot:', error);
          }
        }, 1000);
      }
    }
    
    res.json({
      success: true,
      message: 'ÄÃ£ lÆ°u cÃ i Ä‘áº·t thÃ nh công',
      needsRestart: restartAfterSave
    });
  } catch (error) {
    console.error('Lỗi cáº­p nháº­t cÃ i Ä‘áº·t:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi cáº­p nháº­t cÃ i Ä‘áº·t'
    });
  }
});

// Middleware xá»­ lÃ½ route không tá»“n táº¡i - pháº£i Ä‘áº·t sau táº¥t cả cÃ¡c routes
app.use((req, res) => {
  console.log(`Route không tá»“n táº¡i: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    error: 'API endpoint không tá»“n táº¡i'
  });
});

// ... existing code ...
// API endpoint Ä‘á»ƒ xem chi tiáº¿t cÃ¡c file vÃ  tráº¡ng thÃ¡i Ä‘á»“ng bá»™
app.get('/api/files-status', (req, res) => {
  try {
    console.log('===== KIá»‚M TRA TRáº NG THÃI CÃC FILE =====');
    const files = readFilesDb();
    
    // Táº¡o danh sÃ¡ch pháº£n há»“i vá»›i cÃ¡c thÃ´ng tin quan trá»ng
    const filesList = files.map(file => ({
      id: file.id,
      name: file.name,
      size: file.size ? formatBytes(file.size) : 'Không rÃµ',
      uploadDate: file.uploadDate ? formatDate(file.uploadDate) : 'Không rÃµ',
      fileStatus: file.fileStatus || 'Không rÃµ',
      needsSync: !!file.needsSync,
      hasTelegramId: !!file.telegramFileId,
      hasLocalPath: !!file.localPath,
      localPathExists: file.localPath ? fs.existsSync(file.localPath) : false,
      localPath: file.localPath || 'Không cÃ³'
    }));
    
    // Thá»‘ng kÃª
    const stats = {
      total: files.length,
      local: files.filter(f => f.fileStatus === 'local').length,
      telegram: files.filter(f => f.fileStatus === 'telegram').length,
      missing: files.filter(f => f.fileStatus === 'missing').length,
      needsSync: files.filter(f => f.needsSync).length,
      synced: files.filter(f => f.telegramFileId).length
    };
    
    res.json({
      success: true,
      files: filesList,
      stats: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Lỗi khi láº¥y tráº¡ng thÃ¡i files:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Lỗi server khi láº¥y tráº¡ng thÃ¡i files'
    });
  }
});
// ... existing code ...
