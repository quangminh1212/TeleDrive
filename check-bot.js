const { Telegraf } = require('telegraf');
const dotenv = require('dotenv');

// Đọc cấu hình từ file .env
dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;

console.log('Kiểm tra kết nối với Telegram Bot...');
console.log('Token:', BOT_TOKEN ? BOT_TOKEN.substring(0, 10) + '...' : 'Không có');

if (!BOT_TOKEN) {
  console.error('Bot token chưa được cấu hình. Vui lòng cập nhật file .env');
  process.exit(1);
}

// Khởi tạo bot
const bot = new Telegraf(BOT_TOKEN);

// Kiểm tra kết nối
bot.telegram.getMe()
  .then(botInfo => {
    console.log('Kết nối thành công!');
    console.log('Thông tin bot:');
    console.log('- ID:', botInfo.id);
    console.log('- Username:', botInfo.username);
    console.log('- Tên:', botInfo.first_name);
    
    // Thử khởi động bot với chế độ polling
    console.log('Đang thử khởi động bot với chế độ polling...');
    return bot.launch();
  })
  .then(() => {
    console.log('Bot đã khởi động thành công!');
    console.log('Nhắn tin cho @' + bot.botInfo.username + ' để kiểm tra.');
    
    // Thêm handler để kiểm tra
    bot.on('message', (ctx) => {
      console.log('Đã nhận tin nhắn:', ctx.message.text);
      ctx.reply('Đã nhận được tin nhắn của bạn: ' + ctx.message.text);
    });
    
    // Giữ quy trình chạy
    console.log('Bot đang chạy. Nhấn Ctrl+C để dừng.');
  })
  .catch(error => {
    console.error('Lỗi kết nối đến Telegram API:', error.message);
    console.error('Chi tiết lỗi:', error);
    process.exit(1);
  }); 