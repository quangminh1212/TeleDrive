const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { promisify } = require('util');
const { tdlibStorage } = require('../storage/tdlib-client');
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
      logger.info(`Chuẩn bị tải lên file: ${fileData.originalname} cho người dùng: ${user.firstName} (${user.telegramId || user._id})`);
      
      // Kiểm tra file
      if (!fileData || !fileData.path || !fileData.size) {
        throw new Error('Dữ liệu file không hợp lệ hoặc bị thiếu');
      }
      
      // Kiểm tra nếu file có tồn tại
      if (!fs.existsSync(fileData.path)) {
        throw new Error(`File không tồn tại: ${fileData.path}`);
      }
      
      // Kiểm tra lại kích thước file từ hệ thống
      try {
        const stats = await statAsync(fileData.path);
        if (stats.size !== fileData.size) {
          logger.warn(`Kích thước file không khớp: ${fileData.size} (reported) vs ${stats.size} (actual)`);
          fileData.size = stats.size; // Cập nhật kích thước chính xác
        }
      } catch (statError) {
        logger.error(`Lỗi khi kiểm tra kích thước file: ${statError.message}`);
        throw new Error(`Không thể đọc file: ${statError.message}`);
      }
      
      // Check if user has enough storage
      if (!user.hasEnoughStorage(fileData.size)) {
        throw new Error('Không đủ dung lượng lưu trữ. Vui lòng xóa bớt file hoặc nâng cấp tài khoản.');
      }

      // Xử lý tải lên file lớn (split file nếu cần)
      if (fileData.size > 50 * 1024 * 1024) { // Nếu file lớn hơn 50MB
        return await this.handleLargeFileUpload(fileData, user);
      }
      
      // Tạo bản ghi tạm thời trong cơ sở dữ liệu
      const tempFile = await File.create({
        name: fileData.originalname,
        mimeType: fileData.mimetype,
        size: fileData.size,
        createdBy: user._id,
        isUploading: true
      });
      
      logger.info(`Đã tạo bản ghi tạm thời cho file: ${tempFile._id}`);
      
      try {
        // Upload file sử dụng TDLib
        const telegramFile = await tdlibStorage.uploadFile(
          fileData.path,
          `Uploaded by: ${user.firstName} (${user.telegramId || user._id})`
        );
        
        // Cập nhật bản ghi với thông tin từ Telegram
        const file = await File.findByIdAndUpdate(
          tempFile._id,
          {
            telegramFileId: telegramFile.fileId,
            telegramMessageId: telegramFile.messageId,
            isUploading: false
          },
          { new: true }
        );
        
        // Update user storage usage
        await user.addStorageUsed(fileData.size);
        
        // Delete temporary file
        try {
          await unlinkAsync(fileData.path);
          logger.info(`Đã xóa file tạm: ${fileData.path}`);
        } catch (error) {
          logger.warn(`Failed to delete temporary file: ${fileData.path}`);
        }
        
        logger.info(`File uploaded successfully: ${file._id}`);
        
        return file;
      } catch (uploadError) {
        // Nếu upload thất bại, xóa bản ghi tạm
        await File.findByIdAndRemove(tempFile._id);
        throw uploadError; // Re-throw để xử lý ở mức cao hơn
      }
    } catch (error) {
      // Delete temporary file if it exists
      if (fileData && fileData.path && fs.existsSync(fileData.path)) {
        try {
          await unlinkAsync(fileData.path);
          logger.info(`Đã xóa file tạm sau khi xảy ra lỗi: ${fileData.path}`);
        } catch (unlinkError) {
          logger.warn(`Failed to delete temporary file after error: ${fileData.path}`);
        }
      }
      
      logger.error(`Error uploading file: ${error.message}`);
      logger.error(`Stack trace: ${error.stack}`);
      throw error;
    }
  }
  
  /**
   * Xử lý tải lên file lớn bằng cách chia thành nhiều phần
   * @param {Object} fileData - File data from multer
   * @param {Object} user - User object
   * @returns {Promise<Object>} - Uploaded file data
   */
  async handleLargeFileUpload(fileData, user) {
    // Giảm kích thước chunk từ 20MB xuống 10MB để tránh lỗi khi tải lên
    const chunkSize = 10 * 1024 * 1024; // 10MB mỗi phần
    const totalChunks = Math.ceil(fileData.size / chunkSize);
    const tempFolder = path.join(config.paths.temp, 'chunks', crypto.randomBytes(8).toString('hex'));
    const chunks = [];
    let telegramMessages = [];
    
    logger.info(`Chia file lớn thành ${totalChunks} phần, mỗi phần ${chunkSize / (1024 * 1024)}MB`);
    
    try {
      // Tạo thư mục tạm cho các phần
      if (!fs.existsSync(tempFolder)) {
        fs.mkdirSync(tempFolder, { recursive: true });
      }
      
      // Tạo bản ghi chính cho file
      const parentFile = await File.create({
        name: fileData.originalname,
        mimeType: fileData.mimetype,
        size: fileData.size,
        createdBy: user._id,
        isUploading: true,
        isMultipart: true,
        totalParts: totalChunks,
        uploadedParts: 0
      });
      
      // Sử dụng phương pháp chia file an toàn hơn với stream
      logger.info('Bắt đầu chia file thành các phần nhỏ...');
      
      const fileStream = fs.createReadStream(fileData.path, {
        highWaterMark: chunkSize  // Đọc theo từng chunk có kích thước cụ thể
      });
      
      let chunkIndex = 0;
      let bytesProcessed = 0;
      
      // Tạo thư mục tạm cho các phần nếu chưa tồn tại
      if (!fs.existsSync(tempFolder)) {
        fs.mkdirSync(tempFolder, { recursive: true });
      }
      
      // Xử lý từng chunk dữ liệu
      for await (const chunk of fileStream) {
        // Lưu chunk vào file tạm
        const chunkPath = path.join(tempFolder, `chunk_${chunkIndex}.bin`);
        fs.writeFileSync(chunkPath, chunk);
        chunks.push(chunkPath);
        
        bytesProcessed += chunk.length;
        
        logger.info(`Đã tạo phần ${chunkIndex + 1}/${totalChunks}, kích thước: ${chunk.length} bytes (Tổng: ${bytesProcessed}/${fileData.size} bytes)`);
        
        // Cập nhật tiến độ xử lý
        await File.findByIdAndUpdate(
          parentFile._id,
          { 
            uploadProgress: Math.round(bytesProcessed * 50 / fileData.size) // 50% cho việc chia file
          }
        );
        
        chunkIndex++;
      }
      
      logger.info(`Đã hoàn thành việc chia file thành ${chunks.length} phần`);
      
      // Tải lên từng phần lên Telegram sử dụng TDLib
      for (let i = 0; i < chunks.length; i++) {
        try {
          const chunkPath = chunks[i];
          const caption = `Part ${i + 1}/${chunks.length} of ${fileData.originalname} (${user.telegramId || user._id})`;
          
          logger.info(`Đang tải lên phần ${i + 1}/${chunks.length} - ${chunkPath}`);
          
          // Upload với tối đa 5 lần thử lại
          let retries = 5;
          let telegramFile;
          let lastError;
          
          while (retries > 0 && !telegramFile) {
            try {
              telegramFile = await tdlibStorage.uploadFile(chunkPath, caption);
            } catch (err) {
              lastError = err;
              retries--;
              logger.warn(`Lỗi khi tải lên phần ${i + 1}, còn ${retries} lần thử lại: ${err.message}`);
              
              if (retries > 0) {
                // Tăng thời gian chờ giữa các lần thử
                const waitTime = 5000 * (6 - retries); // 5s, 10s, 15s, 20s, 25s
                logger.info(`Đợi ${waitTime/1000}s trước khi thử lại...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
              }
            }
          }
          
          if (!telegramFile) {
            throw lastError || new Error(`Không thể tải lên phần ${i + 1} sau nhiều lần thử`);
          }
          
          telegramMessages.push({
            index: i,
            messageId: telegramFile.messageId,
            fileId: telegramFile.fileId
          });
          
          // Cập nhật tiến độ - 50% cho việc chia file, 50% cho việc tải lên
          await File.findByIdAndUpdate(
            parentFile._id,
            { 
              $inc: { uploadedParts: 1 },
              $set: { uploadProgress: 50 + Math.round((i + 1) * 50 / chunks.length) }
            }
          );
          
          logger.info(`Đã tải lên phần ${i + 1}/${chunks.length} thành công`);
          
          // Thêm thời gian nghỉ giữa các lần tải lên để tránh bị giới hạn tần suất
          if (i < chunks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } catch (error) {
          logger.error(`Lỗi tải lên phần ${i + 1}/${chunks.length}: ${error.message}`);
          
          // Xóa các tin nhắn đã tải lên nếu có lỗi
          for (const message of telegramMessages) {
            try {
              await tdlibStorage.deleteFile(message.messageId);
              logger.info(`Đã xóa phần đã tải lên trước đó (messageId: ${message.messageId})`);
            } catch (deleteError) {
              logger.warn(`Không thể xóa phần đã tải lên: ${deleteError.message}`);
            }
          }
          
          // Cập nhật trạng thái file
          await File.findByIdAndUpdate(
            parentFile._id,
            { isUploading: false, error: error.message }
          );
          
          throw new Error(`Lỗi khi tải lên phần ${i + 1}/${chunks.length}: ${error.message}`);
        }
      }
      
      // Sắp xếp các tin nhắn theo thứ tự đúng
      telegramMessages.sort((a, b) => a.index - b.index);
      
      // Lưu danh sách file ID và message ID vào cơ sở dữ liệu
      const fileIds = telegramMessages.map(message => message.fileId);
      const messageIds = telegramMessages.map(message => message.messageId);
      
      const updatedFile = await File.findByIdAndUpdate(
        parentFile._id,
        { 
          isUploading: false,
          uploadedParts: chunks.length,
          uploadProgress: 100,
          telegramFileIds: fileIds,
          telegramMessageIds: messageIds
        },
        { new: true }
      );
      
      // Cập nhật dung lượng đã sử dụng
      await user.addStorageUsed(fileData.size);
      
      // Xóa file tạm và thư mục tạm
      try {
        // Xóa file gốc
        if (fs.existsSync(fileData.path)) {
          await unlinkAsync(fileData.path);
          logger.info(`Đã xóa file gốc: ${fileData.path}`);
        }
        
        // Xóa các phần
        for (const chunkPath of chunks) {
          if (fs.existsSync(chunkPath)) {
            await unlinkAsync(chunkPath);
            logger.info(`Đã xóa phần: ${chunkPath}`);
          }
        }
        
        // Xóa thư mục tạm
        if (fs.existsSync(tempFolder)) {
          fs.rmdirSync(tempFolder);
          logger.info(`Đã xóa thư mục tạm: ${tempFolder}`);
        }
      } catch (error) {
        logger.warn(`Lỗi khi xóa file tạm: ${error.message}`);
      }
      
      logger.info(`Tải lên file đa phần thành công: ${updatedFile._id}`);
      
      return updatedFile;
    } catch (error) {
      logger.error(`Lỗi khi xử lý file lớn: ${error.message}`);
      
      // Xóa file tạm và thư mục tạm
      try {
        // Xóa các phần
        for (const chunkPath of chunks) {
          if (fs.existsSync(chunkPath)) {
            await unlinkAsync(chunkPath);
          }
        }
        
        // Xóa thư mục tạm
        if (fs.existsSync(tempFolder)) {
          fs.rmdirSync(tempFolder);
        }
        
        // Xóa file gốc
        if (fs.existsSync(fileData.path)) {
          await unlinkAsync(fileData.path);
        }
      } catch (cleanupError) {
        logger.warn(`Lỗi khi dọn dẹp file tạm: ${cleanupError.message}`);
      }
      
      throw error;
    }
  }
  
  /**
   * Tải xuống file từ Telegram
   * @param {string} fileId - ID của file
   * @param {Object} user - User object
   * @returns {Promise<string>} - Path to downloaded file
   */
  async downloadFile(fileId, user) {
    try {
      logger.info(`Downloading file: ${fileId} for user: ${user.firstName} (${user.telegramId || user._id})`);
      
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
      
      // Kiểm tra xem file có phải là file đa phần không
      if (file.isMultipart && file.telegramFileIds && file.telegramFileIds.length > 0) {
        return await this.downloadMultipartFile(file, user);
      }
      
      // Create user-specific download folder
      const userDownloadDir = path.join(config.paths.downloads, user._id.toString());
      if (!fs.existsSync(userDownloadDir)) {
        fs.mkdirSync(userDownloadDir, { recursive: true });
      }
      
      // Xác định output path
      const outputPath = path.join(userDownloadDir, file.name);
      
      // Download file using TDLib
      const filePath = await tdlibStorage.downloadFile(file.telegramFileId, outputPath);
      
      logger.info(`File downloaded successfully: ${filePath}`);
      
      // Cập nhật thống kê tải xuống
      await File.findByIdAndUpdate(fileId, {
        lastDownloadedAt: new Date(),
        $inc: { downloadCount: 1 }
      });
      
      return filePath;
    } catch (error) {
      logger.error(`Error downloading file: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Tải xuống file đa phần từ Telegram và ghép lại
   * @param {Object} file - Thông tin file từ cơ sở dữ liệu
   * @param {Object} user - User object
   * @returns {Promise<string>} - Path to merged file
   */
  async downloadMultipartFile(file, user) {
    logger.info(`Tải xuống file đa phần: ${file._id} (${file.name})`);
    
    // Tạo thư mục tạm để lưu các phần
    const tempDir = path.join(config.paths.temp, 'downloads', crypto.randomBytes(8).toString('hex'));
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Tạo thư mục download cho người dùng
    const userDownloadDir = path.join(config.paths.downloads, user._id.toString());
    if (!fs.existsSync(userDownloadDir)) {
      fs.mkdirSync(userDownloadDir, { recursive: true });
    }
    
    const outputPath = path.join(userDownloadDir, file.name);
    const parts = [];
    
    try {
      // Tải xuống từng phần
      logger.info(`Tải xuống ${file.telegramFileIds.length} phần của file ${file.name}`);
      
      for (let i = 0; i < file.telegramFileIds.length; i++) {
        const fileId = file.telegramFileIds[i];
        const partPath = path.join(tempDir, `part_${i}.bin`);
        
        logger.info(`Đang tải xuống phần ${i + 1}/${file.telegramFileIds.length} - ${fileId}`);
        
        // Thử tải xuống tối đa 3 lần
        let attempts = 0;
        let downloaded = false;
        let error;
        
        while (attempts < 3 && !downloaded) {
          try {
            const downloadedPart = await tdlibStorage.downloadFile(fileId, partPath);
            parts.push(downloadedPart);
            downloaded = true;
            logger.info(`Phần ${i + 1} đã được tải xuống: ${downloadedPart}`);
          } catch (err) {
            attempts++;
            error = err;
            logger.warn(`Lỗi khi tải xuống phần ${i + 1}, lần thử ${attempts}/3: ${err.message}`);
            
            // Chờ 1 giây trước khi thử lại
            if (attempts < 3) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }
        
        if (!downloaded) {
          throw error || new Error(`Không thể tải xuống phần ${i + 1}`);
        }
      }
      
      // Ghép các phần lại thành file hoàn chỉnh
      logger.info(`Đang ghép ${parts.length} phần thành file hoàn chỉnh: ${outputPath}`);
      
      // Nếu file đầu ra đã tồn tại, xóa nó
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
      
      // Sử dụng writeStream để ghép file
      const outStream = fs.createWriteStream(outputPath);
      
      for (let i = 0; i < parts.length; i++) {
        const partData = fs.readFileSync(parts[i]);
        outStream.write(partData);
      }
      
      outStream.end();
      
      // Đợi stream kết thúc
      await new Promise((resolve, reject) => {
        outStream.on('finish', resolve);
        outStream.on('error', reject);
      });
      
      logger.info(`Đã ghép thành công các phần thành file: ${outputPath}`);
      
      // Cập nhật thống kê tải xuống
      await File.findByIdAndUpdate(file._id, {
        lastDownloadedAt: new Date(),
        $inc: { downloadCount: 1 }
      });
      
      // Dọn dẹp các phần tạm thời
      try {
        for (const part of parts) {
          if (fs.existsSync(part)) {
            fs.unlinkSync(part);
          }
        }
        
        if (fs.existsSync(tempDir)) {
          fs.rmdirSync(tempDir, { recursive: true });
        }
        
        logger.info('Đã dọn dẹp các file tạm');
      } catch (cleanupError) {
        logger.warn(`Lỗi khi dọn dẹp các file tạm: ${cleanupError.message}`);
      }
      
      return outputPath;
    } catch (error) {
      logger.error(`Lỗi khi tải xuống và ghép file đa phần: ${error.message}`);
      
      // Thử dọn dẹp nếu có lỗi
      try {
        // Xóa các phần tạm nếu tồn tại
        for (const part of parts) {
          if (fs.existsSync(part)) {
            fs.unlinkSync(part);
          }
        }
        
        // Xóa thư mục tạm
        if (fs.existsSync(tempDir)) {
          fs.rmdirSync(tempDir, { recursive: true });
        }
        
        // Xóa file đầu ra nếu đã tạo một phần
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
      } catch (cleanupError) {
        logger.warn(`Lỗi khi dọn dẹp sau lỗi: ${cleanupError.message}`);
      }
      
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
      logger.info(`Deleting file: ${fileId} for user: ${user.firstName} (${user.telegramId || user._id}), permanent: ${permanent}`);
      
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
        // Xóa file đa phần
        if (file.isMultipart && file.telegramMessageIds && file.telegramMessageIds.length > 0) {
          logger.info(`Đang xóa vĩnh viễn file đa phần: ${fileId} (${file.telegramMessageIds.length} phần)`);
          
          for (const messageId of file.telegramMessageIds) {
            try {
              await tdlibStorage.deleteFile(messageId);
              logger.info(`Đã xóa phần với messageId: ${messageId}`);
            } catch (error) {
              logger.warn(`Không thể xóa phần với messageId: ${messageId} - ${error.message}`);
              // Tiếp tục xóa các phần khác
            }
          }
        } else {
          // Permanently delete file from Telegram
          await tdlibStorage.deleteFile(file.telegramMessageId);
        }
        
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
      logger.info(`Restoring file: ${fileId} for user: ${user.firstName} (${user.telegramId || user._id})`);
      
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
   * Empty user's trash (permanently delete all trashed files)
   * @param {Object} user - User object
   * @returns {Promise<number>} - Number of files deleted
   */
  async emptyTrash(user) {
    try {
      logger.info(`Emptying trash for user: ${user.firstName} (${user.telegramId || user._id})`);
      
      // Find all trashed files for this user
      const trashedFiles = await File.find({ 
        createdBy: user._id,
        isDeleted: true
      });
      
      if (trashedFiles.length === 0) {
        return 0;
      }
      
      // For each file, permanently delete from Telegram
      let totalSize = 0;
      for (const file of trashedFiles) {
        await tdlibStorage.deleteFile(file.telegramMessageId);
        totalSize += file.size;
      }
      
      // Delete all files from database
      await File.deleteMany({
        createdBy: user._id,
        isDeleted: true
      });
      
      // Update user storage usage
      await user.subtractStorageUsed(totalSize);
      
      logger.info(`Emptied trash for user: ${user.firstName}, deleted ${trashedFiles.length} files`);
      
      return trashedFiles.length;
    } catch (error) {
      logger.error(`Error emptying trash: ${error.message}`);
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
      logger.info(`Getting file info: ${fileId} for user: ${user.firstName} (${user.telegramId || user._id})`);
      
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
      
      logger.info(`Listing files for user: ${user.firstName} (${user.telegramId || user._id}), page: ${page}, limit: ${limit}`);
      
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
      logger.info(`Sharing file: ${fileId} for user: ${user.firstName} (${user.telegramId || user._id})`);
      
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
      logger.info(`Updating file metadata: ${fileId} for user: ${user.firstName} (${user.telegramId || user._id})`);
      
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