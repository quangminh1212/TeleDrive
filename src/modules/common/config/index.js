/**
 * Configuration for TeleDrive
 * Loads environment variables and provides default values
 */

require('dotenv').config();
const path = require('path');

// Base paths
const ROOT_DIR = path.resolve(__dirname, '../../../../');
const DATA_DIR = path.join(ROOT_DIR, process.env.DATA_DIR || 'data');
const TEMP_DIR = path.join(ROOT_DIR, process.env.TEMP_DIR || 'temp');
const STORAGE_DIR = path.join(ROOT_DIR, 'storage');
const UPLOADS_DIR = path.join(ROOT_DIR, 'uploads');
const DOWNLOADS_DIR = path.join(ROOT_DIR, 'downloads');
const LOGS_DIR = path.join(ROOT_DIR, 'logs');

const config = {
  // Server configuration
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Telegram configuration
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID,
  TELEGRAM_BOT_USERNAME: process.env.TELEGRAM_BOT_USERNAME,
  
  // Authentication
  ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'admin',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'password',
  SESSION_SECRET: process.env.SESSION_SECRET || 'teledrive-secret-key',
  
  // Paths
  ROOT_DIR,
  DATA_DIR,
  TEMP_DIR,
  STORAGE_DIR,
  UPLOADS_DIR,
  DOWNLOADS_DIR,
  LOGS_DIR,
  DB_DIR: path.join(DATA_DIR, 'db'),
  TEMP_UPLOADS_DIR: path.join(TEMP_DIR, 'uploads'),
  TEMP_DOWNLOADS_DIR: path.join(TEMP_DIR, 'downloads'),
  
  // Storage configuration
  STORAGE_PATH: DATA_DIR,
  CLEAN_DOWNLOADS: process.env.CLEAN_DOWNLOADS !== 'false', // Default to true
  DOWNLOAD_EXPIRY: parseInt(process.env.DOWNLOAD_EXPIRY || '60'), // Minutes
  
  // Sync configuration
  AUTO_SYNC: process.env.AUTO_SYNC !== 'false' || process.env.ENABLE_AUTO_SYNC === 'true', // Default to true
  SYNC_INTERVAL: parseInt(process.env.SYNC_INTERVAL || '60'), // Minutes
  
  // Cleanup configuration
  AUTO_CLEANUP: process.env.AUTO_CLEANUP !== 'false', // Default to true
  CLEANUP_INTERVAL: parseInt(process.env.CLEANUP_INTERVAL || '120'), // Minutes
  TRASH_RETENTION: parseInt(process.env.TRASH_RETENTION || '30'), // Days
  
  // Logging
  LOG_TO_FILE: process.env.LOG_TO_FILE === 'true', // Default to false
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  
  // API configuration
  API_RATE_LIMIT: parseInt(process.env.API_RATE_LIMIT || '100'), // Requests per minute
  API_TIMEOUT: parseInt(process.env.API_TIMEOUT || '30000'), // Milliseconds
  
  // File size limits
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '20971520'), // 20MB default
};

// Validate required configuration
const validateConfig = () => {
  const requiredVars = ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'];
  const missing = requiredVars.filter(varName => !config[varName]);
  
  if (missing.length > 0) {
    console.warn(`Missing required environment variables: ${missing.join(', ')}`);
    console.warn('Some features may not work correctly without these variables.');
  }
};

validateConfig();

module.exports = config; 