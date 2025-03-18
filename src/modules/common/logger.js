const winston = require('winston');
const path = require('path');
const fs = require('fs');
const { config } = require('./config');

// Ensure log directory exists
if (!fs.existsSync(config.paths.logs)) {
  fs.mkdirSync(config.paths.logs, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Create the logger
const logger = winston.createLogger({
  level: config.logLevel,
  format: logFormat,
  defaultMeta: { service: 'teledrive' },
  transports: [
    // Write logs with level 'error' and below to 'error.log'
    new winston.transports.File({ 
      filename: path.join(config.paths.logs, 'error.log'), 
      level: 'error' 
    }),
    // Write all logs to 'combined.log'
    new winston.transports.File({ 
      filename: path.join(config.paths.logs, 'combined.log') 
    }),
  ],
  exitOnError: false
});

// If we're not in production, also log to the console
if (config.nodeEnv !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

// Create a stream object with a 'write' function that will be used by morgan
logger.stream = {
  write: function(message) {
    // Remove trailing newline
    logger.info(message.trim());
  },
};

module.exports = logger; 