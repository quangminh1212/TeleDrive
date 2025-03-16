/**
 * TeleDrive - Config
 * File này chứa các cấu hình ứng dụng
 */

require('dotenv').config();
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

// Load biến môi trường từ file .env
const envFile = path.resolve(process.cwd(), '.env');

// Kiểm tra sự tồn tại của file .env và tạo nếu không có
function checkEnvFile() {
  if (!fs.existsSync(envFile)) {
    console.log('File .env không tồn tại. Tạo file .env mặc định...');
    
    // Tạo nội dung mặc định cho file .env
    const defaultEnvContent = `# TeleDrive Configuration
# Sửa các thông số này để phù hợp với môi trường của bạn

# Cổng máy chủ
PORT=5002
HOST=localhost
BASE_URL=http://localhost:5002

# Telegram Bot config
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# Đường dẫn lưu trữ
STORAGE_PATH=${process.cwd()}

# Tự động đồng bộ files
AUTO_SYNC=true

# Debug mode
DEBUG=false
`;
    
    // Ghi file .env mặc định
    fs.writeFileSync(envFile, defaultEnvContent);
    console.log('Đã tạo file .env mặc định.');
  }
}

// Kiểm tra và tạo file .env nếu cần
checkEnvFile();

// Load biến môi trường
dotenv.config({ path: envFile });

/**
 * Cấu hình ứng dụng
 */
const config = {
  // Môi trường
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Server
  PORT: process.env.PORT || 3000,
  HOST: process.env.HOST || 'localhost',
  BASE_URL: process.env.BASE_URL || 'http://localhost:3000',
  
  // Thông tin đăng nhập
  API_KEY: process.env.API_KEY || 'changeme',
  
  // Telegram Bot
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID,

  // Telegram API
  TELEGRAM_API_ID: process.env.API_ID,
  TELEGRAM_API_HASH: process.env.API_HASH,
  
  // Đường dẫn storage
  STORAGE_PATH: process.env.STORAGE_PATH ? 
    path.resolve(process.env.STORAGE_PATH) : 
    path.join(process.cwd(), 'storage'),
  
  // Giới hạn kích thước file (mặc định 2GB)
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || 2 * 1024 * 1024 * 1024),
  
  // Cấu hình session
  SESSION_SECRET: process.env.SESSION_SECRET || 'changeme',
  
  // Cài đặt đồng bộ
  AUTO_SYNC: process.env.AUTO_SYNC === 'true',
  SYNC_INTERVAL: parseInt(process.env.SYNC_INTERVAL || 60) * 60 * 1000, // Giờ -> ms
  
  // Tự động dọn dẹp
  CLEANUP_ENABLED: process.env.CLEANUP_ENABLED === 'true',
  CLEANUP_INTERVAL: parseInt(process.env.CLEANUP_INTERVAL || 24) * 60 * 60 * 1000 // Giờ -> ms
};

// Tạo các đường dẫn phụ thuộc
config.UPLOADS_DIR = path.join(config.STORAGE_PATH, 'uploads');
config.TEMP_DIR = path.join(config.STORAGE_PATH, 'temp');
config.DB_DIR = path.join(config.STORAGE_PATH, 'db');

// Lấy tên bot từ token
if (config.TELEGRAM_BOT_TOKEN) {
  try {
    const botTokenParts = config.TELEGRAM_BOT_TOKEN.split(':');
    if (botTokenParts.length >= 1) {
      config.TELEGRAM_BOT_ID = botTokenParts[0];
    }
  } catch (e) {
    console.error('Không thể phân tích bot token:', e);
  }
}

// Đảm bảo các thư mục cần thiết tồn tại
function ensureDirectories() {
  const dirs = [
    config.DB_DIR,
    config.UPLOADS_DIR,
    config.TEMP_DIR
  ];
  
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      console.log(`Tạo thư mục: ${dir}`);
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

// Tạo các thư mục cần thiết
ensureDirectories();

/**
 * Cập nhật biến môi trường và lưu vào file .env
 * @param {Object} updates Đối tượng chứa các cập nhật
 * @returns {Object} Kết quả cập nhật
 */
function updateEnv(updates) {
  if (!updates || typeof updates !== 'object') {
    return { success: false, error: 'Invalid updates' };
  }
  
  try {
    // Đọc nội dung hiện tại của file .env
    let envContent = '';
    if (fs.existsSync(envFile)) {
      envContent = fs.readFileSync(envFile, 'utf8');
    }
    
    // Cập nhật từng biến môi trường
    for (const [key, value] of Object.entries(updates)) {
      // Kiểm tra xem biến đã tồn tại trong file .env chưa
      const regex = new RegExp(`^${key}=.*$`, 'm');
      
      if (envContent.match(regex)) {
        // Cập nhật biến đã tồn tại
        envContent = envContent.replace(regex, `${key}=${value}`);
      } else {
        // Thêm biến mới
        envContent += `\n${key}=${value}`;
      }
      
      // Cập nhật biến trong process.env
      process.env[key] = value;
      
      // Cập nhật biến trong config
      if (key in config) {
        config[key] = value;
      }
    }
    
    // Ghi nội dung đã cập nhật vào file .env
    fs.writeFileSync(envFile, envContent);
    
    return { success: true, message: 'Đã cập nhật biến môi trường' };
  } catch (error) {
    console.error('Lỗi khi cập nhật biến môi trường:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  ...config,
  updateEnv,
  checkEnvFile
}; 