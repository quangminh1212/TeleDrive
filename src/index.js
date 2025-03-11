const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const fileUpload = require('express-fileupload');
const path = require('path');
const { initTelegramClient } = require('./config/telegram');
const AuthController = require('./controllers/authController');
require('dotenv').config();

// Initialize the Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit (Telegram bot API limit)
  useTempFiles: true,
  tempFileDir: path.join(require('os').tmpdir(), 'teledrive')
}));

// API routes
app.use('/api', require('./routes/api'));

// Static files for the frontend
app.use(express.static(path.join(__dirname, '../public')));

// Start the server
async function startServer() {
  try {
    // Initialize Telegram client
    const isConnected = await initTelegramClient();
    
    if (!isConnected) {
      console.log('Starting login process...');
      await AuthController.login();
    }
    
    // Start the Express server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

// Start the server
startServer(); 