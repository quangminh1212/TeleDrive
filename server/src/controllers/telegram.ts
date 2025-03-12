import { Request, Response } from 'express';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { AuthRequest } from '../middleware/auth';
import { UserModel } from '../models/user';
import { FileModel } from '../models/file';
import input from 'input';

// Send verification code
export const sendCode = async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ message: 'Số điện thoại là bắt buộc' });
    }

    const apiId = Number(process.env.TELEGRAM_API_ID);
    const apiHash = process.env.TELEGRAM_API_HASH || '';

    if (!apiId || !apiHash) {
      return res.status(500).json({ message: 'Thiếu cấu hình Telegram API' });
    }

    const stringSession = new StringSession('');
    const client = new TelegramClient(stringSession, apiId, apiHash, {
      connectionRetries: 5,
    });

    await client.connect();
    const result = await client.sendCode(
      {
        apiId,
        apiHash,
      },
      phoneNumber
    );

    await client.disconnect();

    res.status(200).json({
      message: 'Đã gửi mã xác thực',
      phoneCodeHash: result.phoneCodeHash,
    });
  } catch (error) {
    console.error('Send code error:', error);
    res.status(500).json({ message: 'Lỗi khi gửi mã xác thực' });
  }
};

// Verify code and login
export const verifyCode = async (req: Request, res: Response) => {
  try {
    const { phoneNumber, code, phoneCodeHash } = req.body;

    if (!phoneNumber || !code || !phoneCodeHash) {
      return res.status(400).json({ message: 'Thiếu thông tin xác thực' });
    }

    const apiId = Number(process.env.TELEGRAM_API_ID);
    const apiHash = process.env.TELEGRAM_API_HASH || '';

    if (!apiId || !apiHash) {
      return res.status(500).json({ message: 'Thiếu cấu hình Telegram API' });
    }

    const stringSession = new StringSession('');
    const client = new TelegramClient(stringSession, apiId, apiHash, {
      connectionRetries: 5,
    });

    await client.connect();
    
    // Sign in with the code
    const user = await client.signIn({
      phoneNumber,
      phoneCode: code,
      phoneCodeHash,
    });

    // Get user info
    const me = await client.getMe();
    const sessionString = client.session.save() as unknown as string;
    
    await client.disconnect();

    // Check if user exists in our database
    let dbUser = await UserModel.findOne({ telegramId: Number(me.id) });

    if (!dbUser) {
      // Create new user
      dbUser = new UserModel({
        telegramId: Number(me.id),
        firstName: me.firstName,
        lastName: me.lastName,
        telegramUsername: me.username,
        telegramPhoneNumber: phoneNumber,
        sessionString,
      });
    } else {
      // Update existing user
      dbUser.firstName = me.firstName || dbUser.firstName;
      dbUser.lastName = me.lastName || dbUser.lastName;
      dbUser.telegramUsername = me.username || dbUser.telegramUsername;
      dbUser.sessionString = sessionString;
    }

    await dbUser.save();

    // Generate auth token
    const token = dbUser.generateAuthToken();

    res.status(200).json({
      message: 'Đăng nhập thành công',
      user: dbUser,
      token,
    });
  } catch (error) {
    console.error('Verify code error:', error);
    res.status(500).json({ message: 'Lỗi khi xác thực mã' });
  }
};

// Get bot link
export const getBotLink = async (req: Request, res: Response) => {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!botToken) {
      return res.status(500).json({ message: 'Thiếu cấu hình Telegram Bot' });
    }

    // Get bot username from token
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const data = await response.json();

    if (!data.ok) {
      return res.status(500).json({ message: 'Không thể lấy thông tin bot' });
    }

    const botUsername = data.result.username;
    const botLink = `https://t.me/${botUsername}`;

    res.status(200).json({
      botLink,
      botUsername,
    });
  } catch (error) {
    console.error('Get bot link error:', error);
    res.status(500).json({ message: 'Lỗi khi lấy link bot' });
  }
};

// Get bot info
export const getBotInfo = async (req: AuthRequest, res: Response) => {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!botToken) {
      return res.status(500).json({ message: 'Thiếu cấu hình Telegram Bot' });
    }

    // Get bot info
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const data = await response.json();

    if (!data.ok) {
      return res.status(500).json({ message: 'Không thể lấy thông tin bot' });
    }

    res.status(200).json({
      botInfo: data.result,
    });
  } catch (error) {
    console.error('Get bot info error:', error);
    res.status(500).json({ message: 'Lỗi khi lấy thông tin bot' });
  }
};

// Get storage usage
export const getStorageUsage = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user._id;

    // Get total size of all files
    const files = await FileModel.find({ userId });
    const totalSize = files.reduce((acc, file) => acc + file.size, 0);

    // Convert to readable format
    const sizeInMB = totalSize / (1024 * 1024);
    const sizeInGB = sizeInMB / 1024;

    res.status(200).json({
      totalFiles: files.length,
      totalSize,
      sizeInMB: sizeInMB.toFixed(2),
      sizeInGB: sizeInGB.toFixed(2),
    });
  } catch (error) {
    console.error('Get storage usage error:', error);
    res.status(500).json({ message: 'Lỗi khi lấy thông tin lưu trữ' });
  }
}; 