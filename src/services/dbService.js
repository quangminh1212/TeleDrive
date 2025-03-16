/**
 * Database Service for TeleDrive
 * Handles file metadata storage using lowdb
 */

const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/config');
const { log, ensureDirectoryExists } = require('../utils/helpers');

// Use lowdb for simple JSON database
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

// Ensure data directory exists
const dbDir = path.join(__dirname, '../../data');
ensureDirectoryExists(dbDir);

// Initialize database
const adapter = new FileSync(path.join(dbDir, 'db.json'));
const db = low(adapter);

// Set default data structure
db.defaults({
  files: [],
  settings: {
    lastSync: null
  }
}).write();

/**
 * Get all files with pagination and filtering
 * @param {Object} options - Query options
 * @returns {Object} Files and pagination info
 */
const getFiles = (options = {}) => {
  const {
    page = 1,
    limit = 20,
    sortBy = 'uploadDate',
    sortOrder = 'desc',
    query = '',
    includeDeleted = false,
    onlyDeleted = false
  } = options;

  // Start with all files
  let files = db.get('files');

  // Filter by deletion status
  if (!includeDeleted) {
    files = files.filter(file => !file.deletedAt);
  } else if (onlyDeleted) {
    files = files.filter(file => file.deletedAt);
  }

  // Filter by search query if provided
  if (query) {
    const lowerQuery = query.toLowerCase();
    files = files.filter(file => 
      file.name.toLowerCase().includes(lowerQuery) ||
      (file.caption && file.caption.toLowerCase().includes(lowerQuery))
    );
  }

  // Count total before pagination
  const totalItems = files.size().value();

  // Sort files
  if (sortBy && sortOrder) {
    files = files.orderBy([sortBy], [sortOrder]);
  }

  // Apply pagination
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const paginatedFiles = files.slice(startIndex, endIndex).value();

  return {
    data: paginatedFiles,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(totalItems / limit),
      totalItems
    }
  };
};

/**
 * Get a file by ID
 * @param {string} id - File ID
 * @returns {Object|null} File object or null if not found
 */
const getFileById = (id) => {
  return db.get('files').find({ id }).value() || null;
};

/**
 * Get a file by Telegram message ID
 * @param {number} messageId - Telegram message ID
 * @returns {Object|null} File object or null if not found
 */
const getFileByMessageId = (messageId) => {
  return db.get('files').find({ telegramMessageId: messageId }).value() || null;
};

/**
 * Save a new file to the database
 * @param {Object} fileData - File data
 * @returns {Object} Saved file object
 */
const saveFile = (fileData) => {
  const id = fileData.id || uuidv4();
  const now = new Date().toISOString();
  
  const file = {
    id,
    name: fileData.name,
    size: fileData.size,
    mimeType: fileData.mimeType,
    type: fileData.type || 'other',
    telegramMessageId: fileData.telegramMessageId,
    caption: fileData.caption || '',
    uploadDate: now,
    updatedAt: now,
    deletedAt: null
  };
  
  db.get('files').push(file).write();
  return file;
};

/**
 * Update an existing file
 * @param {string} id - File ID
 * @param {Object} updates - Fields to update
 * @returns {Object|null} Updated file or null if not found
 */
const updateFile = (id, updates) => {
  const file = getFileById(id);
  
  if (!file) {
    return null;
  }
  
  // Prevent updating certain fields
  delete updates.id;
  delete updates.uploadDate;
  
  // Add updated timestamp
  updates.updatedAt = new Date().toISOString();
  
  // Update file
  db.get('files')
    .find({ id })
    .assign(updates)
    .write();
  
  return getFileById(id);
};

/**
 * Move a file to trash
 * @param {string} id - File ID
 * @returns {Object} Result with success status
 */
const moveToTrash = (id) => {
  const file = getFileById(id);
  
  if (!file) {
    return { success: false, message: 'File không tồn tại' };
  }
  
  if (file.deletedAt) {
    return { success: false, message: 'File đã ở trong thùng rác' };
  }
  
  updateFile(id, { deletedAt: new Date().toISOString() });
  
  return { success: true, file: getFileById(id) };
};

/**
 * Restore a file from trash
 * @param {string} id - File ID
 * @returns {Object} Result with success status
 */
const restoreFromTrash = (id) => {
  const file = getFileById(id);
  
  if (!file) {
    return { success: false, message: 'File không tồn tại' };
  }
  
  if (!file.deletedAt) {
    return { success: false, message: 'File không ở trong thùng rác' };
  }
  
  updateFile(id, { deletedAt: null });
  
  return { success: true, file: getFileById(id) };
};

/**
 * Permanently delete a file
 * @param {string} id - File ID
 * @returns {Object} Result with success status
 */
const deleteFilePermanently = (id) => {
  const file = getFileById(id);
  
  if (!file) {
    return { success: false, message: 'File không tồn tại' };
  }
  
  db.get('files').remove({ id }).write();
  
  return { success: true };
};

/**
 * Empty trash (delete all files in trash)
 * @returns {Object} Result with count of deleted files
 */
const emptyTrash = () => {
  const trashedFiles = db.get('files')
    .filter(file => file.deletedAt)
    .value();
  
  const count = trashedFiles.length;
  
  db.get('files')
    .remove(file => file.deletedAt)
    .write();
  
  return { success: true, count };
};

/**
 * Clean up old files in trash
 * @param {number} days - Days to keep files in trash
 * @returns {Object} Result with count of deleted files
 */
const cleanupTrash = (days = 30) => {
  const now = new Date();
  const trashedFiles = db.get('files')
    .filter(file => {
      if (!file.deletedAt) return false;
      
      const deletedDate = new Date(file.deletedAt);
      const diffTime = Math.abs(now - deletedDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays > days;
    })
    .value();
  
  const count = trashedFiles.length;
  
  if (count > 0) {
    const idsToDelete = trashedFiles.map(file => file.id);
    
    db.get('files')
      .remove(file => idsToDelete.includes(file.id))
      .write();
    
    log(`Cleaned up ${count} old files from trash (older than ${days} days)`);
  }
  
  return { success: true, count };
};

/**
 * Search files by query
 * @param {Object} options - Search options
 * @returns {Object} Search results and pagination
 */
const searchFiles = (options = {}) => {
  const { query, page = 1, limit = 20 } = options;
  
  return getFiles({
    page,
    limit,
    query,
    includeDeleted: false
  });
};

/**
 * Get storage statistics
 * @returns {Object} Storage stats
 */
const getStorageStats = () => {
  const allFiles = db.get('files').value();
  const activeFiles = allFiles.filter(file => !file.deletedAt);
  const trashedFiles = allFiles.filter(file => file.deletedAt);
  
  const totalSize = allFiles.reduce((sum, file) => sum + (file.size || 0), 0);
  const activeSize = activeFiles.reduce((sum, file) => sum + (file.size || 0), 0);
  const trashedSize = trashedFiles.reduce((sum, file) => sum + (file.size || 0), 0);
  
  // Group by file type
  const fileTypes = {};
  activeFiles.forEach(file => {
    const type = file.type || 'other';
    if (!fileTypes[type]) {
      fileTypes[type] = { count: 0, size: 0 };
    }
    fileTypes[type].count++;
    fileTypes[type].size += (file.size || 0);
  });
  
  return {
    totalFiles: allFiles.length,
    activeFiles: activeFiles.length,
    trashedFiles: trashedFiles.length,
    totalSize,
    activeSize,
    trashedSize,
    fileTypes,
    lastSync: db.get('settings.lastSync').value()
  };
};

/**
 * Update last sync time
 * @returns {string} ISO timestamp
 */
const updateLastSync = () => {
  const now = new Date().toISOString();
  db.set('settings.lastSync', now).write();
  return now;
};

/**
 * Get last sync time
 * @returns {string|null} ISO timestamp or null
 */
const getLastSync = () => {
  return db.get('settings.lastSync').value();
};

module.exports = {
  getFiles,
  getFileById,
  getFileByMessageId,
  saveFile,
  updateFile,
  moveToTrash,
  restoreFromTrash,
  deleteFilePermanently,
  emptyTrash,
  cleanupTrash,
  searchFiles,
  getStorageStats,
  updateLastSync,
  getLastSync
}; 