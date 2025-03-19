const express = require('express');
const path = require('path');
const morgan = require('morgan');
const session = require('express-session');
const { config, validateConfig } = require('./modules/common/config');
const logger = require('./modules/common/logger');
const { loadUser, logRequest, handleShareToken } = require('./modules/auth/middleware');
const fileRoutes = require('./modules/files/routes');
const authRoutes = require('./modules/auth/routes');

// Validate required configuration
validateConfig();

// Create Express app
const app = express();

// View engine setup
app.set('views', config.paths.views);
app.set('view engine', 'ejs');

// Middleware
app.use(morgan('combined', { stream: logger.stream }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(config.paths.public));

// Session setup
let sessionOptions = {
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
};

// Thêm MongoDB store nếu có kết nối
try {
  const MongoStore = require('connect-mongo');
  sessionOptions.store = new MongoStore({
    mongoUrl: config.db.uri,
    collection: 'sessions',
    ttl: 24 * 60 * 60 // 1 day
  });
  
  logger.info('Đã kết nối session với MongoDB');
} catch (error) {
  logger.warn(`Không thể kết nối session với MongoDB: ${error.message}`);
  logger.warn('Sử dụng session lưu trong bộ nhớ (không bền vững giữa các lần khởi động)');
}

app.use(session(sessionOptions));

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
    
    res.json({
      isAvailable: !!client && client.hasCredentials,
      isConnected: !!client && client.isConnected,
      isLoggedIn: !!client && client.isLoggedIn
    });
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

// Error handler
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}\n${err.stack}`);
  
  res.status(err.status || 500);
  
  if (req.xhr || req.path.startsWith('/api')) {
    res.json({
      error: err.message,
      stack: config.nodeEnv === 'development' ? err.stack : undefined,
    });
  } else {
    res.render('error', {
      title: 'Error',
      message: err.message,
      error: config.nodeEnv === 'development' ? err : {},
    });
  }
});

module.exports = app; 