const express = require('express');
const path = require('path');
const morgan = require('morgan');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const helmet = require('helmet');
const cors = require('cors');
const { config } = require('./modules/common/config');
const logger = require('./modules/common/logger');
const errorHandler = require('./modules/common/error-handler');
const { loadUser, logRequest, handleShareToken } = require('./modules/auth/middleware');
const fileRoutes = require('./modules/files/routes');
const authRoutes = require('./modules/auth/routes');

// Create Express app
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      mediaSrc: ["'self'", 'data:', 'blob:'],
    },
  }
}));
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

// Debug middleware for request/response
app.use((req, res, next) => {
  try {
    // Bypass for static files or certain paths
    if (req.path.startsWith('/css') || req.path.startsWith('/js') || req.path.startsWith('/img')) {
      return next();
    }

    // Log request details
    if (config.nodeEnv === 'development') {
      logger.debug(`Request: ${req.method} ${req.path} (${req.ip})`);
      if (Object.keys(req.query).length > 0) {
        logger.debug(`Query: ${JSON.stringify(req.query)}`);
      }
      if (req.body && Object.keys(req.body).length > 0 && !req.is('multipart/form-data')) {
        const filteredBody = { ...req.body };
        if (filteredBody.password) filteredBody.password = '[FILTERED]';
        logger.debug(`Body: ${JSON.stringify(filteredBody)}`);
      }
    }

    // Add start time for performance measurement
    req.startTime = Date.now();

    // Log response after completion
    res.on('finish', () => {
      if (config.nodeEnv === 'development') {
        const duration = Date.now() - req.startTime;
        logger.debug(`Response: ${res.statusCode} ${res.statusMessage} (${duration}ms)`);
      }
    });

    next();
  } catch (error) {
    logger.error(`Middleware error: ${error.message}`);
    next(error);
  }
});

// Check for TDLib availability
app.use((req, res, next) => {
  // Add TDLib status to locals for views
  res.locals.tdlibAvailable = require('./modules/storage/tdlib-client').tdlibStorage !== null;
  next();
});

// Error handling for routes that throw errors
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`);
  logger.error(err.stack);
  
  if (res.headersSent) {
    return next(err);
  }
  
  if (req.xhr || req.path.startsWith('/api')) {
    res.status(err.status || 500).json({
      error: err.message,
      status: err.status || 500
    });
  } else {
    res.status(err.status || 500).render('error', {
      error: err,
      status: err.status || 500,
      message: err.message,
      stack: config.nodeEnv === 'development' ? err.stack : null
    });
  }
});

// Routes
app.use('/', require('./modules/routes'));

// Custom middleware
app.use(logRequest);
app.use(loadUser);
app.use(handleShareToken);

// Routes
app.use('/api/files', fileRoutes);
app.use('/', authRoutes);

// API route để kiểm tra trạng thái TDLib
app.get('/api/telegram/status', async (req, res) => {
  try {
    const { getClient } = require('./modules/storage/tdlib-client');
    const client = await getClient();
    
    // Kiểm tra cấu hình
    const apiId = config.telegram.apiId;
    const apiHash = config.telegram.apiHash;
    const botToken = config.telegram.botToken;
    const chatId = config.telegram.chatId;
    
    const status = {
      config: {
        api_id_provided: !!apiId,
        api_hash_provided: !!apiHash,
        bot_token_provided: !!botToken,
        chat_id_provided: !!chatId
      },
      tdlib: {
        isAvailable: !!client,
        isConnected: !!client && client.isConnected,
        isLoggedIn: !!client && client.isLoggedIn,
        chatId: client ? client.chatId : null
      },
      // Kiểm tra xem có đang sử dụng TDLib
      using_tdlib: !!client && client.isConnected,
      fallback_to_bot_api: (!client || !client.isConnected) && !!botToken && !!chatId
    };
    
    res.json(status);
  } catch (error) {
    logger.error(`Lỗi kiểm tra trạng thái TDLib: ${error.message}`);
    res.status(500).json({
      isAvailable: false,
      error: error.message
    });
  }
});

// Home page
app.get('/', (req, res) => {
  res.render('index', {
    user: req.user || null,
  });
});

// Dashboard page (protected)
app.get('/dashboard', (req, res) => {
  if (!req.session || !req.session.user) {
    req.session.returnTo = '/dashboard';
    return res.redirect('/login');
  }
  
  res.render('dashboard', {
    user: req.session.user,
  });
});

// 404 handler
app.use((req, res) => {
  if (req.xhr || req.path.startsWith('/api')) {
    res.status(404).json({ error: 'Not Found', status: 404 });
  } else {
    res.status(404).render('error', {
      error: new Error('Not Found'),
      status: 404,
      message: 'Trang bạn tìm kiếm không tồn tại.',
      stack: null
    });
  }
});

// Error handler
app.use(errorHandler);

module.exports = app; 