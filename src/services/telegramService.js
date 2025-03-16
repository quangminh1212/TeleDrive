/**
 * TeleDrive - Telegram Service
 * File này chứa các hàm tương tác với Telegram
 */

const { Telegraf } = require('telegraf');
const fs = require('fs');
const path = require('path');
const config = require('../config/config');
const axios = require('axios');

// Khởi tạo bot Telegram
let bot = null;
let chatId = null;
let isReady = false;

/**
 * Khởi tạo bot Telegram
 * @returns {Object} Bot instance
 */
function initBot() {
  try {
    console.log('===== KHỞI TẠO BOT TELEGRAM =====');
    
    const telegramToken = config.TELEGRAM_BOT_TOKEN;
    const targetChatId = config.TELEGRAM_CHAT_ID;
    
    if (!telegramToken || !targetChatId) {
      console.error('Thiếu cấu hình Telegram Bot. Vui lòng kiểm tra .env');
      return null;
    }
    
    // Tạo instance bot
    bot = new Telegraf(telegramToken);
    chatId = targetChatId;
    
    // Cấu hình các sự kiện
    
    // Sự kiện khi bot được khởi động
    bot.start(ctx => {
      const chatId = ctx.chat.id;
      ctx.reply(`Bot đã sẵn sàng. Chat ID của bạn là: ${chatId}`);
      console.log(`Bot đã được khởi động bởi user với chat ID: ${chatId}`);
    });
    
    // Sự kiện khi bot nhận được tin nhắn
    bot.on('message', ctx => {
      const message = ctx.message;
      const chatId = ctx.chat.id;
      
      console.log(`Nhận tin nhắn từ chat ID ${chatId}: ${message.text || '[không phải tin nhắn văn bản]'}`);
      
      // Kiểm tra xem tin nhắn có phải là file không
      if (message.document) {
        handleIncomingFile(ctx);
      }
    });
    
    // Khởi động bot ở chế độ polling
    bot.launch();
    
    console.log(`Bot Telegram đã được khởi tạo thành công`);
    console.log(`Bot đang lắng nghe các tin nhắn từ chat ID: ${targetChatId}`);
    
    isReady = true;
    return bot;
  } catch (error) {
    console.error('Lỗi khi khởi tạo Telegram Bot:', error);
    isReady = false;
    return null;
  }
}

/**
 * Dừng bot Telegram
 */
function stopBot() {
  try {
    if (bot) {
      bot.stop();
      console.log('Bot Telegram đã dừng');
    }
    isReady = false;
  } catch (error) {
    console.error('Lỗi khi dừng bot:', error);
  }
}

/**
 * Kiểm tra trạng thái bot
 * @returns {Boolean} Trạng thái
 */
function isBotActive() {
  return isReady && bot !== null;
}

/**
 * Xác thực bot token
 * @returns {Promise<Object>} Kết quả xác thực token
 */
async function verifyBotToken() {
  try {
    const telegramToken = config.TELEGRAM_BOT_TOKEN;
    
    if (!telegramToken) {
      console.error('Thiếu TELEGRAM_BOT_TOKEN trong cấu hình');
      return { 
        success: false, 
        error: 'Thiếu TELEGRAM_BOT_TOKEN trong cấu hình' 
      };
    }
    
    // Gọi API getMe của Telegram để kiểm tra token
    const response = await axios.get(`https://api.telegram.org/bot${telegramToken}/getMe`);
    
    if (response.data && response.data.ok) {
      const botInfo = response.data.result;
      console.log(`Xác thực token thành công. Bot: ${botInfo.username}`);
      return { 
        success: true, 
        botInfo: botInfo,
        botUsername: botInfo.username
      };
    } else {
      console.error('Không thể xác thực token Telegram');
      return { 
        success: false, 
        error: 'Không thể xác thực token Telegram' 
      };
    }
  } catch (error) {
    console.error('Lỗi khi xác thực token Telegram:', error);
    return { 
      success: false, 
      error: error.message || 'Lỗi không xác định khi xác thực token Telegram' 
    };
  }
}

/**
 * Xử lý khi nhận được file từ Telegram
 * @param {Object} ctx Context của bot
 */
async function handleIncomingFile(ctx) {
  try {
    const document = ctx.message.document;
    const fileId = document.file_id;
    const fileName = document.file_name;
    const fileSize = document.file_size;
    const fileType = document.mime_type;
    
    console.log(`Nhận file từ Telegram: ${fileName} (${fileSize} bytes)`);
    
    // Lấy thông tin về file từ Telegram
    const fileLink = await bot.telegram.getFileLink(fileId);
    
    // Tạo đường dẫn lưu file
    const downloadDir = path.join(config.STORAGE_PATH, 'downloads');
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }
    
    const filePath = path.join(downloadDir, fileName);
    
    // Tải file về
    const response = await axios({
      method: 'GET',
      url: fileLink.href,
      responseType: 'stream'
    });
    
    const writer = fs.createWriteStream(filePath);
    
    response.data.pipe(writer);
    
    return new Promise((resolve, reject) => {
      writer.on('finish', async () => {
        console.log(`Đã tải file thành công: ${filePath}`);
        
        try {
          // Thêm file vào cơ sở dữ liệu
          const fileService = require('./fileService');
          const filesDb = fileService.readFilesDb();
          
          const newFile = {
            id: require('crypto').randomUUID(),
            name: fileName,
            displayName: fileName,
            size: fileSize,
            uploadDate: new Date().toISOString(),
            fileType: fileType || 'application/octet-stream',
            telegramFileId: fileId,
            telegramUrl: fileLink.href,
            localPath: filePath,
            fileStatus: 'active',
            needsSync: false,
            isDeleted: false
          };
          
          // Kiểm tra xem file đã tồn tại trong DB chưa
          const existingFile = filesDb.find(f => 
            f.telegramFileId === fileId || 
            (f.name === fileName && f.size === fileSize)
          );
          
          if (!existingFile) {
            filesDb.push(newFile);
            fileService.saveFilesDb(filesDb);
            console.log(`Đã thêm file ${fileName} vào cơ sở dữ liệu`);
            ctx.reply(`Đã nhận và lưu file: ${fileName}`);
          } else {
            console.log(`File ${fileName} đã tồn tại trong cơ sở dữ liệu`);
            ctx.reply(`Đã nhận file: ${fileName} (đã tồn tại trong hệ thống)`);
          }
          
          resolve({
            success: true,
            fileId,
            fileName,
            filePath,
            fileSize,
            fileType,
            fileDbId: existingFile ? existingFile.id : newFile.id
          });
        } catch (dbError) {
          console.error(`Lỗi khi lưu thông tin file vào DB: ${dbError.message}`);
          ctx.reply(`Đã nhận file: ${fileName}, nhưng gặp lỗi khi lưu thông tin`);
          resolve({
            success: true,
            fileId,
            fileName,
            filePath,
            fileSize,
            fileType,
            dbError: dbError.message
          });
        }
      });
      
      writer.on('error', error => {
        console.error(`Lỗi khi tải file: ${error.message}`);
        ctx.reply(`Lỗi khi xử lý file: ${error.message}`);
        reject(error);
      });
    });
  } catch (error) {
    console.error('Lỗi khi xử lý file nhận từ Telegram:', error);
    ctx.reply('Lỗi khi xử lý file. Vui lòng thử lại sau.');
    return {
      success: false,
      error: error.message || 'Lỗi không xác định'
    };
  }
}

/**
 * Gửi file lên Telegram
 * @param {Object} fileInfo Thông tin file cần gửi
 * @returns {Promise<Object>} Kết quả gửi file
 */
async function sendFileToTelegram(fileInfo) {
  try {
    if (!fileInfo || !fileInfo.localPath) {
      console.error('Không thể gửi file: Thiếu thông tin file');
      return { 
        success: false,
        error: 'Thiếu thông tin file' 
      };
    }

    if (!isReady || !bot) {
      console.error('Bot Telegram chưa sẵn sàng');
      return {
        success: false,
        error: 'Bot chưa sẵn sàng'
      };
    }
    
    // Kiểm tra kích thước file (giới hạn của Telegram là 50MB)
    const fileStats = fs.statSync(fileInfo.localPath);
    const fileSizeMB = fileStats.size / (1024 * 1024);
    
    if (fileSizeMB > 50) {
      console.error(`Không thể gửi file: Kích thước file (${fileSizeMB.toFixed(2)}MB) vượt quá giới hạn 50MB của Telegram`);
      return { 
        success: false,
        error: `Kích thước file (${fileSizeMB.toFixed(2)}MB) vượt quá giới hạn 50MB của Telegram` 
      };
    }
    
    // Gửi file lên Telegram
    console.log(`Đang gửi file "${fileInfo.originalName}" lên Telegram...`);
    
    let teleMsg;
    try {
      teleMsg = await bot.telegram.sendDocument(chatId, {
        source: fileInfo.localPath,
        filename: fileInfo.originalName
      });
    } catch (error) {
      console.error('Lỗi khi gửi file lên Telegram:', error);
      return { 
        success: false,
        error: error.message || 'Lỗi khi gửi file lên Telegram' 
      };
    }
    
    if (!teleMsg || !teleMsg.document) {
      console.error('Không thể lấy thông tin document từ response của Telegram');
      return { 
        success: false,
        error: 'Không thể lấy thông tin document từ response của Telegram' 
      };
    }
    
    const fileId = teleMsg.document.file_id;
    console.log(`File đã được gửi thành công với ID: ${fileId}`);
    
    return {
      success: true,
      fileId: fileId,
      fileUrl: null, // URL sẽ được lấy từ getFileLink khi cần
      messageId: teleMsg.message_id
    };
  } catch (error) {
    console.error('Lỗi không xác định khi gửi file lên Telegram:', error);
    return { 
      success: false,
      error: error.message || 'Lỗi không xác định khi gửi file lên Telegram' 
    };
  }
}

/**
 * Lấy URL để tải file từ Telegram
 * @param {String} fileId ID của file trên Telegram
 * @returns {Promise<String>} URL để tải file
 */
async function getFileLink(fileId) {
  try {
    if (!isReady || !bot) {
      console.error('Bot Telegram chưa sẵn sàng');
      return null;
    }
    
    const fileLink = await bot.telegram.getFileLink(fileId);
    return fileLink.href;
  } catch (error) {
    console.error('Lỗi khi lấy link file từ Telegram:', error);
    throw error;
  }
}

/**
 * Tải file từ Telegram
 * @param {String} fileId ID file trên Telegram
 * @param {String} outputPath Đường dẫn lưu file
 * @returns {Object} Kết quả tải file
 */
async function downloadFileFromTelegram(fileId, outputPath) {
  try {
    if (!isReady || !bot) {
      console.error('Bot Telegram chưa sẵn sàng');
      return {
        success: false,
        error: 'Bot chưa sẵn sàng'
      };
    }
    
    // Lấy thông tin về file từ Telegram
    const fileLink = await bot.telegram.getFileLink(fileId);
    
    console.log(`Đang tải file từ Telegram: ${fileLink.href}`);
    
    // Tạo thư mục chứa file nếu chưa tồn tại
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Tải file về
    const response = await axios({
      method: 'GET',
      url: fileLink.href,
      responseType: 'stream'
    });
    
    const writer = fs.createWriteStream(outputPath);
    
    response.data.pipe(writer);
    
    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log(`Đã tải file thành công: ${outputPath}`);
        
        resolve({
          success: true,
          filePath: outputPath
        });
      });
      
      writer.on('error', error => {
        console.error(`Lỗi khi tải file: ${error.message}`);
        reject(error);
      });
    });
  } catch (error) {
    console.error('Lỗi khi tải file từ Telegram:', error);
    return {
      success: false,
      error: error.message || 'Lỗi không xác định'
    };
  }
}

/**
 * Gửi tin nhắn thông báo lên Telegram
 * @param {String} message Nội dung tin nhắn
 * @returns {Object} Kết quả gửi tin nhắn
 */
async function sendNotification(message) {
  try {
    if (!isReady || !bot) {
      console.error('Bot Telegram chưa sẵn sàng');
      return {
        success: false,
        error: 'Bot chưa sẵn sàng'
      };
    }
    
    // Gửi tin nhắn lên Telegram
    const result = await bot.telegram.sendMessage(chatId, message);
    
    console.log(`Đã gửi thông báo lên Telegram`);
    
    return {
      success: true,
      messageId: result.message_id
    };
  } catch (error) {
    console.error('Lỗi khi gửi thông báo lên Telegram:', error);
    return {
      success: false,
      error: error.message || 'Lỗi không xác định'
    };
  }
}

/**
 * Lấy danh sách file từ chat Telegram
 * @param {Number} limit Số lượng tin nhắn tối đa cần kiểm tra
 * @returns {Promise<Array>} Danh sách thông tin file
 */
async function getFilesFromChat(limit = 100) {
  try {
    if (!bot || !chatId) {
      console.error('Bot hoặc chatId chưa được cấu hình');
      return [];
    }
    
    console.log(`Đang lấy ${limit} tin nhắn gần nhất từ chat ID: ${chatId}`);
    
    // Lấy tin nhắn từ chat
    const messages = await bot.telegram.getChat(chatId);
    
    if (!messages) {
      console.log('Không thể lấy tin nhắn từ chat');
      return [];
    }
    
    try {
      // Lấy tất cả tin nhắn gần đây từ chat
      const history = await bot.telegram.getChatHistory(chatId, {
        limit: limit
      });
      
      if (!history || !Array.isArray(history)) {
        console.log('Không thể lấy lịch sử chat hoặc định dạng không hợp lệ');
        return [];
      }
      
      // Lọc chỉ lấy những tin nhắn có file
      const fileMessages = history.filter(msg => msg.document);
      
      if (fileMessages.length === 0) {
        console.log('Không tìm thấy file nào trong lịch sử chat');
        return [];
      }
      
      // Chuyển đổi thành định dạng thông tin file
      const files = await Promise.all(fileMessages.map(async (msg) => {
        const document = msg.document;
        const fileId = document.file_id;
        
        try {
          // Lấy đường dẫn file
          const fileLink = await bot.telegram.getFileLink(fileId);
          
          return {
            fileId: fileId,
            fileName: document.file_name,
            fileSize: document.file_size,
            fileType: document.mime_type,
            fileUrl: fileLink.href,
            date: new Date(msg.date * 1000).toISOString()
          };
        } catch (error) {
          console.error(`Lỗi khi lấy đường dẫn cho file ID ${fileId}:`, error);
          return null;
        }
      }));
      
      // Lọc bỏ các null
      return files.filter(f => f !== null);
    } catch (error) {
      console.error('Lỗi khi lấy lịch sử chat:', error);
      
      // Phương pháp thay thế: sử dụng getUpdates
      console.log('Thử lấy file qua phương thức getUpdates...');
      const updates = await bot.telegram.getUpdates({ limit: limit });
      
      if (!updates || !Array.isArray(updates)) {
        console.log('Không thể lấy updates hoặc định dạng không hợp lệ');
        return [];
      }
      
      // Lọc những update có file và thuộc về chat cần lấy
      const fileUpdates = updates.filter(update => 
        update.message && 
        update.message.chat && 
        update.message.chat.id.toString() === chatId.toString() && 
        update.message.document
      );
      
      if (fileUpdates.length === 0) {
        console.log('Không tìm thấy file nào trong updates');
        return [];
      }
      
      // Chuyển đổi thành định dạng thông tin file
      const files = await Promise.all(fileUpdates.map(async (update) => {
        const document = update.message.document;
        const fileId = document.file_id;
        
        try {
          // Lấy đường dẫn file
          const fileLink = await bot.telegram.getFileLink(fileId);
          
          return {
            fileId: fileId,
            fileName: document.file_name,
            fileSize: document.file_size,
            fileType: document.mime_type,
            fileUrl: fileLink.href,
            date: new Date(update.message.date * 1000).toISOString()
          };
        } catch (error) {
          console.error(`Lỗi khi lấy đường dẫn cho file ID ${fileId}:`, error);
          return null;
        }
      }));
      
      // Lọc bỏ các null
      return files.filter(f => f !== null);
    }
  } catch (error) {
    console.error('Lỗi khi lấy danh sách file từ Telegram:', error);
    return [];
  }
}

module.exports = {
  initBot,
  stopBot,
  isBotActive,
  verifyBotToken,
  handleIncomingFile,
  sendFileToTelegram,
  getFileLink,
  downloadFileFromTelegram,
  sendNotification,
  getFilesFromChat
}; 