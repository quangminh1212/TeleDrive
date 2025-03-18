/**
 * Logger Module for TeleDrive
 * Provides consistent logging across the application
 */

const fs = require('fs-extra');
const path = require('path');
const config = require('../config');

// Ensure logs directory exists
const logsDir = config.LOGS_DIR;
fs.ensureDirSync(logsDir);

// Log levels
const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

// Current log level from config
const currentLogLevel = LOG_LEVELS[config.LOG_LEVEL] || LOG_LEVELS.info;

/**
 * Format the current timestamp for logging
 * @returns {string} Formatted timestamp
 */
function getTimestamp() {
  return new Date().toISOString();
}

/**
 * Write log to file
 * @param {string} message - Message to log
 * @param {string} level - Log level
 */
function writeToFile(message, level) {
  if (!config.LOG_TO_FILE) return;
  
  try {
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(logsDir, `${today}.log`);
    const timestamp = getTimestamp();
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
    
    fs.appendFileSync(logFile, logEntry);
  } catch (error) {
    console.error(`Error writing to log file: ${error.message}`);
  }
}

/**
 * Log a debug message
 * @param {string} message - Message to log
 */
function debug(message) {
  if (currentLogLevel <= LOG_LEVELS.debug) {
    const timestamp = getTimestamp();
    console.debug(`[${timestamp}] [DEBUG] ${message}`);
    writeToFile(message, 'debug');
  }
}

/**
 * Log an info message
 * @param {string} message - Message to log
 */
function info(message) {
  if (currentLogLevel <= LOG_LEVELS.info) {
    const timestamp = getTimestamp();
    console.info(`[${timestamp}] [INFO] ${message}`);
    writeToFile(message, 'info');
  }
}

/**
 * Log a warning message
 * @param {string} message - Message to log
 */
function warn(message) {
  if (currentLogLevel <= LOG_LEVELS.warn) {
    const timestamp = getTimestamp();
    console.warn(`[${timestamp}] [WARN] ${message}`);
    writeToFile(message, 'warn');
  }
}

/**
 * Log an error message
 * @param {string} message - Message to log
 * @param {Error} [error] - Optional error object
 */
function error(message, error) {
  if (currentLogLevel <= LOG_LEVELS.error) {
    const timestamp = getTimestamp();
    console.error(`[${timestamp}] [ERROR] ${message}`);
    
    if (error && error.stack) {
      console.error(error.stack);
    }
    
    writeToFile(message, 'error');
    if (error && error.stack) {
      writeToFile(error.stack, 'error');
    }
  }
}

/**
 * Generic log function
 * @param {string} message - Message to log
 * @param {string} [level='info'] - Log level
 */
function log(message, level = 'info') {
  switch (level.toLowerCase()) {
    case 'debug':
      debug(message);
      break;
    case 'info':
      info(message);
      break;
    case 'warn':
      warn(message);
      break;
    case 'error':
      error(message);
      break;
    default:
      info(message);
  }
}

module.exports = {
  debug,
  info,
  warn,
  error,
  log
}; 