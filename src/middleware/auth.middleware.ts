import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/user.model';
import config from '../config';

/**
 * Middleware để xác thực người dùng thông qua JWT
 * @param req Request
 * @param res Response
 * @param next NextFunction
 */
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Lấy token từ header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Không có token xác thực',
      });
    }

    // Lấy token từ header "Bearer [token]"
    const token = authHeader.split(' ')[1];

    // Xác thực token
    const decoded = jwt.verify(token, config.jwt.secret) as { id: string };
    
    // Tìm người dùng với id từ token
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Người dùng không tồn tại hoặc không có quyền truy cập',
      });
    }

    // Lưu thông tin người dùng vào request
    (req as any).user = user;
    next();
  } catch (error) {
    if ((error as Error).name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token đã hết hạn',
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Token không hợp lệ',
    });
  }
};

/**
 * Middleware để kiểm tra vai trò admin
 * @param req Request
 * @param res Response
 * @param next NextFunction
 */
export const adminMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;

    if (!user || !user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ admin mới có quyền truy cập',
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: (error as Error).message,
    });
  }
}; 