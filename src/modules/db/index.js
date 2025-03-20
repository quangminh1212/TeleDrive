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

// Thiết lập cơ sở dữ liệu giả lập cho development
const setupMockDatabase = () => {
  logger.info('Setting up mock database for development');
  
  // Lưu trữ dữ liệu trong bộ nhớ
  const mockData = {
    users: [],
    files: [],
    sessions: []
  };

  // Đối tượng lưu trữ model đã định nghĩa
  const mockModels = {};

  // Tạo đối tượng giả lập cho Schema
  mongoose.Schema = function(definition) {
    this.definition = definition;
    this.methods = {};
    this.statics = {};
    this.virtual = function() { return { get: function() {}, set: function() {} }; };
    this.pre = function() { return this; };
    this.post = function() { return this; };
  };

  // Tạo lớp ModelClass để giả lập các phương thức của Model
  class ModelClass {
    constructor(data) {
      Object.assign(this, data);
      this._id = this._id || mongoose.Types.ObjectId().toString();
      this.createdAt = this.createdAt || new Date();
      this.updatedAt = new Date();
    }

    // Phương thức lưu
    async save() {
      this.updatedAt = new Date();
      const collection = this.constructor.collection;
      const existingIndex = mockData[collection].findIndex(item => item._id === this._id);
      
      if (existingIndex >= 0) {
        mockData[collection][existingIndex] = this;
      } else {
        mockData[collection].push(this);
      }
      
      return this;
    }

    // Xóa
    async remove() {
      const collection = this.constructor.collection;
      const index = mockData[collection].findIndex(item => item._id === this._id);
      if (index >= 0) {
        mockData[collection].splice(index, 1);
      }
      return this;
    }
  }

  // Các phương thức tĩnh cho model
  const modelStatics = {
    // Tìm tất cả
    find: function(query = {}) {
      return {
        exec: async () => {
          return mockData[this.collection].filter(item => matchQuery(item, query));
        },
        limit: function() { return this; },
        skip: function() { return this; },
        sort: function() { return this; },
        populate: function() { return this; },
        lean: function() { return this; }
      };
    },

    // Tìm theo ID
    findById: function(id) {
      return {
        exec: async () => mockData[this.collection].find(item => item._id === id),
        populate: function() { return this; }
      };
    },

    // Tìm một đối tượng
    findOne: function(query = {}) {
      return {
        exec: async () => mockData[this.collection].find(item => matchQuery(item, query)),
        populate: function() { return this; }
      };
    },

    // Tạo mới
    create: async function(data) {
      if (Array.isArray(data)) {
        return Promise.all(data.map(item => this.create(item)));
      }
      
      const newItem = new ModelClass(data);
      newItem.constructor = this;
      await newItem.save();
      return newItem;
    },

    // Cập nhật theo ID
    findByIdAndUpdate: async function(id, update, options = {}) {
      const item = mockData[this.collection].find(item => item._id === id);
      if (!item) return null;
      
      // Áp dụng cập nhật
      Object.assign(item, update);
      item.updatedAt = new Date();
      
      return options.new !== false ? item : { _id: id };
    },

    // Xóa theo ID
    findByIdAndDelete: async function(id) {
      const index = mockData[this.collection].findIndex(item => item._id === id);
      if (index >= 0) {
        const item = mockData[this.collection][index];
        mockData[this.collection].splice(index, 1);
        return item;
      }
      return null;
    },

    // Mới có thể bị thiếu, thêm vào
    findByIdAndRemove: async function(id) {
      return this.findByIdAndDelete(id);
    },

    // Đếm số lượng
    countDocuments: async function(query = {}) {
      return mockData[this.collection].filter(item => matchQuery(item, query)).length;
    },

    // Kiểm tra tồn tại
    exists: async function(query = {}) {
      return mockData[this.collection].some(item => matchQuery(item, query));
    }
  };

  // Hàm kiểm tra xem item có khớp với query không
  function matchQuery(item, query) {
    // Query đơn giản
    for (const key in query) {
      // Bỏ qua các toán tử đặc biệt
      if (key.startsWith('$')) continue;
      
      // Query lồng nhau
      if (typeof query[key] === 'object' && !Array.isArray(query[key])) {
        // Phép so sánh đặc biệt ($gt, $lt, vv)
        const subQuery = query[key];
        for (const operator in subQuery) {
          switch (operator) {
            case '$eq':
              if (item[key] !== subQuery[operator]) return false;
              break;
            case '$ne':
              if (item[key] === subQuery[operator]) return false;
              break;
            case '$gt':
              if (!(item[key] > subQuery[operator])) return false;
              break;
            case '$gte':
              if (!(item[key] >= subQuery[operator])) return false;
              break;
            case '$lt':
              if (!(item[key] < subQuery[operator])) return false;
              break;
            case '$lte':
              if (!(item[key] <= subQuery[operator])) return false;
              break;
            case '$in':
              if (!Array.isArray(subQuery[operator]) || !subQuery[operator].includes(item[key])) return false;
              break;
            case '$nin':
              if (!Array.isArray(subQuery[operator]) || subQuery[operator].includes(item[key])) return false;
              break;
          }
        }
      } else {
        // So sánh đơn giản
        if (item[key] !== query[key]) return false;
      }
    }
    
    return true;
  }

  // Tạo model giả lập
  mongoose.model = function(name, schema) {
    // Tạo constructor cho model
    function Model(data) {
      ModelClass.call(this, data);
    }
    
    // Kế thừa từ ModelClass
    Model.prototype = Object.create(ModelClass.prototype);
    Model.prototype.constructor = Model;
    
    // Thêm các phương thức từ schema
    if (schema && schema.methods) {
      Object.assign(Model.prototype, schema.methods);
    }
    
    // Thiết lập các thuộc tính và phương thức tĩnh
    Model.collection = name.toLowerCase() + 's';
    Object.assign(Model, modelStatics);
    
    // Thêm các phương thức tĩnh từ schema
    if (schema && schema.statics) {
      Object.assign(Model, schema.statics);
    }
    
    // Lưu vào danh sách model
    mockModels[name] = Model;
    
    // Tạo collection nếu chưa có
    if (!mockData[Model.collection]) {
      mockData[Model.collection] = [];
    }
    
    return Model;
  };

  // Types.ObjectId giả lập
  mongoose.Types = {
    ObjectId: function(id) {
      return id || Math.random().toString(36).substring(2, 15);
    }
  };
  
  mongoose.connection = {
    on: function() { return this; },
    once: function() { return this; }
  };
  
  logger.info('Đã thiết lập mock database cho development');
  return true;
};

module.exports = {
  connectDB,
  setupMockDatabase,
}; 