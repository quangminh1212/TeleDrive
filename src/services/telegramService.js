/**
 * TeleDrive - Telegram Service
 * Dịch vụ tương tác với Telegram để lưu trữ và quản lý file
 */

const { Telegraf } = require('telegraf');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const config = require('../config/config');
const { log, generateId } = require('../utils/helpers');

// Biến trạng thái
let bot = null;
let isReady = false;

/**
 * Khởi tạo bot Telegram
 * @returns {Promise<Boolean>} Kết quả khởi tạo
 */
async function initBot() {
  try {
    // Kiểm tra xem bot đã sẵn sàng chưa
    if (bot && isReady) {
      return true;
    }
    
    // Kiểm tra cấu hình
    if (!config.TELEGRAM_BOT_TOKEN) {
      log('Không tìm thấy TELEGRAM_BOT_TOKEN trong cấu hình', 'error');
      return false;
    }
    
    if (!config.TELEGRAM_CHAT_ID) {
      log('Không tìm thấy TELEGRAM_CHAT_ID trong cấu hình', 'error');
      return false;
    }
    
    // Khởi tạo bot
    bot = new Telegraf(config.TELEGRAM_BOT_TOKEN);
    
    // Thiết lập xử lý sự kiện nhận file
    bot.on('document', handleIncomingFile);
    bot.on('photo', handleIncomingFile);
    bot.on('video', handleIncomingFile);
    bot.on('audio', handleIncomingFile);
    
    // Lệnh kiểm tra
    bot.command('ping', (ctx) => ctx.reply('Pong!'));
    
    // Khởi động bot
    await bot.launch();
    isReady = true;
    
    log('Khởi tạo bot Telegram thành công');
    return true;
  } catch (error) {
    log(`Lỗi khởi tạo bot Telegram: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Dừng bot Telegram
 * @returns {Promise<Boolean>} Kết quả dừng bot
 */
async function stopBot() {
  try {
    if (!bot) {
      log('Bot chưa được khởi tạo, không cần dừng', 'warning');
      return true;
    }
    
    await bot.stop();
    bot = null;
    isReady = false;
    
    log('Dừng bot Telegram thành công');
    return true;
  } catch (error) {
    log(`Lỗi khi dừng bot Telegram: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Kiểm tra xem bot có đang hoạt động không
 * @returns {Boolean} Trạng thái hoạt động của bot
 */
function isBotActive() {
  return bot !== null && isReady;
}

/**
 * Xử lý file gửi đến từ Telegram
 * @param {Object} ctx Context Telegraf
 */
async function handleIncomingFile(ctx) {
  try {
    // Kiểm tra xem có phải từ chat ID đã cấu hình không
    if (ctx.chat.id.toString() !== config.TELEGRAM_CHAT_ID.toString()) {
      log(`Nhận file từ chat ID không được phép: ${ctx.chat.id}`, 'warning');
      return;
    }
    
    // Xác định loại file
    let fileInfo = null;
    
    if (ctx.message.document) {
      fileInfo = {
        file_id: ctx.message.document.file_id,
        file_name: ctx.message.document.file_name,
        mime_type: ctx.message.document.mime_type,
        file_size: ctx.message.document.file_size,
        type: 'document'
      };
    } else if (ctx.message.photo) {
      // Lấy ảnh chất lượng cao nhất (cuối mảng)
      const photo = ctx.message.photo[ctx.message.photo.length - 1];
      fileInfo = {
        file_id: photo.file_id,
        file_name: `photo_${Date.now()}.jpg`,
        mime_type: 'image/jpeg',
        file_size: photo.file_size,
        type: 'photo'
      };
    } else if (ctx.message.video) {
      fileInfo = {
        file_id: ctx.message.video.file_id,
        file_name: `video_${Date.now()}.mp4`,
        mime_type: ctx.message.video.mime_type,
        file_size: ctx.message.video.file_size,
        type: 'video'
      };
    } else if (ctx.message.audio) {
      fileInfo = {
        file_id: ctx.message.audio.file_id,
        file_name: ctx.message.audio.title || `audio_${Date.now()}.mp3`,
        mime_type: ctx.message.audio.mime_type,
        file_size: ctx.message.audio.file_size,
        type: 'audio'
      };
    }
    
    if (!fileInfo) {
      log('Tin nhắn không chứa file được hỗ trợ', 'warning');
      return;
    }
    
    log(`Đã nhận file: ${fileInfo.file_name} (${fileInfo.file_size} bytes)`);
    
    // Thêm thông tin message
    fileInfo.message_id = ctx.message.message_id;
    fileInfo.chat_id = ctx.chat.id;
    fileInfo.date = ctx.message.date * 1000; // Convert to milliseconds
    fileInfo.caption = ctx.message.caption || '';
    
    // Thông báo đã nhận được file
    const fileModule = require('./fileService');
    await fileModule.addFileFromTelegram(fileInfo);
    
    await ctx.reply(`Đã nhận và lưu trữ file: ${fileInfo.file_name}`);
  } catch (error) {
    log(`Lỗi xử lý file gửi đến: ${error.message}`, 'error');
  }
}

/**
 * Tải file từ Telegram
 * @param {String} fileId ID file trên Telegram
 * @param {String} savePath Đường dẫn lưu file
 * @returns {Promise<Object>} Thông tin file đã tải
 */
async function downloadFile(fileId, savePath) {
  try {
    if (!fileId) {
      throw new Error('File ID không được cung cấp');
    }
    
    if (!isReady || !bot) {
      throw new Error('Bot chưa sẵn sàng. Vui lòng khởi tạo bot trước');
    }
    
    // Lấy thông tin file
    const fileInfo = await bot.telegram.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${config.TELEGRAM_BOT_TOKEN}/${fileInfo.file_path}`;
    
    // Tạo thư mục lưu file nếu cần
    await fs.ensureDir(path.dirname(savePath));
    
    // Tải file
    const response = await axios({
      method: 'GET',
      url: fileUrl,
      responseType: 'stream'
    });
    
    // Lưu file
    const writer = fs.createWriteStream(savePath);
    response.data.pipe(writer);
    
    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        resolve({
          path: savePath,
          size: fileInfo.file_size,
          name: path.basename(savePath)
        });
      });
      
      writer.on('error', (error) => {
        reject(error);
      });
    });
  } catch (error) {
    log(`Lỗi tải file từ Telegram: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Gửi file lên Telegram
 * @param {String} filePath Đường dẫn file cần gửi
 * @param {String} caption Chú thích cho file
 * @returns {Promise<Object>} Thông tin file đã gửi
 */
async function sendFile(filePath, caption = '') {
  try {
    if (!isReady || !bot) {
      throw new Error('Bot chưa sẵn sàng. Vui lòng khởi tạo bot trước');
    }
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`File không tồn tại: ${filePath}`);
    }
    
    // Gửi file
    const message = await bot.telegram.sendDocument(
      config.TELEGRAM_CHAT_ID,
      { source: filePath },
      { caption }
    );
    
    // Trả về thông tin file đã gửi
    return {
      file_id: message.document.file_id,
      message_id: message.message_id,
      chat_id: message.chat.id,
      file_name: message.document.file_name,
      file_size: message.document.file_size,
      mime_type: message.document.mime_type
    };
  } catch (error) {
    log(`Lỗi gửi file lên Telegram: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Lấy link tải file từ Telegram
 * @param {String} fileId ID file trên Telegram
 * @returns {Promise<String>} URL tải file
 */
async function getFileLink(fileId) {
  try {
    if (!isReady || !bot) {
      throw new Error('Bot chưa sẵn sàng. Vui lòng khởi tạo bot trước');
    }
    
    const fileInfo = await bot.telegram.getFile(fileId);
    return `https://api.telegram.org/file/bot${config.TELEGRAM_BOT_TOKEN}/${fileInfo.file_path}`;
  } catch (error) {
    log(`Lỗi lấy link file từ Telegram: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Lấy danh sách file từ chat
 * @param {Number} limit Số lượng file tối đa
 * @returns {Promise<Array>} Danh sách file
 */
async function getFilesFromChat(limit = 100) {
  try {
    if (!isReady || !bot) {
      throw new Error('Bot chưa sẵn sàng. Vui lòng khởi tạo bot trước');
    }
    
    const chatId = config.TELEGRAM_CHAT_ID;
    const messages = [];
    let lastMessageId = 0;
    
    // Lấy tin nhắn theo chunk
    while (messages.length < limit) {
      const chunkSize = Math.min(100, limit - messages.length);
      const messagesChunk = await bot.telegram.getChatHistory(chatId, {
        limit: chunkSize,
        offset_id: lastMessageId || 0
      });
      
      if (messagesChunk.length === 0) break;
      
      // Lọc những tin nhắn có file
      const fileMessages = messagesChunk.filter(msg => 
        msg.document || msg.photo || msg.video || msg.audio
      );
      
      messages.push(...fileMessages);
      lastMessageId = messagesChunk[messagesChunk.length - 1].message_id;
    }
    
    // Chuyển đổi thành thông tin file
    return messages.map(msg => {
      let fileInfo = null;
      
      if (msg.document) {
        fileInfo = {
          file_id: msg.document.file_id,
          file_name: msg.document.file_name,
          mime_type: msg.document.mime_type,
          file_size: msg.document.file_size,
          type: 'document'
        };
      } else if (msg.photo) {
        const photo = msg.photo[msg.photo.length - 1];
        fileInfo = {
          file_id: photo.file_id,
          file_name: `photo_${msg.date}.jpg`,
          mime_type: 'image/jpeg',
          file_size: photo.file_size,
          type: 'photo'
        };
      } else if (msg.video) {
        fileInfo = {
          file_id: msg.video.file_id,
          file_name: `video_${msg.date}.mp4`,
          mime_type: msg.video.mime_type,
          file_size: msg.video.file_size,
          type: 'video'
        };
      } else if (msg.audio) {
        fileInfo = {
          file_id: msg.audio.file_id,
          file_name: msg.audio.title || `audio_${msg.date}.mp3`,
          mime_type: msg.audio.mime_type,
          file_size: msg.audio.file_size,
          type: 'audio'
        };
      }
      
      if (fileInfo) {
        fileInfo.message_id = msg.message_id;
        fileInfo.chat_id = msg.chat.id;
        fileInfo.date = msg.date * 1000; // Convert to milliseconds
        fileInfo.caption = msg.caption || '';
      }
      
      return fileInfo;
    }).filter(Boolean);
  } catch (error) {
    log(`Lỗi lấy danh sách file từ chat: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Đồng bộ danh sách file từ Telegram
 * @returns {Promise<Object>} Kết quả đồng bộ
 */
async function syncFilesFromTelegram() {
  try {
    log('Bắt đầu đồng bộ file từ Telegram', 'info');
    
    if (!isReady || !bot) {
      await initBot();
      if (!isReady) {
        throw new Error('Không thể khởi tạo bot Telegram');
      }
    }
    
    // Lấy danh sách file từ Telegram
    const telegramFiles = await getFilesFromChat(500); // Lấy tối đa 500 file
    
    const fileModule = require('./fileService');
    const result = await fileModule.syncFilesFromTelegram(telegramFiles);
    
    log(`Đồng bộ hoàn tất: ${result.added} file mới, ${result.updated} cập nhật, ${result.unchanged} không thay đổi`);
    
    return result;
  } catch (error) {
    log(`Lỗi đồng bộ file từ Telegram: ${error.message}`, 'error');
    throw error;
  }
}

module.exports = {
  initBot,
  stopBot,
  isBotActive,
  downloadFile,
  sendFile,
  getFileLink,
  getFilesFromChat,
  syncFilesFromTelegram
}; 