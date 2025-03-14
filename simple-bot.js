const { Telegraf } = require('telegraf');
const dotenv = require('dotenv');

// Đọc cấu hình từ file .env
dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;

console.log('Khởi động bot đơn giản...');
console.log('Token:', BOT_TOKEN ? BOT_TOKEN.substring(0, 10) + '...' : 'Không có');

// Khởi tạo bot
const bot = new Telegraf(BOT_TOKEN);

// Thêm handlers đơn giản
bot.start((ctx) => ctx.reply('Xin chào! Bot đang hoạt động.'));
bot.help((ctx) => ctx.reply('Đây là bot kiểm tra.'));
bot.on('message', (ctx) => {
  console.log('Đã nhận tin nhắn:', ctx.message.text);
  ctx.reply('Đã nhận được tin nhắn của bạn: ' + ctx.message.text);
});

// Khởi động bot
bot.launch()
  .then(() => {
    console.log('Bot đã khởi động thành công!');
    console.log('Nhắn tin cho @' + bot.botInfo.username + ' để kiểm tra.');
  })
  .catch(error => {
    console.error('Lỗi khởi động bot:', error);
  });

// Bắt sự kiện khi dừng
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM')); 