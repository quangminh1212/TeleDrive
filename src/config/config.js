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

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_TELEGRAM_TIMEOUT = 10000; // 10 seconds
const DEFAULT_POLLING_TIMEOUT = 5;       // 5 seconds

/**
 * Cấu hình ứng dụng
 */
const config = {
  // Môi trường
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Server
  PORT: process.env.PORT || 5002,
  HOST: process.env.HOST || 'localhost',
  BASE_URL: process.env.BASE_URL || 'http://localhost:5002',
  
  // Thông tin đăng nhập
  API_KEY: process.env.API_KEY || 'defaultapikey',
  
  // Telegram Bot
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID,
  
  // Telegram API
  TELEGRAM_API_ID: process.env.API_ID,
  TELEGRAM_API_HASH: process.env.API_HASH,
  
  // Telegram API timeout và cấu hình
  TELEGRAM_API_TIMEOUT: parseInt(process.env.TELEGRAM_API_TIMEOUT) || DEFAULT_TELEGRAM_TIMEOUT,
  TELEGRAM_POLLING_TIMEOUT: parseInt(process.env.TELEGRAM_POLLING_TIMEOUT) || DEFAULT_POLLING_TIMEOUT,
  TELEGRAM_RETRY_DELAY: parseInt(process.env.TELEGRAM_RETRY_DELAY) || 3000,
  TELEGRAM_MAX_RETRIES: parseInt(process.env.TELEGRAM_MAX_RETRIES) || DEFAULT_MAX_RETRIES,
  TELEGRAM_SIMULATION_MODE: process.env.TELEGRAM_SIMULATION_MODE === 'true',
  
  // Đường dẫn storage
  STORAGE_PATH: process.env.STORAGE_PATH || path.join(process.cwd(), 'storage'),
  
  // Giới hạn kích thước file (mặc định 50MB)
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024,
  
  // Cấu hình session
  SESSION_SECRET: process.env.SESSION_SECRET || 'teledrivesecret',
  
  // Cài đặt đồng bộ
  AUTO_SYNC: process.env.AUTO_SYNC !== 'false',
  SYNC_INTERVAL: parseInt(process.env.SYNC_INTERVAL) || 6 * 60 * 60 * 1000, // 6 hours
  
  // Tự động dọn dẹp
  CLEANUP_ENABLED: process.env.CLEANUP_ENABLED !== 'false',
  CLEANUP_INTERVAL: parseInt(process.env.CLEANUP_INTERVAL) || 24 * 60 * 60 * 1000, // 24 hours
  
  // Tạo các đường dẫn phụ thuộc
  UPLOADS_DIR: path.join(config.STORAGE_PATH, 'uploads'),
  TEMP_DIR: path.join(config.STORAGE_PATH, 'temp'),
  DB_DIR: path.join(config.STORAGE_PATH, 'db'),
  TEMP_PATH: process.env.TEMP_PATH || path.join(process.cwd(), 'temp'),
  DOWNLOAD_PATH: process.env.DOWNLOAD_PATH || path.join(process.cwd(), 'downloads')
};

// Đảm bảo các thư mục cần thiết tồn tại
function ensureDirectories() {
  const dirs = [
    config.DB_DIR,
    config.UPLOADS_DIR,
    config.TEMP_DIR,
    config.TEMP_PATH,
    config.DOWNLOAD_PATH
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

// Cập nhật file .env
async function updateEnv(newValues) {
  try {
    if (!newValues || Object.keys(newValues).length === 0) {
      return {
        success: false,
        error: 'Không có thông tin cập nhật'
      };
    }
    
    // Đọc nội dung file .env
    const envPath = path.join(process.cwd(), '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Cập nhật từng biến
    const envLines = envContent.split('\n');
    const updatedLines = [];
    const updatedKeys = new Set();
    
    // First pass: update existing keys
    for (const line of envLines) {
      // Skip empty lines and comments
      if (!line.trim() || line.trim().startsWith('#')) {
        updatedLines.push(line);
        continue;
      }
      
      // Check if the line contains a key that needs to be updated
      const match = line.match(/^([A-Za-z0-9_]+)=/);
      if (match) {
        const key = match[1];
        if (newValues.hasOwnProperty(key)) {
          updatedLines.push(`${key}=${newValues[key]}`);
          updatedKeys.add(key);
          
          // Also update the runtime config
          config[key] = newValues[key];
        } else {
          updatedLines.push(line);
        }
      } else {
        updatedLines.push(line);
      }
    }
    
    // Second pass: add new keys
    for (const [key, value] of Object.entries(newValues)) {
      if (!updatedKeys.has(key)) {
        updatedLines.push(`${key}=${value}`);
        
        // Also update the runtime config
        config[key] = value;
      }
    }
    
    // Ghi lại vào file .env
    fs.writeFileSync(envPath, updatedLines.join('\n'));
    console.log('Đã cập nhật file .env thành công');
    
    // Reload dotenv
    dotenv.config();
    
    return {
      success: true,
      updates: newValues
    };
  } catch (error) {
    console.error('Lỗi khi cập nhật file .env:', error);
    return {
      success: false,
      error: error.message || 'Lỗi không xác định khi cập nhật .env'
    };
  }
}

// Function to log info about the configuration
function logConfig() {
  console.log('==== Configuration ====');
  console.log(`Environment: ${config.NODE_ENV}`);
  console.log(`Server: ${config.HOST}:${config.PORT}`);
  console.log(`Telegram Bot: ${config.TELEGRAM_BOT_TOKEN ? 'Configured' : 'Not configured'}`);
  console.log(`Telegram Chat ID: ${config.TELEGRAM_CHAT_ID || 'Not configured'}`);
  console.log(`Auto Sync: ${config.AUTO_SYNC ? 'Enabled' : 'Disabled'}`);
  console.log(`Sync Interval: ${config.SYNC_INTERVAL / (60 * 60 * 1000)} hours`);
  console.log(`Cleanup: ${config.CLEANUP_ENABLED ? 'Enabled' : 'Disabled'}`);
  console.log(`Max File Size: ${config.MAX_FILE_SIZE / (1024 * 1024)}MB`);
  console.log('=====================');
}

module.exports = {
  ...config,
  updateEnv,
  checkEnvFile,
  logConfig
}; 