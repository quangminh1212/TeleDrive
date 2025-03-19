const fs = require('fs');
const path = require('path');
const { Telegraf } = require('telegraf');
const fetch = require('node-fetch');
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
      
      // Get file stats
      const stats = fs.statSync(filePath);
      
      logger.info(`Đang chuẩn bị tải lên file: ${fileName} (Kích thước: ${stats.size} bytes)`);
      
      // Check file size against config limit
      if (stats.size > config.file.maxSize) {
        throw new Error(`Kích thước file (${Math.round(stats.size/1024/1024)}MB) vượt quá giới hạn cho phép (${Math.round(config.file.maxSize/1024/1024)}MB)`);
      }
      
      // Thêm retry logic
      let retries = 3;
      let message;
      let lastError;
      
      while (retries > 0) {
        try {
          logger.info(`Đang thử tải lên file (lần thử ${4-retries}/3): ${fileName}`);
          
          // Tạo stream để tải lên file, với timeout
          const createUploadStream = () => {
            const stream = fs.createReadStream(filePath);
            
            // Xử lý lỗi stream
            stream.on('error', (err) => {
              logger.error(`Stream error: ${err.message}`);
              // Không ném lỗi ở đây vì chúng ta đã xử lý lỗi ở catch block
            });
            
            return stream;
          };
          
          // Determine the upload method based on file type
          if (this.isImageFile(filePath)) {
            logger.info(`Tải lên dưới dạng hình ảnh: ${fileName}`);
            // Đặt timeout cho request
            const uploadPromise = this.bot.telegram.sendPhoto(this.chatId, {
              source: createUploadStream(),
            }, {
              caption,
              disable_notification: true
            });
            
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Upload timeout')), 300000) // 5 phút timeout
            );
            
            message = await Promise.race([uploadPromise, timeoutPromise]);
          } else if (this.isVideoFile(filePath)) {
            logger.info(`Tải lên dưới dạng video: ${fileName}`);
            const uploadPromise = this.bot.telegram.sendVideo(this.chatId, {
              source: createUploadStream(),
            }, {
              caption,
              disable_notification: true
            });
            
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Upload timeout')), 600000) // 10 phút timeout
            );
            
            message = await Promise.race([uploadPromise, timeoutPromise]);
          } else if (this.isAudioFile(filePath)) {
            logger.info(`Tải lên dưới dạng audio: ${fileName}`);
            const uploadPromise = this.bot.telegram.sendAudio(this.chatId, {
              source: createUploadStream(),
            }, {
              caption,
              disable_notification: true
            });
            
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Upload timeout')), 300000) // 5 phút timeout
            );
            
            message = await Promise.race([uploadPromise, timeoutPromise]);
          } else {
            logger.info(`Tải lên dưới dạng document: ${fileName}`);
            const uploadPromise = this.bot.telegram.sendDocument(
              this.chatId,
              { source: createUploadStream(), filename: fileName },
              { 
                caption,
                disable_notification: true
              }
            );
            
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Upload timeout')), 600000) // 10 phút timeout
            );
            
            message = await Promise.race([uploadPromise, timeoutPromise]);
          }
          
          // Nếu có message, tải lên thành công
          if (message) {
            logger.info(`Tải lên thành công: ${fileName}`);
            break;
          }
        } catch (uploadError) {
          lastError = uploadError;
          retries--;
          
          // Ghi log chi tiết lỗi
          logger.error(`Lỗi khi tải lên file (còn ${retries} lần thử): ${uploadError.message}`);
          if (uploadError.response) {
            logger.error(`Response code: ${uploadError.response.status}, Message: ${uploadError.response.statusText}`);
          }
          
          if (uploadError.message.includes('413') || uploadError.message.includes('Too Large')) {
            logger.error(`File quá lớn cho Bot API. Vui lòng chia nhỏ file hoặc cấu hình TDLib.`);
            break; // Không retry nếu lỗi kích thước
          }
          
          if (uploadError.message.includes('429') || uploadError.message.includes('Too Many Requests')) {
            // Nếu bị rate limit, chờ lâu hơn
            const waitTime = 10000 * (4 - retries); // 10s, 20s, 30s
            logger.warn(`Bị giới hạn tần suất, đợi ${waitTime/1000}s trước khi thử lại...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          } else {
            // Đợi thời gian thông thường
            const waitTime = 3000; // 3 giây
            if (retries > 0) {
              logger.info(`Đợi ${waitTime/1000}s trước khi thử lại...`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
            }
          }
        }
      }
      
      if (!message) {
        throw lastError || new Error('Không thể tải lên file sau nhiều lần thử');
      }
      
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
        throw new Error('Không thể lấy file ID từ phản hồi của Telegram');
      }
      
      logger.info(`File đã được tải lên thành công: ${fileName} (ID: ${fileId})`);
      
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
      logger.error(`Lỗi tải lên file: ${error.message}`);
      
      // Thêm thông tin chi tiết lỗi
      if (error.code) {
        logger.error(`Mã lỗi: ${error.code}`);
      }
      
      if (error.response) {
        logger.error(`Phản hồi API: ${JSON.stringify(error.response)}`);
      }
      
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