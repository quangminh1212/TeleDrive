const crypto = require('crypto');
const { Telegraf } = require('telegraf');
const { config } = require('../common/config');
const logger = require('../common/logger');
const User = require('../db/models/User');

// Initialize Telegram bot
const bot = new Telegraf(config.telegram.botToken);

// Create a map to store login requests
const loginRequests = new Map();

/**
 * Generate a login link with a random token
 * @param {string} callbackUrl - URL to redirect after login
 * @returns {Object} - Login data with token and URL
 */
const generateLoginLink = (callbackUrl = '/') => {
  // Generate a random token
  const token = crypto.randomBytes(32).toString('hex');
  
  // Set expiration time (30 minutes)
  const expiresAt = Date.now() + 30 * 60 * 1000;
  
  // Store login request
  loginRequests.set(token, {
    token,
    callbackUrl,
    expiresAt,
    used: false,
    user: null,
  });
  
  // Clean up old requests
  cleanupLoginRequests();
  
  // Return login data
  return {
    token,
    deepLink: `https://t.me/${config.telegram.botUsername}?start=login_${token}`,
    loginUrl: `https://t.me/${config.telegram.botUsername}?start=login_${token}`,
    expiresAt,
  };
};

/**
 * Verify a login token and retrieve the associated user
 * @param {string} token - Login token
 * @returns {Object|null} - Login request with user data if valid
 */
const verifyLoginToken = (token) => {
  // Check if token exists
  if (!loginRequests.has(token)) {
    return null;
  }
  
  // Get login request
  const request = loginRequests.get(token);
  
  // Check if token is expired
  if (request.expiresAt < Date.now()) {
    loginRequests.delete(token);
    return null;
  }
  
  // Check if token is already used
  if (request.used) {
    return null;
  }
  
  // Mark token as used
  request.used = true;
  loginRequests.set(token, request);
  
  return request;
};

/**
 * Process login from Telegram bot
 * @param {string} token - Login token
 * @param {Object} telegramUser - Telegram user data
 * @returns {Object|null} - Login request with user data if valid
 */
const processLogin = async (token, telegramUser) => {
  try {
    // Check if token exists
    if (!loginRequests.has(token)) {
      logger.warn(`Invalid login token: ${token}`);
      return null;
    }
    
    // Get login request
    const request = loginRequests.get(token);
    
    // Check if token is expired
    if (request.expiresAt < Date.now()) {
      logger.warn(`Expired login token: ${token}`);
      loginRequests.delete(token);
      return null;
    }
    
    // Check if token is already used
    if (request.used) {
      logger.warn(`Already used login token: ${token}`);
      return null;
    }
    
    // Find or create user
    const user = await User.findOrCreateUser(telegramUser);
    
    // Update login request
    request.user = user;
    request.used = true;
    loginRequests.set(token, request);
    
    logger.info(`User logged in: ${user.firstName} (${user.telegramId})`);
    
    return request;
  } catch (error) {
    logger.error(`Error processing login: ${error.message}`);
    return null;
  }
};

/**
 * Clean up expired login requests
 */
const cleanupLoginRequests = () => {
  const now = Date.now();
  
  // Remove expired requests
  for (const [token, request] of loginRequests.entries()) {
    if (request.expiresAt < now) {
      loginRequests.delete(token);
    }
  }
};

/**
 * Set up Telegram bot commands for authentication
 */
const setupAuthBot = () => {
  // Handle start command with login token
  bot.start(async (ctx) => {
    const text = ctx.message.text || '';
    
    // Check if it's a login request
    if (text.startsWith('/start login_')) {
      const token = text.substring('/start login_'.length);
      const user = ctx.from;
      
      // Process login
      const loginRequest = await processLogin(token, user);
      
      if (loginRequest) {
        ctx.reply(`Xin chào ${user.first_name}! Bạn đã đăng nhập thành công vào TeleDrive. Bây giờ bạn có thể quay lại trang web.`);
      } else {
        ctx.reply('Đường dẫn đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.');
      }
    } else {
      // Regular start command
      ctx.reply(`Xin chào ${ctx.from.first_name}! Đây là bot TeleDrive. Sử dụng ứng dụng web để quản lý file của bạn.`);
    }
  });
  
  // Help command
  bot.help((ctx) => {
    ctx.reply(`
TeleDrive Bot - Lưu trữ file qua Telegram

Lệnh:
/start - Khởi động bot
/help - Hiển thị trợ giúp
/status - Kiểm tra trạng thái kết nối

Bot này hoạt động cùng với ứng dụng web TeleDrive. Để sử dụng đầy đủ tính năng, vui lòng truy cập ứng dụng web.
    `);
  });
  
  // Status command
  bot.command('status', async (ctx) => {
    try {
      // Find user
      const user = await User.findByTelegramId(ctx.from.id);
      
      if (user) {
        // Format storage usage
        const usedGB = (user.storageUsed / (1024 * 1024 * 1024)).toFixed(2);
        const totalGB = (user.storageLimit / (1024 * 1024 * 1024)).toFixed(2);
        const percentage = user.getStoragePercentage().toFixed(1);
        
        ctx.reply(`
Trạng thái TeleDrive của bạn:

Người dùng: ${user.firstName} ${user.lastName || ''}
Dung lượng đã sử dụng: ${usedGB}GB / ${totalGB}GB (${percentage}%)
Loại tài khoản: ${user.isPremium ? 'Premium' : 'Miễn phí'}
Lần cuối hoạt động: ${user.lastSeen.toLocaleString()}
        `);
      } else {
        ctx.reply('Bạn chưa đăng ký TeleDrive. Vui lòng truy cập ứng dụng web để đăng ký.');
      }
    } catch (error) {
      logger.error(`Error in status command: ${error.message}`);
      ctx.reply('Có lỗi xảy ra khi kiểm tra trạng thái của bạn. Vui lòng thử lại sau.');
    }
  });
  
  // Start the bot
  bot.launch()
    .then(() => {
      logger.info(`Telegram bot started as @${config.telegram.botUsername}`);
    })
    .catch((error) => {
      logger.error(`Error starting Telegram bot: ${error.message}`);
    });
  
  // Enable graceful stop
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
};

module.exports = {
  generateLoginLink,
  verifyLoginToken,
  processLogin,
  setupAuthBot,
  bot,
}; 