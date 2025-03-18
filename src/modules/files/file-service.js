const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { promisify } = require('util');
const telegramStorage = require('../storage/telegram');
const File = require('../db/models/File');
const User = require('../db/models/User');
const logger = require('../common/logger');
const { config } = require('../common/config');

// Promisify fs functions
const unlinkAsync = promisify(fs.unlink);
const statAsync = promisify(fs.stat);

/**
 * FileService class to handle file operations
 */
class FileService {
  /**
   * Upload a file to Telegram
   * @param {Object} fileData - File data from multer
   * @param {Object} user - User object
   * @returns {Promise<Object>} - Uploaded file data
   */
  async uploadFile(fileData, user) {
    try {
      logger.info(`Uploading file: ${fileData.originalname} for user: ${user.firstName} (${user.telegramId})`);
      
      // Check if user has enough storage
      if (!user.hasEnoughStorage(fileData.size)) {
        throw new Error('Không đủ dung lượng lưu trữ. Vui lòng xóa bớt file hoặc nâng cấp tài khoản.');
      }
      
      // Upload file to Telegram
      const telegramFile = await telegramStorage.uploadFile(
        fileData.path,
        `Uploaded by: ${user.firstName} (${user.telegramId})`
      );
      
      // Create file record in database
      const file = await File.create({
        name: fileData.originalname,
        telegramFileId: telegramFile.fileId,
        telegramMessageId: telegramFile.messageId,
        mimeType: fileData.mimetype,
        size: fileData.size,
        createdBy: user._id,
      });
      
      // Update user storage usage
      await user.addStorageUsed(fileData.size);
      
      // Delete temporary file
      try {
        await unlinkAsync(fileData.path);
      } catch (error) {
        logger.warn(`Failed to delete temporary file: ${fileData.path}`);
      }
      
      logger.info(`File uploaded successfully: ${file._id}`);
      
      return file;
    } catch (error) {
      // Delete temporary file if it exists
      if (fileData.path && fs.existsSync(fileData.path)) {
        try {
          await unlinkAsync(fileData.path);
        } catch (unlinkError) {
          logger.warn(`Failed to delete temporary file after error: ${fileData.path}`);
        }
      }
      
      logger.error(`Error uploading file: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Download a file from Telegram
   * @param {string} fileId - File ID in database
   * @param {Object} user - User object
   * @returns {Promise<string>} - Path to downloaded file
   */
  async downloadFile(fileId, user) {
    try {
      logger.info(`Downloading file: ${fileId} for user: ${user.firstName} (${user.telegramId})`);
      
      // Find file in database
      const file = await File.findById(fileId);
      
      if (!file) {
        throw new Error('File không tồn tại');
      }
      
      // Check if file is deleted
      if (file.isDeleted) {
        throw new Error('File đã bị xóa');
      }
      
      // Check if user has access to file (owner or public file)
      if (!file.isPublic && file.createdBy.toString() !== user._id.toString()) {
        throw new Error('Bạn không có quyền truy cập file này');
      }
      
      // Create user-specific download folder
      const userDownloadDir = path.join(config.paths.downloads, user._id.toString());
      if (!fs.existsSync(userDownloadDir)) {
        fs.mkdirSync(userDownloadDir, { recursive: true });
      }
      
      // Download file from Telegram
      const outputPath = path.join(userDownloadDir, file.name);
      const filePath = await telegramStorage.downloadFile(file.telegramFileId, outputPath);
      
      logger.info(`File downloaded successfully: ${filePath}`);
      
      return filePath;
    } catch (error) {
      logger.error(`Error downloading file: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Delete a file
   * @param {string} fileId - File ID in database
   * @param {Object} user - User object
   * @param {boolean} permanent - Whether to permanently delete the file
   * @returns {Promise<Object>} - Deleted file data
   */
  async deleteFile(fileId, user, permanent = false) {
    try {
      logger.info(`Deleting file: ${fileId} for user: ${user.firstName} (${user.telegramId}), permanent: ${permanent}`);
      
      // Find file in database
      const file = await File.findById(fileId);
      
      if (!file) {
        throw new Error('File không tồn tại');
      }
      
      // Check if user has access to file
      if (file.createdBy.toString() !== user._id.toString()) {
        throw new Error('Bạn không có quyền xóa file này');
      }
      
      if (permanent) {
        // Permanently delete file from Telegram
        await telegramStorage.deleteFile(file.telegramMessageId);
        
        // Remove file from database
        await file.deleteOne();
        
        // Update user storage usage
        await user.subtractStorageUsed(file.size);
        
        logger.info(`File permanently deleted: ${fileId}`);
      } else {
        // Soft delete file (move to trash)
        await file.softDelete();
        
        logger.info(`File moved to trash: ${fileId}`);
      }
      
      return file;
    } catch (error) {
      logger.error(`Error deleting file: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Restore a file from trash
   * @param {string} fileId - File ID in database
   * @param {Object} user - User object
   * @returns {Promise<Object>} - Restored file data
   */
  async restoreFile(fileId, user) {
    try {
      logger.info(`Restoring file: ${fileId} for user: ${user.firstName} (${user.telegramId})`);
      
      // Find file in database
      const file = await File.findById(fileId);
      
      if (!file) {
        throw new Error('File không tồn tại');
      }
      
      // Check if file is in trash
      if (!file.isDeleted) {
        throw new Error('File không ở trong thùng rác');
      }
      
      // Check if user has access to file
      if (file.createdBy.toString() !== user._id.toString()) {
        throw new Error('Bạn không có quyền khôi phục file này');
      }
      
      // Restore file
      await file.restore();
      
      logger.info(`File restored: ${fileId}`);
      
      return file;
    } catch (error) {
      logger.error(`Error restoring file: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get file info
   * @param {string} fileId - File ID in database
   * @param {Object} user - User object
   * @returns {Promise<Object>} - File data
   */
  async getFileInfo(fileId, user) {
    try {
      logger.info(`Getting file info: ${fileId} for user: ${user.firstName} (${user.telegramId})`);
      
      // Find file in database
      const file = await File.findById(fileId);
      
      if (!file) {
        throw new Error('File không tồn tại');
      }
      
      // Check if user has access to file (owner or public file)
      if (!file.isPublic && file.createdBy.toString() !== user._id.toString()) {
        throw new Error('Bạn không có quyền truy cập file này');
      }
      
      logger.info(`File info retrieved: ${fileId}`);
      
      return file;
    } catch (error) {
      logger.error(`Error getting file info: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * List files for a user
   * @param {Object} user - User object
   * @param {Object} options - List options (page, limit, sortBy, sortOrder, search, tag)
   * @returns {Promise<Object>} - List of files and pagination data
   */
  async listFiles(user, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        search = '',
        tag = '',
        deleted = false,
      } = options;
      
      logger.info(`Listing files for user: ${user.firstName} (${user.telegramId}), page: ${page}, limit: ${limit}`);
      
      // Create base query
      let query = {
        createdBy: user._id,
        isDeleted: deleted === true,
      };
      
      // Add search filter if provided
      if (search) {
        query.$text = { $search: search };
      }
      
      // Add tag filter if provided
      if (tag) {
        query.tags = tag;
      }
      
      // Create sort object
      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
      
      // If searching, add text score to sort
      if (search) {
        sort.score = { $meta: 'textScore' };
      }
      
      // Calculate pagination
      const skip = (page - 1) * limit;
      
      // Get total count
      const total = await File.countDocuments(query);
      
      // Get files
      let files;
      if (search) {
        files = await File.find(
          query,
          { score: { $meta: 'textScore' } }
        )
          .sort(sort)
          .skip(skip)
          .limit(limit);
      } else {
        files = await File.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit);
      }
      
      // Calculate pagination data
      const totalPages = Math.ceil(total / limit);
      const hasNext = page < totalPages;
      const hasPrev = page > 1;
      
      logger.info(`Listed ${files.length} files for user`);
      
      return {
        files,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext,
          hasPrev,
        },
      };
    } catch (error) {
      logger.error(`Error listing files: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Share a file
   * @param {string} fileId - File ID in database
   * @param {Object} user - User object
   * @param {number} expiresInHours - Number of hours until the share link expires (0 for no expiration)
   * @returns {Promise<Object>} - File with share link
   */
  async shareFile(fileId, user, expiresInHours = 24) {
    try {
      logger.info(`Sharing file: ${fileId} for user: ${user.firstName} (${user.telegramId})`);
      
      // Find file in database
      const file = await File.findById(fileId);
      
      if (!file) {
        throw new Error('File không tồn tại');
      }
      
      // Check if file is deleted
      if (file.isDeleted) {
        throw new Error('File đã bị xóa');
      }
      
      // Check if user has access to file
      if (file.createdBy.toString() !== user._id.toString()) {
        throw new Error('Bạn không có quyền chia sẻ file này');
      }
      
      // Generate share link
      await file.generateShareLink(expiresInHours);
      
      logger.info(`File shared: ${fileId}, share link: ${file.shareLink}`);
      
      return file;
    } catch (error) {
      logger.error(`Error sharing file: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get file by share link
   * @param {string} shareLink - Share link token
   * @returns {Promise<Object>} - File data
   */
  async getFileByShareLink(shareLink) {
    try {
      logger.info(`Getting file by share link: ${shareLink}`);
      
      // Find file in database
      const file = await File.findOne({ shareLink });
      
      if (!file) {
        throw new Error('Đường dẫn chia sẻ không hợp lệ');
      }
      
      // Check if file is deleted
      if (file.isDeleted) {
        throw new Error('File đã bị xóa');
      }
      
      // Check if share link is expired
      if (file.isShareExpired()) {
        throw new Error('Đường dẫn chia sẻ đã hết hạn');
      }
      
      logger.info(`File retrieved by share link: ${file._id}`);
      
      return file;
    } catch (error) {
      logger.error(`Error getting file by share link: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Update file metadata
   * @param {string} fileId - File ID in database
   * @param {Object} user - User object
   * @param {Object} metadata - File metadata to update
   * @returns {Promise<Object>} - Updated file data
   */
  async updateFileMetadata(fileId, user, metadata) {
    try {
      logger.info(`Updating file metadata: ${fileId} for user: ${user.firstName} (${user.telegramId})`);
      
      // Find file in database
      const file = await File.findById(fileId);
      
      if (!file) {
        throw new Error('File không tồn tại');
      }
      
      // Check if file is deleted
      if (file.isDeleted) {
        throw new Error('File đã bị xóa');
      }
      
      // Check if user has access to file
      if (file.createdBy.toString() !== user._id.toString()) {
        throw new Error('Bạn không có quyền cập nhật file này');
      }
      
      // Update fields
      if (metadata.name) file.name = metadata.name;
      if (metadata.description !== undefined) file.description = metadata.description;
      if (metadata.isPublic !== undefined) file.isPublic = metadata.isPublic;
      if (metadata.tags !== undefined) file.tags = metadata.tags;
      
      // Save changes
      await file.save();
      
      logger.info(`File metadata updated: ${fileId}`);
      
      return file;
    } catch (error) {
      logger.error(`Error updating file metadata: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new FileService(); 