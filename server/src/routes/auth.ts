import { Router } from 'express';
import { login, logout, register, getMe } from '../controllers/auth';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Auth routes
router.post('/register', register);
router.post('/login', login);
router.post('/logout', authMiddleware, logout);
router.get('/me', authMiddleware, getMe);

export default router; 