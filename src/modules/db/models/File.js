const mongoose = require('mongoose');
const { Schema } = mongoose;

// File schema
const fileSchema = new Schema({
  name: { 
    type: String, 
    required: true 
  },
  mimeType: { 
    type: String, 
    required: true 
  },
  size: { 
    type: Number, 
    required: true 
  },
  telegramFileId: { 
    type: String,
    sparse: true
  },
  telegramMessageId: { 
    type: String,
    sparse: true
  },
  // For multipart files (large files split into multiple parts)
  isMultipart: {
    type: Boolean,
    default: false
  },
  totalParts: {
    type: Number,
    default: 0
  },
  uploadedParts: {
    type: Number,
    default: 0
  },
  telegramFileIds: {
    type: [String],
    default: []
  },
  telegramMessageIds: {
    type: [String],
    default: []
  },
  uploadProgress: {
    type: Number,
    default: 0
  },
  description: {
    type: String,
    default: ''
  },
  tags: {
    type: [String],
    default: []
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  shareLink: {
    type: String,
    default: null,
    sparse: true
  },
  shareExpiresAt: {
    type: Date,
    default: null
  },
  downloadCount: {
    type: Number,
    default: 0
  },
  lastDownloadedAt: {
    type: Date,
    default: null
  },
  isUploading: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexing for better performance
fileSchema.index({ name: 'text', description: 'text', tags: 'text' });
fileSchema.index({ createdBy: 1, isDeleted: 1 });
fileSchema.index({ shareLink: 1 }, { sparse: true });

// Virtual for URL
fileSchema.virtual('url').get(function() {
  return `/api/files/${this._id}`;
});

// Virtual for download URL
fileSchema.virtual('downloadUrl').get(function() {
  return `/api/files/${this._id}/download`;
});

// Virtual for share URL
fileSchema.virtual('shareUrl').get(function() {
  if (!this.shareLink) return null;
  return `/s/${this.shareLink}`;
});

// Method to check if share link is expired
fileSchema.methods.isShareExpired = function() {
  if (!this.shareLink || !this.shareExpiresAt) return true;
  return new Date() > this.shareExpiresAt;
};

// Method to generate a share link
fileSchema.methods.generateShareLink = async function(expiresInHours = 24) {
  const crypto = require('crypto');
  this.shareLink = crypto.randomBytes(16).toString('hex');
  
  // Set expiration if hours are > 0
  if (expiresInHours > 0) {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);
    this.shareExpiresAt = expiresAt;
  } else {
    this.shareExpiresAt = null; // No expiration
  }
  
  await this.save();
  return this.shareLink;
};

// Method to soft delete (move to trash)
fileSchema.methods.softDelete = async function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  await this.save();
  return this;
};

// Method to restore from trash
fileSchema.methods.restore = async function() {
  this.isDeleted = false;
  this.deletedAt = null;
  await this.save();
  return this;
};

let File;

try {
  // Try to load existing model
  File = mongoose.model('File');
} catch (e) {
  // Create model if it doesn't exist
  File = mongoose.model('File', fileSchema);
}

module.exports = File; 