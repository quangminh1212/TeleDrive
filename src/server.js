const express = require('express');
const http = require('http');
const app = require('./app');
const mongoose = require('mongoose');
const logger = require('./modules/common/logger');
const { config } = require('./modules/common/config');
const { initTDLib } = require('./modules/storage/tdlib-client');
const { setupMockDatabase } = require('./modules/db');
const fs = require('fs');

// Create HTTP server
const server = http.createServer(app);

// Initialize TDLib (Telegram API library)
async function initializeApp() {
  try {
    logger.info('Initializing TDLib...');
    // Lấy instance của tdlibStorage
    const tdlibStorage = require('./modules/storage/tdlib-client').tdlibStorage;
    
    if (tdlibStorage) {
      // Gọi phương thức init() thay vì hàm initTDLib
      await tdlibStorage.init();
      logger.info('TDLib đã được khởi tạo và sẵn sàng sử dụng');
    } else {
      logger.warn('TDLib không thể khởi tạo, một số tính năng sẽ bị hạn chế');
    }
  } catch (error) {
    logger.error(`Error initializing TDLib: ${error.message}`);
  }
}

// Start server
async function start() {
  try {
    console.log('Starting server...');
    
    // Kết nối đến MongoDB
    if (config.db && config.db.uri) {
      try {
        console.log('Attempting to connect to MongoDB...');
        await mongoose.connect(config.db.uri);
        logger.info('Đã kết nối thành công đến MongoDB');
      } catch (mongoError) {
        console.log('MongoDB connection error:', mongoError.message);
        logger.error(`Lỗi khi kết nối MongoDB: ${mongoError.message}`);
        logger.warn('Ứng dụng sẽ chạy mà không có MongoDB. Một số tính năng sẽ không hoạt động.');
        
        // Thiết lập mock database cho development
        if (config.nodeEnv === 'development') {
          console.log('Setting up mock database for development...');
          logger.info('Setting up mock database for development');
          setupMockDatabase();
          logger.info('Đã thiết lập mock database cho development');
        }
      }
    } else {
      console.log('No MongoDB URI provided, using mock database');
      logger.warn('Không có URI MongoDB được cung cấp, sử dụng mock database');
      setupMockDatabase();
    }

    // Khởi tạo TDLib
    console.log('Initializing TDLib...');
    await initializeApp();
    console.log('TDLib initialization completed');

    // Lấy port từ environment hoặc sử dụng port mặc định
    const port = process.env.PORT || config.port || 3001;
    
    console.log(`Attempting to start server on port ${port}...`);

    // Khởi động server
    server.listen(port, '0.0.0.0', () => {
      console.log(`Server is now running on port ${port} (${config.nodeEnv})`);
      logger.info(`Server đang chạy trên cổng ${port} (${config.nodeEnv})`);
      
      // Log TDLib status
      const tdlibStorage = require('./modules/storage/tdlib-client').tdlibStorage;
      const tdlibAvailable = tdlibStorage !== null;
      if (tdlibAvailable) {
        logger.info('TDLib đang hoạt động - Có thể xử lý file lớn');
      } else {
        logger.warn('TDLib không khả dụng - Chức năng xử lý file lớn sẽ bị hạn chế');
      }
      
      console.log(`Server đang chạy trên cổng ${port} (${config.nodeEnv})`);
      console.log('TDLib status:', tdlibAvailable ? 'Available' : 'Not available');
      
      // Đảm bảo các thư mục tồn tại
      ensureDirectories();
    });
  } catch (error) {
    console.error('Critical error starting server:', error);
    logger.error(`Error starting server: ${error.message}`);
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Đảm bảo các thư mục tồn tại
function ensureDirectories() {
  const directories = [
    config.paths.uploads,
    config.paths.downloads,
    config.paths.temp,
    config.paths.data,
    config.paths.logs
  ];
  
  for (const dir of directories) {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
        logger.info(`Đã tạo thư mục: ${dir}`);
      } catch (error) {
        logger.warn(`Không thể tạo thư mục ${dir}: ${error.message}`);
      }
    }
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection tại: ${promise}, lý do: ${reason}`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`);
  logger.error(`Stack trace: ${error.stack}`);
  
  // Log to console as well for immediate feedback
  console.error('FATAL ERROR:', error);
  
  // Exit with error
  process.exit(1);
});

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', async () => {
  logger.info('Đã nhận SIGINT, đang tắt ứng dụng...');
  
  // Close server
  server.close(() => {
    logger.info('HTTP server đã đóng');
  });
  
  // Close MongoDB connection if connected
  if (mongoose.connection.readyState) {
    await mongoose.connection.close();
    logger.info('Kết nối MongoDB đã đóng');
  }
  
  process.exit(0);
});

// Start the server
start(); 