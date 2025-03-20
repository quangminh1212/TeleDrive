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
      if (!fileData || !fileData.path || !fs.existsSync(fileData.path)) { 
        throw new Error('File không tồn tại hoặc đường dẫn không hợp lệ'); 
      } 
 
      // Kiểm tra kích thước file 
      const stats = await promisify(fs.stat)(fileData.path); 
      if (stats.size === 0) { 
        throw new Error('File rỗng'); 
      } 
 
      // Log thông tin upload 
      logger.info(`Đang tải lên file ${fileData.originalname} cho người dùng ${user.firstName} (${user.telegramId || user._id})`); 
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
      logger.info(`Đang tải file lên Telegram cho người dùng ${user.firstName} (${user.telegramId || user._id})`); 
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
        if (fileData && fileData.path && fs.existsSync(fileData.path)) { 
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
 
      // Kiểm tra nếu file lớn hơn giới hạn, cần chia nhỏ 
      const stats = await promisify(fs.stat)(fileData.path); 
      const MAX_FILE_SIZE = 1.5 * 1024 * 1024 * 1024; // 1.5GB 
 
      if (stats.size > MAX_FILE_SIZE) { 
        // Tách file thành nhiều phần 
        logger.info(`File quá lớn (${stats.size} bytes), đang chia nhỏ...`); 
        const totalChunks = Math.ceil(stats.size / MAX_FILE_SIZE); 
        const chunks = await this.splitLargeFile(fileData, totalChunks); 
        
        // Tải từng phần lên Telegram 
        const messageIds = []; 
        let i = 0; 
        for (const chunk of chunks) { 
          i++; 
          logger.info(`Đang tải phần ${i}/${totalChunks} lên Telegram...`); 
          const result = await tdlibStorage.uploadFile(chunk.path, config.telegram.chatId); 
          messageIds.push(result.messageId); 
        } 
        
        // Trả về ID của tin nhắn đầu tiên 
        telegramFile = { 
          fileId: crypto.randomBytes(16).toString('hex'), 
          messageId: messageIds[0], 
          messageIds: messageIds 
        }; 
      } else { 
        // File nhỏ, tải trực tiếp 
        logger.info(`Tải file lên Telegram thông qua TDLib...`); 
        const result = await tdlibStorage.uploadFile(fileData.path, config.telegram.chatId); 
        telegramFile = { 
          fileId: result.fileId, 
          messageId: result.messageId 
        }; 
      } 
 
      logger.info(`Đã tải file lên Telegram, message ID: ${telegramFile.messageId}`); 
      return telegramFile; 
    } catch (error) { 
      logger.error(`Lỗi khi tải file lên Telegram: ${error.message}`); 
      throw error; 
    } 
  } 
 
  async splitLargeFile(fileData, totalChunks) { 
    return new Promise(async (resolve, reject) => { 
      try { 
        logger.info(`Đang chia file ${fileData.originalname} thành ${totalChunks} phần...`); 
        
        const chunkPaths = []; 
        const fileSize = fs.statSync(fileData.path).size; 
        const chunkSize = Math.ceil(fileSize / totalChunks); 
        
        const readStream = fs.createReadStream(fileData.path); 
        let bytesProcessed = 0; 
        let chunkIndex = 0; 
        let currentChunk = null; 
        
        readStream.on('data', (chunk) => { 
          logger.info(`Đọc chunk ${chunk.length} bytes (Tổng ${bytesProcessed} / ${fileSize})`); 
          bytesProcessed += chunk.length; 
          
          // Cập nhật tiến trình 
          const progress = Math.round(bytesProcessed * 50 / fileData.size); // 50% cho việc chia file 
          
          if (!currentChunk) { 
            // Tạo chunk mới 
            const chunkPath = path.join(process.cwd(), 'temp', `${fileData.originalname}.part${chunkIndex + 1}`); 
            currentChunk = fs.createWriteStream(chunkPath); 
            chunkPaths.push({ path: chunkPath, index: chunkIndex }); 
          } 
          
          currentChunk.write(chunk); 
          
          if (bytesProcessed >= (chunkIndex + 1) * chunkSize) { 
            // Đóng chunk hiện tại và chuẩn bị chunk mới 
            currentChunk.end(); 
            currentChunk = null; 
            chunkIndex++; 
          } 
        }); 
        
        readStream.on('end', () => { 
          // Đóng chunk cuối cùng nếu còn mở 
          if (currentChunk) { 
            currentChunk.end(); 
          } 
          logger.info(`Đã chia file thành ${chunkPaths.length} phần`); 
          resolve(chunkPaths); 
        }); 
        
        readStream.on('error', (err) => { 
          logger.error(`Lỗi khi đọc file: ${err.message}`); 
          reject(err); 
        }); 
      } catch (error) { 
        logger.error(`Lỗi khi chia file: ${error.message}`); 
        reject(error); 
      } 
    }); 
  } 
 
  async createShareLink(fileId, user) { 
    try { 
      // Tìm file theo ID 
      const file = await File.findOne({ 
        _id: fileId, 
        userId: user._id // Chỉ cho phép chủ sở hữu tạo link 
      }); 
 
      if (!file) { 
        throw new Error(`Không tìm thấy file có ID ${fileId} for user ${user._id}`); 
      } 
 
      // Tạo token chia sẻ nếu chưa có 
      if (!file.shareToken) { 
        // Tạo token ngẫu nhiên 
        const token = crypto.randomBytes(32).toString('hex'); 
        
        // Cập nhật file với token mới 
        file.shareToken = token; 
        file.shareEnabled = true; 
        await file.save(); 
      } 
      
      // Tạo link chia sẻ 
      const shareLink = `${config.baseUrl}/share/${file.shareToken}`; 
      logger.info(`Đã tạo link chia sẻ cho file ${fileId}, share link: ${shareLink}`); 
      
      return shareLink; 
    } catch (error) { 
      logger.error(`Lỗi khi tạo link chia sẻ: ${error.message}`); 
      throw error; 
    } 
  } 
 
  async getFileByShareToken(token) { 
    try { 
      // Tìm file theo token chia sẻ 
      const file = await File.findOne({ 
        shareToken: token, 
        shareEnabled: true 
      }); 
      
      if (!file) { 
        throw new Error('Link chia sẻ không hợp lệ hoặc đã hết hạn'); 
      } 
      
      logger.info(`Đã tìm thấy file qua share token: ${file._id}`); 
      return file; 
    } catch (error) { 
      logger.error(`Lỗi khi lấy file theo share token: ${error.message}`); 
      throw error; 
    } 
  } 
 
  async deleteFile(fileId, user) { 
    try { 
      // Tìm file theo ID 
      const file = await File.findOne({ 
        _id: fileId, 
        userId: user._id // Chỉ cho phép chủ sở hữu xóa 
      }); 
 
      if (!file) { 
        throw new Error('File không tồn tại hoặc bạn không có quyền xóa'); 
      } 
 
      // Xóa file khỏi Telegram nếu có thể 
      try { 
        if (file.telegramMessageId) { 
          await tdlibStorage.deleteMessage(config.telegram.chatId, file.telegramMessageId); 
          logger.info(`Đã xóa tin nhắn Telegram cho file ${fileId}`); 
        } 
      } catch (telegramError) { 
        logger.warn(`Không thể xóa tin nhắn Telegram: ${telegramError.message}`); 
        // Tiếp tục xóa file trong DB ngay cả khi không xóa được trên Telegram 
      } 
 
      // Xóa file trong database 
      await File.findByIdAndDelete(fileId); 
      logger.info(`Đã xóa file ${fileId}`); 
 
      return { success: true, message: 'Đã xóa file thành công' }; 
    } catch (error) { 
      logger.error(`Lỗi khi xóa file: ${error.message}`); 
      throw error; 
    } 
  } 
} 
 
module.exports = new FileService(); 
