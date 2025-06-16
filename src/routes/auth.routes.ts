import express from 'express';
import authController from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = express.Router();

/**
 * @route POST /api/auth/register
 * @desc Đăng ký tài khoản mới
 * @access Public
 */
router.post('/register', authController.register);

/**
 * @route POST /api/auth/login
 * @desc Đăng nhập với email và mật khẩu
 * @access Public
 */
router.post('/login', authController.login);

/**
 * @route POST /api/auth/telegram
 * @desc Đăng nhập với Telegram
 * @access Public
 */
router.post('/telegram', authController.telegramAuth);

/**
 * @route GET /api/auth/me
 * @desc Lấy thông tin người dùng hiện tại
 * @access Private
 */
router.get('/me', authMiddleware, authController.getProfile);

export default router; 