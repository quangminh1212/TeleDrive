const mongoose = require('mongoose');
const { config } = require('../common/config');
const logger = require('../common/logger');

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.db.uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    logger.info(`MongoDB connected: ${conn.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB connection error: ${err}`);
    });
    
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });
    
    // Handle process termination
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed due to app termination');
      process.exit(0);
    });
    
    return conn;
  } catch (error) {
    logger.error(`MongoDB connection error: ${error.message}`);
    
    // Không dừng ứng dụng nếu không kết nối được
    logger.warn('Continuing without MongoDB connection - some features will be limited');
    
    // Tạo mock database cho phát triển
    if (config.nodeEnv === 'development') {
      setupMockDatabase();
      logger.info('Mock database set up for development');
    }
    
    return null;
  }
};

// Thiết lập mock database cho phát triển khi không có MongoDB
const setupMockDatabase = () => {
  // Chỉ giả lập trong môi trường development
  if (config.nodeEnv !== 'development') return;
  
  logger.info('Setting up mock database for development');
  
  // Mock schema và model method
  mongoose.Schema = function(definition, options) {
    this.definition = definition;
    this.options = options;
    this.methods = {};
    this.statics = {};
    
    this.method = function(name, fn) {
      this.methods[name] = fn;
      return this;
    };
    
    this.static = function(name, fn) {
      this.statics[name] = fn;
      return this;
    };
    
    return this;
  };
  
  // Mock model
  mongoose.model = function(name, schema) {
    // Lưu ý: đây chỉ là mock đơn giản, không hoạt động thực tế
    return function() {
      return {
        name: 'mock model',
        mockDB: true,
        save: async () => ({ _id: 'mock_id' }),
        findById: async () => null,
        find: async () => [],
        findOne: async () => null,
      };
    };
  };
  
  // Mock connection
  mongoose.connection = {
    readyState: 0,
    close: async () => {},
  };
};

module.exports = {
  connectDB,
  setupMockDatabase,
}; 