/**
 * Storage Service
 * Handles storage operations via Telegram
 */

const fs = require('fs-extra');
const path = require('path');
const config = require('../../common/config');
const { logger, retry } = require('../../common/utils');
const telegramService = require('./telegramService');

/**
 * Upload a file to storage
 * @param {String} filePath - Path to the file
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result
 */
async function uploadFile(filePath, options = {}) {
  try {
    // Validate file
    if (!fs.existsSync(filePath)) {
      return { 
        success: false, 
        error: `File not found: ${filePath}` 
      };
    }
    
    // Check file size
    const stats = await fs.stat(filePath);
    const maxSize = config.MAX_FILE_SIZE || 20 * 1024 * 1024; // 20MB default
    
    if (stats.size > maxSize) {
      return { 
        success: false, 
        error: `File size exceeds maximum allowed (${stats.size} > ${maxSize} bytes)` 
      };
    }
    
    logger.info(`Uploading file to Telegram: ${path.basename(filePath)}`);
    
    // Upload to Telegram
    const result = await telegramService.sendFile(filePath, options.caption || '');
    
    if (!result.success) {
      return { 
        success: false, 
        error: result.error || 'Failed to upload file to Telegram' 
      };
    }
    
    return {
      success: true,
      fileId: result.fileId,
      messageId: result.messageId,
      chatId: result.chatId,
      fileName: path.basename(filePath)
    };
  } catch (error) {
    logger.error(`Error uploading file to storage: ${error.message}`);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

/**
 * Download a file from storage
 * @param {String} fileId - Telegram file ID
 * @param {String} targetPath - Path to save the file
 * @returns {Promise<Object>} Download result
 */
async function downloadFile(fileId, targetPath) {
  try {
    if (!fileId) {
      return { 
        success: false, 
        error: 'File ID is required' 
      };
    }
    
    logger.info(`Downloading file from Telegram: ${fileId}`);
    
    // Ensure target directory exists
    await fs.ensureDir(path.dirname(targetPath));
    
    // Download with retry
    const result = await retry(
      async () => await telegramService.downloadFile(fileId, targetPath),
      3, // Max 3 retries
      1000 // Start with 1 second delay
    );
    
    if (!result.success) {
      return { 
        success: false, 
        error: result.error || 'Failed to download file from Telegram' 
      };
    }
    
    return {
      success: true,
      filePath: targetPath,
      size: result.size
    };
  } catch (error) {
    logger.error(`Error downloading file from storage: ${error.message}`);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

/**
 * Get a temporary link to a file
 * @param {String} fileId - Telegram file ID
 * @returns {Promise<Object>} Link result
 */
async function getFileLink(fileId) {
  try {
    if (!fileId) {
      return { 
        success: false, 
        error: 'File ID is required' 
      };
    }
    
    const linkResult = await telegramService.getFileLink(fileId);
    
    if (!linkResult.success) {
      return { 
        success: false, 
        error: linkResult.error || 'Failed to get file link' 
      };
    }
    
    return {
      success: true,
      url: linkResult.url,
      expiresAt: linkResult.expiresAt
    };
  } catch (error) {
    logger.error(`Error getting file link: ${error.message}`);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

/**
 * Get files from storage
 * @param {Number} limit - Maximum number of files to retrieve
 * @returns {Promise<Object>} Files result
 */
async function getStorageFiles(limit = 100) {
  try {
    const result = await telegramService.getFilesFromChat(limit);
    
    if (!result.success) {
      return { 
        success: false, 
        error: result.error || 'Failed to retrieve files from storage' 
      };
    }
    
    return {
      success: true,
      files: result.files
    };
  } catch (error) {
    logger.error(`Error getting files from storage: ${error.message}`);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

/**
 * Sync files with storage
 * @returns {Promise<Object>} Sync result
 */
async function syncWithStorage() {
  try {
    // Initialize Telegram service if needed
    if (!telegramService.isActive()) {
      const initResult = await telegramService.initialize();
      
      if (!initResult.success) {
        return { 
          success: false, 
          error: initResult.error || 'Failed to initialize Telegram service' 
        };
      }
    }
    
    // Get files from storage
    const filesResult = await getStorageFiles(500);
    
    if (!filesResult.success) {
      return { 
        success: false, 
        error: filesResult.error 
      };
    }
    
    return {
      success: true,
      files: filesResult.files
    };
  } catch (error) {
    logger.error(`Error syncing with storage: ${error.message}`);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

module.exports = {
  uploadFile,
  downloadFile,
  getFileLink,
  getStorageFiles,
  syncWithStorage
}; 