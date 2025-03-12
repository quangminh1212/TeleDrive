import mongoose, { Schema, Document } from 'mongoose';

// File interface
export interface IFile extends Document {
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  telegramFileId: string;
  messageId: number;
  path?: string;
  isPublic: boolean;
  publicLink?: string;
  folderId?: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// File schema
const fileSchema = new Schema<IFile>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    originalName: {
      type: String,
      required: true,
      trim: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    telegramFileId: {
      type: String,
      required: true,
    },
    messageId: {
      type: Number,
      required: true,
    },
    path: {
      type: String,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    publicLink: {
      type: String,
    },
    folderId: {
      type: Schema.Types.ObjectId,
      ref: 'Folder',
    },
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Create File model
export const FileModel = mongoose.model<IFile>('File', fileSchema); 