/**
 * TeleDrive - Dịch vụ Telegram
 * File này quản lý tương tác với Telegram Bot API
 */

const { Telegraf } = require('telegraf');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const config = require('../config/config');

// Bot instance
let bot = null;
let botActive = false;

/**
 * Khởi tạo và kết nối đến Telegram Bot
 * @returns {Object} Bot instance và trạng thái
 */
async function startBot() {
  try {
    console.log('===== KHỞI TẠO BOT TELEGRAM =====');
    
    // Đảm bảo đã đọc file .env mới nhất
    dotenv.config({ path: path.resolve(process.cwd(), '.env') });
    
    // Lấy token bot và chat ID từ biến môi trường
    const botToken = process.env.BOT_TOKEN || '';
    const chatId = process.env.CHAT_ID || '';
    
    // Kiểm tra token và chat ID
    if (!botToken) {
      console.error('Lỗi: BOT_TOKEN không được cấu hình trong file .env');
      return { bot: null, botActive: false };
    }
    
    if (!chatId) {
      console.error('Lỗi: CHAT_ID không được cấu hình trong file .env');
      return { bot: null, botActive: false };
    }
    
    // Hiển thị một phần token để debug (không hiển thị toàn bộ vì lý do bảo mật)
    console.log(`Bot Token: ***${botToken.slice(-8)}`);
    console.log(`Chat ID: ${chatId}`);
    
    // Tạo instance mới của bot
    bot = new Telegraf(botToken);
    
    // Thiết lập các event handlers
    setupBotHandlers(bot);
    
    // Kết nối đến Telegram API
    console.log('Đang kết nối đến Telegram API...');
    
    try {
      // Kiểm tra kết nối bằng cách lấy thông tin bot
      const botInfo = await bot.telegram.getMe();
      console.log(`Kết nối thành công. Bot name: ${botInfo.first_name}`);
      
      // Khởi động bot
      bot.launch();
      botActive = true;
      
      // Thông báo đã khởi động bot thành công
      try {
        await bot.telegram.sendMessage(chatId, `🚀 TeleDrive Bot đã được khởi động\n🕒 ${new Date().toLocaleString('vi-VN')}`);
      } catch (msgError) {
        console.warn('Cảnh báo: Không thể gửi tin nhắn chào mừng', msgError.message);
        // Không dừng quá trình khởi tạo bot nếu không gửi được tin nhắn chào mừng
      }
      
      return { bot, botActive: true };
    } catch (error) {
      console.error('Lỗi khi kết nối đến Telegram API:', error.message);
      return { bot: null, botActive: false };
    }
  } catch (error) {
    console.error('Lỗi khi khởi tạo bot:', error);
    return { bot: null, botActive: false };
  }
}

/**
 * Thiết lập các event handlers cho bot
 * @param {Object} bot Bot instance
 */
function setupBotHandlers(bot) {
  // Xử lý lệnh /start
  bot.command('start', async (ctx) => {
    await ctx.reply('👋 Xin chào! Tôi là TeleDrive Bot. Tôi giúp lưu trữ file của bạn trên Telegram.');
    await ctx.reply('👉 Sử dụng /help để xem danh sách lệnh.');
  });
  
  // Xử lý lệnh /help
  bot.command('help', async (ctx) => {
    const helpText = `
📚 *TeleDrive Bot - Trợ giúp*

*Các lệnh có sẵn:*
- /start - Khởi động bot
- /help - Hiển thị trợ giúp
- /status - Kiểm tra trạng thái
- /count - Đếm số file đang lưu trữ

ℹ️ Bot này được quản lý tự động bởi TeleDrive.
    `;
    
    await ctx.replyWithMarkdown(helpText);
  });
  
  // Xử lý lệnh /status
  bot.command('status', async (ctx) => {
    await ctx.reply('✅ Bot đang hoạt động bình thường');
  });
  
  // Xử lý lệnh /count
  bot.command('count', async (ctx) => {
    try {
      // Đọc database files
      const dbPath = path.join(config.STORAGE_PATH, 'db', 'files.json');
      if (!fs.existsSync(dbPath)) {
        return ctx.reply('📂 Chưa có file nào được lưu trữ');
      }
      
      const data = fs.readFileSync(dbPath, 'utf8');
      const files = JSON.parse(data);
      
      if (!Array.isArray(files)) {
        return ctx.reply('📂 Chưa có file nào được lưu trữ');
      }
      
      // Đếm số file đã được đồng bộ
      const syncedFiles = files.filter(file => file.telegramFileId).length;
      
      await ctx.reply(`📊 *Thống kê lưu trữ*\n\n📂 Tổng số file: ${files.length}\n✅ Đã đồng bộ: ${syncedFiles}`, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Lỗi khi xử lý lệnh count:', error);
      await ctx.reply('❌ Có lỗi xảy ra khi đếm số file');
    }
  });
  
  // Xử lý khi tin nhắn được nhận
  bot.on('message', async (ctx) => {
    // Bỏ qua các tin nhắn không phải từ chatId đã cấu hình
    const chatId = process.env.CHAT_ID;
    if (ctx.chat.id.toString() !== chatId) {
      console.log(`Bỏ qua tin nhắn từ chat ID không được phép: ${ctx.chat.id}`);
      return;
    }
    
    const message = ctx.message;
    
    // Xử lý tin nhắn có file đính kèm
    if (message.document) {
      await ctx.reply(`📁 Đã nhận file: ${message.document.file_name}`);
    } else if (message.photo) {
      await ctx.reply('🖼️ Đã nhận hình ảnh');
    } else if (message.video) {
      await ctx.reply('🎥 Đã nhận video');
    } else if (message.audio) {
      await ctx.reply('🎵 Đã nhận audio');
    } else if (message.voice) {
      await ctx.reply('🎤 Đã nhận voice message');
    } else {
      // Nếu là tin nhắn văn bản bình thường (không phải lệnh)
      if (!message.text.startsWith('/')) {
        await ctx.reply('👋 Xin chào! Sử dụng /help để xem danh sách lệnh.');
      }
    }
  });
  
  // Xử lý lỗi
  bot.catch((err, ctx) => {
    console.error(`Lỗi bot cho ${ctx.updateType}`, err);
  });
}

/**
 * Kiểm tra xem bot có đang hoạt động không
 * @returns {boolean} Trạng thái hoạt động của bot
 */
function isBotActive() {
  return botActive;
}

/**
 * Lấy instance hiện tại của bot
 * @returns {Object} Bot instance
 */
function getBot() {
  return bot;
}

/**
 * Đặt instance mới cho bot
 * @param {Object} newBot Bot instance mới
 */
function setBot(newBot) {
  bot = newBot;
}

/**
 * Đặt trạng thái hoạt động mới cho bot
 * @param {boolean} active Trạng thái hoạt động mới
 */
function setBotActive(active) {
  botActive = active;
}

/**
 * Khởi động lại bot
 * @returns {Object} Kết quả khởi động lại
 */
async function restartBot() {
  try {
    console.log('===== KHỞI ĐỘNG LẠI BOT =====');
    
    // Dừng bot hiện tại nếu đang hoạt động
    if (bot && botActive) {
      console.log('Dừng bot hiện tại...');
      await bot.stop();
      bot = null;
      botActive = false;
    }
    
    // Khởi động lại bot
    const result = await startBot();
    return { 
      success: result.botActive, 
      message: result.botActive ? 'Khởi động lại bot thành công' : 'Không thể khởi động lại bot'
    };
  } catch (error) {
    console.error('Lỗi khi khởi động lại bot:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Gửi file lên Telegram
 * @param {string} filePath Đường dẫn đến file cần gửi
 * @param {string} caption Chú thích cho file
 * @returns {Object} Kết quả gửi file
 */
async function sendFileToTelegram(filePath, caption = '') {
  try {
    console.log(`===== GỬI FILE LÊN TELEGRAM =====`);
    console.log(`File path: ${filePath}`);
    
    // Kiểm tra bot và kết nối
    if (!bot || !botActive) {
      console.log('Bot không hoạt động, thử khởi tạo lại...');
      const result = await startBot();
      if (!result.botActive) {
        return { success: false, error: 'Bot không hoạt động' };
      }
      bot = result.bot;
      botActive = result.botActive;
    }
    
    // Kiểm tra sự tồn tại của file
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'File không tồn tại' };
    }
    
    // Lấy thông tin file
    const fileName = path.basename(filePath);
    const fileSize = fs.statSync(filePath).size;
    
    // Giới hạn kích thước file (50MB)
    const maxFileSize = config.MAX_FILE_SIZE;
    if (fileSize > maxFileSize) {
      return { success: false, error: `File quá lớn (${fileSize} bytes). Giới hạn là ${maxFileSize} bytes` };
    }
    
    // Lấy chat ID từ config
    const chatId = process.env.CHAT_ID;
    
    if (!chatId) {
      return { success: false, error: 'CHAT_ID không được cấu hình' };
    }
    
    console.log(`Đang gửi file ${fileName} (${fileSize} bytes) đến chat ${chatId}...`);
    
    // Số lần thử lại
    const maxRetries = config.TELEGRAM_RETRY_COUNT;
    let retries = 0;
    let lastError = null;
    
    // Thử gửi file với số lần thử lại
    while (retries < maxRetries) {
      try {
        // Gửi file lên Telegram
        const message = await bot.telegram.sendDocument(
          chatId,
          { source: filePath },
          { caption: caption || fileName }
        );
        
        // Lấy file_id từ kết quả
        const fileId = message.document.file_id;
        
        console.log(`Gửi file thành công. File ID: ${fileId}`);
        
        // Trả về thông tin file đã gửi
        return {
          success: true,
          fileId: fileId,
          messageId: message.message_id,
          fileInfo: message.document
        };
      } catch (error) {
        lastError = error;
        retries++;
        console.error(`Lần thử ${retries}/${maxRetries} - Lỗi khi gửi file:`, error.message);
        
        // Chờ một khoảng thời gian trước khi thử lại
        if (retries < maxRetries) {
          const delay = config.TELEGRAM_RETRY_DELAY;
          console.log(`Chờ ${delay}ms trước khi thử lại...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // Nếu tất cả các lần thử đều thất bại
    return {
      success: false,
      error: lastError ? lastError.message : 'Không thể gửi file sau nhiều lần thử',
      retries: retries
    };
  } catch (error) {
    console.error('Lỗi khi gửi file lên Telegram:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Lấy link tải file từ Telegram
 * @param {string} fileId ID của file trên Telegram
 * @returns {string} Link tải file
 */
async function getTelegramFileLink(fileId) {
  try {
    console.log(`===== LẤY LINK TẢI FILE TỪ TELEGRAM =====`);
    console.log(`File ID: ${fileId}`);
    
    // Kiểm tra bot và kết nối
    if (!bot || !botActive) {
      console.log('Bot không hoạt động, thử khởi tạo lại...');
      const result = await startBot();
      if (!result.botActive) {
        throw new Error('Bot không hoạt động');
      }
      bot = result.bot;
      botActive = result.botActive;
    }
    
    // Lấy thông tin file từ Telegram
    const file = await bot.telegram.getFile(fileId);
    
    // Lấy token bot từ config
    const botToken = process.env.BOT_TOKEN;
    
    if (!botToken) {
      throw new Error('BOT_TOKEN không được cấu hình');
    }
    
    // Tạo link tải file
    const fileLink = `https://api.telegram.org/file/bot${botToken}/${file.file_path}`;
    
    console.log(`Link tải file: ${fileLink}`);
    
    return fileLink;
  } catch (error) {
    console.error('Lỗi khi lấy link tải file từ Telegram:', error);
    throw error;
  }
}

module.exports = {
  startBot,
  isBotActive,
  getBot,
  setBot,
  setBotActive,
  restartBot,
  sendFileToTelegram,
  getTelegramFileLink
}; 