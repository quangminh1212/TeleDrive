const express = require('express');
const http = require('http');
const app = require('./app');
const mongoose = require('mongoose');
const logger = require('./modules/common/logger');
const { config } = require('./modules/common/config');
const { initTDLib } = require('./modules/storage/tdlib-client');
const { setupMockDatabase } = require('./modules/db');

// Create HTTP server
const server = http.createServer(app);

// Initialize TDLib (Telegram API library)
async function initializeApp() {
  try {
    logger.info('Initializing TDLib...');
    const tdlib = await initTDLib();
    if (tdlib) {
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
    // Kết nối đến MongoDB
    if (config.db && config.db.uri) {
      try {
        await mongoose.connect(config.db.uri);
        logger.info('Đã kết nối thành công đến MongoDB');
      } catch (mongoError) {
        logger.error(`Lỗi khi kết nối MongoDB: ${mongoError.message}`);
        logger.warn('Ứng dụng sẽ chạy mà không có MongoDB. Một số tính năng sẽ không hoạt động.');
        
        // Thiết lập mock database cho development
        if (config.nodeEnv === 'development') {
          logger.info('Setting up mock database for development');
          setupMockDatabase();
          logger.info('Đã thiết lập mock database cho development');
        }
      }
    } else {
      logger.warn('Không có URI MongoDB được cung cấp, sử dụng mock database');
      setupMockDatabase();
    }

    // Khởi tạo TDLib
    await initializeApp();

    // Lấy port từ environment hoặc sử dụng port mặc định
    const port = process.env.PORT || config.port || 3001;

    // Khởi động server
    server.listen(port, () => {
      logger.info(`Server đang chạy trên cổng ${port} (${config.nodeEnv})`);
      
      // Log TDLib status
      const tdlibAvailable = require('./modules/storage/tdlib-client').tdlibStorage !== null;
      if (tdlibAvailable) {
        logger.info('TDLib đang hoạt động - Có thể xử lý file lớn');
      } else {
        logger.warn('TDLib không khả dụng - Chức năng xử lý file lớn sẽ bị hạn chế');
      }
      
      console.log(`Server đang chạy trên cổng ${port} (${config.nodeEnv})`);
      console.log('TDLib status:', tdlibAvailable ? 'Available' : 'Not available');
    });
  } catch (error) {
    logger.error(`Error starting server: ${error.message}`);
    console.error('Failed to start server:', error);
    process.exit(1);
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