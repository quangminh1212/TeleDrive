const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { config } = require('../../common/config');

const { Schema } = mongoose;

// User schema
const userSchema = new Schema({
  telegramId: {
    type: String,
    sparse: true
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    default: ''
  },
  username: {
    type: String,
    sparse: true
  },
  email: {
    type: String,
    sparse: true,
    lowercase: true
  },
  password: {
    type: String
  },
  avatarUrl: {
    type: String,
    default: null
  },
  storageUsed: {
    type: Number,
    default: 0
  },
  storageLimit: {
    type: Number,
    default: 1024 * 1024 * 1024 // 1GB default
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date,
    default: null
  },
  telegramAuth: {
    hash: String,
    authDate: Date,
    accessToken: String
  },
  apiKeys: [{
    key: String,
    name: String,
    createdAt: {
      type: Date,
      default: Date.now
    },
    lastUsed: Date
  }],
  settings: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system'
    },
    language: {
      type: String,
      enum: ['en', 'vi'],
      default: 'vi'
    },
    notifications: {
      enabled: {
        type: Boolean,
        default: true
      }
    }
  }
}, { timestamps: true });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  if (this.lastName) {
    return `${this.firstName} ${this.lastName}`;
  }
  return this.firstName;
});

// Password hashing middleware
userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to check password
userSchema.methods.comparePassword = async function(password) {
  if (!this.password) return false;
  return await bcrypt.compare(password, this.password);
};

// Method to generate JWT
userSchema.methods.generateToken = function() {
  return jwt.sign(
    { userId: this._id, isAdmin: this.isAdmin },
    config.jwtSecret,
    { expiresIn: '7d' }
  );
};

// Method to generate API key
userSchema.methods.generateApiKey = function(name) {
  const apiKey = jwt.sign(
    { userId: this._id, type: 'api' },
    config.jwtSecret,
    { expiresIn: '365d' }
  );
  
  this.apiKeys.push({
    key: apiKey,
    name: name || 'API Key',
    createdAt: new Date()
  });
  
  return apiKey;
};

// Method to check if user has enough storage
userSchema.methods.hasEnoughStorage = function(fileSize) {
  return this.storageUsed + fileSize <= this.storageLimit;
};

// Method to add storage used
userSchema.methods.addStorageUsed = async function(bytes) {
  this.storageUsed += bytes;
  await this.save();
  return this.storageUsed;
};

// Method to remove storage used
userSchema.methods.removeStorageUsed = async function(bytes) {
  this.storageUsed = Math.max(0, this.storageUsed - bytes);
  await this.save();
  return this.storageUsed;
};

// Method to update last login
userSchema.methods.updateLastLogin = async function() {
  this.lastLogin = new Date();
  await this.save();
  return this;
};

let User;

try {
  // Try to load existing model
  User = mongoose.model('User');
} catch (e) {
  // Create model if it doesn't exist
  User = mongoose.model('User', userSchema);
}

module.exports = User; 