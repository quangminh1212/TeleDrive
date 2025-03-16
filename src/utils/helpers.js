/**
 * TeleDrive - Helpers
 * File này chứa các hàm tiện ích
 */

const fs = require('fs-extra');
const path = require('path');
const config = require('../config/config');

/**
 * Đảm bảo các thư mục cần thiết tồn tại
 */
function ensureDirectories() {
  const dirs = [
    config.STORAGE_PATH,
    config.TEMP_DIR,
    config.DATA_DIR,
    config.DOWNLOAD_DIR,
    config.UPLOAD_DIR,
    path.join(config.STORAGE_PATH, 'db')
  ];
  
  for (const dir of dirs) {
    fs.ensureDirSync(dir);
  }
}

/**
 * Tạo ID ngẫu nhiên
 * @param {Number} length Độ dài của ID
 * @returns {String} ID ngẫu nhiên
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
 * Tính kích thước định dạng người đọc được
 * @param {Number} bytes Kích thước tính bằng bytes
 * @returns {String} Kích thước định dạng người đọc được
 */
function formatSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Định dạng thời gian
 * @param {Date|String|Number} date Thời gian cần định dạng
 * @returns {String} Thời gian đã định dạng
 */
function formatDate(date) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Lấy MIME type từ tên file
 * @param {String} fileName Tên file
 * @returns {String} MIME type
 */
function getMimeType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  
  const mimeTypes = {
    '.html': 'text/html',
    '.htm': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed',
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4',
    '.txt': 'text/plain',
    '.csv': 'text/csv'
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Đoán loại file dựa trên đuôi file
 * @param {String} fileName Tên file
 * @returns {String} Loại file (image, video, audio, document, archive, other)
 */
function guessFileType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.bmp'];
  const videoExts = ['.mp4', '.webm', '.avi', '.mov', '.mkv', '.flv', '.wmv'];
  const audioExts = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac'];
  const documentExts = [
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', 
    '.txt', '.rtf', '.csv', '.odt', '.ods', '.odp'
  ];
  const archiveExts = ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2'];
  
  if (imageExts.includes(ext)) return 'image';
  if (videoExts.includes(ext)) return 'video';
  if (audioExts.includes(ext)) return 'audio';
  if (documentExts.includes(ext)) return 'document';
  if (archiveExts.includes(ext)) return 'archive';
  
  return 'other';
}

/**
 * Ghi log ra console
 * @param {String} message Nội dung log
 * @param {String} type Loại log (info, error, warning)
 */
function log(message, type = 'info') {
  const date = new Date();
  const formattedDate = formatDate(date);
  
  switch (type) {
    case 'error':
      console.error(`[${formattedDate}] ERROR: ${message}`);
      break;
    case 'warning':
      console.warn(`[${formattedDate}] WARNING: ${message}`);
      break;
    case 'info':
    default:
      console.log(`[${formattedDate}] INFO: ${message}`);
      break;
  }
}

/**
 * Dọn dẹp thư mục tạm
 */
function cleanupTempDir() {
  try {
    if (fs.existsSync(config.TEMP_DIR)) {
      const files = fs.readdirSync(config.TEMP_DIR);
      const now = Date.now();
      
      // Xóa các file cũ hơn 1 ngày
      for (const file of files) {
        const filePath = path.join(config.TEMP_DIR, file);
        const stats = fs.statSync(filePath);
        const fileAge = now - stats.mtimeMs;
        
        // Nếu file cũ hơn 24h (86400000ms)
        if (fileAge > 86400000) {
          fs.unlinkSync(filePath);
          log(`Đã xóa file tạm cũ: ${file}`);
        }
      }
    }
  } catch (error) {
    log(`Lỗi khi dọn dẹp thư mục tạm: ${error.message}`, 'error');
  }
}

module.exports = {
  ensureDirectories,
  generateId,
  formatSize,
  formatDate,
  getMimeType,
  guessFileType,
  log,
  cleanupTempDir
}; 