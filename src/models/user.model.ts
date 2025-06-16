import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import config from '../config';

export interface IUser {
  fullName: string;
  email: string;
  password?: string;
  telegramId?: number;
  telegramUsername?: string;
  telegramPhotoUrl?: string;
  telegramAccessHash?: string;
  telegramAuthDate?: Date;
  storageUsed: number;
  isAdmin: boolean;
  lastLogin: Date;
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserDocument extends IUser, Document {
  comparePassword(password: string): Promise<boolean>;
  generateAuthToken(): string;
  generateRefreshToken(): string;
}

const UserSchema: Schema = new Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Họ tên là bắt buộc'],
      trim: true,
      maxlength: [50, 'Họ tên không được vượt quá 50 ký tự'],
    },
    email: {
      type: String,
      required: [true, 'Email là bắt buộc'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email không hợp lệ'],
    },
    password: {
      type: String,
      minlength: [8, 'Mật khẩu phải có ít nhất 8 ký tự'],
      select: false,
    },
    telegramId: {
      type: Number,
      unique: true,
      sparse: true,
    },
    telegramUsername: {
      type: String,
      trim: true,
    },
    telegramPhotoUrl: String,
    telegramAccessHash: String,
    telegramAuthDate: Date,
    storageUsed: {
      type: Number,
      default: 0,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
    refreshToken: {
      type: String,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

// Mã hóa mật khẩu trước khi lưu
UserSchema.pre('save', async function (next) {
  const user = this as IUserDocument;
  if (!user.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password as string, salt);
    next();
  } catch (err) {
    next(err as Error);
  }
});

// So sánh mật khẩu
UserSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  return await bcrypt.compare(password, this.password);
};

// Tạo JWT
UserSchema.methods.generateAuthToken = function (): string {
  return jwt.sign(
    { id: this._id },
    config.jwt.secret,
    { expiresIn: config.jwt.expire }
  );
};

// Tạo Refresh token
UserSchema.methods.generateRefreshToken = function (): string {
  return jwt.sign(
    { id: this._id },
    config.jwt.secret + this.password,
    { expiresIn: '30d' }
  );
};

export default mongoose.model<IUserDocument>('User', UserSchema);
