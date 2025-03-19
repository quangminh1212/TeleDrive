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
        // Tải lên file sử dụng TDLib
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
      
      // Tải lên đồng thời nhiều phần 
      try {
        logger.info(`Tải lên nhiều phần sử dụng TDLib: ${chunks.length} phần`);
        
        const captions = chunks.map((_, i) => 
          `Part ${i + 1}/${chunks.length} of ${fileData.originalname} (${user.telegramId || user._id})`
        );
        
        telegramMessages = await tdlibStorage.uploadMultipartFile(chunks, captions);
        
        logger.info(`Đã tải lên thành công tất cả ${telegramMessages.length} phần`);
      } catch (multipartError) {
        logger.error(`Lỗi khi tải lên nhiều phần: ${multipartError.message}`);
        
        // Thử tải từng phần nếu tải đồng thời thất bại
        for (let i = 0; i < chunks.length; i++) {
          try {
            const chunkPath = chunks[i];
            const caption = `Part ${i + 1}/${chunks.length} of ${fileData.originalname} (${user.telegramId || user._id})`;
            
            logger.info(`Đang tải lên phần ${i + 1}/${chunks.length} - ${chunkPath}`);
            
            // Tải lên với tối đa 5 lần thử lại
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
            
            telegramMessages.push(telegramFile);
            
            // Cập nhật tiến độ - 50% cho việc chia file, 50% cho việc tải lên
            await File.findByIdAndUpdate(
              parentFile._id,
              { 
                $inc: { uploadedParts: 1 },
                $set: { uploadProgress: 50 + Math.round((i + 1) * 50 / chunks.length) }
              }
            );
            
            logger.info(`Đã tải lên phần ${i + 1}/${chunks.length} thành công`);
          } catch (error) {
            logger.error(`Lỗi tải lên phần ${i + 1}: ${error.message}`);
            throw error;
          }
        }
      }
      
      if (telegramMessages.length !== chunks.length) {
        throw new Error(`Số lượng phần đã tải lên (${telegramMessages.length}) không khớp với số phần đã chia (${chunks.length})`);
      }
      
      // Cập nhật thông tin file trong cơ sở dữ liệu
      const updates = {
        isUploading: false,
        uploadedParts: chunks.length,
        uploadProgress: 100,
        telegramFileIds: telegramMessages.map(msg => msg.fileId),
        telegramMessageIds: telegramMessages.map(msg => msg.messageId)
      };
      
      const file = await File.findByIdAndUpdate(parentFile._id, updates, { new: true });
      
      // Cập nhật dung lượng đã sử dụng
      await user.addStorageUsed(fileData.size);
      
      // Xóa các file tạm và thư mục
      for (const chunkPath of chunks) {
        try {
          if (fs.existsSync(chunkPath)) {
            fs.unlinkSync(chunkPath);
          }
        } catch (e) {
          logger.warn(`Không thể xóa file tạm: ${chunkPath}`);
        }
      }
      
      // Xóa thư mục tạm
      try {
        fs.rmdirSync(tempFolder, { recursive: true });
      } catch (e) {
        logger.warn(`Không thể xóa thư mục tạm: ${tempFolder}`);
      }
      
      // Xóa file gốc
      try {
        await unlinkAsync(fileData.path);
      } catch (e) {
        logger.warn(`Không thể xóa file gốc: ${fileData.path}`);
      }
      
      logger.info(`File đa phần đã được tải lên thành công: ${file._id} (${file.name})`);
      
      return file;
    } catch (error) {
      logger.error(`Lỗi xử lý file lớn: ${error.message}`);
      
      // Xóa các file tạm nếu có
      for (const chunkPath of chunks) {
        try {
          if (fs.existsSync(chunkPath)) {
            fs.unlinkSync(chunkPath);
          }
        } catch (e) {
          logger.warn(`Không thể xóa file tạm: ${chunkPath}`);
        }
      }
      
      // Xóa thư mục tạm
      try {
        if (fs.existsSync(tempFolder)) {
          fs.rmdirSync(tempFolder, { recursive: true });
        }
      } catch (e) {
        logger.warn(`Không thể xóa thư mục tạm: ${tempFolder}`);
      }
      
      throw error;
    }
  }
  
  /**
   * Download a file from Telegram
   * @param {string} fileId - ID of the file
   * @param {Object} user - User object
   * @returns {Promise<string>} - Path to the downloaded file
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
      
      // Download file từ TDLib
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
    
    if (!file.telegramFileIds || file.telegramFileIds.length === 0) {
      throw new Error('File không có dữ liệu về các phần');
    }
    
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
    
    try {
      // Tải xuống các phần bằng TDLib
      logger.info(`Tải xuống đồng thời ${file.telegramFileIds.length} phần của file ${file.name}`);
      
      try {
        // Thử tải xuống và ghép file bằng phương thức có sẵn của TDLib
        await tdlibStorage.downloadMultipartFile(file.telegramFileIds, outputPath);
        logger.info(`Đã tải xuống và ghép file thành công: ${outputPath}`);
      } catch (bulkError) {
        logger.warn(`Lỗi khi tải xuống nhiều phần cùng lúc: ${bulkError.message}. Đang thử tải từng phần riêng lẻ...`);
        
        // Nếu tải xuống đồng thời thất bại, thử tải từng phần
        const parts = [];
        
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
            throw error || new Error(`Không thể tải xuống phần ${i + 1} sau nhiều lần thử`);
          }
        }
        
        // Nếu tất cả các phần đã được tải xuống, ghép chúng lại
        logger.info(`Tất cả ${parts.length} phần đã được tải xuống, bắt đầu ghép...`);
        
        // Kiểm tra nếu file đầu ra đã tồn tại
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
        
        // Tạo writeStream để ghi vào file đầu ra
        const outputStream = fs.createWriteStream(outputPath);
        
        // Ghép các phần lại với nhau
        for (const partPath of parts) {
          const partData = fs.readFileSync(partPath);
          outputStream.write(partData);
        }
        
        // Kết thúc ghi
        outputStream.end();
        
        // Đợi cho writeStream ghi xong
        await new Promise((resolve, reject) => {
          outputStream.on('finish', resolve);
          outputStream.on('error', reject);
        });
        
        logger.info(`Đã ghép thành công ${parts.length} phần thành file: ${outputPath}`);
        
        // Xóa các file tạm
        for (const partPath of parts) {
          try {
            fs.unlinkSync(partPath);
          } catch (e) {
            logger.warn(`Không thể xóa file tạm: ${partPath}`);
          }
        }
      }
      
      // Xóa thư mục tạm
      try {
        fs.rmdirSync(tempDir, { recursive: true });
      } catch (e) {
        logger.warn(`Không thể xóa thư mục tạm: ${tempDir}`);
      }
      
      // Cập nhật thông tin tải xuống
      await File.findByIdAndUpdate(file._id, {
        lastDownloadedAt: new Date(),
        $inc: { downloadCount: 1 }
      });
      
      return outputPath;
    } catch (error) {
      logger.error(`Lỗi khi tải xuống file đa phần: ${error.message}`);
      
      // Xóa thư mục tạm khi có lỗi
      try {
        fs.rmdirSync(tempDir, { recursive: true });
      } catch (e) {
        logger.warn(`Không thể xóa thư mục tạm: ${tempDir}`);
      }
      
      throw error;
    }
  }
  
  /**
   * List files for a user
   * @param {Object} user - User object
   * @param {Object} options - Listing options
   * @returns {Promise<Object>} - List result
   */
  async listFiles(user, options = {}) {
    try {
      const { page = 1, limit = 50, sortBy = 'createdAt', sortOrder = 'desc', search = '', tag = '', deleted = false } = options;
      
      // Build query
      const query = {
        createdBy: user._id,
        isDeleted: deleted
      };
      
      // Add search
      if (search) {
        query.name = { $regex: search, $options: 'i' };
      }
      
      // Add tag filter
      if (tag) {
        query.tags = tag;
      }
      
      // Build sort
      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
      
      // Calculate pagination
      const skip = (page - 1) * limit;
      
      // Find files
      const files = await File.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit);
      
      // Count total
      const total = await File.find(query).countDocuments();
      
      return {
        files,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error(`Error listing files: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get file info
   * @param {string} fileId - ID of the file
   * @param {Object} user - User object
   * @returns {Promise<Object>} - File object
   */
  async getFileInfo(fileId, user) {
    try {
      const file = await File.findById(fileId);
      
      if (!file) {
        throw new Error('File không tồn tại');
      }
      
      // Check if user has access to file
      if (file.createdBy.toString() !== user._id.toString() && !file.isPublic) {
        throw new Error('Bạn không có quyền truy cập file này');
      }
      
      return file;
    } catch (error) {
      logger.error(`Error getting file info: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Delete a file
   * @param {string} fileId - ID of the file
   * @param {Object} user - User object
   * @param {boolean} permanent - Whether to delete permanently
   * @returns {Promise<Object>} - Result
   */
  async deleteFile(fileId, user, permanent = false) {
    try {
      const file = await File.findById(fileId);
      
      if (!file) {
        throw new Error('File không tồn tại');
      }
      
      // Check if user has access to file
      if (file.createdBy.toString() !== user._id.toString()) {
        throw new Error('Bạn không có quyền xóa file này');
      }
      
      if (permanent) {
        // Permanently delete from Telegram if using TDLib
        try {
          if (file.isMultipart && file.telegramMessageIds && file.telegramMessageIds.length > 0) {
            for (const messageId of file.telegramMessageIds) {
              await tdlibStorage.deleteFile(messageId);
            }
          } else if (file.telegramMessageId) {
            await tdlibStorage.deleteFile(file.telegramMessageId);
          }
        } catch (telegramError) {
          logger.error(`Lỗi khi xóa file từ Telegram: ${telegramError.message}`);
          // Vẫn tiếp tục xóa trong DB
        }
        
        // Reduce user storage
        await user.removeStorageUsed(file.size);
        
        // Delete from database
        await File.findByIdAndRemove(fileId);
        
        return { success: true, message: 'File đã được xóa vĩnh viễn' };
      } else {
        // Move to trash
        await File.findByIdAndUpdate(fileId, { 
          isDeleted: true,
          deletedAt: new Date()
        });
        
        return { success: true, message: 'File đã được chuyển vào thùng rác' };
      }
    } catch (error) {
      logger.error(`Error deleting file: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Restore a file from trash
   * @param {string} fileId - ID of the file
   * @param {Object} user - User object
   * @returns {Promise<Object>} - Result
   */
  async restoreFile(fileId, user) {
    try {
      const file = await File.findById(fileId);
      
      if (!file) {
        throw new Error('File không tồn tại');
      }
      
      // Check if user has access to file
      if (file.createdBy.toString() !== user._id.toString()) {
        throw new Error('Bạn không có quyền khôi phục file này');
      }
      
      // Check if file is in trash
      if (!file.isDeleted) {
        throw new Error('File không ở trong thùng rác');
      }
      
      // Restore from trash
      await File.findByIdAndUpdate(fileId, { 
        isDeleted: false,
        deletedAt: null
      });
      
      return { success: true, message: 'File đã được khôi phục' };
    } catch (error) {
      logger.error(`Error restoring file: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Empty trash for a user
   * @param {Object} user - User object
   * @returns {Promise<Object>} - Result
   */
  async emptyTrash(user) {
    try {
      // Find all files in trash
      const files = await File.find({
        createdBy: user._id,
        isDeleted: true
      });
      
      // Delete all files from Telegram and database
      let totalSize = 0;
      
      for (const file of files) {
        try {
          if (file.isMultipart && file.telegramMessageIds && file.telegramMessageIds.length > 0) {
            for (const messageId of file.telegramMessageIds) {
              await tdlibStorage.deleteFile(messageId);
            }
          } else if (file.telegramMessageId) {
            await tdlibStorage.deleteFile(file.telegramMessageId);
          }
        } catch (telegramError) {
          logger.error(`Lỗi khi xóa file từ Telegram: ${telegramError.message}`);
          // Vẫn tiếp tục xóa trong DB
        }
        
        totalSize += file.size;
      }
      
      // Remove all files from database
      await File.deleteMany({
        createdBy: user._id,
        isDeleted: true
      });
      
      // Update user storage
      await user.removeStorageUsed(totalSize);
      
      return { 
        success: true, 
        message: `Đã xóa vĩnh viễn ${files.length} file từ thùng rác`,
        deletedCount: files.length,
        freedSpace: totalSize
      };
    } catch (error) {
      logger.error(`Error emptying trash: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Share a file
   * @param {string} fileId - ID of the file
   * @param {Object} user - User object
   * @param {number} expiresInHours - Hours until the share expires
   * @returns {Promise<Object>} - Share information
   */
  async shareFile(fileId, user, expiresInHours = 24) {
    try {
      const file = await File.findById(fileId);
      
      if (!file) {
        throw new Error('File không tồn tại');
      }
      
      // Check if user has access to file
      if (file.createdBy.toString() !== user._id.toString()) {
        throw new Error('Bạn không có quyền chia sẻ file này');
      }
      
      // Generate share token
      const shareToken = crypto.randomBytes(16).toString('hex');
      
      // Calculate expiry time
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expiresInHours);
      
      // Update file with share info
      await File.findByIdAndUpdate(fileId, {
        shareLink: shareToken,
        shareExpiresAt: expiresAt
      });
      
      return {
        shareToken,
        expiresAt,
        file
      };
    } catch (error) {
      logger.error(`Error sharing file: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Update file metadata
   * @param {string} fileId - ID of the file
   * @param {Object} user - User object
   * @param {Object} metadata - Metadata to update
   * @returns {Promise<Object>} - Updated file
   */
  async updateFileMetadata(fileId, user, metadata) {
    try {
      const file = await File.findById(fileId);
      
      if (!file) {
        throw new Error('File không tồn tại');
      }
      
      // Check if user has access to file
      if (file.createdBy.toString() !== user._id.toString()) {
        throw new Error('Bạn không có quyền cập nhật file này');
      }
      
      // Update file with metadata
      const updates = {};
      
      if (metadata.name) {
        updates.name = metadata.name;
      }
      
      if (metadata.description !== undefined) {
        updates.description = metadata.description;
      }
      
      if (metadata.isPublic !== undefined) {
        updates.isPublic = metadata.isPublic;
      }
      
      if (metadata.tags) {
        updates.tags = metadata.tags;
      }
      
      const updatedFile = await File.findByIdAndUpdate(fileId, updates, { new: true });
      
      return updatedFile;
    } catch (error) {
      logger.error(`Error updating file metadata: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new FileService(); 