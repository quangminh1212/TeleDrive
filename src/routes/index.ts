import express from 'express';
import authRoutes from './auth.routes';
import fileRoutes from './file.routes';

const router = express.Router();

// Routes chính
router.use('/auth', authRoutes);
router.use('/files', fileRoutes);

// Route home API
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'TeleDrive API',
    version: '1.0.0',
  });
});

export default router; 