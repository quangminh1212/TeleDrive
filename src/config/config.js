/**
 * TeleDrive - Config
 * File này chứa cấu hình ứng dụng
 */

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

# Telegram Bot config
BOT_TOKEN=
CHAT_ID=

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
  // Cổng máy chủ
  PORT: process.env.PORT || 5002,
  
  // Telegram Bot
  BOT_TOKEN: process.env.BOT_TOKEN || '',
  CHAT_ID: process.env.CHAT_ID || '',
  
  // Đường dẫn lưu trữ
  STORAGE_PATH: process.env.STORAGE_PATH || process.cwd(),
  
  // Tự động đồng bộ files
  AUTO_SYNC: process.env.AUTO_SYNC || 'true',
  
  // Debug mode
  DEBUG: process.env.DEBUG === 'true',
  
  // Thư mục dữ liệu
  DB_DIR: path.join(process.env.STORAGE_PATH || process.cwd(), 'db'),
  
  // Thư mục uploads
  UPLOADS_DIR: path.join(process.env.STORAGE_PATH || process.cwd(), 'uploads'),
  
  // Số lần thử lại khi gửi file lên Telegram bị lỗi
  TELEGRAM_RETRY_COUNT: 3,
  
  // Thời gian chờ giữa các lần thử lại (milliseconds)
  TELEGRAM_RETRY_DELAY: 5000,
  
  // Kích thước chunk khi gửi file lớn (bytes, mặc định 5MB)
  TELEGRAM_CHUNK_SIZE: 5 * 1024 * 1024,
  
  // Kích thước tối đa của file có thể gửi lên Telegram (bytes, mặc định 50MB)
  MAX_FILE_SIZE: 50 * 1024 * 1024,
  
  // Thời gian hết hạn của session (milliseconds, mặc định 24h)
  SESSION_EXPIRY: 24 * 60 * 60 * 1000,
  
  // Secret key cho session
  SESSION_SECRET: process.env.SESSION_SECRET || 'teledrive-session-secret'
};

// Đảm bảo các thư mục cần thiết tồn tại
function ensureDirectories() {
  const dirs = [
    config.DB_DIR,
    config.UPLOADS_DIR
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