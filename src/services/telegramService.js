/**
 * TeleDrive - Telegram Service
 * Dịch vụ tương tác với Telegram để lưu trữ và quản lý file
 */

const { Telegraf } = require('telegraf');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const config = require('../config/config');
const { log, generateId, ensureDirectoryExists } = require('../utils/helpers');
const { message } = require('telegraf/filters');
const fileService = require('./fileService');
const dbService = require('./dbService');

// Ensure temp directories exist
const tempDir = path.join(__dirname, '../../temp');
const uploadsDir = path.join(tempDir, 'uploads');
ensureDirectoryExists(uploadsDir);

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
    setupMessageHandlers();
    
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
 * Set up message handlers for the bot
 */
const setupMessageHandlers = () => {
  if (!bot) return;
  
  // Xử lý lệnh /start với mã xác thực
  bot.start((ctx) => {
    try {
      const startPayload = ctx.startPayload; // Lấy dữ liệu sau lệnh /start
      
      // Kiểm tra xem có phải yêu cầu xác thực không
      if (startPayload && startPayload.startsWith('auth_')) {
        const authCode = startPayload.replace('auth_', '');
        const userId = ctx.from.id;
        const username = ctx.from.username || '';
        const firstName = ctx.from.first_name || '';
        const lastName = ctx.from.last_name || '';
        
        log(`Nhận yêu cầu xác thực từ người dùng Telegram: ${userId} (${username})`, 'info');
        
        // Lưu thông tin người dùng vào database để xác minh sau
        dbService.saveAuthRequest({
          authCode: authCode,
          telegramId: userId,
          username: username,
          firstName: firstName,
          lastName: lastName,
          photoUrl: '',
          timestamp: Date.now()
        });
        
        ctx.reply('Bạn đã xác thực thành công! Bạn có thể quay lại trang web.');
      } else {
        ctx.reply('Xin chào! Tôi là bot lưu trữ file của TeleDrive. Sử dụng giao diện web để tương tác với tôi.');
      }
    } catch (error) {
      log(`Lỗi khi xử lý lệnh /start: ${error.message}`, 'error');
      ctx.reply('Đã xảy ra lỗi khi xử lý yêu cầu. Vui lòng thử lại sau.');
    }
  });
  
  // Handle document messages
  bot.on(message('document'), async (ctx) => {
    try {
      const document = ctx.message.document;
      const messageId = ctx.message.message_id;
      const caption = ctx.message.caption || '';
      
      log(`Received document: ${document.file_name} (${document.file_size} bytes)`);
      
      // Check if file already exists in database
      const existingFile = await fileService.getFileByMessageId(messageId);
      
      if (existingFile) {
        log(`File already exists in database with ID: ${existingFile.id}`);
        return;
      }
      
      // Save file to database
      const fileData = {
        name: document.file_name,
        size: document.file_size,
        mimeType: document.mime_type,
        telegramMessageId: messageId,
        caption
      };
      
      const savedFile = await fileService.saveFile(fileData);
      log(`Saved file to database with ID: ${savedFile.id}`);
    } catch (err) {
      log(`Error handling document message: ${err.message}`, 'error');
    }
  });
  
  // Handle photo messages
  bot.on(message('photo'), async (ctx) => {
    try {
      const photos = ctx.message.photo;
      const messageId = ctx.message.message_id;
      const caption = ctx.message.caption || '';
      
      // Get the largest photo
      const photo = photos[photos.length - 1];
      
      log(`Received photo: ${photo.file_id} (${photo.file_size} bytes)`);
      
      // Check if file already exists in database
      const existingFile = await fileService.getFileByMessageId(messageId);
      
      if (existingFile) {
        log(`File already exists in database with ID: ${existingFile.id}`);
        return;
      }
      
      // Generate a filename
      const fileName = `photo_${Date.now()}.jpg`;
      
      // Save file to database
      const fileData = {
        name: fileName,
        size: photo.file_size,
        mimeType: 'image/jpeg',
        telegramMessageId: messageId,
        caption
      };
      
      const savedFile = await fileService.saveFile(fileData);
      log(`Saved photo to database with ID: ${savedFile.id}`);
    } catch (err) {
      log(`Error handling photo message: ${err.message}`, 'error');
    }
  });
  
  // Handle video messages
  bot.on(message('video'), async (ctx) => {
    try {
      const video = ctx.message.video;
      const messageId = ctx.message.message_id;
      const caption = ctx.message.caption || '';
      
      log(`Received video: ${video.file_name || 'unnamed'} (${video.file_size} bytes)`);
      
      // Check if file already exists in database
      const existingFile = await fileService.getFileByMessageId(messageId);
      
      if (existingFile) {
        log(`File already exists in database with ID: ${existingFile.id}`);
        return;
      }
      
      // Generate a filename if not provided
      const fileName = video.file_name || `video_${Date.now()}.mp4`;
      
      // Save file to database
      const fileData = {
        name: fileName,
        size: video.file_size,
        mimeType: video.mime_type,
        telegramMessageId: messageId,
        caption
      };
      
      const savedFile = await fileService.saveFile(fileData);
      log(`Saved video to database with ID: ${savedFile.id}`);
    } catch (err) {
      log(`Error handling video message: ${err.message}`, 'error');
    }
  });
  
  // Handle audio messages
  bot.on(message('audio'), async (ctx) => {
    try {
      const audio = ctx.message.audio;
      const messageId = ctx.message.message_id;
      const caption = ctx.message.caption || '';
      
      log(`Received audio: ${audio.file_name || audio.title || 'unnamed'} (${audio.file_size} bytes)`);
      
      // Check if file already exists in database
      const existingFile = await fileService.getFileByMessageId(messageId);
      
      if (existingFile) {
        log(`File already exists in database with ID: ${existingFile.id}`);
        return;
      }
      
      // Generate a filename if not provided
      const fileName = audio.file_name || audio.title || `audio_${Date.now()}.mp3`;
      
      // Save file to database
      const fileData = {
        name: fileName,
        size: audio.file_size,
        mimeType: audio.mime_type,
        telegramMessageId: messageId,
        caption
      };
      
      const savedFile = await fileService.saveFile(fileData);
      log(`Saved audio to database with ID: ${savedFile.id}`);
    } catch (err) {
      log(`Error handling audio message: ${err.message}`, 'error');
    }
  });
};

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
    
    const result = await fileService.syncFilesFromTelegram(telegramFiles);
    
    log(`Đồng bộ hoàn tất: ${result.added} file mới, ${result.updated} cập nhật, ${result.unchanged} không thay đổi`);
    
    return result;
  } catch (error) {
    log(`Lỗi đồng bộ file từ Telegram: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Xác minh yêu cầu xác thực Telegram
 * @param {String} authCode Mã xác thực
 * @returns {Promise<Object|null>} Thông tin người dùng hoặc null nếu không tìm thấy
 */
async function verifyAuthRequest(authCode) {
  try {
    if (!authCode) {
      log('Không có mã xác thực được cung cấp', 'warning');
      return null;
    }
    
    log(`Đang kiểm tra mã xác thực: ${authCode}`, 'info');
    
    // Lấy thông tin yêu cầu xác thực từ database
    const authRequest = dbService.getAuthRequest(authCode);
    
    if (!authRequest) {
      log(`Không tìm thấy yêu cầu xác thực: ${authCode}`, 'warning');
      return null;
    }
    
    log(`Đã tìm thấy yêu cầu xác thực: ${authCode} cho user ${authRequest.username || authRequest.telegramId}`, 'info');
    
    // Kiểm tra thời gian xác thực (hết hạn sau 10 phút)
    const now = Date.now();
    if (now - authRequest.timestamp > 10 * 60 * 1000) {
      log(`Yêu cầu xác thực đã hết hạn: ${authCode}`, 'warning');
      dbService.removeAuthRequest(authCode);
      return null;
    }
    
    // Xóa yêu cầu xác thực sau khi đã xác minh thành công
    dbService.removeAuthRequest(authCode);
    
    // Trả về thông tin người dùng Telegram
    const user = {
      id: authRequest.telegramId,
      username: authRequest.username || String(authRequest.telegramId),
      displayName: authRequest.firstName + (authRequest.lastName ? ' ' + authRequest.lastName : ''),
      photoUrl: authRequest.photoUrl || 'https://telegram.org/img/t_logo.png',
      isAdmin: true, // Mọi người dùng Telegram đều có quyền admin
      provider: 'telegram'
    };
    
    log(`Xác thực thành công cho ${user.displayName} (${user.username})`, 'info');
    
    return user;
  } catch (error) {
    log(`Lỗi khi xác minh yêu cầu xác thực: ${error.message}`, 'error');
    return null;
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
  syncFilesFromTelegram,
  verifyAuthRequest
}; 