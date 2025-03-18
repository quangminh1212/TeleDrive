/**
 * File Utilities for TeleDrive
 * Contains functions related to file operations
 */

const fs = require('fs-extra');
const path = require('path');
const mime = require('mime-types');
const config = require('../config');
const logger = require('./logger');

/**
 * Ensure directory exists, create if necessary
 * @param {String} dirPath - Directory path to ensure
 * @returns {Boolean} Success status
 */
function ensureDirectoryExists(dirPath) {
  try {
    fs.ensureDirSync(dirPath);
    return true;
  } catch (error) {
    logger.error(`Error creating directory ${dirPath}: ${error.message}`);
    return false;
  }
}

/**
 * Ensure all required directories exist
 * @returns {void}
 */
function ensureDirectories() {
  const dirs = [
    config.DATA_DIR,
    config.TEMP_DIR,
    config.LOGS_DIR,
    config.UPLOADS_DIR,
    config.DOWNLOADS_DIR,
    config.STORAGE_DIR,
    config.DB_DIR,
    config.TEMP_UPLOADS_DIR,
    config.TEMP_DOWNLOADS_DIR,
    path.join(config.STORAGE_DIR, 'uploads'),
    path.join(config.STORAGE_DIR, 'temp')
  ];
  
  dirs.forEach(dir => {
    if (ensureDirectoryExists(dir)) {
      logger.info(`Ensured directory exists: ${dir}`);
    }
  });
}

/**
 * Get MIME type from file name
 * @param {String} fileName - File name
 * @returns {String} MIME type
 */
function getMimeType(fileName) {
  const mimeType = mime.lookup(fileName);
  return mimeType || 'application/octet-stream';
}

/**
 * Guess file type from file name
 * @param {String} fileName - File name
 * @returns {String} File type category
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
 * Create a secure file name
 * @param {String} fileName - Original file name
 * @returns {String} Secure file name
 */
function createSecureFileName(fileName) {
  // Remove invalid characters
  let secureName = fileName.replace(/[\/\\?%*:|"<>]/g, '-');
  
  // Add unique suffix
  const ext = path.extname(secureName);
  const baseName = path.basename(secureName, ext);
  const timestamp = Date.now();
  const uniqueSuffix = Math.round(Math.random() * 1E9);
  
  return `${baseName}-${timestamp}-${uniqueSuffix}${ext}`;
}

/**
 * Format file size to human-readable string
 * @param {Number} bytes - Size in bytes
 * @param {Number} decimals - Decimal places
 * @returns {String} Formatted size
 */
function formatSize(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Clean up temporary files older than specified age
 * @param {String} directory - Directory to clean
 * @param {Number} maxAgeMinutes - Maximum age in minutes
 * @returns {Number} Number of files deleted
 */
async function cleanupTempFiles(directory = config.TEMP_DIR, maxAgeMinutes = 60) {
  try {
    if (!fs.existsSync(directory)) {
      return 0;
    }
    
    const files = await fs.readdir(directory);
    let count = 0;
    const now = Date.now();
    
    for (const file of files) {
      const filePath = path.join(directory, file);
      
      // Skip directories and .gitkeep files
      if (fs.statSync(filePath).isDirectory() || file === '.gitkeep') {
        continue;
      }
      
      const stats = await fs.stat(filePath);
      const fileAgeMs = now - stats.mtime.getTime();
      const fileAgeMinutes = fileAgeMs / (1000 * 60);
      
      if (fileAgeMinutes > maxAgeMinutes) {
        await fs.remove(filePath);
        count++;
        logger.info(`Deleted old temp file: ${file} (${fileAgeMinutes.toFixed(2)} minutes old)`);
      }
    }
    
    return count;
  } catch (error) {
    logger.error(`Error cleaning up temp files: ${error.message}`);
    return 0;
  }
}

module.exports = {
  ensureDirectoryExists,
  ensureDirectories,
  getMimeType,
  guessFileType,
  createSecureFileName,
  formatSize,
  cleanupTempFiles
}; 