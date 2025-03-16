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
      
      // Nếu chưa có chat ID, tự động cập nhật
      if (!chatId) {
        console.log(`Người dùng ${userChatId} đang truy cập bot, tự động thiết lập chat ID`);
        chatId = userChatId.toString();
        
        try {
          // Cập nhật vào .env
          await config.updateEnv({
            TELEGRAM_CHAT_ID: chatId
          });
          await ctx.reply(`✅ Đã tự động cập nhật chat ID thành ${chatId}. Ứng dụng đã sẵn sàng để đồng bộ file.`);
          console.log(`Đã tự động cập nhật TELEGRAM_CHAT_ID thành ${chatId}`);
        } catch (configError) {
          console.error('Lỗi khi cập nhật file .env:', configError.message);
          await ctx.reply(`✅ Đã lưu chat ID ${chatId} (chỉ trong bộ nhớ, không lưu vào .env)`);
        }
      }
      // Kiểm tra nếu chat ID khác với cấu hình
      else if (userChatId.toString() !== chatId.toString()) {
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
      } else if (ctx.message.text) {
        // Nếu gửi tin nhắn văn bản và không có chat ID
        if (!chatId) {
          const userChatId = ctx.chat.id;
          console.log(`Nhận tin nhắn từ ${userChatId}, tự động thiết lập chat ID`);
          chatId = userChatId.toString();
          
          try {
            // Cập nhật vào .env
            config.updateEnv({
              TELEGRAM_CHAT_ID: chatId
            }).then(() => {
              ctx.reply(`✅ Đã tự động thiết lập chat ID: ${chatId}`);
              console.log(`Đã tự động cập nhật TELEGRAM_CHAT_ID thành ${chatId}`);
            }).catch(err => {
              console.error('Lỗi khi cập nhật file .env:', err.message);
              ctx.reply(`✅ Đã lưu chat ID ${chatId} (chỉ trong bộ nhớ, không lưu vào .env)`);
            });
          } catch (error) {
            console.error('Lỗi khi cập nhật chat ID:', error.message);
          }
        }
      }
    });
    
    // Biến để kiểm soát lỗi bot info
    let botInfoSet = false;
    
    // Khởi động bot với polling
    bot.launch({
      dropPendingUpdates: true,
      allowedUpdates: ['message', 'callback_query']
    }).then(() => {
      console.log(`Bot Telegram đã được khởi tạo thành công`);
      
      // Lấy thông tin bot
      bot.telegram.getMe().then(botInfo => {
        // Kiểm tra lại bot còn tồn tại không trước khi gán
        if (bot) {
          console.log(`Bot đã khởi tạo: ${botInfo.username} (${botInfo.first_name})`);
          bot.botInfo = botInfo;
          botInfoSet = true;
          
          if (chatId) {
            console.log(`Bot đang lắng nghe các tin nhắn từ chat ID: ${chatId}`);
          } else {
            console.log('Chưa có chat ID, hãy nhắn tin với bot để lấy chat ID');
            console.log(`Link truy cập bot: https://t.me/${botInfo.username}`);
            console.log(getStartInstructions());
          }
        } else {
          console.log('Bot đã bị hủy trước khi thiết lập thông tin');
        }
        
        isReady = bot !== null && botInfoSet;
      }).catch(err => {
        console.error('Lỗi khi lấy thông tin bot:', err.message);
        isReady = false;
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
        const tempBot = bot;
        // Đặt biến bot thành null trước để tránh các lỗi gọi lại sau khi đã dừng
        bot = null;
        isReady = false;
        
        // Dừng bot
        tempBot.stop('Dừng theo yêu cầu');
        console.log('Đã dừng bot thành công');
      } catch (err) {
        console.error('Lỗi khi dừng bot:', err.message);
        // Đảm bảo bot được set null dù có lỗi
        bot = null;
        isReady = false;
      }
    } else {
      console.log('Bot không được khởi tạo, không cần dừng');
      bot = null;
      isReady = false;
    }
    
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
 * Lấy danh sách file từ Telegram
 * @returns {Promise<Array>} Mảng chứa các file từ Telegram
 */
async function getFilesFromChat() {
  try {
    if (!bot) {
      throw new Error('Bot chưa được khởi tạo. Vui lòng khởi tạo bot trước.');
    }

    // Lấy chat ID từ config
    let validChatId = chatId || config.TELEGRAM_CHAT_ID;
    
    if (!validChatId) {
      console.log('Chưa thiết lập TELEGRAM_CHAT_ID. Đang thử tìm chat ID tự động...');
      
      // Thử lấy chat ID từ updates gần đây
      try {
        const updates = await bot.telegram.getUpdates({limit: 100});
        console.log(`Đã nhận ${updates.length} updates gần đây`);
        
        if (updates.length > 0) {
          // Lọc các chat IDs từ updates
          const chatIds = new Set();
          
          for (const update of updates) {
            if (update.message?.chat?.id) {
              chatIds.add(update.message.chat.id.toString());
            }
          }
          
          console.log(`Đã tìm thấy ${chatIds.size} chat IDs từ updates:`, [...chatIds]);
          
          // Thử từng chat ID
          for (const potentialChatId of chatIds) {
            try {
              // Thử gửi tin nhắn tới chat ID này
              await bot.telegram.sendMessage(
                potentialChatId,
                `Đang thử kết nối với chat ID: ${potentialChatId}`
              );
              
              console.log(`Tìm thấy chat ID hợp lệ: ${potentialChatId}`);
              validChatId = potentialChatId;
              
              // Lưu chat ID cho lần sau
              chatId = potentialChatId;
              
              // Thông báo cho người dùng cập nhật .env
              await bot.telegram.sendMessage(
                potentialChatId,
                `Chat ID của bạn là: ${potentialChatId}\n\nVui lòng cập nhật file .env với TELEGRAM_CHAT_ID=${potentialChatId}`
              );
              
              break;
            } catch (err) {
              console.log(`Chat ID ${potentialChatId} không hợp lệ: ${err.message}`);
            }
          }
        }
      } catch (updatesError) {
        console.error('Lỗi khi lấy updates:', updatesError.message);
      }
    }
    
    // Nếu vẫn không tìm thấy chat ID
    if (!validChatId) {
      console.log('Không tìm thấy chat ID hợp lệ nào. Vui lòng làm theo hướng dẫn để thiết lập chat ID.');
      console.log(getStartInstructions());
      return [];
    }
    
    console.log(`Đang tìm file trong chat ID: ${validChatId}`);
    
    // Biến để lưu danh sách file
    let fileList = [];
    
    // Phương pháp 1: Sử dụng getUpdates để lấy tin nhắn gần đây
    try {
      console.log('Phương pháp 1: Đang thử sử dụng getUpdates...');
      const updates = await bot.telegram.getUpdates({
        limit: 100,
        allowed_updates: ['message']
      });
      
      console.log(`Nhận được ${updates.length} updates từ getUpdates`);
      
      // Lọc ra các updates có chứa tin nhắn từ chat ID cần tìm
      const targetUpdates = updates.filter(update => 
        update.message?.chat?.id.toString() === validChatId.toString()
      );
      
      console.log(`Có ${targetUpdates.length} updates từ chat ID ${validChatId}`);
      
      // Lấy các file từ tin nhắn
      for (const update of targetUpdates) {
        if (update.message?.document) {
          console.log(`Tìm thấy file: ${update.message.document.file_name}`);
          fileList.push({
            id: update.message.document.file_id,
            name: update.message.document.file_name,
            size: update.message.document.file_size
          });
        }
      }
    } catch (updatesError) {
      console.error('Lỗi khi lấy updates:', updatesError.message);
    }
    
    // Phương pháp 2: Truy vấn trực tiếp API Telegram
    if (fileList.length === 0) {
      try {
        console.log('Phương pháp 2: Sử dụng API trực tiếp để lấy tin nhắn gần đây');
        const telegramToken = config.TELEGRAM_BOT_TOKEN;
        
        const response = await axios.get(`https://api.telegram.org/bot${telegramToken}/getUpdates?limit=100&allowed_updates=["message"]`);
        
        if (response.data && response.data.ok && response.data.result) {
          const apiUpdates = response.data.result;
          console.log(`Nhận được ${apiUpdates.length} updates từ API trực tiếp`);
          
          // Lọc tin nhắn từ chat ID cần tìm
          const filteredUpdates = apiUpdates.filter(update => 
            update.message?.chat?.id.toString() === validChatId.toString()
          );
          
          console.log(`Có ${filteredUpdates.length} tin nhắn từ chat ID ${validChatId}`);
          
          // Lấy các file từ tin nhắn
          for (const update of filteredUpdates) {
            if (update.message?.document) {
              const doc = update.message.document;
              console.log(`Tìm thấy file: ${doc.file_name}`);
              
              // Kiểm tra trùng lặp
              const exists = fileList.some(f => f.id === doc.file_id);
              if (!exists) {
                fileList.push({
                  id: doc.file_id,
                  name: doc.file_name,
                  size: doc.file_size
                });
              }
            }
          }
        }
      } catch (apiError) {
        console.error('Lỗi khi truy vấn API Telegram:', apiError.message);
      }
    }
    
    // Nếu vẫn không tìm thấy file, thử gửi tin nhắn thông báo
    if (fileList.length === 0) {
      try {
        await bot.telegram.sendMessage(
          validChatId,
          'Không tìm thấy file nào trong cuộc trò chuyện này. Vui lòng gửi file đính kèm để tiến hành đồng bộ.'
        );
        console.log('Đã gửi thông báo yêu cầu gửi file');
      } catch (sendError) {
        console.error(`Không thể gửi tin nhắn đến chat ID ${validChatId}:`, sendError.message);
        throw new Error(`Chat ID không tồn tại: ${validChatId}. Vui lòng kiểm tra lại.`);
      }
    }
    
    console.log(`Tìm thấy tổng cộng ${fileList.length} file`);
    return fileList;
  } catch (error) {
    console.error('Lỗi khi lấy danh sách file từ Telegram:', error.message);
    throw error;
  }
}

/**
 * Đồng bộ các file từ Telegram
 * @returns {Promise<Object>} Kết quả đồng bộ hóa
 */
async function syncFiles() {
  console.log('===== BẮT ĐẦU ĐỒNG BỘ FILES =====');
  const results = {
    total: 0,
    new: 0,
    skipped: 0,
    errors: 0
  };
  
  try {
    // Kiểm tra và khởi tạo bot nếu chưa sẵn sàng
    if (!isBotActive()) {
      console.log('Bot không hoạt động, thử khởi động lại...');
      initBot();
      
      // Đợi bot khởi động với timeout
      const timeout = 5000; // 5 giây
      const startTime = Date.now();
      
      while (!isBotActive() && (Date.now() - startTime < timeout)) {
        // Đợi 200ms mỗi lần kiểm tra
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Kiểm tra nếu vẫn không hoạt động sau khi đợi
      if (!isBotActive()) {
        if (Date.now() - startTime >= timeout) {
          console.error('Không thể khởi động bot Telegram do timeout');
        } else {
          console.error('Không thể khởi động bot Telegram');
        }
        return results;
      }
      
      console.log('Đã khởi động lại bot thành công, tiếp tục đồng bộ');
    }
    
    // Đồng bộ từ local lên Telegram
    console.log('===== ĐỒNG BỘ TỪ LOCAL LÊN TELEGRAM =====');
    // TODO: Triển khai đồng bộ từ local lên Telegram
    
    // Đồng bộ từ Telegram xuống local
    console.log('===== ĐỒNG BỘ TỪ TELEGRAM XUỐNG LOCAL =====');
    
    // Retry lấy danh sách file nếu cần
    let files = [];
    let retries = 0;
    const maxRetries = 3;
    
    while (retries < maxRetries) {
      try {
        // Lấy danh sách file từ chat
        files = await getFilesFromChat();
        
        if (files.length > 0) {
          // Nếu tìm thấy file, không cần retry nữa
          break;
        } else {
          console.log(`Không tìm thấy file nào (lần thử ${retries + 1}/${maxRetries})`);
          
          // Nếu chưa có chat ID, không cần thử lại
          if (!chatId) {
            console.log('Chưa có chat ID, không thể đồng bộ file. Vui lòng thiết lập chat ID trước.');
            console.log(getStartInstructions());
            break;
          }
          
          retries++;
          
          if (retries < maxRetries) {
            // Đợi trước khi thử lại
            console.log(`Đợi 5 giây trước khi thử lại...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        }
      } catch (fetchError) {
        console.error(`Lỗi khi lấy danh sách file (lần thử ${retries + 1}/${maxRetries}):`, fetchError.message);
        
        retries++;
        
        if (retries < maxRetries) {
          // Thử khởi động lại bot trước khi retry
          console.log('Khởi động lại bot trước khi thử lại...');
          stopBot();
          await new Promise(resolve => setTimeout(resolve, 1000));
          initBot();
          
          // Đợi bot khởi động với timeout
          const timeout = 3000; // 3 giây
          const startTime = Date.now();
          
          while (!isBotActive() && (Date.now() - startTime < timeout)) {
            // Đợi 200ms mỗi lần kiểm tra
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
      }
    }
    
    results.total = files.length;
    
    if (files.length === 0) {
      console.log('Không tìm thấy file nào trên Telegram hoặc không thể lấy danh sách file');
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
    
    console.log(`===== KẾT THÚC ĐỒNG BỘ FILES =====`);
    console.log(`Đã đồng bộ: ${results.total} | File mới: ${results.new} | Lỗi: ${results.errors} | Bỏ qua: ${results.skipped}`);
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
  const botUsername = bot?.botInfo?.username || 'lab1212_bot';
  const botUrl = config.TELEGRAM_BOT_URL || `https://t.me/${botUsername}`;
  
  let instructions = '===== HƯỚNG DẪN THIẾT LẬP CHAT ID =====\n';
  instructions += `1. Mở Telegram và truy cập bot tại: ${botUrl}\n`;
  instructions += '2. Nhắn tin với bot: /start\n';
  instructions += '3. Bot sẽ trả về chat ID của bạn\n';
  instructions += '4. Sao chép chat ID và cập nhật trong file .env với khóa TELEGRAM_CHAT_ID\n';
  instructions += '5. Khởi động lại ứng dụng\n';
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