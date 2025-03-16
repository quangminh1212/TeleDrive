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
      writer.on('finish', () => {
        console.log(`Đã tải file thành công: ${filePath}`);
        ctx.reply(`Đã nhận file: ${fileName}`);
        
        resolve({
          success: true,
          fileId,
          fileName,
          filePath,
          fileSize,
          fileType
        });
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

module.exports = {
  initBot,
  stopBot,
  isBotActive,
  sendFileToTelegram,
  getFileLink,
  downloadFileFromTelegram,
  sendNotification
}; 