const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config();

const config = {
  // Server Configuration
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  sessionSecret: process.env.SESSION_SECRET || 'teledrive_session_secret',
  
  // Telegram Configuration
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID,
    botUsername: process.env.TELEGRAM_BOT_USERNAME,
    apiId: process.env.TELEGRAM_API_ID,
    apiHash: process.env.TELEGRAM_API_HASH,
    phoneNumber: process.env.TELEGRAM_PHONE_NUMBER,
    authCode: process.env.TELEGRAM_AUTH_CODE,
    password: process.env.TELEGRAM_PASSWORD,
    useQRCodeAuth: process.env.TELEGRAM_USE_QR_CODE_AUTH === 'true'
  },
  
  // File Configuration
  file: {
    maxSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 20 * 1024 * 1024, // 20MB default
    autoSync: process.env.AUTO_SYNC === 'true',
    syncInterval: parseInt(process.env.SYNC_INTERVAL, 10) || 60, // minutes
  },
  
  // Database Configuration
  db: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/teledrive',
  },
  
  // Logging Configuration
  logLevel: process.env.LOG_LEVEL || 'info',
  
  // Paths
  paths: {
    root: path.resolve(__dirname, '../../../'),
    uploads: path.resolve(__dirname, '../../../uploads'),
    downloads: path.resolve(__dirname, '../../../downloads'),
    temp: path.resolve(__dirname, '../../../temp'),
    data: path.resolve(__dirname, '../../../data'),
    logs: path.resolve(__dirname, '../../../logs'),
    public: path.resolve(__dirname, '../../../public'),
    views: path.resolve(__dirname, '../../../views'),
  },
};

// Validate required configuration
const validateConfig = () => {
  const required = [
    'sessionSecret',
  ];
  
  // Kiểm tra xem sử dụng bot token hay tài khoản người dùng
  if (process.env.USE_USER_AUTH === 'true') {
    required.push('telegram.apiId', 'telegram.apiHash', 'telegram.phoneNumber');
  } else {
    required.push('telegram.botToken', 'telegram.botUsername');
  }
  
  const missing = required.filter(key => {
    const keys = key.split('.');
    let value = config;
    for (const k of keys) {
      value = value[k];
      if (value === undefined || value === null || value === '' 
          || value === 'YOUR_BOT_TOKEN' || value === 'YOUR_BOT_USERNAME') {
        return true;
      }
    }
    return false;
  });
  
  if (missing.length > 0) {
    console.error(`Lỗi: Thiếu các thông tin cấu hình bắt buộc: ${missing.join(', ')}`);
    console.error('Vui lòng kiểm tra file .env hoặc biến môi trường. Dừng chương trình...');
    
    if (missing.includes('telegram.botToken') && !config.telegram.useUserAuth) {
      console.error(`
====================================================
LỖI CẤU HÌNH: TELEGRAM BOT TOKEN KHÔNG HỢP LỆ
====================================================
Token Telegram Bot không được cấu hình hoặc không hợp lệ.

Để lấy token:
1. Liên hệ với @BotFather trên Telegram
2. Tạo bot mới bằng lệnh /newbot
3. Sao chép token được cung cấp và đặt vào biến TELEGRAM_BOT_TOKEN trong file .env
4. Đặt TELEGRAM_BOT_USERNAME là username của bot (không bao gồm ký tự @)

Ví dụ:
TELEGRAM_BOT_TOKEN=1234567890:ABCDefGhIJklMnoPQRsTUVwxYZ
TELEGRAM_BOT_USERNAME=your_bot_name_bot
====================================================
`);
    }
    
    if (config.telegram.useUserAuth && (missing.includes('telegram.apiId') || missing.includes('telegram.apiHash'))) {
      console.error(`
====================================================
LỖI CẤU HÌNH: TELEGRAM API ID VÀ API HASH KHÔNG HỢP LỆ
====================================================
Để sử dụng tài khoản người dùng thông thường, bạn cần:
1. Truy cập https://my.telegram.org/auth
2. Đăng nhập và chọn "API development tools"
3. Tạo ứng dụng mới và nhận API ID và API HASH
4. Đặt thông tin vào file .env:

TELEGRAM_API_ID=123456
TELEGRAM_API_HASH=abcdef1234567890abcdef1234567890
USE_USER_AUTH=true
TELEGRAM_PHONE_NUMBER=+84xxxxxxxxx (bao gồm mã quốc gia)
====================================================
`);
    }
    
    if (config.telegram.useUserAuth && missing.includes('telegram.phoneNumber')) {
      console.error(`
====================================================
LỖI CẤU HÌNH: THIẾU SỐ ĐIỆN THOẠI TELEGRAM
====================================================
Để đăng nhập bằng tài khoản người dùng, bạn cần cung cấp số điện thoại:

TELEGRAM_PHONE_NUMBER=+84xxxxxxxxx (bao gồm mã quốc gia)
====================================================
`);
    }
    
    process.exit(1);
  }
  
  // Kiểm tra TDLib API ID và API Hash
  if (config.telegram.apiId && config.telegram.apiHash) {
    if (config.telegram.useUserAuth) {
      console.info('Đã phát hiện cấu hình đăng nhập bằng tài khoản Telegram - sẽ đăng nhập bằng số điện thoại');
    } else {
      console.info('Đã phát hiện Telegram API ID và API Hash - có thể sử dụng TDLib cho hiệu suất cao hơn');
    }
  }
};

module.exports = {
  config,
  validateConfig,
}; 