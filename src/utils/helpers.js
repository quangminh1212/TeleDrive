/**
 * TeleDrive - Các hàm trợ giúp
 * File này chứa các hàm tiện ích
 */

const fs = require('fs');
const path = require('path');

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

/**
 * Đoán loại MIME dựa trên phần mở rộng của file
 * @param {String} extension Phần mở rộng file
 * @returns {String} MIME type
 */
function getMimeType(extension) {
  const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
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
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.csv': 'text/csv'
  };

  return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
}

/**
 * Đoán loại file dựa trên MIME type
 * @param {String} mimeType MIME type của file
 * @returns {String} Loại file (image, video, audio, hoặc document)
 */
function guessFileType(mimeType) {
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
 * Xác định loại file dựa trên tên file
 * @param {String} filename Tên file
 * @returns {String} Loại file (image, video, audio, hoặc document)
 */
function getFileType(filename) {
  if (!filename) return 'document';
  
  const extension = path.extname(filename).toLowerCase();
  const mimeType = getMimeType(extension);
  
  return guessFileType(mimeType);
}

/**
 * Lấy tất cả các file trong thư mục, bao gồm cả thư mục con
 * @param {String} dirPath Đường dẫn thư mục
 * @param {Array} arrayOfFiles Mảng chứa các file (sử dụng đệ quy)
 * @returns {Array} Mảng chứa đường dẫn đến tất cả các file
 */
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else {
      arrayOfFiles.push(filePath);
    }
  });

  return arrayOfFiles;
}

module.exports = {
  ensureDirectories,
  getMimeType,
  guessFileType,
  getFileType,
  getAllFiles
}; 