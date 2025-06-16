import { Request, Response } from 'express';
import authService from '../services/auth.service';

class AuthController {
  /**
   * Đăng ký tài khoản mới
   * @route POST /api/auth/register
   */
  async register(req: Request, res: Response) {
    try {
      const { fullName, email, password } = req.body;
      
      // Kiểm tra các trường bắt buộc
      if (!fullName || !email || !password) {
        return res.status(400).json({ 
          success: false, 
          message: 'Vui lòng cung cấp đầy đủ thông tin' 
        });
      }

      const result = await authService.register({ fullName, email, password });
      
      // Loại bỏ thông tin nhạy cảm trước khi trả về
      const user = result.user.toObject();
      delete user.password;
      
      return res.status(201).json({ 
        success: true, 
        data: { 
          user, 
          token: result.token 
        }, 
        message: 'Đăng ký thành công' 
      });
    } catch (error) {
      return res.status(400).json({ 
        success: false, 
        message: (error as Error).message 
      });
    }
  }

  /**
   * Đăng nhập với email và mật khẩu
   * @route POST /api/auth/login
   */
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      
      // Kiểm tra các trường bắt buộc
      if (!email || !password) {
        return res.status(400).json({ 
          success: false, 
          message: 'Vui lòng cung cấp đầy đủ thông tin' 
        });
      }

      const result = await authService.login(email, password);
      
      // Loại bỏ thông tin nhạy cảm trước khi trả về
      const user = result.user.toObject();
      delete user.password;
      
      return res.status(200).json({ 
        success: true, 
        data: { 
          user, 
          token: result.token 
        }, 
        message: 'Đăng nhập thành công' 
      });
    } catch (error) {
      return res.status(401).json({ 
        success: false, 
        message: (error as Error).message 
      });
    }
  }

  /**
   * Đăng nhập với Telegram
   * @route POST /api/auth/telegram
   */
  async telegramAuth(req: Request, res: Response) {
    try {
      const telegramData = req.body;
      
      // Kiểm tra dữ liệu Telegram cần thiết
      if (!telegramData || !telegramData.id || !telegramData.first_name || !telegramData.auth_date || !telegramData.hash) {
        return res.status(400).json({ 
          success: false, 
          message: 'Dữ liệu Telegram không hợp lệ' 
        });
      }

      const result = await authService.loginWithTelegram(telegramData);
      
      // Loại bỏ thông tin nhạy cảm trước khi trả về
      const user = result.user.toObject();
      delete user.password;
      
      return res.status(200).json({ 
        success: true, 
        data: { 
          user, 
          token: result.token,
          isNewUser: result.isNewUser
        }, 
        message: 'Đăng nhập bằng Telegram thành công' 
      });
    } catch (error) {
      return res.status(401).json({ 
        success: false, 
        message: (error as Error).message 
      });
    }
  }

  /**
   * Lấy thông tin người dùng hiện tại
   * @route GET /api/auth/me
   */
  async getProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      
      // Thông tin người dùng lấy từ middleware auth
      const user = (req as any).user;
      
      return res.status(200).json({ 
        success: true, 
        data: user,
        message: 'Lấy thông tin người dùng thành công' 
      });
    } catch (error) {
      return res.status(500).json({ 
        success: false, 
        message: (error as Error).message 
      });
    }
  }
}

export default new AuthController(); 