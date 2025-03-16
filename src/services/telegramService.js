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
    
    // Dừng bot cũ nếu tồn tại
    if (bot) {
      try {
        stopBot();
        console.log('Đã dừng bot cũ để tránh xung đột');
      } catch (stopErr) {
        console.error('Lỗi khi dừng bot cũ:', stopErr.message);
      }
    }
    
    // Reset trạng thái
    isReady = false;
    bot = null;
    
    const telegramToken = config.TELEGRAM_BOT_TOKEN;
    let targetChatId = config.TELEGRAM_CHAT_ID;
    
    if (!telegramToken || !targetChatId) {
      console.error('Thiếu cấu hình Telegram Bot. Vui lòng kiểm tra .env');
      return null;
    }
    
    console.log(`Đang khởi tạo bot với token: ${telegramToken.slice(0, 5)}...${telegramToken.slice(-5)}`);
    console.log(`Chat ID cấu hình: ${targetChatId}`);
    
    // Chuẩn hóa chat ID
    targetChatId = targetChatId.toString();
    
    // Tạo instance bot mới
    bot = new Telegraf(telegramToken);
    chatId = targetChatId;
    
    // Cấu hình sự kiện
    configureBot();
    
    // Kiểm tra thông tin bot (đồng bộ)
    try {
      const meResponse = require('axios').get(`https://api.telegram.org/bot${telegramToken}/getMe`);
      const botInfo = meResponse.data && meResponse.data.result;
      
      if (botInfo) {
        console.log(`Bot đã khởi tạo: ${botInfo.username} (${botInfo.first_name})`);
        bot.botInfo = botInfo;
      }
    } catch (infoError) {
      console.warn('Không thể lấy thông tin bot (đồng bộ):', infoError.message);
    }
    
    // Xóa webhook trước khi khởi động polling
    try {
      require('axios').post(`https://api.telegram.org/bot${telegramToken}/deleteWebhook?drop_pending_updates=true`);
      console.log('Đã xóa webhook để tránh xung đột');
    } catch (webhookError) {
      console.warn('Lỗi khi xóa webhook:', webhookError.message);
    }
    
    // Khởi động bot với polling
    bot.launch({
      dropPendingUpdates: true,
      allowedUpdates: ['message', 'callback_query']
    }).then(() => {
      console.log(`Bot Telegram đã được khởi tạo thành công`);
      console.log(`Bot đang lắng nghe các tin nhắn từ chat ID: ${targetChatId}`);
      isReady = true;
      
      // Gửi ping định kỳ để giữ bot hoạt động
      if (global.botKeepAliveInterval) {
        clearInterval(global.botKeepAliveInterval);
      }
      
      global.botKeepAliveInterval = setInterval(() => {
        if (bot && isReady) {
          bot.telegram.getMe()
            .then(() => console.log('Bot keep-alive: OK'))
            .catch(err => console.error('Bot keep-alive failed:', err.message));
        }
      }, 60000); // Ping mỗi phút
    }).catch(err => {
      console.error(`Không thể khởi động bot: ${err.message}`);
      isReady = false;
      bot = null;
    });
    
    return bot;
  } catch (error) {
    console.error('Lỗi khi khởi tạo Telegram Bot:', error);
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
 * Dừng bot Telegram
 */
function stopBot() {
  try {
    // Xóa interval keep-alive
    if (global.botKeepAliveInterval) {
      clearInterval(global.botKeepAliveInterval);
      global.botKeepAliveInterval = null;
    }
    
    // Dừng bot nếu đang hoạt động
    if (bot) {
      bot.stop();
      console.log('Bot Telegram đã dừng');
    }
    
    // Reset trạng thái
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
  try {
    if (!bot) {
      console.log('Bot chưa được khởi tạo');
      return false;
    }
    
    // Kiểm tra xem bot có đang hoạt động hay không (polling)
    if (!bot.botInfo) {
      console.log('Bot không có thông tin, có thể chưa sẵn sàng');
      return false;
    }
    
    // Kiểm tra thêm biến isReady để đảm bảo bot đã hoàn thành quá trình khởi tạo
    if (!isReady) {
      console.log('Bot chưa hoàn thành quá trình khởi tạo');
      return false;
    }
    
    console.log('Bot đang hoạt động bình thường');
    return true;
  } catch (error) {
    console.error('Lỗi khi kiểm tra trạng thái bot:', error);
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

    console.log(`Đang thử lấy các file gần đây từ chat ID: ${chatId}`);
    
    // Kiểm tra kết nối với chat 
    let targetChatId = chatId;
    let isChatValid = false;

    // Thử với định dạng chat ID hiện tại
    try {
      await bot.telegram.getChat(targetChatId);
      console.log(`Đã xác thực chat ID: ${targetChatId}`);
      isChatValid = true;
    } catch (chatError) {
      console.error(`Không thể kết nối tới chat ID ${targetChatId}: ${chatError.message}`);
      
      // Thử với định dạng khác (thêm hoặc bỏ dấu -)
      const altChatId = targetChatId.toString().startsWith('-') ? 
        targetChatId.toString().substring(1) : 
        `-${targetChatId.toString()}`;
      
      console.log(`Thử kết nối với chat ID thay thế: ${altChatId}`);
      
      try {
        await bot.telegram.getChat(altChatId);
        console.log(`Đã xác thực chat ID thay thế: ${altChatId}`);
        targetChatId = altChatId;
        isChatValid = true;
        
        // Cập nhật lại chatId
        await updateChatId(altChatId);
      } catch (altChatError) {
        console.error(`Không thể kết nối tới chat với cả hai định dạng ID: ${altChatError.message}`);
      }
    }
    
    if (!isChatValid) {
      console.error('Không thể xác thực chat ID, vui lòng kiểm tra lại cấu hình và quyền của bot');
      return [];
    }
    
    // Gửi tin nhắn thông báo
    let lastMessageId = 0;
    try {
      const sentMessage = await bot.telegram.sendMessage(targetChatId, 'Đang đồng bộ các file... Vui lòng đợi trong giây lát.');
      console.log('Đã gửi tin nhắn thông báo đến chat');
      lastMessageId = sentMessage.message_id;
    } catch (messageError) {
      console.error(`Không thể gửi tin nhắn đến chat: ${messageError.message}`);
      // Tiếp tục ngay cả khi không gửi được tin nhắn
    }
    
    // Phương pháp 1: Sử dụng direct API call thay vì Telegraf wrapper
    try {
      // Nếu có lastMessageId, sử dụng nó để lấy các tin nhắn trước đó
      if (lastMessageId > 0) {
        console.log(`Đang sử dụng ID tin nhắn gần nhất (${lastMessageId}) để tìm file...`);
        
        // Sử dụng axios để gọi trực tiếp API Telegram
        const telegramToken = config.TELEGRAM_BOT_TOKEN;
        const baseUrl = `https://api.telegram.org/bot${telegramToken}`;
        
        // Tìm các tin nhắn gần đây
        const recentMessages = [];
        
        // Lấy khoảng 20 tin nhắn gần nhất (limit theo Telegram API)
        for (let offset = 0; offset < 5; offset++) {
          try {
            const response = await axios.get(`${baseUrl}/getUpdates`, {
              params: {
                offset: -20 * (offset + 1),
                limit: 20,
                allowed_updates: ['message']
              }
            });
            
            if (response.data && response.data.ok && response.data.result) {
              const updates = response.data.result;
              
              // Lọc updates có chứa document và đúng chat ID
              const validUpdates = updates.filter(update => 
                update.message && 
                update.message.chat && 
                (update.message.chat.id.toString() === targetChatId.toString() ||
                 update.message.chat.id.toString() === targetChatId.toString().replace(/^-/, '') ||
                 update.message.chat.id.toString() === `-${targetChatId.toString().replace(/^-/, '')}`) && 
                update.message.document
              );
              
              if (validUpdates.length > 0) {
                console.log(`Tìm thấy ${validUpdates.length} updates có chứa file từ API trực tiếp`);
                recentMessages.push(...validUpdates.map(u => u.message));
              }
            }
          } catch (err) {
            console.error(`Lỗi khi lấy updates offset ${offset}:`, err.message);
            break;
          }
        }
        
        // Nếu tìm được message có document
        if (recentMessages.length > 0) {
          console.log(`Tìm thấy tổng cộng ${recentMessages.length} tin nhắn có chứa file`);
          
          // Chuyển đổi thành định dạng thông tin file
          const files = await Promise.all(recentMessages.map(async (message) => {
            const document = message.document;
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
                date: new Date(message.date * 1000).toISOString()
              };
            } catch (error) {
              console.error(`Lỗi khi lấy đường dẫn cho file ID ${fileId}:`, error);
              return null;
            }
          }));
          
          // Lọc bỏ các null
          return files.filter(f => f !== null);
        }
        
        // Nếu không tìm thấy file, thử phương pháp 2
        console.log('Không tìm thấy file trong updates, chuyển sang phương pháp thay thế...');
      }
      
      // Phương pháp 2: Sử dụng getUpdates thông qua Telegraf
      console.log('Đang thử phương pháp getUpdates...');
      const updates = await bot.telegram.getUpdates({ 
        limit: limit, 
        allowed_updates: ['message'],
        timeout: 5 // Giảm timeout để tránh chờ quá lâu
      });
      
      // Lọc updates có chứa document và đúng chat ID
      const validChatIds = [targetChatId.toString()];
      if (targetChatId.toString().startsWith('-')) {
        validChatIds.push(targetChatId.toString().substring(1));
      } else {
        validChatIds.push(`-${targetChatId.toString()}`);
      }
      
      const fileUpdates = updates.filter(update => 
        update.message && 
        update.message.chat && 
        validChatIds.includes(update.message.chat.id.toString()) && 
        update.message.document
      );
      
      if (fileUpdates.length > 0) {
        console.log(`Tìm thấy ${fileUpdates.length} file từ getUpdates`);
        
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
      
      // Nếu không tìm thấy file, gửi tin nhắn hướng dẫn
      console.log('Không tìm thấy file nào trong các phương pháp thử. Gửi hướng dẫn cho người dùng...');
      await bot.telegram.sendMessage(targetChatId, 
        'Không tìm thấy file nào trong lịch sử gần đây. Vui lòng gửi file vào chat này để đồng bộ.');
      
      return [];
    } catch (error) {
      console.error('Lỗi khi lấy danh sách file từ Telegram:', error.message);
      
      // Gửi thông báo cho người dùng
      try {
        await bot.telegram.sendMessage(targetChatId, 
          'Không thể lấy lịch sử file tự động. Vui lòng gửi lại các file vào chat này để đồng bộ.');
      } catch (notifyError) {
        console.error('Không thể gửi thông báo:', notifyError.message);
      }
      
      return [];
    }
  } catch (error) {
    console.error('Lỗi không xác định khi lấy danh sách file từ Telegram:', error);
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
  getFilesFromChat,
  updateChatId
}; 