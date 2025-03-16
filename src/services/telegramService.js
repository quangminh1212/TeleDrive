/**
 * TeleDrive - Dịch vụ Telegram Bot
 * File này quản lý tất cả các tương tác với Telegram Bot
 */

const { Telegraf } = require('telegraf');
const fs = require('fs');
const dotenv = require('dotenv');
const config = require('../config/config');

// Biến lưu trữ instance của bot
let bot = null;
let botActive = false;

/**
 * Khởi tạo Telegram Bot với timeout
 * @returns {Promise<Object|null>} Bot instance hoặc null nếu không thành công
 */
const initBot = () => {
  console.log('===== KHỞI TẠO TELEGRAM BOT =====');
  
  // Đọc lại file .env để đảm bảo có token mới nhất
  try {
    if (fs.existsSync('.env')) {
      console.log('Đọc cấu hình từ file .env');
      const envConfig = dotenv.parse(fs.readFileSync('.env'));
      if (envConfig.BOT_TOKEN) {
        process.env.BOT_TOKEN = envConfig.BOT_TOKEN;
        console.log('Đã cập nhật BOT_TOKEN từ file .env');
      } else {
        console.warn('BOT_TOKEN không tìm thấy trong file .env');
      }
      if (envConfig.CHAT_ID) {
        process.env.CHAT_ID = envConfig.CHAT_ID;
        console.log('Đã cập nhật CHAT_ID từ file .env');
      } else {
        console.warn('CHAT_ID không tìm thấy trong file .env');
      }
    } else {
      console.error('File .env không tồn tại');
    }
  } catch (e) {
    console.error('Không thể đọc file .env:', e.message);
  }
  
  // Lấy token từ biến môi trường hoặc config
  const botToken = process.env.BOT_TOKEN || config.telegram.botToken;
  
  console.log('Debug - Bot Token read from env:', botToken ? `${botToken.substring(0, 8)}...${botToken.substring(botToken.length - 5)}` : 'not set');
  
  if (!botToken || botToken === 'your_telegram_bot_token') {
    console.log('Bot token chưa được cấu hình. Vui lòng cập nhật file .env');
    return Promise.resolve(null);
  }
  
  try {
    console.log('Kiểm tra kết nối với Telegram API...');
    
    // Tạo đối tượng bot với timeout cho telegram api
    const newBot = new Telegraf(botToken, {
      telegram: { 
        apiRoot: 'https://api.telegram.org',
        timeout: 30000 // Tăng timeout lên 30 giây
      }
    });
    
    // Khi bot đã sẵn sàng
    newBot.launch()
      .then(async () => {
        const me = await newBot.telegram.getMe();
        console.log(`Kết nối thành công! Bot: @${me.username}`);
        
        console.log('Khởi động bot trong tiến trình riêng biệt...');
        
        // Khởi động bot trong tiến trình riêng biệt để không block main thread
        try {
          newBot.botInfo = me;
          console.log('Bot đã được khởi động trong tiến trình riêng biệt.');
          return newBot;
        } catch (error) {
          console.error('Lỗi khi khởi động bot trong tiến trình riêng:', error);
          return newBot;
        }
      })
      .catch(error => {
        console.error('Lỗi khởi động bot:', error.message);
        if (error.code === 401) {
          console.error('Token không hợp lệ hoặc đã bị thu hồi. Vui lòng kiểm tra BOT_TOKEN trong file .env');
        } else if (error.code === 'ETIMEOUT') {
          console.error('Timeout khi kết nối đến Telegram API. Vui lòng kiểm tra kết nối mạng');
        }
        console.log('Ứng dụng vẫn tiếp tục chạy mà không có bot.');
        return null;
      });
    
    return Promise.resolve(newBot);
  } catch (error) {
    console.error('Lỗi khi khởi tạo bot:', error);
    return Promise.resolve(null);
  }
};

/**
 * Hàm kiểm tra xem bot có hoạt động không
 * @returns {Promise<boolean>} Trạng thái hoạt động của bot
 */
const checkBotActive = async () => {
  console.log('Kiểm tra trạng thái hoạt động của bot...');
  
  if (!bot) {
    console.log('Bot không tồn tại hoặc token chưa được cấu hình');
    return false;
  }
  
  try {
    // Thiết lập timeout cho việc kiểm tra bot
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Timeout khi kiểm tra bot Telegram'));
      }, 5000); // 5 giây timeout
    });
    
    console.log('Gửi yêu cầu kiểm tra đến Telegram...');
    
    // Kiểm tra bot bằng cách lấy thông tin
    const checkPromise = bot.telegram.getMe()
      .then((botInfo) => {
        console.log(`Bot hoạt động bình thường: @${botInfo.username}`);
        return true;
      })
      .catch((error) => {
        console.error('Lỗi khi kiểm tra bot:', error.message);
        return false;
      });
    
    // Race giữa check và timeout
    const result = await Promise.race([checkPromise, timeoutPromise]);
    console.log(`Kết quả kiểm tra bot: ${result ? 'Hoạt động' : 'Không hoạt động'}`);
    return result;
  } catch (error) {
    console.error('Lỗi khi kiểm tra bot:', error);
    return false;
  }
};

/**
 * Gửi file đến Telegram
 * @param {Object} fileInfo Thông tin về file cần gửi
 * @param {String} fileInfo.path Đường dẫn đến file
 * @param {String} fileInfo.name Tên file
 * @param {String} fileInfo.type Loại file (image, video, audio, document)
 * @returns {Promise<Object>} Kết quả gửi file
 */
const sendFileToTelegram = async (fileInfo) => {
  const chatId = process.env.CHAT_ID || config.telegram.chatId;
  
  if (!bot || !botActive) {
    throw new Error('Bot không hoạt động hoặc chưa kết nối');
  }
  
  if (!chatId) {
    throw new Error('CHAT_ID chưa được cấu hình');
  }
  
  try {
    // Tạo caption với tên file đã được giải mã UTF-8 đúng
    let normalizedFileName = fileInfo.name;
    try {
      // Thử normalize tên file Unicode
      normalizedFileName = decodeURIComponent(escape(fileInfo.name));
    } catch(e) {
      console.log(`Không thể chuẩn hóa tên file: ${fileInfo.name}, sử dụng tên gốc`);
    }
    
    const caption = `File: ${normalizedFileName}`;
    const fileOptions = {
      source: fileInfo.path,
      filename: normalizedFileName
    };
    
    // Gửi tất cả file dưới dạng document để tránh lỗi PHOTO_INVALID_DIMENSIONS
    console.log(`Gửi file "${fileInfo.name}" như document để tránh lỗi format`);
    
    // Thiết lập timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout khi gửi file lên Telegram')), 120000); // 2 phút
    });
    
    // Gửi file
    const sendPromise = bot.telegram.sendDocument(chatId, fileOptions, { caption: caption });
    
    // Đợi kết quả hoặc timeout
    const result = await Promise.race([sendPromise, timeoutPromise]);
    
    return result;
  } catch (error) {
    console.error(`Lỗi khi gửi file "${fileInfo.name}" lên Telegram:`, error.message);
    throw error;
  }
};

/**
 * Lấy URL tải file từ Telegram
 * @param {String} fileId ID file trên Telegram
 * @returns {Promise<String>} URL tải file
 */
const getTelegramFileLink = async (fileId) => {
  if (!bot || !botActive) {
    throw new Error('Bot không hoạt động hoặc chưa kết nối');
  }
  
  try {
    const fileInfo = await bot.telegram.getFile(fileId);
    if (!fileInfo || !fileInfo.file_path) {
      throw new Error('Không thể lấy thông tin file từ Telegram');
    }
    
    // Tạo URL tải file
    const botToken = process.env.BOT_TOKEN || config.telegram.botToken;
    const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${fileInfo.file_path}`;
    
    return downloadUrl;
  } catch (error) {
    console.error(`Lỗi khi lấy link file Telegram (${fileId}):`, error.message);
    throw error;
  }
};

/**
 * Khởi chạy bot và thiết lập các handler
 */
const startBot = async () => {
  try {
    bot = await initBot();
    botActive = await checkBotActive();
    
    return {
      bot,
      botActive
    };
  } catch (error) {
    console.error('Lỗi khi khởi động bot:', error);
    return {
      bot: null,
      botActive: false
    };
  }
};

module.exports = {
  initBot,
  checkBotActive,
  sendFileToTelegram,
  getTelegramFileLink,
  startBot,
  getBot: () => bot,
  isBotActive: () => botActive,
  setBot: (newBot) => { bot = newBot },
  setBotActive: (status) => { botActive = status }
}; 