/**
 * TeleDrive - Telegram Service
 * File này chứa các hàm tương tác với Telegram
 */

const { Telegraf } = require('telegraf');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const config = require('../config');

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
    
    // Nếu bot đã tồn tại và đang hoạt động, trả về bot đó
    if (bot && isReady) {
      console.log('Bot đã được khởi tạo trước đó, sử dụng lại');
      return bot;
    }
    
    // Dừng bot cũ nếu tồn tại
    if (bot) {
      try {
        stopBot();
        console.log('Đã dừng bot cũ để tránh xung đột');
      } catch (stopErr) {
        console.error('Lỗi khi dừng bot cũ:', stopErr.message);
      }
      
      // Đợi một chút để đảm bảo bot cũ đã dừng hoàn toàn
      setTimeout(() => {}, 500);
    }
    
    // Reset trạng thái
    isReady = false;
    bot = null;
    
    // Lấy token và chat ID từ config
    const telegramToken = config.TELEGRAM_BOT_TOKEN;
    const targetChatId = config.TELEGRAM_CHAT_ID;
    
    if (!telegramToken) {
      console.error('Thiếu cấu hình Telegram Bot Token. Vui lòng kiểm tra .env');
      return null;
    }
    
    if (!targetChatId) {
      console.log('Thiếu cấu hình Telegram Chat ID. Bot sẽ khởi động nhưng không thể đồng bộ file.');
    }
    
    console.log(`Đang khởi tạo bot với token: ${telegramToken.slice(0, 5)}...${telegramToken.slice(-5)}`);
    console.log(`Chat ID cấu hình: ${targetChatId || 'chưa thiết lập'}`);
    
    // Chuẩn hóa chat ID
    chatId = targetChatId ? targetChatId.toString() : null;
    
    // Xóa webhook (nếu có) trước khi khởi động polling
    try {
      axios.post(`https://api.telegram.org/bot${telegramToken}/deleteWebhook?drop_pending_updates=true`)
        .then(() => console.log('Đã xóa webhook để tránh xung đột'))
        .catch(err => console.warn('Lỗi khi xóa webhook:', err.message));
    } catch (webhookError) {
      console.warn('Lỗi khi xóa webhook:', webhookError.message);
    }
    
    // Tạo instance bot mới
    bot = new Telegraf(telegramToken);
    
    // Cấu hình các sự kiện bot
    // Sự kiện khi bot nhận được lệnh /start
    bot.start(async (ctx) => {
      const userChatId = ctx.chat.id;
      await ctx.reply(`Bot đã sẵn sàng. Chat ID của bạn là: ${userChatId}`);
      console.log(`Bot đã được khởi động bởi user với chat ID: ${userChatId}`);
      
      // Kiểm tra nếu chat ID khác với cấu hình
      if (chatId && userChatId.toString() !== chatId.toString()) {
        console.log(`Chat ID người dùng ${userChatId} khác với cấu hình ${chatId}`);
        await ctx.reply(`⚠️ Chat ID của bạn (${userChatId}) khác với chat ID đã cấu hình (${chatId}).\nBạn có muốn cập nhật ID? Sử dụng lệnh /updatechatid`);
      }
    });
    
    // Lệnh cập nhật chat ID
    bot.command('updatechatid', async (ctx) => {
      const newChatId = ctx.message.text.split(' ')[1] || ctx.chat.id.toString();
      
      console.log(`Nhận lệnh cập nhật chat ID thành: ${newChatId}`);
      
      try {
        // Cập nhật chat ID
        chatId = newChatId;
        
        try {
          await config.updateEnv({
            TELEGRAM_CHAT_ID: newChatId
          });
          await ctx.reply(`✅ Đã cập nhật chat ID thành ${newChatId}`);
        } catch (configError) {
          console.error('Lỗi khi cập nhật file .env:', configError.message);
          await ctx.reply(`✅ Đã cập nhật chat ID thành ${newChatId} (chỉ trong bộ nhớ, không lưu vào .env)`);
        }
      } catch (error) {
        await ctx.reply(`❌ Lỗi: ${error.message}`);
        console.error('Lỗi khi cập nhật chat ID:', error.message);
      }
    });
    
    // Sự kiện khi bot nhận được tin nhắn
    bot.on('message', ctx => {
      if (ctx.message.document) {
        handleIncomingFile(ctx);
      }
    });
    
    // Khởi động bot với polling
    bot.launch({
      dropPendingUpdates: true,
      allowedUpdates: ['message', 'callback_query']
    }).then(() => {
      console.log(`Bot Telegram đã được khởi tạo thành công`);
      
      // Lấy thông tin bot
      bot.telegram.getMe().then(botInfo => {
        console.log(`Bot đã khởi tạo: ${botInfo.username} (${botInfo.first_name})`);
        bot.botInfo = botInfo;
        
        if (chatId) {
          console.log(`Bot đang lắng nghe các tin nhắn từ chat ID: ${chatId}`);
        } else {
          console.log('Chưa có chat ID, hãy nhắn tin với bot để lấy chat ID');
          console.log(`Link truy cập bot: https://t.me/${botInfo.username}`);
          console.log(getStartInstructions());
        }
        
        isReady = true;
      });
    }).catch(err => {
      console.error(`Không thể khởi động bot: ${err.message}`);
      isReady = false;
      bot = null;
    });
    
    return bot;
  } catch (error) {
    console.error('Lỗi khi khởi tạo Telegram Bot:', error.message);
    isReady = false;
    bot = null;
    return null;
  }
}

/**
 * Cấu hình các sự kiện cho bot
 */
function configureBot() {
  if (!bot) return;
  
  // Kiểm tra thông tin bot
  bot.telegram.getMe().then(botInfo => {
    console.log(`Bot đã khởi tạo: ${botInfo.username} (${botInfo.first_name})`);
    bot.botInfo = botInfo; // Lưu thông tin bot
  }).catch(err => {
    console.error('Không thể lấy thông tin bot:', err.message);
  });
  
  // Sự kiện khi bot được khởi động
  bot.start(async (ctx) => {
    const userChatId = ctx.chat.id;
    ctx.reply(`Bot đã sẵn sàng. Chat ID của bạn là: ${userChatId}`);
    console.log(`Bot đã được khởi động bởi user với chat ID: ${userChatId}`);
    
    // Kiểm tra nếu chat ID khác với cấu hình
    if (userChatId.toString() !== chatId.toString()) {
      console.log(`Chat ID người dùng ${userChatId} khác với chat ID đã cấu hình ${chatId}`);
      await ctx.reply(`⚠️ Chat ID của bạn (${userChatId}) khác với chat ID đã cấu hình (${chatId}).\nBạn có muốn cập nhật ID? Sử dụng lệnh /updatechatid`);
    }
  });
  
  // Thêm lệnh cập nhật chat ID
  bot.command('updatechatid', async (ctx) => {
    const newChatId = ctx.message.text.split(' ')[1] || ctx.chat.id.toString();
    
    console.log(`Nhận lệnh cập nhật chat ID thành: ${newChatId}`);
    
    try {
      // Cập nhật chat ID
      const result = await updateChatId(newChatId);
      
      if (result.success) {
        await ctx.reply(`✅ Đã cập nhật chat ID thành ${newChatId}`);
        console.log(`Đã cập nhật chat ID thành: ${newChatId}`);
      } else {
        await ctx.reply(`❌ Lỗi: ${result.error}`);
        console.error(`Lỗi khi cập nhật chat ID: ${result.error}`);
      }
    } catch (error) {
      await ctx.reply(`❌ Lỗi không xác định: ${error.message}`);
      console.error(`Lỗi không xác định khi cập nhật chat ID: ${error.message}`);
    }
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
}

/**
 * Cập nhật chat ID
 * @param {String|Number} newChatId Chat ID mới
 * @returns {Object} Kết quả cập nhật
 */
async function updateChatId(newChatId) {
  try {
    if (!newChatId) {
      return {
        success: false,
        error: 'Chat ID không hợp lệ'
      };
    }
    
    // Chuẩn hóa chat ID
    const normalizedChatId = newChatId.toString();
    
    // Cập nhật biến local
    chatId = normalizedChatId;
    
    // Cập nhật trong config
    try {
      await config.updateEnv({
        TELEGRAM_CHAT_ID: normalizedChatId
      });
      
      console.log(`Đã cập nhật TELEGRAM_CHAT_ID trong .env thành ${normalizedChatId}`);
      
      return {
        success: true,
        chatId: normalizedChatId
      };
    } catch (configError) {
      console.error(`Lỗi khi cập nhật config: ${configError.message}`);
      
      return {
        success: false,
        error: `Không thể cập nhật file .env: ${configError.message}`
      };
    }
  } catch (error) {
    console.error(`Lỗi khi cập nhật chat ID: ${error.message}`);
    
    return {
      success: false,
      error: error.message || 'Lỗi không xác định'
    };
  }
}

/**
 * Dừng bot Telegram và giải phóng tài nguyên
 */
function stopBot() {
  try {
    console.log('===== DỪNG BOT TELEGRAM =====');
    
    // Xóa interval giữ kết nối nếu có
    if (global.botKeepAliveInterval) {
      clearInterval(global.botKeepAliveInterval);
      global.botKeepAliveInterval = null;
      console.log('Đã xóa interval giữ kết nối');
    }
    
    // Dừng bot
    if (bot) {
      console.log('Đang dừng bot...');
      
      try {
        bot.stop('Dừng theo yêu cầu');
        console.log('Đã dừng bot thành công');
      } catch (err) {
        console.error('Lỗi khi dừng bot:', err.message);
      }
      
      // Xóa reference đến bot
      bot = null;
    } else {
      console.log('Bot không được khởi tạo, không cần dừng');
    }
    
    // Reset trạng thái
    isReady = false;
    console.log('Bot Telegram đã bị dừng và giải phóng');
  } catch (error) {
    console.error('Lỗi khi dừng bot:', error.message);
    // Đảm bảo reset trạng thái ngay cả khi có lỗi
    bot = null;
    isReady = false;
  }
}

/**
 * Kiểm tra xem bot có đang hoạt động không
 * @returns {Boolean} true nếu bot đang hoạt động
 */
function isBotActive() {
  if (!bot || !isReady) {
    return false;
  }
  
  try {
    // Kiểm tra nhanh bằng biến trạng thái
    return isReady && bot !== null;
  } catch (error) {
    console.error('Lỗi khi kiểm tra trạng thái bot:', error.message);
    return false;
  }
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
 * @param {String|Object} filePathOrInfo Đường dẫn file hoặc thông tin file cần gửi
 * @param {String} originalFileName Tên file gốc (tùy chọn)
 * @returns {Promise<Object>} Kết quả gửi file
 */
async function sendFileToTelegram(filePathOrInfo, originalFileName) {
  try {
    // Xử lý tham số đầu vào
    let filePath, fileName;
    
    if (typeof filePathOrInfo === 'string') {
      filePath = filePathOrInfo;
      fileName = originalFileName || path.basename(filePath);
    } else if (filePathOrInfo && filePathOrInfo.localPath) {
      filePath = filePathOrInfo.localPath;
      fileName = originalFileName || filePathOrInfo.originalName || filePathOrInfo.name || path.basename(filePath);
    } else {
      console.error('Không thể gửi file: Không đúng định dạng tham số');
      return { 
        success: false,
        error: 'Không đúng định dạng tham số' 
      };
    }

    if (!fs.existsSync(filePath)) {
      console.error(`Không thể gửi file: File không tồn tại tại ${filePath}`);
      return { 
        success: false,
        error: `File không tồn tại tại ${filePath}` 
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
    const fileStats = fs.statSync(filePath);
    const fileSizeMB = fileStats.size / (1024 * 1024);
    
    if (fileSizeMB > 50) {
      console.error(`Không thể gửi file: Kích thước file (${fileSizeMB.toFixed(2)}MB) vượt quá giới hạn 50MB của Telegram`);
      return { 
        success: false,
        error: `Kích thước file (${fileSizeMB.toFixed(2)}MB) vượt quá giới hạn 50MB của Telegram` 
      };
    }
    
    // Gửi file lên Telegram
    console.log(`Đang gửi file "${fileName}" lên Telegram...`);
    
    let teleMsg;
    try {
      teleMsg = await bot.telegram.sendDocument(chatId, {
        source: filePath,
        filename: fileName
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
    
    // Lấy file URL ngay lập tức
    let fileUrl = null;
    try {
      const fileLink = await bot.telegram.getFileLink(fileId);
      fileUrl = fileLink.href;
    } catch (urlError) {
      console.log('Không thể lấy URL file ngay, sẽ lấy sau khi cần: ', urlError.message);
    }
    
    return {
      success: true,
      fileId: fileId,
      fileUrl: fileUrl,
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
 * Lấy danh sách file từ chat dựa trên chatId
 * @returns {Promise<Array>} Mảng các file đã tìm thấy
 */
async function getFilesFromChat() {
  console.log('===== BẮT ĐẦU LẤY DANH SÁCH FILE =====');
  
  // Kiểm tra bot đã được khởi tạo và chat ID
  if (!bot || !isReady) {
    console.log('Bot chưa sẵn sàng, khởi tạo lại...');
    initBot();
    // Đợi 2 giây để bot khởi tạo
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Kiểm tra lại sau khi khởi tạo
  if (!bot || !isReady) {
    throw new Error('Không thể khởi tạo bot Telegram');
  }
  
  if (!chatId) {
    console.error('Không có chat ID, không thể lấy danh sách file');
    console.log(getStartInstructions());
    throw new Error('Thiếu cấu hình TELEGRAM_CHAT_ID trong .env');
  }
  
  try {
    console.log(`Đang kết nối đến chat ID: ${chatId} để lấy danh sách file...`);
    
    // Gửi tin nhắn kiểm tra để xác nhận kết nối
    try {
      await bot.telegram.sendMessage(chatId, '🔄 Đang kiểm tra danh sách file...');
      console.log('Gửi thông báo kiểm tra thành công');
    } catch (msgError) {
      console.error('Lỗi khi gửi tin nhắn kiểm tra:', msgError.message);
      
      // Nếu lỗi chat not found, hướng dẫn người dùng
      if (msgError.message.includes('chat not found')) {
        console.error(`Chat ID không tồn tại: ${chatId}`);
        console.log('Vui lòng kiểm tra lại cấu hình TELEGRAM_CHAT_ID trong .env');
        console.log('Hoặc khởi động bot và gửi tin nhắn để lấy chat ID chính xác');
        console.log(getStartInstructions());
        throw new Error(`Chat ID không tồn tại: ${chatId}. Kiểm tra lại hoặc gửi tin nhắn cho bot để lấy ID đúng.`);
      }
      
      // Tiếp tục dù có lỗi gửi tin nhắn
    }
    
    // Lấy danh sách tin nhắn gần đây
    const updates = await bot.telegram.getUpdates({
      limit: 100,
      allowed_updates: ['message']
    });
    
    console.log(`Đã nhận ${updates.length} tin nhắn gần đây`);
    
    // Lọc các file từ tin nhắn
    const documents = [];
    
    for (const update of updates) {
      if (update.message && update.message.document && 
          update.message.chat && update.message.chat.id.toString() === chatId.toString()) {
        
        const doc = update.message.document;
        const fileId = doc.file_id;
        
        // Lấy thông tin file
        const fileInfo = await bot.telegram.getFile(fileId);
        
        documents.push({
          id: fileId,
          name: doc.file_name || `file_${fileId}`,
          mime: doc.mime_type || 'application/octet-stream',
          size: doc.file_size,
          path: fileInfo.file_path,
          date: new Date(update.message.date * 1000)
        });
      }
    }
    
    console.log(`Tìm thấy ${documents.length} file trong chat`);
    
    // Thông báo kết quả
    if (documents.length === 0) {
      try {
        await bot.telegram.sendMessage(chatId, '⚠️ Không tìm thấy file nào trong các tin nhắn gần đây');
      } catch (notifyErr) {
        console.warn('Lỗi khi gửi thông báo không tìm thấy file:', notifyErr.message);
      }
    } else {
      try {
        await bot.telegram.sendMessage(chatId, `🔎 Đã tìm thấy ${documents.length} file trong chat`);
      } catch (notifyErr) {
        console.warn('Lỗi khi gửi thông báo tìm thấy file:', notifyErr.message);
      }
    }
    
    return documents;
  } catch (error) {
    console.error('Lỗi khi lấy danh sách file từ chat:', error.message);
    throw error;
  }
}

/**
 * Đồng bộ các file từ Telegram
 * @returns {Promise<Object>} Kết quả đồng bộ hóa
 */
async function syncFiles() {
  console.log('===== BẮT ĐẦU ĐỒNG BỘ FILE =====');
  const results = {
    total: 0,
    new: 0,
    skipped: 0,
    errors: 0
  };
  
  try {
    // Kiểm tra và khởi tạo bot nếu chưa sẵn sàng
    if (!isBotActive()) {
      console.log('Bot không hoạt động, khởi tạo lại...');
      initBot();
      
      // Đợi bot khởi động
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Kiểm tra lại sau khi khởi động
      if (!isBotActive()) {
        throw new Error('Không thể khởi tạo bot Telegram');
      }
    }
    
    // Lấy danh sách file từ chat
    const files = await getFilesFromChat();
    results.total = files.length;
    
    if (files.length === 0) {
      console.log('Không có file nào để đồng bộ');
      return results;
    }
    
    console.log(`Tìm thấy ${files.length} file để đồng bộ`);
    
    // Tạo thư mục download nếu chưa tồn tại
    const downloadDir = path.join(process.cwd(), 'downloads');
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
      console.log(`Đã tạo thư mục downloads tại ${downloadDir}`);
    }
    
    // Đồng bộ từng file
    for (const file of files) {
      const fileName = file.name;
      const filePath = path.join(downloadDir, fileName);
      
      try {
        // Kiểm tra xem file đã tồn tại chưa
        if (fs.existsSync(filePath)) {
          console.log(`File ${fileName} đã tồn tại, bỏ qua`);
          results.skipped++;
          continue;
        }
        
        // Lấy URL file
        const fileUrl = await bot.telegram.getFileLink(file.id);
        
        // Tải file về
        console.log(`Đang tải file ${fileName}...`);
        const response = await axios({
          method: 'GET',
          url: fileUrl.href,
          responseType: 'stream'
        });
        
        // Lưu file
        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);
        
        await new Promise((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
        });
        
        console.log(`Đã tải xong file ${fileName}`);
        results.new++;
        
      } catch (error) {
        console.error(`Lỗi khi tải file ${fileName}:`, error.message);
        results.errors++;
      }
    }
    
    console.log(`===== KẾT QUẢ ĐỒNG BỘ: Tổng ${results.total}, Mới ${results.new}, Bỏ qua ${results.skipped}, Lỗi ${results.errors} =====`);
    return results;
    
  } catch (error) {
    console.error('Lỗi khi đồng bộ file:', error.message);
    results.errors++;
    return results;
  }
}

/**
 * Hiển thị hướng dẫn cách lấy chat ID đúng
 * @returns {String} Hướng dẫn cách nhận chat ID
 */
function getStartInstructions() {
  let instructions = '===== HƯỚNG DẪN THIẾT LẬP CHAT ID =====\n';
  instructions += '1. Tìm bot của bạn trên Telegram (@' + (bot?.botInfo?.username || 'lab1212_bot') + ')\n';
  instructions += '2. Nhắn tin với bot: /start\n';
  instructions += '3. Bot sẽ trả về chat ID của bạn\n';
  instructions += '4. Sao chép chat ID và cập nhật trong file .env\n';
  instructions += '========================================\n';
  return instructions;
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
  getFilesFromChat,
  updateChatId,
  syncFiles,
  getStartInstructions
}; 