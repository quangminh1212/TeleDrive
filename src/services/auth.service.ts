import jwt from 'jsonwebtoken';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import User, { IUserDocument } from '../models/user.model';
import config from '../config';

class AuthService {
  /**
   * Đăng ký người dùng mới
   */
  async register(userData: {
    fullName: string;
    email: string;
    password: string;
  }): Promise<{ user: IUserDocument; token: string }> {
    // Kiểm tra xem email đã tồn tại chưa
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      throw new Error('Email đã được sử dụng');
    }

    // Tạo người dùng mới
    const user = await User.create(userData);
    const token = user.generateAuthToken();

    return { user, token };
  }

  /**
   * Đăng nhập với email và mật khẩu
   */
  async login(email: string, password: string): Promise<{ user: IUserDocument; token: string }> {
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      throw new Error('Email không tồn tại');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new Error('Mật khẩu không chính xác');
    }

    // Cập nhật thời gian đăng nhập cuối
    user.lastLogin = new Date();
    await user.save();

    const token = user.generateAuthToken();
    return { user, token };
  }

  /**
   * Xác thực với Telegram
   */
  async loginWithTelegram(telegramData: {
    id: number;
    first_name: string;
    username?: string;
    photo_url?: string;
    auth_date: number;
    hash: string;
  }): Promise<{ user: IUserDocument; token: string; isNewUser: boolean }> {
    // Kiểm tra tính hợp lệ của dữ liệu Telegram
    this.verifyTelegramAuth(telegramData);

    // Tìm người dùng theo Telegram ID
    let user = await User.findOne({ telegramId: telegramData.id });
    let isNewUser = false;

    if (!user) {
      // Tạo người dùng mới nếu chưa tồn tại
      isNewUser = true;
      user = await User.create({
        fullName: telegramData.first_name,
        email: `${telegramData.id}@telegram.user`,
        telegramId: telegramData.id,
        telegramUsername: telegramData.username,
        telegramPhotoUrl: telegramData.photo_url,
        telegramAuthDate: new Date(telegramData.auth_date * 1000),
      });
    } else {
      // Cập nhật thông tin Telegram
      user.telegramUsername = telegramData.username;
      user.telegramPhotoUrl = telegramData.photo_url;
      user.telegramAuthDate = new Date(telegramData.auth_date * 1000);
      user.lastLogin = new Date();
      await user.save();
    }

    const token = user.generateAuthToken();
    return { user, token, isNewUser };
  }

  /**
   * Xác minh dữ liệu Telegram auth
   */
  private verifyTelegramAuth(authData: any): boolean {
    const { hash, ...data } = authData;
    
    // Kiểm tra thời gian xác thực - chỉ hợp lệ trong 24 giờ
    const authDate = data.auth_date;
    if (Date.now() / 1000 - authDate > 86400) {
      throw new Error('Xác thực đã hết hạn');
    }
    
    // TODO: Xác thực hash theo tài liệu Telegram Login
    // Trong môi trường thực tế, cần kiểm tra hash từ Telegram

    return true;
  }

  /**
   * Khởi tạo Telegram client
   */
  async initTelegramClient(session?: string): Promise<TelegramClient> {
    const stringSession = new StringSession(session || '');
    
    const client = new TelegramClient(
      stringSession, 
      config.telegram.apiId, 
      config.telegram.apiHash, 
      { connectionRetries: 5 }
    );
    
    await client.connect();
    return client;
  }
}

export default new AuthService(); 