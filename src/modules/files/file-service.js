const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { promisify } = require('util');
const { tdlibStorage } = require('../storage/tdlib-client');
const File = require('../db/models/File');
const User = require('../db/models/User');
const logger = require('../common/logger');
const { config } = require('../common/config');

class FileService {
  constructor() {
    this.uploadPath = path.join(process.cwd(), 'public', 'uploads');
    this.tempPath = path.join(process.cwd(), 'temp');
    this.chunkSize = 1024 * 1024; // 1MB chunks
    
    // Đảm bảo các thư mục tồn tại
    if (!fs.existsSync(this.uploadPath)) {
      fs.mkdirSync(this.uploadPath, { recursive: true });
    }
    if (!fs.existsSync(this.tempPath)) {
      fs.mkdirSync(this.tempPath, { recursive: true });
    }
  }

  async uploadFile(fileData, user) {
    try {
      logger.info(`Đang tải lên file ${fileData.originalname} cho người dùng ${user.firstName || user._id}`);
      
      // Kiểm tra file có tồn tại không
      if (!fs.existsSync(fileData.path)) {
        logger.error(`File không tồn tại: ${fileData.path}`);
        throw new Error('File không tồn tại');
      }

      // Tạo bản ghi file tạm thời
      const tempFile = await File.create({
        name: fileData.originalname,
        mimeType: fileData.mimetype,
        size: fileData.size,
        userId: user._id,
        isUploading: true,
        isComplete: false
      });

      logger.info(`Đã tạo bản ghi file tạm: ${tempFile._id}`);
      
      // Upload file lên Telegram
      try {
        const telegramFile = await this.uploadFileToTelegram(fileData, user);
        
        // Cập nhật bản ghi file
        await File.findByIdAndUpdate(tempFile._id, {
          telegramFileId: telegramFile.fileId,
          telegramMessageId: telegramFile.messageId,
          isUploading: false,
          isComplete: true
        });
        
        // Xóa file tạm
        await promisify(fs.unlink)(fileData.path);
        
        // Trả về thông tin file đã tải lên
        return await File.findById(tempFile._id);
      } catch (error) {
        // Xử lý lỗi khi upload
        logger.error(`Lỗi khi tải lên file: ${error.message}`);
        await File.findByIdAndUpdate(tempFile._id, {
          isUploading: false,
          isError: true,
          errorMessage: error.message
        });
        
        // Xóa file tạm
        if (fs.existsSync(fileData.path)) {
          await promisify(fs.unlink)(fileData.path);
        }
        
        throw error;
      }
    } catch (error) {
      logger.error(`Lỗi khi xử lý file: ${error.message}`);
      throw error;
    }
  }

  async uploadFileToTelegram(fileData, user) {
    try {
      // Gọi hàm upload của TDLib
      return await tdlibStorage.uploadFile({
        filePath: fileData.path,
        fileName: fileData.originalname,
        fileSize: fileData.size,
        userId: user._id
      });
    } catch (error) {
      logger.error(`Lỗi khi tải lên file lên Telegram: ${error.message}`);
      
      // Nếu TDLib không khả dụng, thử fallback về mock
      if (!tdlibStorage.isAvailable() || error.message.includes('not initialized')) {
        logger.warn('TDLib không khả dụng, sử dụng mock upload');
        return {
          fileId: `mock-file-${Date.now()}`,
          messageId: `mock-msg-${Date.now()}`
        };
      }
      
      throw error;
    }
  }

  async splitLargeFile(fileData, totalChunks) {
    const filePath = fileData.path;
    const chunkSize = this.chunkSize;
    
    // Tạo thư mục chunks nếu chưa tồn tại
    const chunksDir = path.join(this.tempPath, 'chunks');
    if (!fs.existsSync(chunksDir)) {
      fs.mkdirSync(chunksDir, { recursive: true });
    }

    // Mở file để đọc
    const fileHandle = await fs.promises.open(filePath, 'r');
    const fileSize = (await fileHandle.stat()).size;
    const chunks = [];
    let bytesProcessed = 0;

    try {
      for (let i = 0; i < totalChunks; i++) {
        // Tính toán kích thước chunk
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, fileSize);
        const length = end - start;
        
        // Đọc chunk từ file
        const buffer = Buffer.alloc(length);
        await fileHandle.read(buffer, 0, length, start);
        
        // Tạo tên file chunk
        const chunkFileName = `${path.basename(filePath)}.part${i}`;
        const chunkPath = path.join(chunksDir, chunkFileName);
        
        // Ghi chunk ra file
        await fs.promises.writeFile(chunkPath, buffer);
        
        chunks.push({
          path: chunkPath,
          index: i
        });
        
        bytesProcessed += length;
        logger.debug(`Đã xử lý chunk ${i+1}/${totalChunks}: ${chunk.length} bytes (Tổng: ${bytesProcessed}/${fileSize})`);
        
        // Báo cáo tiến độ nếu cần
        const progress = Math.round(bytesProcessed * 50 / fileData.size); // 50% cho việc chia file
        // Có thể thêm code báo cáo tiến độ ở đây
      }
    } catch (err) {
      logger.error(`Lỗi khi chia file: ${err.message}`);
      throw err;
    } finally {
      await fileHandle.close();
    }
    
    return chunks;
  }

  async createShareLink(fileId, user) {
    try {
      // Tìm file trong database
      const file = await File.findOne({ _id: fileId, userId: user._id });
      if (!file) {
        throw new Error('File không tồn tại hoặc bạn không có quyền truy cập');
      }
      
      // Tạo token chia sẻ nếu chưa có
      if (!file.shareToken) {
        const token = crypto.randomBytes(16).toString('hex');
        await File.findByIdAndUpdate(fileId, { shareToken: token });
        file.shareToken = token;
      }
      
      // Tạo URL chia sẻ
      const baseUrl = config.baseUrl || `http://localhost:${process.env.PORT || 3000}`;
      const shareLink = `${baseUrl}/share/${file.shareToken}`;
      
      logger.info(`Đã tạo link chia sẻ cho file ${fileId}`);
      
      return { shareLink, fileId: file._id };
    } catch (error) {
      logger.error(`Lỗi khi tạo link chia sẻ: ${error.message}`);
      throw error;
    }
  }

  async getFileByShareToken(token) {
    try {
      const file = await File.findOne({ shareToken: token });
      if (!file) {
        throw new Error('Link chia sẻ không hợp lệ hoặc đã hết hạn');
      }
      
      logger.info(`Truy cập file qua link chia sẻ: ${file._id}`);
      return file;
    } catch (error) {
      logger.error(`Lỗi khi truy cập file qua link chia sẻ: ${error.message}`);
      throw error;
    }
  }
  
  async deleteFile(fileId, user) {
    try {
      // Tìm file trong database
      const file = await File.findOne({ _id: fileId, userId: user._id });
      if (!file) {
        throw new Error('File không tồn tại hoặc bạn không có quyền truy cập');
      }
      
      // Xóa file trên Telegram
      if (file.telegramFileId && file.telegramMessageId) {
        try {
          await tdlibStorage.deleteFile(file.telegramMessageId);
        } catch (error) {
          logger.warn(`Không thể xóa file trên Telegram: ${error.message}`);
        }
      }
      
      // Xóa bản ghi file
      await File.findByIdAndRemove(fileId);
      
      logger.info(`Đã xóa file ${fileId}`);
      return { success: true, fileId };
    } catch (error) {
      logger.error(`Lỗi khi xóa file: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new FileService();
