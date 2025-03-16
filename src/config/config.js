/**
 * TeleDrive - Cấu hình ứng dụng
 * File này quản lý tất cả các biến cấu hình và đường dẫn
 */

const path = require('path');
const dotenv = require('dotenv');

// Load biến môi trường từ file .env
dotenv.config();

// Thư mục gốc
const ROOT_DIR = path.resolve(__dirname, '..', '..');

// Cấu hình đường dẫn
const config = {
  // Thông tin server
  port: process.env.PORT || 5002,
  
  // Token và Chat ID của Telegram Bot
  telegram: {
    botToken: process.env.BOT_TOKEN,
    chatId: process.env.CHAT_ID
  },
  
  // Đường dẫn các thư mục
  paths: {
    root: ROOT_DIR,
    uploads: path.join(ROOT_DIR, 'uploads'),
    logs: path.join(ROOT_DIR, 'logs'),
    temp: path.join(ROOT_DIR, 'temp'),
    data: path.join(ROOT_DIR, process.env.DATA_DIR || 'data'),
    database: path.join(ROOT_DIR, 'files_db.json'),
    views: path.join(ROOT_DIR, 'views')
  },
  
  // Cấu hình upload
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '2000', 10) * 1024 * 1024 // Convert MB to bytes
  }
};

// Xuất cấu hình ra ngoài
module.exports = config; 