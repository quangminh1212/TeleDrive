const express = require('express');
const path = require('path');
const morgan = require('morgan');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const { config, validateConfig } = require('./modules/common/config');
const logger = require('./modules/common/logger');
const { loadUser, logRequest, handleShareToken } = require('./modules/auth/middleware');
const fileRoutes = require('./modules/files/routes');

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
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: config.db.uri,
    collectionName: 'sessions',
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    secure: config.nodeEnv === 'production',
  }
}));

// Custom middleware
app.use(logRequest);
app.use(loadUser);
app.use(handleShareToken);

// Routes
app.use('/api/files', fileRoutes);

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