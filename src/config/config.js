/**
 * TeleDrive - Configuration
 * Tập trung toàn bộ cấu hình trong một file
 */
const path = require('path');
const dotenv = require('dotenv');

// Nạp cấu hình từ file .env
dotenv.config();

// Đường dẫn thư mục gốc của ứng dụng
const APP_ROOT = path.resolve(__dirname, '..', '..');

// Cấu hình thư mục lưu trữ
const STORAGE_PATH = process.env.STORAGE_PATH || path.join(APP_ROOT, 'storage');
const TEMP_DIR = process.env.TEMP_DIR || path.join(APP_ROOT, 'temp');
const DATA_DIR = process.env.DATA_DIR || path.join(APP_ROOT, 'data');
const DOWNLOAD_DIR = path.join(APP_ROOT, 'downloads');
const UPLOAD_DIR = path.join(APP_ROOT, 'uploads');

// Cấu hình Telegram
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Cấu hình đồng bộ và dọn dẹp
const AUTO_SYNC = process.env.AUTO_SYNC === 'true';
const SYNC_INTERVAL = parseInt(process.env.SYNC_INTERVAL || '6');
const CLEANUP_ENABLED = process.env.CLEANUP_ENABLED === 'true';
const CLEANUP_INTERVAL = parseInt(process.env.CLEANUP_INTERVAL || '24');

// Cấu hình ứng dụng
const PORT = parseInt(process.env.PORT || '5002');
const NODE_ENV = process.env.NODE_ENV || 'development';
const SESSION_SECRET = process.env.SESSION_SECRET || 'teledrive-session-secret-key';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '2000') * 1024 * 1024; // Convert to bytes

// Cấu hình xác thực
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

module.exports = {
  APP_ROOT,
  STORAGE_PATH,
  TEMP_DIR,
  DATA_DIR,
  DOWNLOAD_DIR,
  UPLOAD_DIR,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  AUTO_SYNC,
  SYNC_INTERVAL,
  CLEANUP_ENABLED,
  CLEANUP_INTERVAL,
  PORT,
  NODE_ENV,
  SESSION_SECRET,
  MAX_FILE_SIZE,
  ADMIN_USERNAME,
  ADMIN_PASSWORD,
}; 