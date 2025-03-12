import mongoose, { Schema, Document } from 'mongoose';

// Folder interface
export interface IFolder extends Document {
  name: string;
  path?: string;
  isPublic: boolean;
  publicLink?: string;
  parentId?: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Folder schema
const folderSchema = new Schema<IFolder>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
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
    parentId: {
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

// Create Folder model
export const FolderModel = mongoose.model<IFolder>('Folder', folderSchema); 