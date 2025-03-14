const { Telegraf } = require('telegraf');
const dotenv = require('dotenv');

// Đọc cấu hình từ file .env
dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;

console.log('Kiểm tra kết nối với Telegram Bot...');
console.log('Token:', BOT_TOKEN ? BOT_TOKEN.substring(0, 8) + '...' : 'Không có');

if (!BOT_TOKEN || BOT_TOKEN === 'your_telegram_bot_token') {
  console.error('Bot token chưa được cấu hình. Vui lòng cập nhật file .env');
  process.exit(1);
}

// Khởi tạo bot
const bot = new Telegraf(BOT_TOKEN);

// Thiết lập timeout
const timeout = setTimeout(() => {
  console.error('Timeout khi kết nối đến Telegram API');
  process.exit(1);
}, 10000);

// Kiểm tra kết nối
bot.telegram.getMe()
  .then(botInfo => {
    clearTimeout(timeout);
    console.log('Kết nối thành công!');
    console.log('Thông tin bot:');
    console.log('- ID:', botInfo.id);
    console.log('- Username:', botInfo.username);
    console.log('- Tên:', botInfo.first_name);
    process.exit(0);
  })
  .catch(error => {
    clearTimeout(timeout);
    console.error('Lỗi kết nối đến Telegram API:', error.message);
    console.error('Chi tiết lỗi:', error);
    process.exit(1);
  }); 