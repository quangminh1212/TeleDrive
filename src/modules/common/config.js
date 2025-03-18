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
    'telegram.botToken',
    'telegram.chatId',
    'telegram.botUsername',
    'sessionSecret',
  ];
  
  const missing = required.filter(key => {
    const keys = key.split('.');
    let value = config;
    for (const k of keys) {
      value = value[k];
      if (value === undefined || value === null || value === '') {
        return true;
      }
    }
    return false;
  });
  
  if (missing.length > 0) {
    console.error(`Missing required configuration: ${missing.join(', ')}`);
    console.error('Please check your .env file or environment variables');
    process.exit(1);
  }
};

module.exports = {
  config,
  validateConfig,
}; 