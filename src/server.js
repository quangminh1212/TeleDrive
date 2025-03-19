const http = require('http');
const mongoose = require('mongoose');
const app = require('./app');
const { config } = require('./modules/common/config');
const logger = require('./modules/common/logger');
const { getClient: getTDLibClient } = require('./modules/storage/tdlib-client');

// Normalize port
const normalizePort = (val) => {
  const port = parseInt(val, 10);
  
  if (isNaN(port)) {
    return val;
  }
  
  if (port >= 0) {
    return port;
  }
  
  return false;
};

// Get port from environment and store in Express
const port = normalizePort(config.port);
app.set('port', port);

// Create HTTP server
const server = http.createServer(app);

// Khởi tạo TDLib client nếu có API ID và API Hash
async function initTDLib() {
  try {
    const tdlibClient = await getTDLibClient();
    
    if (tdlibClient) {
      logger.info('TDLib client đã được khởi tạo thành công.');
    } else {
      logger.info('TDLib client không khả dụng, sẽ sử dụng Bot API thông thường.');
    }
  } catch (error) {
    logger.error(`Lỗi khởi tạo TDLib client: ${error.message}`);
  }
}

// Kết nối MongoDB và khởi động server, cho phép chạy ứng dụng mà không cần MongoDB
async function start() {
  try {
    // Kết nối MongoDB
    try {
      await mongoose.connect(config.db.uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      logger.info(`Đã kết nối thành công đến MongoDB: ${config.db.uri}`);
    } catch (dbError) {
      logger.error(`Lỗi khi kết nối MongoDB: ${dbError.message}`);
      logger.warn('Ứng dụng sẽ chạy mà không có MongoDB. Một số tính năng sẽ không hoạt động.');
      
      // Sử dụng mock database nếu đang ở development mode
      if (config.nodeEnv === 'development') {
        try {
          const { setupMockDatabase } = require('./modules/db');
          setupMockDatabase();
          logger.info('Đã thiết lập mock database cho development');
        } catch (mockError) {
          logger.error(`Lỗi thiết lập mock database: ${mockError.message}`);
        }
      }
    }
    
    // Khởi tạo TDLib client (độc lập với MongoDB)
    await initTDLib();
    
    // Khởi động HTTP server
    server.listen(config.port, () => {
      logger.info(`Server đang chạy trên cổng ${config.port} (${config.nodeEnv})`);
    });
  } catch (error) {
    logger.error(`Lỗi khởi động server: ${error.message}`);
    process.exit(1);
  }
}

// Xử lý các sự kiện process
process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection tại: ${promise}, lý do: ${reason}`);
});

process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`);
  logger.error(error.stack);
});

// Xử lý tắt ứng dụng
process.on('SIGINT', async () => {
  logger.info('Đã nhận SIGINT, đang tắt ứng dụng...');
  
  try {
    // Đóng kết nối MongoDB
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      logger.info('Đã đóng kết nối MongoDB');
    }
    
    // Đóng HTTP server
    server.close(() => {
      logger.info('HTTP server đã đóng');
      process.exit(0);
    });
  } catch (error) {
    logger.error(`Lỗi khi tắt ứng dụng: ${error.message}`);
    process.exit(1);
  }
});

// Khởi động ứng dụng
start(); 