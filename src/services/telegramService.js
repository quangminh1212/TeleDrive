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
let botStarting = false; // Biến cờ để theo dõi khi bot đang khởi động
let lastInitTime = 0; // Thời gian lần cuối khởi tạo bot thành công

// Thêm biến để theo dõi trạng thái khởi tạo gần đây
let lastInitFailed = false;
let lastInitAttempt = 0;
const INIT_COOLDOWN = 60000; // 1 phút giữa các lần thử initBot
const TELEGRAM_CONFLICT_WAIT = 10000; // 10 giây đợi khi xung đột

/**
 * Khởi tạo bot Telegram
 * @param {Boolean} force Buộc khởi tạo lại bot
 * @returns {Promise<Boolean>} Kết quả khởi tạo
 */
async function initBot(force = false) {
  // Nếu đang có tiến trình khởi động bot, đợi
  if (botStarting) {
    log('Bot đang trong quá trình khởi động, đợi...', 'info');
    // Đợi tối đa 5 giây
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      if (!botStarting) {
        return isReady; // Trả về trạng thái hiện tại
      }
    }
    log('Đợi bot khởi động quá lâu', 'warning');
    return false;
  }
  
  try {
    botStarting = true;
    
    // Kiểm tra xem bot đã sẵn sàng chưa và không buộc khởi tạo lại
    if (!force && bot && isReady) {
      log('Bot đã được khởi tạo trước đó và đang hoạt động', 'info');
      lastInitFailed = false;
      botStarting = false;
      return true;
    }
    
    // Kiểm tra thời gian cooldown nếu lần khởi tạo gần đây thất bại
    const now = Date.now();
    if (lastInitFailed && (now - lastInitAttempt < INIT_COOLDOWN) && !force) {
      log(`Cooldown đang hoạt động, vui lòng đợi ${Math.ceil((INIT_COOLDOWN - (now - lastInitAttempt)) / 1000)} giây nữa`, 'warning');
      botStarting = false;
      return false;
    }
    
    // Nếu đang có bot instance, dừng nó trước
    if (bot) {
      log('Dừng bot hiện tại trước khi khởi tạo lại', 'info');
      try {
        await stopBot(true); // Dừng bot hiện tại
        // Đợi một khoảng thời gian để Telegram giải phóng tài nguyên
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        log(`Lỗi khi dừng bot hiện tại: ${error.message}`, 'warning');
      }
    }
    
    // Đảm bảo các biến trạng thái đã reset
    resetBotStatus();
    
    // Cập nhật thời gian thử khởi tạo
    lastInitAttempt = now;
    
    // Kiểm tra cấu hình
    if (!config.TELEGRAM_BOT_TOKEN) {
      log('Không tìm thấy TELEGRAM_BOT_TOKEN trong cấu hình', 'error');
      lastInitFailed = true;
      botStarting = false;
      return false;
    }
    
    if (!config.TELEGRAM_CHAT_ID) {
      log('Không tìm thấy TELEGRAM_CHAT_ID trong cấu hình', 'error');
      lastInitFailed = true;
      botStarting = false;
      return false;
    }
    
    // Khởi tạo bot với tùy chọn để tránh xung đột
    try {
      bot = new Telegraf(config.TELEGRAM_BOT_TOKEN, {
        telegram: {
          // Tắt webhook để sử dụng long polling
          webhookReply: false
        }
      });
      
      // Thiết lập xử lý sự kiện nhận file
      setupMessageHandlers();
      
      // Lệnh kiểm tra
      bot.command('ping', (ctx) => ctx.reply('Pong!'));
      
      // Khởi động bot với cơ chế retry
      const maxRetries = 3;
      let retries = 0;
      let success = false;
      
      while (!success && retries < maxRetries) {
        try {
          await bot.launch({
            dropPendingUpdates: true,
            allowedUpdates: ['message', 'callback_query']
          });
          success = true;
        } catch (error) {
          retries++;
          const isConflict = error.message && (
            error.message.includes('409: Conflict') || 
            error.message.includes('terminated by other getUpdates')
          );
          
          if (isConflict) {
            log(`Phát hiện xung đột bot (lần thử ${retries}/${maxRetries}), đợi trước khi thử lại...`, 'warning');
            // Dọn dẹp bot hiện tại
            try {
              bot.stop();
            } catch (e) { /* Bỏ qua lỗi stop */ }
            
            // Đợi thời gian dài hơn sau mỗi lần thử
            const waitTime = TELEGRAM_CONFLICT_WAIT * retries;
            log(`Đợi ${waitTime/1000} giây trước khi thử lại...`, 'info');
            await new Promise(resolve => setTimeout(resolve, waitTime));
            
            // Tạo lại bot instance
            bot = new Telegraf(config.TELEGRAM_BOT_TOKEN, {
              telegram: {
                webhookReply: false
              }
            });
            
            // Thiết lập handlers lại
            setupMessageHandlers();
            bot.command('ping', (ctx) => ctx.reply('Pong!'));
          } else {
            log(`Lỗi không phải xung đột khi khởi tạo bot: ${error.message}`, 'error');
            throw error; // Nếu không phải lỗi xung đột, throw lỗi
          }
        }
      }
      
      if (!success) {
        throw new Error(`Không thể khởi tạo bot sau ${maxRetries} lần thử`);
      }
      
      isReady = true;
      lastInitTime = Date.now();
      lastInitFailed = false;
      
      log('Khởi tạo bot Telegram thành công', 'info');
      return true;
    } catch (error) {
      log(`Lỗi khởi tạo bot Telegram: ${error.message}`, 'error');
      // Reset bot state nếu có lỗi
      resetBotStatus();
      lastInitFailed = true;
      return false;
    } finally {
      botStarting = false;
    }
  } catch (outerError) {
    log(`Lỗi ngoại lệ khi khởi tạo bot: ${outerError.message}`, 'error');
    botStarting = false;
    return false;
  }
}

/**
 * Dừng bot Telegram
 * @param {Boolean} force Buộc dừng ngay cả khi có lỗi
 * @returns {Promise<Boolean>} Kết quả dừng bot
 */
async function stopBot(force = false) {
  try {
    if (!bot) {
      log('Bot chưa được khởi tạo, không cần dừng', 'warning');
      return true;
    }
    
    // Gọi hàm dừng bot
    await bot.stop();
    
    // Reset trạng thái
    resetBotStatus();
    
    log('Dừng bot Telegram thành công', 'info');
    return true;
  } catch (error) {
    log(`Lỗi khi dừng bot Telegram: ${error.message}`, 'error');
    
    // Nếu force = true, vẫn reset trạng thái kể cả khi có lỗi
    if (force) {
      resetBotStatus();
      return true;
    }
    
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
      log('Bot chưa sẵn sàng, đang khởi động lại...', 'warning');
      const success = await initBot();
      if (!success) {
        throw new Error('Bot chưa sẵn sàng. Vui lòng khởi tạo bot trước');
      }
    }
    
    const chatId = config.TELEGRAM_CHAT_ID;
    let messages = [];
    let lastMessageId = 0;
    
    log(`Đang lấy tối đa ${limit} tin nhắn từ Telegram chat ${chatId}`);
    
    // Lấy tin nhắn theo chunk
    while (messages.length < limit) {
      const chunkSize = Math.min(100, limit - messages.length);
      
      try {
        const messagesChunk = await bot.telegram.getMessages(chatId, {
          limit: chunkSize,
          offset_id: lastMessageId
        });
        
        if (!messagesChunk || messagesChunk.length === 0) {
          log('Không có thêm tin nhắn nào', 'info');
          break;
        }
        
        log(`Đã tải ${messagesChunk.length} tin nhắn`, 'debug');
        
        // Lọc những tin nhắn có file (document, photo, video, audio, voice)
        const fileMessages = messagesChunk.filter(msg => 
          msg.document || msg.photo || msg.video || msg.audio || msg.voice
        );
        
        messages.push(...fileMessages);
        lastMessageId = messagesChunk[messagesChunk.length - 1].message_id;
      } catch (error) {
        log(`Lỗi khi lấy tin nhắn: ${error.message}. Thử phương pháp khác.`, 'warning');
        
        // Thử phương pháp khác: lấy tin nhắn gần đây
        try {
          const history = await bot.telegram.getChatHistory(chatId, {
            limit: chunkSize
          });
          
          if (!history || history.length === 0) {
            log('Không thể lấy lịch sử chat', 'warning');
            break;
          }
          
          log(`Đã tải ${history.length} tin nhắn sử dụng getChatHistory`, 'debug');
          
          // Lọc tin nhắn có file
          const fileMessages = history.filter(msg => 
            msg.document || msg.photo || msg.video || msg.audio || msg.voice
          );
          
          messages.push(...fileMessages);
          break; // Chỉ lấy một lần với phương pháp này
        } catch (fallbackError) {
          log(`Không thể lấy lịch sử chat: ${fallbackError.message}`, 'error');
          break;
        }
      }
    }
    
    // Sắp xếp tin nhắn theo thời gian giảm dần (mới nhất lên đầu)
    messages.sort((a, b) => b.date - a.date);
    
    log(`Đã tìm thấy ${messages.length} tin nhắn có file`, 'info');
    
    // Chuyển đổi thành thông tin file
    const files = messages.map(msg => {
      let fileInfo = null;
      
      if (msg.document) {
        fileInfo = {
          file_id: msg.document.file_id,
          file_name: msg.document.file_name || `document_${msg.date}.bin`,
          mime_type: msg.document.mime_type || 'application/octet-stream',
          file_size: msg.document.file_size || 0,
          type: 'document'
        };
      } else if (msg.photo) {
        // Lấy ảnh chất lượng cao nhất (phần tử cuối cùng)
        const photo = msg.photo[msg.photo.length - 1];
        fileInfo = {
          file_id: photo.file_id,
          file_name: `photo_${msg.date}.jpg`,
          mime_type: 'image/jpeg',
          file_size: photo.file_size || 0,
          type: 'photo'
        };
      } else if (msg.video) {
        fileInfo = {
          file_id: msg.video.file_id,
          file_name: msg.video.file_name || `video_${msg.date}.mp4`,
          mime_type: msg.video.mime_type || 'video/mp4',
          file_size: msg.video.file_size || 0,
          type: 'video'
        };
      } else if (msg.audio) {
        fileInfo = {
          file_id: msg.audio.file_id,
          file_name: msg.audio.title || msg.audio.file_name || `audio_${msg.date}.mp3`,
          mime_type: msg.audio.mime_type || 'audio/mpeg',
          file_size: msg.audio.file_size || 0,
          type: 'audio'
        };
      } else if (msg.voice) {
        fileInfo = {
          file_id: msg.voice.file_id,
          file_name: `voice_${msg.date}.ogg`,
          mime_type: msg.voice.mime_type || 'audio/ogg',
          file_size: msg.voice.file_size || 0,
          type: 'voice'
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
    
    log(`Đã chuyển đổi thành ${files.length} thông tin file`, 'info');
    return files;
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
    
    // Kiểm tra xem có nên thử khởi tạo bot không
    const now = Date.now();
    if (!isReady || !bot) {
      // Nếu lần khởi tạo gần đây thất bại và chưa đến thời gian cooldown
      if (lastInitFailed && (now - lastInitAttempt < INIT_COOLDOWN)) {
        throw new Error('Khởi tạo bot thất bại gần đây, vui lòng đợi và thử lại sau');
      }
      
      log('Bot chưa sẵn sàng, tiến hành khởi tạo...', 'info');
      lastInitAttempt = now;
      const initResult = await initBot();
      
      if (!initResult || !isReady) {
        lastInitFailed = true;
        throw new Error('Không thể khởi tạo bot Telegram');
      }
      
      lastInitFailed = false;
    } else {
      log('Bot đã sẵn sàng, tiếp tục đồng bộ file', 'info');
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
 * Reset các biến theo dõi trạng thái bot
 */
function resetBotStatus() {
  bot = null;
  isReady = false;
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
  verifyAuthRequest,
  resetBotStatus
}; 