import { Request, Response, NextFunction } from 'express';
import { UserModel } from '../models/user';
import session from 'express-session';

// Mở rộng session để bao gồm userId
declare module 'express-session' {
  interface SessionData {
    userId: string;
  }
}

// Mở rộng Request để bao gồm user và session
export interface AuthRequest extends Request {
  user?: any;
  session: session.Session & Partial<session.SessionData>;
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Kiểm tra session
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Không có phiên làm việc, truy cập bị từ chối' });
    }

    // Lấy userId từ session
    const userId = req.session.userId;

    // Kiểm tra xem người dùng có tồn tại không
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(401).json({ message: 'Người dùng không tồn tại' });
    }

    // Thêm user vào request
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ message: 'Lỗi xác thực' });
  }
}; 