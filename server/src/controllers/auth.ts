import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import crypto from 'crypto';
import { userStore, User } from '../services/fileSystemStore';
import { v4 as uuidv4 } from 'uuid';

// Register a new user
export const register = async (req: Request, res: Response) => {
  try {
    const { telegramId, firstName, lastName, username, phoneNumber } = req.body;

    // Check if user already exists
    const existingUser = await userStore.findOne({ telegramId });
    if (existingUser) {
      return res.status(400).json({ message: 'Người dùng đã tồn tại' });
    }

    // Create new user
    const now = new Date();
    const user: User = {
      id: uuidv4(),
      telegramId,
      firstName,
      lastName,
      telegramUsername: username,
      telegramPhoneNumber: phoneNumber,
      createdAt: now,
      updatedAt: now
    };

    await userStore.save(user);

    // Lưu userId vào session
    if (req.session) {
      req.session.userId = user.id;
    }

    res.status(201).json({
      message: 'Đăng ký thành công',
      user,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// Login user
export const login = async (req: Request, res: Response) => {
  try {
    const { telegramId } = req.body;

    // Find user by telegramId
    const user = await userStore.findOne({ telegramId });
    if (!user) {
      return res.status(404).json({ message: 'Người dùng không tồn tại' });
    }

    // Lưu userId vào session
    if (req.session) {
      req.session.userId = user.id;
    }

    res.status(200).json({
      message: 'Đăng nhập thành công',
      user,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// Login with Telegram
export const loginWithTelegram = async (req: Request, res: Response) => {
  try {
    const {
      id,
      first_name,
      last_name,
      username,
      photo_url,
      auth_date,
      hash
    } = req.body;

    // Xác thực data từ Telegram
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return res.status(500).json({ message: 'Thiếu cấu hình Telegram Bot' });
    }

    // Xác thực dữ liệu từ Telegram Widget
    // Tạo data string để xác thực
    const authData = Object.entries(req.body)
      .filter(([key]) => key !== 'hash')
      .sort()
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    // Tạo secret key từ token bot
    const secretKey = crypto
      .createHash('sha256')
      .update(botToken)
      .digest();
    
    // Tính toán hash để so sánh
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(authData)
      .digest('hex');
    
    // So sánh hash từ Telegram và hash được tính toán
    if (calculatedHash !== hash) {
      return res.status(401).json({ message: 'Dữ liệu xác thực không hợp lệ' });
    }

    // Kiểm tra thời gian xác thực (auth_date không quá cũ, chỉ chấp nhận trong vòng 1 ngày)
    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime - parseInt(auth_date) > 86400) {
      return res.status(401).json({ message: 'Xác thực đã hết hạn' });
    }

    // Tìm người dùng bằng Telegram ID
    let user = await userStore.findOne({ telegramId: Number(id) });
    const now = new Date();

    if (!user) {
      // Tạo người dùng mới nếu chưa tồn tại
      user = {
        id: uuidv4(),
        telegramId: Number(id),
        firstName: first_name,
        lastName: last_name || '',
        telegramUsername: username || '',
        photoUrl: photo_url || '',
        createdAt: now,
        updatedAt: now
      };
      await userStore.save(user);
    } else {
      // Cập nhật thông tin người dùng nếu đã tồn tại
      user.firstName = first_name;
      user.lastName = last_name || user.lastName;
      user.telegramUsername = username || user.telegramUsername;
      user.photoUrl = photo_url || user.photoUrl;
      user.updatedAt = now;
      await userStore.save(user);
    }

    // Lưu userId vào session
    if (req.session) {
      req.session.userId = user.id;
    }

    res.status(200).json({
      message: 'Đăng nhập thành công',
      user,
    });
  } catch (error) {
    console.error('Login with Telegram error:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// Logout user
export const logout = async (req: AuthRequest, res: Response) => {
  try {
    // Xóa session
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: 'Lỗi khi đăng xuất' });
      }
      res.clearCookie('connect.sid');
      res.status(200).json({ message: 'Đăng xuất thành công' });
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// Get current user
export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    res.status(200).json({
      user: req.user,
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
}; 