import { Request, Response } from 'express';
import { UserModel } from '../models/user';
import { AuthRequest } from '../middleware/auth';

// Register a new user
export const register = async (req: Request, res: Response) => {
  try {
    const { telegramId, firstName, lastName, username, phoneNumber } = req.body;

    // Check if user already exists
    const existingUser = await UserModel.findOne({ telegramId });
    if (existingUser) {
      return res.status(400).json({ message: 'Người dùng đã tồn tại' });
    }

    // Create new user
    const user = new UserModel({
      telegramId,
      firstName,
      lastName,
      telegramUsername: username,
      telegramPhoneNumber: phoneNumber,
    });

    await user.save();

    // Generate auth token
    const token = user.generateAuthToken();

    res.status(201).json({
      message: 'Đăng ký thành công',
      user,
      token,
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
    const user = await UserModel.findOne({ telegramId });
    if (!user) {
      return res.status(404).json({ message: 'Người dùng không tồn tại' });
    }

    // Generate auth token
    const token = user.generateAuthToken();

    res.status(200).json({
      message: 'Đăng nhập thành công',
      user,
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// Logout user
export const logout = async (req: Request, res: Response) => {
  try {
    res.status(200).json({ message: 'Đăng xuất thành công' });
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