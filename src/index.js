require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs-extra');
const path = require('path');
const logger = require('./utils/logger');
const commandHandler = require('./handlers/commandHandler');
const fileHandler = require('./handlers/fileHandler');
const menuHandler = require('./handlers/menuHandler');
const webServer = require('./web/server');

// Khởi tạo thông số bot
const token = process.env.TELEGRAM_BOT_TOKEN;
const storagePath = process.env.STORAGE_PATH || './storage';
const botUsername = process.env.BOT_USERNAME || 'teledrive_bot';
const webPort = process.env.WEB_PORT || 3000;

// Khởi tạo bot
const bot = new TelegramBot(token, { polling: true });

// Đảm bảo thư mục lưu trữ tồn tại
fs.ensureDirSync(storagePath);
fs.ensureDirSync(path.join(storagePath, 'users'));
logger.info('Thư mục lưu trữ đã được khởi tạo');

// Đảm bảo thư mục cho web interface tồn tại
fs.ensureDirSync(path.join(__dirname, 'web', 'public'));
fs.ensureDirSync(path.join(__dirname, 'web', 'public', 'css'));
fs.ensureDirSync(path.join(__dirname, 'web', 'public', 'images'));
fs.ensureDirSync(path.join(__dirname, 'web', 'views'));
logger.info('Thư mục web interface đã được khởi tạo');

// Khởi động web server
webServer.startServer();
logger.info(`Web interface đã được khởi động tại http://localhost:${webPort}`);

// Xử lý lệnh start
bot.onText(/\/start/, (msg) => {
    commandHandler.handleStart(bot, msg);
});

// Xử lý lệnh help
bot.onText(/\/help/, (msg) => {
    commandHandler.handleHelp(bot, msg);
});

// Xử lý lệnh list
bot.onText(/\/list/, (msg) => {
    commandHandler.handleList(bot, msg);
});

// Xử lý lệnh mkdir
bot.onText(/\/mkdir (.+)/, (msg, match) => {
    const folderName = match[1];
    commandHandler.handleMkdir(bot, msg, folderName);
});

// Xử lý lệnh cd
bot.onText(/\/cd (.+)/, (msg, match) => {
    const path = match[1];
    commandHandler.handleCd(bot, msg, path);
});

// Xử lý callback từ inline keyboards
bot.on('callback_query', (query) => {
    menuHandler.handleCallbackQuery(bot, query);
});

// Xử lý khi nhận được file
bot.on('document', (msg) => {
    fileHandler.handleFileUpload(bot, msg);
});

// Xử lý khi nhận được hình ảnh
bot.on('photo', (msg) => {
    fileHandler.handlePhotoUpload(bot, msg);
});

// Xử lý khi nhận được video
bot.on('video', (msg) => {
    fileHandler.handleVideoUpload(bot, msg);
});

// Xử lý khi nhận được audio
bot.on('audio', (msg) => {
    fileHandler.handleAudioUpload(bot, msg);
});

// Xử lý tin nhắn văn bản
bot.on('text', (msg) => {
    // Bỏ qua các lệnh đã được xử lý ở trên
    if (msg.text.startsWith('/')) return;
    
    // Xử lý văn bản thông thường hoặc lệnh không rõ ràng
    menuHandler.handleTextMessage(bot, msg);
});

// Thông báo khởi động thành công
logger.info(`Bot đã khởi động! @${botUsername}`); 