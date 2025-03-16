/**
 * TeleDrive - Helpers
 * File này chứa các hàm tiện ích
 */

const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
const config = require('../config/config');

/**
 * Đảm bảo các thư mục cần thiết tồn tại
 */
function ensureDirectories() {
  try {
    console.log('===== KIỂM TRA THƯ MỤC TRONG HỆ THỐNG =====');
    
    // Đảm bảo config đã được nạp
    const config = require('../config/config');
    
    // Danh sách thư mục cần kiểm tra
    const directories = [
      'data',
      'data/db',
      'temp',
      'uploads',
      'downloads',
      'storage',
      'storage/db',
      'storage/temp',
      'storage/uploads',
      'storage/downloads'
    ];
    
    // Thêm các thư mục từ config nếu có
    if (config.TEMP_DIR) directories.push(config.TEMP_DIR);
    if (config.DATA_DIR) directories.push(config.DATA_DIR);
    if (config.DATA_DIR) directories.push(path.join(config.DATA_DIR, 'db'));
    if (config.STORAGE_PATH) {
      directories.push(config.STORAGE_PATH);
      directories.push(path.join(config.STORAGE_PATH, 'db'));
      directories.push(path.join(config.STORAGE_PATH, 'temp'));
      directories.push(path.join(config.STORAGE_PATH, 'uploads'));
      directories.push(path.join(config.STORAGE_PATH, 'downloads'));
    }
    
    // Lọc các đường dẫn không xác định
    const validDirectories = directories.filter(dir => dir !== undefined && dir !== null);
    
    for (const dir of validDirectories) {
      const fullPath = path.resolve(dir);
      
      // Kiểm tra và tạo thư mục nếu chưa tồn tại
      if (!fs.existsSync(fullPath)) {
        console.log(`Tạo thư mục: ${fullPath}`);
        fs.mkdirSync(fullPath, { recursive: true });
      } else {
        // Kiểm tra quyền ghi
        try {
          const testFile = path.join(fullPath, '.test');
          fs.writeFileSync(testFile, 'test');
          fs.unlinkSync(testFile);
        } catch (permError) {
          console.error(`Thư mục ${fullPath} không có quyền ghi: ${permError.message}`);
        }
      }
    }
    
    console.log('Đã kiểm tra và tạo các thư mục cần thiết');
  } catch (error) {
    console.error('Lỗi khi tạo thư mục:', error);
  }
}

/**
 * Lấy MIME type dựa trên tên file
 * @param {String} filename Tên file cần kiểm tra
 * @returns {String} MIME type
 */
function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const mimeType = mime.lookup(ext) || 'application/octet-stream';
  return mimeType;
}

/**
 * Đoán loại file dựa trên MIME type
 * @param {String} filename Tên file cần kiểm tra
 * @returns {String} Loại file (image, video, audio, document)
 */
function guessFileType(filename) {
  const mimeType = getMimeType(filename);
  
  if (mimeType.startsWith('image/')) {
    return 'image';
  } else if (mimeType.startsWith('video/')) {
    return 'video';
  } else if (mimeType.startsWith('audio/')) {
    return 'audio';
  } else {
    return 'document';
  }
}

/**
 * Format kích thước file sang dạng đọc được
 * @param {Number} bytes Kích thước file tính bằng bytes
 * @param {Number} decimals Số chữ số thập phân
 * @returns {String} Kích thước đã format
 */
function formatFileSize(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format ngày tháng sang dạng đọc được
 * @param {String|Date} date Ngày cần format
 * @returns {String} Ngày đã format
 */
function formatDate(date) {
  const d = new Date(date);
  return d.toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * Kiểm tra tính hợp lệ của đường dẫn
 * @param {String} filePath Đường dẫn cần kiểm tra
 * @returns {Boolean} Kết quả kiểm tra
 */
function isPathSafe(filePath) {
  // Đảm bảo path không có ký tự đặc biệt
  const safePathRegex = /^[a-zA-Z0-9_.-]+$/;
  const filename = path.basename(filePath);
  
  return safePathRegex.test(filename);
}

/**
 * Tạo ID ngẫu nhiên
 * @param {Number} length Độ dài ID
 * @returns {String} ID đã tạo
 */
function generateId(length = 10) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

/**
 * Ghi log ra console và file
 * @param {String} message Nội dung log
 * @param {String} level Level của log (info, error, warn)
 */
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  // Log ra console
  if (level === 'error') {
    console.error(logMessage);
  } else if (level === 'warn') {
    console.warn(logMessage);
  } else {
    console.log(logMessage);
  }
  
  // TODO: Ghi log vào file nếu cần
}

module.exports = {
  ensureDirectories,
  getMimeType,
  guessFileType,
  formatFileSize,
  formatDate,
  isPathSafe,
  generateId,
  log
}; 