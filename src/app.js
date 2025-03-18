const express = require('express');
const path = require('path');
const morgan = require('morgan');
const session = require('express-session');
const MongoStore = require('connect-mongo');
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
app.use(session({
  secret: config.session.secret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  },
  store: new MongoStore({
    mongoUrl: config.db.uri,
    collection: 'sessions',
    ttl: 24 * 60 * 60 // 1 day
  })
}));

// Custom middleware
app.use(logRequest);
app.use(loadUser);
app.use(handleShareToken);

// Routes
app.use('/api/files', fileRoutes);
app.use('/', authRoutes);

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
  
  res.send('Dashboard - Coming Soon'); // Will be replaced with actual dashboard
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