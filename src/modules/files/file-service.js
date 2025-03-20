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
    // Đảm bảo thư mục uploads tồn tại 
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads'); 
    const tempDir = path.join(process.cwd(), 'temp'); 
    if (!fs.existsSync(uploadsDir)) { 
      fs.mkdirSync(uploadsDir, { recursive: true }); 
    } 
    if (!fs.existsSync(tempDir)) { 
      fs.mkdirSync(tempDir, { recursive: true }); 
    } 
  } 
 
  async uploadFile(fileData, user) { 
    try { 
      // Kiểm tra file tồn tại 
        throw new Error('File không tồn tại hoặc đường dẫn không hợp lệ'); 
      } 
 
      // Kiểm tra kích thước file 
      const stats = await promisify(fs.stat)(fileData.path); 
      if (stats.size === 0) { 
        throw new Error('File rỗng'); 
      } 
 
      // Log thông tin upload 
      logger.info(`Kích thước file: ${fileData.size} (reported) vs ${stats.size} (actual)`); 
 
      // Kiểm tra dung lượng người dùng 
      // Tạo bản ghi file tạm thời 
      const tempFile = await File.create({ 
        filename: fileData.originalname, 
        mimetype: fileData.mimetype, 
        size: fileData.size, 
        userId: user._id, 
        isUploading: true 
      }); 
 
      logger.info(`Đã tạo bản ghi file tạm thời: ${tempFile._id}`); 
 
      // Tải file lên Telegram sử dụng TDLib 
      const telegramFile = await this.uploadFileToTelegram(fileData, user); 
 
      // Cập nhật bản ghi file 
      const file = await File.findByIdAndUpdate( 
        tempFile._id, 
        { 
          telegramFileId: telegramFile.fileId, 
          telegramMessageId: telegramFile.messageId, 
          isUploading: false, 
          isUploaded: true } 
      ); 
 
      // Xóa file tạm 
      logger.info(`Đang xóa file tạm thời: ${fileData.path}`); 
      await promisify(fs.unlink)(fileData.path); 
      logger.info(`Đã xóa file tạm thời: ${fileData.path}`); 
 
      logger.info(`Upload hoàn tất cho file ${file._id}`); 
      return file; 
    } catch (error) { 
      // Xử lý lỗi 
      logger.error(`Lỗi khi tải file lên: ${error.message}`); 
      logger.error(`Stack: ${error.stack}`); 
 
      // Xóa file tạm nếu có 
      try { 
          await promisify(fs.unlink)(fileData.path); 
        } 
      } catch (unlinkError) { 
        logger.error(`Không thể xóa file tạm: ${unlinkError.message}`); 
      } 
 
      throw error; 
    } 
  } 
 
  async uploadFileToTelegram(fileData, user) { 
    try { 
      // Với TDLib, quy trình tải lên sẽ khác nhau 
      let telegramFile; 
 
