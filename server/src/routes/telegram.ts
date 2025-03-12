import { Router } from 'express';
import { 
  sendCode,
  verifyCode,
  getBotLink,
  getBotInfo,
  getStorageUsage
} from '../controllers/telegram';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Telegram routes
router.post('/send-code', sendCode);
router.post('/verify-code', verifyCode);
router.get('/bot-link', getBotLink);
router.get('/bot-info', authMiddleware, getBotInfo);
router.get('/storage-usage', authMiddleware, getStorageUsage);

export default router; 