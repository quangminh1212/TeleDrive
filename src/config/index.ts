import dotenv from 'dotenv';
import path from 'path';

// Cấu hình dotenv
dotenv.config({ path: path.join(__dirname, '../../.env') });

const config = {
  // Server
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  apiUrl: process.env.API_URL || 'http://localhost:3000',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',

  // MongoDB
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/teledrive',
  
  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expire: process.env.JWT_EXPIRE || '7d',
  },

  // Telegram
  telegram: {
    apiId: Number(process.env.TELEGRAM_API_ID),
    apiHash: process.env.TELEGRAM_API_HASH || '',
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
  },

  // Storage
  storage: {
    maxFileSize: Number(process.env.MAX_FILE_SIZE || 2000000000), // 2GB
    chunkSize: Number(process.env.CHUNK_SIZE || 5242880), // 5MB
  },

  // Logger
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

export default config;
