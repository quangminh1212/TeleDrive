import mongoose, { Document, Schema } from 'mongoose';
import { IUserDocument } from './user.model';

export interface IFile {
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  telegramMessageId?: number;
  telegramChatId?: number;
  owner: IUserDocument['_id'];
  parent?: IFileDocument['_id'] | null;
  isFolder: boolean;
  isShared: boolean;
  shareLink?: string;
  accessControl: {
    isPublic: boolean;
    allowedUsers: IUserDocument['_id'][];
  };
  trashed: boolean;
  starred: boolean;
  lastModified: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFileDocument extends IFile, Document {
  // Phương thức cho file
  getPublicUrl(): string;
  getShareableLink(): string;
}

const FileSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Tên file là bắt buộc'],
      trim: true,
    },
    originalName: {
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
      default: 0,
    },
    path: {
      type: String,
      required: true,
    },
    telegramMessageId: {
      type: Number,
    },
    telegramChatId: {
      type: Number,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    parent: {
      type: Schema.Types.ObjectId,
      ref: 'File',
      default: null,
    },
    isFolder: {
      type: Boolean,
      default: false,
    },
    isShared: {
      type: Boolean,
      default: false,
    },
    shareLink: {
      type: String,
    },
    accessControl: {
      isPublic: {
        type: Boolean,
        default: false,
      },
      allowedUsers: [
        {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
    },
    trashed: {
      type: Boolean,
      default: false,
    },
    starred: {
      type: Boolean,
      default: false,
    },
    lastModified: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Tạo index để tìm kiếm hiệu quả hơn
FileSchema.index({ name: 'text', originalName: 'text' });
FileSchema.index({ owner: 1 });
FileSchema.index({ parent: 1 });
FileSchema.index({ trashed: 1 });
FileSchema.index({ starred: 1 });

// Phương thức lấy URL công khai
FileSchema.methods.getPublicUrl = function (): string {
  if (!this.accessControl.isPublic) {
    return '';
  }
  return `/api/files/${this._id}/view`;
};

// Phương thức lấy link chia sẻ
FileSchema.methods.getShareableLink = function (): string {
  if (!this.isShared || !this.shareLink) {
    return '';
  }
  return `/share/${this.shareLink}`;
};

export default mongoose.model<IFileDocument>('File', FileSchema); 