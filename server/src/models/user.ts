import mongoose, { Schema, Document } from 'mongoose';
import jwt from 'jsonwebtoken';

// User interface
export interface IUser extends Document {
  firstName?: string;
  lastName?: string;
  email?: string;
  telegramId: number;
  telegramUsername?: string;
  telegramPhoneNumber?: string;
  photoUrl?: string;
  sessionString?: string;
  createdAt: Date;
  updatedAt: Date;
  generateAuthToken: () => string;
}

// User schema
const userSchema = new Schema<IUser>(
  {
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    telegramId: {
      type: Number,
      required: true,
      unique: true,
    },
    telegramUsername: {
      type: String,
      trim: true,
    },
    telegramPhoneNumber: {
      type: String,
      trim: true,
    },
    photoUrl: {
      type: String,
      trim: true,
    },
    sessionString: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Generate auth token method
userSchema.methods.generateAuthToken = function(): string {
  const user = this;
  const token = jwt.sign(
    { id: user.id },
    process.env.JWT_SECRET || 'default_secret',
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    }
  );
  return token;
};

// Create User model
export const UserModel = mongoose.model<IUser>('User', userSchema); 