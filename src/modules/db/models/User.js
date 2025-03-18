const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  telegramId: {
    type: String,
    required: true,
    unique: true,
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  lastName: {
    type: String,
    trim: true,
  },
  username: {
    type: String,
    trim: true,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  storageUsed: {
    type: Number,
    default: 0,
  },
  storageLimit: {
    type: Number,
    default: 1024 * 1024 * 1024, // 1GB default
  },
  isPremium: {
    type: Boolean,
    default: false,
  },
  settings: {
    language: {
      type: String,
      default: 'en',
    },
    theme: {
      type: String,
      default: 'light',
    },
    autoDeleteDownloads: {
      type: Boolean,
      default: true,
    },
    notificationsEnabled: {
      type: Boolean,
      default: true,
    },
  },
  lastSeen: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the 'updatedAt' field on save
UserSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Methods
UserSchema.methods = {
  // Update last seen
  updateLastSeen: function() {
    this.lastSeen = Date.now();
    return this.save();
  },
  
  // Add storage used
  addStorageUsed: function(bytes) {
    this.storageUsed += bytes;
    return this.save();
  },
  
  // Subtract storage used
  subtractStorageUsed: function(bytes) {
    this.storageUsed = Math.max(0, this.storageUsed - bytes);
    return this.save();
  },
  
  // Check if user has enough storage
  hasEnoughStorage: function(bytes) {
    return (this.storageUsed + bytes) <= this.storageLimit;
  },
  
  // Get storage usage percentage
  getStoragePercentage: function() {
    return (this.storageUsed / this.storageLimit) * 100;
  },
  
  // Reset storage usage
  resetStorageUsed: function() {
    this.storageUsed = 0;
    return this.save();
  },
  
  // Set premium status
  setPremium: function(isPremium = true, storageLimit = null) {
    this.isPremium = isPremium;
    
    if (storageLimit !== null) {
      this.storageLimit = storageLimit;
    } else if (isPremium) {
      this.storageLimit = 10 * 1024 * 1024 * 1024; // 10GB for premium
    } else {
      this.storageLimit = 1024 * 1024 * 1024; // 1GB for free users
    }
    
    return this.save();
  },
  
  // Update user settings
  updateSettings: function(settings) {
    this.settings = { ...this.settings, ...settings };
    return this.save();
  },
};

// Static methods
UserSchema.statics = {
  // Find premium users
  findPremiumUsers: function() {
    return this.find({ isPremium: true });
  },
  
  // Find by Telegram ID
  findByTelegramId: function(telegramId) {
    return this.findOne({ telegramId });
  },
  
  // Find or create user by Telegram data
  findOrCreateUser: async function(telegramData) {
    const user = await this.findOne({ telegramId: telegramData.id });
    
    if (user) {
      // Update user data
      user.firstName = telegramData.first_name;
      user.lastName = telegramData.last_name || '';
      user.username = telegramData.username || '';
      user.lastSeen = Date.now();
      await user.save();
      return user;
    }
    
    // Create new user
    return this.create({
      telegramId: telegramData.id,
      firstName: telegramData.first_name,
      lastName: telegramData.last_name || '',
      username: telegramData.username || '',
    });
  },
};

const User = mongoose.model('User', UserSchema);

module.exports = User; 