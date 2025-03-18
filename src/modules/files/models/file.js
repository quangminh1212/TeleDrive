/**
 * File Model
 * Represents a file in the system
 */

const { generateId, getMimeType, guessFileType } = require('../../common/utils');

/**
 * Create a new file object
 * @param {Object} fileData - File data
 * @returns {Object} File object
 */
function createFile(fileData) {
  const now = new Date().toISOString();
  
  const fileName = fileData.name || 'unnamed_file';
  const mimeType = fileData.mimeType || getMimeType(fileName);
  const fileType = fileData.type || guessFileType(fileName);
  
  return {
    id: fileData.id || generateId(12),
    name: fileName,
    size: fileData.size || 0,
    mimeType: mimeType,
    type: fileType,
    telegramFileId: fileData.telegramFileId || null,
    telegramMessageId: fileData.telegramMessageId || null,
    chatId: fileData.chatId || null,
    localPath: fileData.localPath || null,
    uploadDate: fileData.uploadDate || now,
    updatedAt: now,
    caption: fileData.caption || '',
    folder: fileData.folder || '',
    isDeleted: false,
    deletedAt: null,
    downloadDate: null,
    shareToken: null,
    shareExpiry: null
  };
}

/**
 * Create a file object from Telegram file data
 * @param {Object} telegramFile - Telegram file data
 * @returns {Object} File object
 */
function createFileFromTelegram(telegramFile) {
  const fileName = telegramFile.file_name || 
    `${telegramFile.type || 'file'}_${Date.now()}${getExtensionFromMimeType(telegramFile.mime_type)}`;
  
  return createFile({
    name: fileName,
    size: telegramFile.file_size || 0,
    mimeType: telegramFile.mime_type || getMimeType(fileName),
    type: guessFileType(fileName),
    telegramFileId: telegramFile.file_id,
    telegramMessageId: telegramFile.message_id,
    chatId: telegramFile.chat_id,
    uploadDate: new Date(telegramFile.date * 1000).toISOString(),
    caption: telegramFile.caption || ''
  });
}

/**
 * Update a file with new data
 * @param {Object} file - Existing file object
 * @param {Object} updates - Updates to apply
 * @returns {Object} Updated file object
 */
function updateFile(file, updates) {
  return {
    ...file,
    ...updates,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Mark a file as deleted
 * @param {Object} file - File object
 * @returns {Object} Updated file object
 */
function markFileAsDeleted(file) {
  return {
    ...file,
    isDeleted: true,
    deletedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Restore a deleted file
 * @param {Object} file - File object
 * @returns {Object} Updated file object
 */
function restoreFile(file) {
  return {
    ...file,
    isDeleted: false,
    deletedAt: null,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Create a share token for a file
 * @param {Object} file - File object
 * @param {Number} expiryDays - Number of days until expiry
 * @returns {Object} Updated file object with share token
 */
function createShareToken(file, expiryDays = 7) {
  const shareToken = generateId(16);
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + expiryDays);
  
  return {
    ...file,
    shareToken,
    shareExpiry: expiryDate.toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Get file extension from MIME type
 * @param {String} mimeType - MIME type
 * @returns {String} File extension
 */
function getExtensionFromMimeType(mimeType) {
  if (!mimeType) return '';
  
  const mimeMap = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
    'text/plain': '.txt',
    'text/html': '.html',
    'text/css': '.css',
    'text/javascript': '.js',
    'application/json': '.json',
    'application/pdf': '.pdf',
    'application/zip': '.zip',
    'application/x-rar-compressed': '.rar',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'application/vnd.ms-powerpoint': '.ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'audio/mpeg': '.mp3',
    'audio/ogg': '.ogg',
    'audio/wav': '.wav',
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'video/ogg': '.ogv'
  };
  
  return mimeMap[mimeType] || '';
}

module.exports = {
  createFile,
  createFileFromTelegram,
  updateFile,
  markFileAsDeleted,
  restoreFile,
  createShareToken
}; 