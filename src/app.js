const express = require('express');
const path = require('path');
const morgan = require('morgan');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const { config } = require('./modules/common/config');
const logger = require('./modules/common/logger');
const fileRoutes = require('./modules/files/routes');
const authRoutes = require('./modules/auth/routes');
const telegramRoutes = require('./modules/telegram/routes');
const { tdlibStorage } = require('./modules/storage/tdlib-client');

// Create Express app
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// Views setup
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'ejs');

// Session configuration
const sessionOptions = {
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: config.nodeEnv === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
};

// Attempt to use MongoDB for session storage if available
if (config.db && config.db.uri) {
  try {
    // Connect to MongoDB for session
    sessionOptions.store = MongoStore.create({
      mongoUrl: config.db.uri,
      ttl: 14 * 24 * 60 * 60 // 14 days
    });
    logger.info('Đã kết nối session với MongoDB');
  } catch (error) {
    logger.error(`Lỗi kết nối session với MongoDB: ${error.message}`);
    logger.info('Sử dụng session memory (không lưu trữ)');
    // In-memory session store will be used
  }
}

// Configure session middleware
app.use(session(sessionOptions));

// Main routes
app.get('/', (req, res) => {
  res.render('index', { 
    title: 'TeleDrive',
    tdlibAvailable: !!tdlibStorage 
  });
});

// API routes
app.use('/api/files', fileRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/api/users', require('./modules/users/routes'));

// Telegram status API
app.get('/api/telegram/status', (req, res) => {
  const tdlibStatus = {
    config: {
      api_id_provided: !!config.telegram.apiId,
      api_hash_provided: !!config.telegram.apiHash,
      bot_token_provided: !!config.telegram.botToken,
      chat_id_provided: !!config.telegram.chatId
    },
    tdlib: {
      isAvailable: !!tdlibStorage,
      isConnected: tdlibStorage ? true : false,
      isLoggedIn: tdlibStorage ? true : false,
      chatId: config.telegram.chatId || null
    },
    using_tdlib: !!tdlibStorage,
    fallback_to_bot_api: !tdlibStorage
  };
  
  res.json(tdlibStatus);
});

// Health check API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now()
  });
});

// 404 handler
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    res.status(404).json({ error: 'Not Found', status: 404 });
  } else {
    res.status(404).render('error', {
      title: 'Not Found',
      message: 'Trang bạn tìm kiếm không tồn tại.',
      status: 404
    });
  }
});

// Error handler
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`);
  if (err.stack) {
    logger.error(`Stack: ${err.stack}`);
  }
  
  if (res.headersSent) {
    return next(err);
  }
  
  const statusCode = err.status || 500;
  
  if (req.path.startsWith('/api')) {
    res.status(statusCode).json({
      error: err.message,
      status: statusCode
    });
  } else {
    res.status(statusCode).render('error', {
      title: 'Error',
      message: err.message,
      status: statusCode,
      stack: config.nodeEnv === 'development' ? err.stack : null
    });
  }
});

module.exports = app; 