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
    const mockData = [];
    
    // Trả về một hàm constructor cho model với các phương thức giả lập
    const ModelClass = function(data) {
      Object.assign(this, data);
      this._id = 'mock_' + Date.now();
      
      this.save = async function() {
        mockData.push(this);
        return this;
      };
    };
    
    // Thêm static methods cho model class
    ModelClass.find = async function() { 
      return mockData;
    };
    
    ModelClass.findById = async function(id) {
      return mockData.find(item => item._id === id) || null;
    };
    
    ModelClass.findOne = async function(criteria) {
      return mockData[0] || null;
    };
    
    ModelClass.findByIdAndUpdate = async function(id, update) {
      const item = mockData.find(item => item._id === id);
      if (item) {
        Object.assign(item, update);
      }
      return item;
    };
    
    ModelClass.findByIdAndRemove = async function(id) {
      const index = mockData.findIndex(item => item._id === id);
      if (index !== -1) {
        return mockData.splice(index, 1)[0];
      }
      return null;
    };
    
    ModelClass.create = async function(data) {
      const model = new ModelClass(data);
      await model.save();
      return model;
    };
    
    return ModelClass;
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