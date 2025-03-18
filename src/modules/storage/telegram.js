const fs = require('fs');
const path = require('path');
const { Telegraf } = require('telegraf');
const { config } = require('../common/config');
const logger = require('../common/logger');

// Initialize Telegram bot
const bot = new Telegraf(config.telegram.botToken);

// TelegramStorage class
class TelegramStorage {
  constructor() {
    this.bot = bot;
    this.chatId = config.telegram.chatId;
    
    // Ensure temp directory exists
    if (!fs.existsSync(config.paths.temp)) {
      fs.mkdirSync(config.paths.temp, { recursive: true });
    }
    
    // Ensure downloads directory exists
    if (!fs.existsSync(config.paths.downloads)) {
      fs.mkdirSync(config.paths.downloads, { recursive: true });
    }
  }
  
  /**
   * Upload a file to Telegram
   * @param {string} filePath - Path to the file to upload
   * @param {string} caption - Optional caption for the file
   * @returns {Promise<Object>} - Telegram message object
   */
  async uploadFile(filePath, caption = '') {
    try {
      const fileName = path.basename(filePath);
      
      // Check file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      
      logger.info(`Uploading file: ${fileName}`);
      
      // Get file stats
      const stats = fs.statSync(filePath);
      
      // Check file size
      if (stats.size > config.file.maxSize) {
        throw new Error(`File size exceeds the maximum allowed size of ${config.file.maxSize} bytes`);
      }
      
      // Determine the upload method based on file type
      let message;
      
      if (this.isImageFile(filePath)) {
        message = await this.bot.telegram.sendPhoto(this.chatId, {
          source: fs.createReadStream(filePath),
        }, {
          caption,
        });
      } else if (this.isVideoFile(filePath)) {
        message = await this.bot.telegram.sendVideo(this.chatId, {
          source: fs.createReadStream(filePath),
        }, {
          caption,
        });
      } else if (this.isAudioFile(filePath)) {
        message = await this.bot.telegram.sendAudio(this.chatId, {
          source: fs.createReadStream(filePath),
        }, {
          caption,
        });
      } else {
        message = await this.bot.telegram.sendDocument(this.chatId, {
          source: fs.createReadStream(filePath),
          filename: fileName,
        }, {
          caption,
        });
      }
      
      logger.info(`File uploaded successfully: ${fileName}`);
      
      // Determine file ID based on the message type
      let fileId;
      if (message.photo) {
        fileId = message.photo[message.photo.length - 1].file_id;
      } else if (message.document) {
        fileId = message.document.file_id;
      } else if (message.video) {
        fileId = message.video.file_id;
      } else if (message.audio) {
        fileId = message.audio.file_id;
      } else {
        throw new Error('Failed to get file ID from Telegram response');
      }
      
      // Return message info
      return {
        messageId: message.message_id,
        fileId,
        fileName,
        mimeType: this.getMimeType(filePath),
        size: stats.size,
        caption: message.caption || '',
      };
    } catch (error) {
      logger.error(`Error uploading file: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Download a file from Telegram
   * @param {string} fileId - Telegram file ID
   * @param {string} outputPath - Optional custom output path
   * @returns {Promise<string>} - Path to the downloaded file
   */
  async downloadFile(fileId, outputPath = null) {
    try {
      logger.info(`Downloading file with ID: ${fileId}`);
      
      // Get file link from Telegram
      const fileLink = await this.bot.telegram.getFileLink(fileId);
      
      // Determine output path
      const fileName = path.basename(fileLink.href);
      const filePath = outputPath || path.join(config.paths.downloads, fileName);
      
      // Ensure the directory exists
      const directory = path.dirname(filePath);
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }
      
      // Download the file
      const response = await fetch(fileLink.href);
      
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }
      
      const buffer = await response.arrayBuffer();
      fs.writeFileSync(filePath, Buffer.from(buffer));
      
      logger.info(`File downloaded successfully: ${filePath}`);
      
      return filePath;
    } catch (error) {
      logger.error(`Error downloading file: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Delete a file from Telegram
   * @param {string} messageId - Telegram message ID
   * @returns {Promise<boolean>} - Success status
   */
  async deleteFile(messageId) {
    try {
      logger.info(`Deleting message with ID: ${messageId}`);
      
      await this.bot.telegram.deleteMessage(this.chatId, messageId);
      
      logger.info(`Message deleted successfully: ${messageId}`);
      
      return true;
    } catch (error) {
      logger.error(`Error deleting message: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get file information from Telegram
   * @param {string} fileId - Telegram file ID
   * @returns {Promise<Object>} - File information
   */
  async getFileInfo(fileId) {
    try {
      logger.info(`Getting file info for ID: ${fileId}`);
      
      const fileInfo = await this.bot.telegram.getFile(fileId);
      
      return fileInfo;
    } catch (error) {
      logger.error(`Error getting file info: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Check if a file is an image
   * @param {string} filePath - Path to the file
   * @returns {boolean} - Is image file
   */
  isImageFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
  }
  
  /**
   * Check if a file is a video
   * @param {string} filePath - Path to the file
   * @returns {boolean} - Is video file
   */
  isVideoFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return ['.mp4', '.mov', '.avi', '.mkv', '.webm'].includes(ext);
  }
  
  /**
   * Check if a file is an audio
   * @param {string} filePath - Path to the file
   * @returns {boolean} - Is audio file
   */
  isAudioFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return ['.mp3', '.wav', '.ogg', '.m4a', '.flac'].includes(ext);
  }
  
  /**
   * Get the MIME type of a file
   * @param {string} filePath - Path to the file
   * @returns {string} - MIME type
   */
  getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.mkv': 'video/x-matroska',
      '.webm': 'video/webm',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.m4a': 'audio/m4a',
      '.flac': 'audio/flac',
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
      '.tar': 'application/x-tar',
      '.gz': 'application/gzip',
      '.txt': 'text/plain',
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.xml': 'application/xml',
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
  }
}

module.exports = new TelegramStorage(); 