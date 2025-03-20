const express = require('express');
const router = express.Router();
const fileRoutes = require('./files/routes');
const authRoutes = require('./auth/routes');
const telegramRoutes = require('./telegram/routes');
const { isAuthenticated } = require('./auth/middleware');
const logger = require('./common/logger');
const { tdlibStorage } = require('./storage/tdlib-client');

// Main routes
router.get('/', (req, res) => {
  res.render('index', {
    title: 'TeleDrive',
    user: req.user
  });
});

// Dashboard route
router.get('/dashboard', isAuthenticated, (req, res) => {
  res.render('dashboard', {
    title: 'Dashboard',
    user: req.user
  });
});

// API routes
router.use('/api/files', fileRoutes);
router.use('/api/auth', authRoutes);
router.use('/api/telegram', telegramRoutes);

// Telegram status API
router.get('/api/telegram/status', (req, res) => {
  const tdlibStatus = {
    config: {
      api_id_provided: !!process.env.TELEGRAM_API_ID,
      api_hash_provided: !!process.env.TELEGRAM_API_HASH,
      bot_token_provided: !!process.env.TELEGRAM_BOT_TOKEN,
      chat_id_provided: !!process.env.TELEGRAM_CHAT_ID
    },
    tdlib: {
      isAvailable: !!tdlibStorage,
      isConnected: false,
      isLoggedIn: false,
      chatId: process.env.TELEGRAM_CHAT_ID || null
    },
    using_tdlib: !!tdlibStorage,
    fallback_to_bot_api: !tdlibStorage
  };
  
  res.json(tdlibStatus);
});

// Health check API
router.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now()
  });
});

module.exports = router; 