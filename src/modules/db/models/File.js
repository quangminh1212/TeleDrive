const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  telegramFileId: {
    type: String,
    required: true,
    unique: true,
  },
  telegramMessageId: {
    type: String,
    required: true,
  },
  mimeType: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    required: true,
  },
  path: {
    type: String,
    required: false,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
  createdBy: {
    type: String,
    required: true,
  },
  isPublic: {
    type: Boolean,
    default: false,
  },
  shareLink: {
    type: String,
    default: null,
  },
  shareExpiresAt: {
    type: Date,
    default: null,
  },
  tags: [{
    type: String,
    trim: true,
  }],
  description: {
    type: String,
    trim: true,
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

// Create indexes for search
FileSchema.index({ name: 'text', description: 'text', tags: 'text' });

// Update the 'updatedAt' field on save
FileSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for file URL
FileSchema.virtual('url').get(function() {
  return `/files/${this._id}`;
});

// Virtual for share URL
FileSchema.virtual('shareUrl').get(function() {
  if (this.shareLink) {
    return `/share/${this.shareLink}`;
  }
  return null;
});

// Methods
FileSchema.methods = {
  // Soft delete a file
  softDelete: function() {
    this.isDeleted = true;
    this.deletedAt = Date.now();
    return this.save();
  },
  
  // Restore a deleted file
  restore: function() {
    this.isDeleted = false;
    this.deletedAt = null;
    return this.save();
  },
  
  // Generate a share link
  generateShareLink: function(expiresInHours = 24) {
    const crypto = require('crypto');
    this.shareLink = crypto.randomBytes(16).toString('hex');
    
    if (expiresInHours) {
      this.shareExpiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
    } else {
      this.shareExpiresAt = null;
    }
    
    return this.save();
  },
  
  // Revoke a share link
  revokeShareLink: function() {
    this.shareLink = null;
    this.shareExpiresAt = null;
    return this.save();
  },
  
  // Check if share link is expired
  isShareExpired: function() {
    if (!this.shareLink || !this.shareExpiresAt) {
      return true;
    }
    
    return new Date() > this.shareExpiresAt;
  },
};

// Static methods
FileSchema.statics = {
  // Find files by tag
  findByTag: function(tag) {
    return this.find({ tags: tag, isDeleted: false });
  },
  
  // Find files in trash
  findInTrash: function() {
    return this.find({ isDeleted: true });
  },
  
  // Find public files
  findPublic: function() {
    return this.find({ isPublic: true, isDeleted: false });
  },
  
  // Search files by text
  search: function(query) {
    return this.find(
      { 
        $text: { $search: query },
        isDeleted: false
      },
      { 
        score: { $meta: 'textScore' } 
      }
    ).sort({ score: { $meta: 'textScore' } });
  },
};

const File = mongoose.model('File', FileSchema);

module.exports = File; 