/**
 * TeleDrive - Application Entry Point
 * Modular version of the application
 */

const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const config = require('./modules/common/config');
const { logger } = require('./modules/common/utils');
const fileUtils = require('./modules/common/utils/fileUtils');

// Create Express app
const app = express();

// Initialize required directories
fileUtils.ensureDirectories();

// Set up middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Set up session
app.use(session({
  secret: config.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
}));

// Set up view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Middleware to set common view data
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.isLoggedIn = !!req.session.user;
  res.locals.isAdmin = req.session.user && req.session.user.isAdmin;
  res.locals.appName = 'TeleDrive';
  next();
});

// Set up routes
// Note: Import and configure routes when implemented
// app.use('/api/auth', require('./modules/auth/routes'));
// app.use('/api/files', require('./modules/files/routes'));
// app.use('/', require('./modules/web/routes'));

// 404 Error handler
app.use((req, res, next) => {
  res.status(404).render('error', {
    title: 'Page Not Found',
    message: 'The page you are looking for does not exist.'
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error(`Server error: ${err.message}`, err);
  res.status(500).render('error', {
    title: 'Server Error',
    message: 'An error occurred on the server. Please try again later.'
  });
});

// Export app for testing and server startup
module.exports = app; 