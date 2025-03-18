/**
 * File Service
 * Handles file-related operations
 */

const fs = require('fs-extra');
const path = require('path');
const fileModel = require('../models/file');
const dbService = require('../../db/services/dbService');
const config = require('../../common/config');
const { logger, formatSize, createSecureFileName } = require('../../common/utils');
const storageService = require('../../storage/services/storageService');

/**
 * Get files with filtering and pagination
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Files and pagination data
 */
async function getFiles(options = {}) {
  return await dbService.getFiles(options);
}

/**
 * Get a file by ID
 * @param {String} fileId - File ID
 * @returns {Promise<Object|null>} File object or null if not found
 */
async function getFileById(fileId) {
  return await dbService.getFileById(fileId);
}

/**
 * Get files that are in the trash
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Files and pagination data
 */
async function getTrashFiles(options = {}) {
  return await dbService.getFiles({
    ...options,
    showDeleted: true,
    onlyDeleted: true
  });
}

/**
 * Upload a file to storage
 * @param {String} filePath - Path to the file
 * @param {String} caption - File caption
 * @returns {Promise<Object|null>} File object or null if failed
 */
async function uploadFile(filePath, caption = '') {
  try {
    if (!fs.existsSync(filePath)) {
      logger.error(`File not found: ${filePath}`);
      return null;
    }
    
    // Get file stats
    const stats = await fs.stat(filePath);
    const fileName = path.basename(filePath);
    
    // Create file object
    const fileData = fileModel.createFile({
      name: fileName,
      size: stats.size,
      caption: caption,
      localPath: filePath
    });
    
    logger.info(`Uploading file: ${fileName} (${formatSize(stats.size)})`);
    
    // Upload to storage
    const uploadResult = await storageService.uploadFile(filePath, {
      caption: caption,
      fileName: fileName
    });
    
    if (!uploadResult.success) {
      logger.error(`Failed to upload file to storage: ${uploadResult.error}`);
      return null;
    }
    
    // Update file with storage info
    const updatedFile = fileModel.updateFile(fileData, {
      telegramFileId: uploadResult.fileId,
      telegramMessageId: uploadResult.messageId,
      chatId: uploadResult.chatId
    });
    
    // Save to database
    const savedFile = await dbService.addFile(updatedFile);
    
    if (!savedFile) {
      logger.error(`Failed to save file data to database`);
      return null;
    }
    
    logger.info(`File uploaded successfully: ${fileName}`);
    return savedFile;
  } catch (error) {
    logger.error(`Error uploading file: ${error.message}`);
    return null;
  }
}

/**
 * Download a file from storage
 * @param {String} fileId - File ID
 * @param {String} [downloadPath] - Custom download path
 * @returns {Promise<Object>} Download result
 */
async function downloadFile(fileId, downloadPath) {
  try {
    // Get file info from database
    const file = await dbService.getFileById(fileId);
    
    if (!file) {
      return { success: false, error: 'File not found' };
    }
    
    if (file.isDeleted) {
      return { success: false, error: 'File is in trash' };
    }
    
    // Check if file already exists locally
    if (file.localPath && fs.existsSync(file.localPath)) {
      return { 
        success: true, 
        filePath: file.localPath,
        fromCache: true
      };
    }
    
    // Determine download path
    const targetPath = downloadPath || path.join(
      config.DOWNLOADS_DIR,
      createSecureFileName(file.name)
    );
    
    // Download from storage
    const downloadResult = await storageService.downloadFile(
      file.telegramFileId,
      targetPath
    );
    
    if (!downloadResult.success) {
      return { success: false, error: downloadResult.error };
    }
    
    // Update file with local path
    await dbService.updateFile(fileId, {
      localPath: targetPath,
      downloadDate: new Date().toISOString()
    });
    
    return {
      success: true,
      filePath: targetPath,
      fromCache: false
    };
  } catch (error) {
    logger.error(`Error downloading file: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a file (move to trash)
 * @param {String} fileId - File ID
 * @returns {Promise<Boolean>} Success status
 */
async function deleteFile(fileId) {
  try {
    const file = await dbService.getFileById(fileId);
    
    if (!file) {
      return false;
    }
    
    // Mark as deleted in database
    return await dbService.deleteFile(fileId, false);
  } catch (error) {
    logger.error(`Error deleting file: ${error.message}`);
    return false;
  }
}

/**
 * Permanently delete a file
 * @param {String} fileId - File ID
 * @returns {Promise<Boolean>} Success status
 */
async function permanentlyDeleteFile(fileId) {
  try {
    const file = await dbService.getFileById(fileId);
    
    if (!file) {
      return false;
    }
    
    // Delete local file if exists
    if (file.localPath && fs.existsSync(file.localPath)) {
      try {
        await fs.remove(file.localPath);
        logger.info(`Deleted local file: ${file.localPath}`);
      } catch (err) {
        logger.error(`Error deleting local file: ${err.message}`);
      }
    }
    
    // Remove from database
    return await dbService.deleteFile(fileId, true);
  } catch (error) {
    logger.error(`Error permanently deleting file: ${error.message}`);
    return false;
  }
}

/**
 * Restore a file from trash
 * @param {String} fileId - File ID
 * @returns {Promise<Boolean>} Success status
 */
async function restoreFile(fileId) {
  try {
    const file = await dbService.getFileById(fileId);
    
    if (!file || !file.isDeleted) {
      return false;
    }
    
    // Update file in database
    return !!(await dbService.updateFile(fileId, {
      isDeleted: false,
      deletedAt: null
    }));
  } catch (error) {
    logger.error(`Error restoring file: ${error.message}`);
    return false;
  }
}

/**
 * Create a share token for a file
 * @param {String} fileId - File ID
 * @param {Number} expiryDays - Days until expiration
 * @returns {Promise<Object|null>} Share info or null if failed
 */
async function createShareToken(fileId, expiryDays = 7) {
  try {
    const file = await dbService.getFileById(fileId);
    
    if (!file || file.isDeleted) {
      return null;
    }
    
    // Generate token
    const shareToken = fileModel.generateId(16);
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + expiryDays);
    
    // Update file
    const updatedFile = await dbService.updateFile(fileId, {
      shareToken,
      shareExpiry: expiryDate.toISOString()
    });
    
    if (!updatedFile) {
      return null;
    }
    
    return {
      fileId,
      fileName: file.name,
      shareToken,
      shareExpiry: expiryDate.toISOString()
    };
  } catch (error) {
    logger.error(`Error creating share token: ${error.message}`);
    return null;
  }
}

/**
 * Get file by share token
 * @param {String} token - Share token
 * @returns {Promise<Object|null>} File or null if not found or expired
 */
async function getFileByShareToken(token) {
  try {
    const allFiles = (await dbService.getFiles({ showDeleted: false })).files;
    const file = allFiles.find(f => f.shareToken === token);
    
    if (!file) {
      return null;
    }
    
    // Check if share has expired
    if (file.shareExpiry) {
      const expiryDate = new Date(file.shareExpiry);
      if (expiryDate < new Date()) {
        return null;
      }
    }
    
    return file;
  } catch (error) {
    logger.error(`Error getting file by share token: ${error.message}`);
    return null;
  }
}

/**
 * Sync files from storage
 * @param {Array} storageFiles - Files from storage
 * @returns {Promise<Object>} Sync results
 */
async function syncFilesFromStorage(storageFiles) {
  try {
    const result = {
      added: 0,
      updated: 0,
      unchanged: 0,
      errors: 0
    };
    
    // Get existing files
    const existingFiles = (await dbService.getFiles({ showDeleted: true })).files;
    const updatedFiles = [...existingFiles];
    
    // Process each file from storage
    for (const storageFile of storageFiles) {
      try {
        // Skip if missing file_id
        if (!storageFile.file_id) {
          continue;
        }
        
        // Check if file already exists
        const existingIndex = updatedFiles.findIndex(file => 
          file.telegramFileId === storageFile.file_id || 
          file.telegramMessageId === storageFile.message_id
        );
        
        if (existingIndex === -1) {
          // Add new file
          const newFile = fileModel.createFileFromTelegram(storageFile);
          updatedFiles.push(newFile);
          result.added++;
          logger.info(`Sync: Added new file "${newFile.name}" (${formatSize(newFile.size)})`);
        } else {
          // Update existing file
          const file = updatedFiles[existingIndex];
          let changed = false;
          
          // Update important properties if available
          if (storageFile.file_size && file.size !== storageFile.file_size) {
            file.size = storageFile.file_size;
            changed = true;
          }
          
          if (storageFile.caption && file.caption !== storageFile.caption) {
            file.caption = storageFile.caption;
            changed = true;
          }
          
          // Ensure file_id is updated
          if (file.telegramFileId !== storageFile.file_id) {
            file.telegramFileId = storageFile.file_id;
            changed = true;
          }
          
          // Restore deleted files if found again
          if (file.isDeleted) {
            file.isDeleted = false;
            file.deletedAt = null;
            changed = true;
          }
          
          if (changed) {
            file.updatedAt = new Date().toISOString();
            file.syncDate = new Date().toISOString();
            result.updated++;
            logger.info(`Sync: Updated file "${file.name}"`);
          } else {
            result.unchanged++;
          }
        }
      } catch (error) {
        logger.error(`Error syncing file: ${error.message}`);
        result.errors++;
      }
    }
    
    // Save changes to database
    if (result.added > 0 || result.updated > 0) {
      await dbService.saveDb('files', updatedFiles);
    }
    
    // Update last sync time
    await dbService.updateLastSync();
    
    logger.info(`Sync completed: ${result.added} added, ${result.updated} updated, ${result.unchanged} unchanged, ${result.errors} errors`);
    
    return result;
  } catch (error) {
    logger.error(`Error syncing files: ${error.message}`);
    throw error;
  }
}

module.exports = {
  getFiles,
  getFileById,
  getTrashFiles,
  uploadFile,
  downloadFile,
  deleteFile,
  permanentlyDeleteFile,
  restoreFile,
  createShareToken,
  getFileByShareToken,
  syncFilesFromStorage
}; 