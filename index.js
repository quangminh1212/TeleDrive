require('dotenv').config();
const express = require('express');
const { Telegraf } = require('telegraf');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Create directories if they don't exist
const uploadDir = path.join(__dirname, 'uploads');
const dataDir = path.join(__dirname, 'data');
const filesDbPath = path.join(dataDir, 'files.json');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize or load the files database
let filesDb = [];

if (fs.existsSync(filesDbPath)) {
  try {
    const fileContent = fs.readFileSync(filesDbPath, 'utf8');
    filesDb = JSON.parse(fileContent);
    console.log('Files database loaded successfully');
  } catch (error) {
    console.error('Error loading files database:', error);
    // Continue with empty database
    filesDb = [];
  }
} else {
  // Create empty database file
  fs.writeFileSync(filesDbPath, JSON.stringify([], null, 2));
  console.log('Created new files database');
}

// Helper function to save filesDb to disk
function saveFilesDb() {
  fs.writeFileSync(filesDbPath, JSON.stringify(filesDb, null, 2));
}

// Generate a unique ID for files
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Generate unique filename to prevent collisions
function generateUniqueFilename(originalName) {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(4).toString('hex');
  
  // Get file extension
  const ext = path.extname(originalName);
  const nameWithoutExt = path.basename(originalName, ext);
  
  // Create unique name
  return `${nameWithoutExt}_${timestamp}_${randomString}${ext}`;
}

// Initialize Express app
const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Custom middleware to check if uploaded files exist before serving them
app.use('/uploads', (req, res, next) => {
  const filePath = path.join(uploadDir, req.path.substr(1));
  if (fs.existsSync(filePath)) {
    next(); // File exists, continue to static middleware
  } else {
    console.warn(`File not found on disk: ${filePath}`);
    res.status(404).json({ error: 'File not found' });
  }
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Initialize Telegram bot
const bot = new Telegraf(process.env.BOT_TOKEN);
let botStatus = {
  isLaunched: false,
  error: null,
  startTime: null,
  botInfo: null,
  lastCheck: null
};

// Kiểm tra bot kết nối thành công và cập nhật trạng thái
try {
  bot.telegram.getMe()
    .then(botInfo => {
      console.log(`Bot information retrieved: @${botInfo.username} (${botInfo.first_name})`);
      botStatus.botInfo = botInfo;
      botStatus.isLaunched = true; // Đánh dấu là bot đã online
      botStatus.lastCheck = Date.now();
      botStatus.startTime = botStatus.startTime || Date.now(); // Nếu chưa có startTime thì set
      console.log('Bot status updated:', JSON.stringify(botStatus, null, 2));
    })
    .catch(error => {
      console.error('Error retrieving bot information:', error);
      botStatus.error = error;
      botStatus.isLaunched = false;
      botStatus.lastCheck = Date.now();
    });
} catch (error) {
  console.error('Exception when checking bot info:', error);
}

// Thêm kiểm tra định kỳ trạng thái bot (mỗi 30 giây)
setInterval(() => {
  console.log('Checking bot status...');
  try {
    bot.telegram.getMe()
      .then(botInfo => {
        const wasOffline = !botStatus.isLaunched;
        botStatus.isLaunched = true;
        botStatus.error = null;
        botStatus.botInfo = botInfo;
        botStatus.lastCheck = Date.now();
        
        if (wasOffline) {
          console.log(`Bot reconnected: @${botInfo.username}`);
          botStatus.startTime = Date.now();
        }
      })
      .catch(error => {
        console.error('Error checking bot status:', error);
        botStatus.isLaunched = false;
        botStatus.error = error;
        botStatus.lastCheck = Date.now();
      });
  } catch (error) {
    console.error('Exception during periodic bot check:', error);
  }
}, 30000);

// Bot middleware to handle files
bot.on(['document', 'photo', 'video', 'audio'], async (ctx) => {
  try {
    let fileId, originalFileName, fileType, fileSize;
    let messageObj;
    
    if (ctx.message.document) {
      messageObj = ctx.message.document;
      fileType = 'document';
      originalFileName = messageObj.file_name || `document_${Date.now()}`;
    } else if (ctx.message.photo) {
      // Photos come in an array of different sizes, take the last one (highest quality)
      messageObj = ctx.message.photo[ctx.message.photo.length - 1];
      fileType = 'photo';
      originalFileName = `photo_${Date.now()}.jpg`;
    } else if (ctx.message.video) {
      messageObj = ctx.message.video;
      fileType = 'video';
      originalFileName = messageObj.file_name || `video_${Date.now()}.mp4`;
    } else if (ctx.message.audio) {
      messageObj = ctx.message.audio;
      fileType = 'audio';
      originalFileName = messageObj.file_name || `audio_${Date.now()}.mp3`;
    }
    
    // Generate a unique filename to prevent collisions
    const fileName = generateUniqueFilename(originalFileName);
    
    fileId = messageObj.file_id;
    fileSize = messageObj.file_size;
    
    console.log(`Processing file: ${fileName} (${fileType}, ${fileSize} bytes)`);
    
    // Get file link from Telegram
    const fileLink = await ctx.telegram.getFileLink(fileId);
    console.log(`File link from Telegram: ${fileLink}`);
    
    // Prepare local file path
    const filePath = path.join(uploadDir, fileName);
    console.log(`Saving file to: ${filePath}`);
    
    // Download file from Telegram
    try {
      const response = await fetch(fileLink);
      
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
      }
      
      const fileStream = fs.createWriteStream(filePath);
      
      await new Promise((resolve, reject) => {
        response.body.pipe(fileStream);
        response.body.on('error', (err) => {
          console.error('Error during file download stream:', err);
          reject(err);
        });
        fileStream.on('finish', () => {
          console.log(`File successfully saved to ${filePath}`);
          resolve();
        });
        fileStream.on('error', (err) => {
          console.error('Error writing file to disk:', err);
          reject(err);
        });
      });
      
      // Verify file was saved
      if (!fs.existsSync(filePath)) {
        throw new Error(`File was not saved properly to ${filePath}`);
      }
      
      const stats = fs.statSync(filePath);
      console.log(`File saved, size on disk: ${stats.size} bytes`);
      
      // Use the actual file size
      fileSize = stats.size;
    } catch (error) {
      console.error('Error downloading file:', error);
      await ctx.reply('Sorry, there was an error downloading your file.');
      return;
    }
    
    // Save file metadata to our JSON database
    const newFile = {
      _id: generateId(),
      fileId: fileId,
      fileName: fileName,
      originalFileName: originalFileName,
      fileType: fileType,
      filePath: `/uploads/${fileName}`,
      fileSize: fileSize,
      uploadDate: new Date().toISOString(),
      uploadedBy: {
        userId: ctx.from.id.toString(),
        firstName: ctx.from.first_name,
        lastName: ctx.from.last_name,
        username: ctx.from.username
      }
    };
    
    filesDb.push(newFile);
    saveFilesDb();
    
    await ctx.reply(`File "${originalFileName}" has been saved successfully! Access it from the web interface.`);
  } catch (error) {
    console.error('Error handling file:', error);
    await ctx.reply('Sorry, there was an error processing your file.');
  }
});

bot.command('start', (ctx) => {
  ctx.reply('Welcome to TeleDrive! Send me any file, and I will save it for you.');
});

bot.command('help', (ctx) => {
  ctx.reply('Just send me any file (document, photo, video, audio), and I will save it for you. You can manage your files through the web interface.');
});

// Express routes
app.get('/', async (req, res) => {
  try {
    // Sort files by uploadDate, newest first
    const files = [...filesDb].sort((a, b) => 
      new Date(b.uploadDate) - new Date(a.uploadDate)
    );
    res.render('index', { files });
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).send('Error fetching files');
  }
});

// Bot settings page
app.get('/bot-settings', async (req, res) => {
  try {
    res.render('bot-settings');
  } catch (error) {
    console.error('Error rendering bot settings page:', error);
    res.status(500).send('Error loading bot settings page');
  }
});

app.get('/files/:id', async (req, res) => {
  try {
    const file = filesDb.find(f => f._id === req.params.id);
    if (!file) {
      return res.status(404).send('File not found');
    }
    res.render('file-details', { file });
  } catch (error) {
    console.error('Error fetching file details:', error);
    res.status(500).send('Error fetching file details');
  }
});

app.delete('/files/:id', async (req, res) => {
  try {
    const fileIndex = filesDb.findIndex(f => f._id === req.params.id);
    if (fileIndex === -1) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const file = filesDb[fileIndex];
    
    // Delete file from filesystem
    const filePath = path.join(__dirname, file.filePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`File deleted from disk: ${filePath}`);
    } else {
      console.warn(`File not found on disk when attempting to delete: ${filePath}`);
    }
    
    // Remove from our database
    filesDb.splice(fileIndex, 1);
    saveFilesDb();
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Error deleting file' });
  }
});

// API endpoint to verify file exists
app.get('/api/check-file/:id', (req, res) => {
  try {
    const file = filesDb.find(f => f._id === req.params.id);
    
    if (!file) {
      return res.json({ exists: false, error: 'File not found in database' });
    }
    
    const filePath = path.join(__dirname, file.filePath);
    const fileExists = fs.existsSync(filePath);
    
    res.json({ 
      exists: fileExists,
      file: {
        id: file._id,
        name: file.fileName,
        type: file.fileType,
        size: file.fileSize,
        path: file.filePath
      }
    });
  } catch (error) {
    console.error('Error checking file:', error);
    res.status(500).json({ exists: false, error: error.message });
  }
});

// API endpoint to check bot status
app.get('/api/bot-status', (req, res) => {
  // Check bot status right when endpoint is called
  try {
    bot.telegram.getMe()
      .then(botInfo => {
        botStatus.isLaunched = true;
        botStatus.error = null;
        botStatus.botInfo = botInfo;
        botStatus.lastCheck = Date.now();
        
        res.json({
          isLaunched: botStatus.isLaunched,
          error: null,
          startTime: botStatus.startTime,
          uptime: botStatus.startTime ? Math.floor((Date.now() - botStatus.startTime) / 1000) : null,
          botInfo: botStatus.botInfo,
          lastCheck: botStatus.lastCheck
        });
      })
      .catch(error => {
        console.error('Error checking bot status in API call:', error);
        botStatus.isLaunched = false;
        botStatus.error = error;
        botStatus.lastCheck = Date.now();
        
        res.json({
          isLaunched: false,
          error: error.message,
          startTime: botStatus.startTime,
          uptime: botStatus.startTime ? Math.floor((Date.now() - botStatus.startTime) / 1000) : null,
          botInfo: botStatus.botInfo,
          lastCheck: botStatus.lastCheck,
          token: process.env.BOT_TOKEN ? `${process.env.BOT_TOKEN.substring(0, 5)}...${process.env.BOT_TOKEN.substring(process.env.BOT_TOKEN.length - 5)}` : 'Not provided'
        });
      });
  } catch (error) {
    console.error('Exception in bot status API endpoint:', error);
    res.status(500).json({
      isLaunched: false,
      error: error.message,
      lastCheck: Date.now()
    });
  }
});

// API endpoint to restart the bot
app.post('/api/restart-bot', (req, res) => {
  console.log('Attempting to restart bot...');
  
  try {
    // Stop the bot safely
    bot.stop('restart');
    
    setTimeout(() => {
      // Restart the bot
      bot.launch()
        .then(() => {
          console.log('Telegram bot restarted successfully');
          botStatus.isLaunched = true;
          botStatus.startTime = Date.now();
          botStatus.error = null;
          
          // Get updated info
          return bot.telegram.getMe();
        })
        .then(botInfo => {
          botStatus.botInfo = botInfo;
          botStatus.lastCheck = Date.now();
          
          res.json({
            success: true,
            message: 'Bot restarted successfully',
            botInfo: botStatus.botInfo
          });
        })
        .catch(err => {
          console.error('Error restarting Telegram bot:', err);
          botStatus.isLaunched = false;
          botStatus.error = err;
          botStatus.lastCheck = Date.now();
          
          res.status(500).json({
            success: false,
            message: 'Failed to restart bot',
            error: err.message
          });
        });
    }, 1000); // Đợi 1 giây sau khi dừng bot để khởi động lại
  } catch (error) {
    console.error('Exception during bot restart:', error);
    res.status(500).json({
      success: false,
      message: 'Exception occurred during restart',
      error: error.message
    });
  }
});

// API endpoint to test bot directly
app.get('/api/test-bot', (req, res) => {
  console.log('Testing bot connection directly...');
  
  try {
    bot.telegram.getMe()
      .then(botInfo => {
        console.log('Bot test successful:', botInfo);
        res.json({
          success: true,
          message: 'Bot is online and responding',
          botInfo: botInfo,
          token_info: {
            provided: !!process.env.BOT_TOKEN,
            length: process.env.BOT_TOKEN ? process.env.BOT_TOKEN.length : 0,
            preview: process.env.BOT_TOKEN ? `${process.env.BOT_TOKEN.substring(0, 5)}...${process.env.BOT_TOKEN.substring(process.env.BOT_TOKEN.length - 5)}` : 'Not provided'
          }
        });
      })
      .catch(error => {
        console.error('Bot test failed:', error);
        res.status(500).json({
          success: false,
          message: 'Bot test failed',
          error: error.message,
          error_code: error.code,
          error_response: error.response,
          token_info: {
            provided: !!process.env.BOT_TOKEN,
            length: process.env.BOT_TOKEN ? process.env.BOT_TOKEN.length : 0,
            preview: process.env.BOT_TOKEN ? `${process.env.BOT_TOKEN.substring(0, 5)}...${process.env.BOT_TOKEN.substring(process.env.BOT_TOKEN.length - 5)}` : 'Not provided'
          }
        });
      });
  } catch (error) {
    console.error('Exception during bot test:', error);
    res.status(500).json({
      success: false,
      message: 'Exception occurred during bot test',
      error: error.message
    });
  }
});

// API endpoint to update bot token
app.post('/api/update-token', (req, res) => {
  console.log('Attempting to update bot token...');
  
  // Check if token is provided
  if (!req.body.token) {
    return res.status(400).json({
      success: false,
      message: 'Missing token parameter'
    });
  }
  
  const newToken = req.body.token.trim();
  
  // Simple validation
  if (newToken.length < 20) {
    return res.status(400).json({
      success: false,
      message: 'Token appears to be invalid (too short)'
    });
  }
  
  // Store the original token if we need to restore it
  const originalToken = process.env.BOT_TOKEN;
  
  try {
    // Stop the existing bot
    bot.stop('token_update');
    
    // Update the token
    process.env.BOT_TOKEN = newToken;
    
    // Create a new bot instance with the new token
    const newBot = new Telegraf(newToken);
    
    // Test the new token
    newBot.telegram.getMe()
      .then(botInfo => {
        console.log('New bot token verified successfully:', botInfo);
        
        // Replace the old bot with the new one
        bot = newBot;
        botStatus.botInfo = botInfo;
        botStatus.isLaunched = true;
        botStatus.startTime = Date.now();
        botStatus.error = null;
        botStatus.lastCheck = Date.now();
        
        // Launch the new bot
        bot.launch()
          .then(() => {
            console.log('Bot restarted with new token successfully');
            
            // Respond with success
            res.json({
              success: true,
              message: 'Bot token updated and bot restarted successfully',
              botInfo: botStatus.botInfo
            });
          })
          .catch(err => {
            console.error('Error launching bot with new token:', err);
            
            // Restore the original token and bot
            process.env.BOT_TOKEN = originalToken;
            bot = new Telegraf(originalToken);
            bot.launch().catch(e => console.error('Failed to restore original bot:', e));
            
            res.status(500).json({
              success: false,
              message: 'Failed to launch bot with new token, reverted to original',
              error: err.message
            });
          });
      })
      .catch(err => {
        console.error('Error verifying new bot token:', err);
        
        // Restore the original token and bot
        process.env.BOT_TOKEN = originalToken;
        bot = new Telegraf(originalToken);
        bot.launch().catch(e => console.error('Failed to restore original bot:', e));
        
        res.status(400).json({
          success: false,
          message: 'Invalid bot token provided',
          error: err.message
        });
      });
  } catch (error) {
    console.error('Exception during token update:', error);
    
    // Restore the original token and bot
    process.env.BOT_TOKEN = originalToken;
    bot = new Telegraf(originalToken);
    bot.launch().catch(e => console.error('Failed to restore original bot after exception:', e));
    
    res.status(500).json({
      success: false,
      message: 'Exception occurred during token update',
      error: error.message
    });
  }
});

// Handle errors from Telegram bot
bot.catch((err, ctx) => {
  console.error('Telegram bot error:', err);
  ctx.reply('An error occurred with the bot. Please try again later.').catch(e => {
    console.error('Failed to send error message to user:', e);
  });
});

// Start the bot with error handling
bot.launch()
  .then(() => {
    console.log('Telegram bot started successfully');
    botStatus.isLaunched = true;
    botStatus.startTime = Date.now();
    botStatus.error = null;
    
    // Get and log bot information
    return bot.telegram.getMe();
  })
  .then(botInfo => {
    botStatus.botInfo = botInfo;
    botStatus.lastCheck = Date.now();
    
    // Log additional information
    console.log(`Bot is now running as @${botInfo.username} (${botInfo.first_name})`);
    console.log(`Bot ID: ${botInfo.id}`);
    console.log(`Bot token used: ${process.env.BOT_TOKEN ? `${process.env.BOT_TOKEN.substring(0, 5)}...${process.env.BOT_TOKEN.substring(process.env.BOT_TOKEN.length - 5)}` : 'Not provided'}`);
  })
  .catch(err => {
    console.error('Error starting Telegram bot:', err);
    console.error('Bot token:', process.env.BOT_TOKEN ? `${process.env.BOT_TOKEN.substring(0, 5)}...${process.env.BOT_TOKEN.substring(process.env.BOT_TOKEN.length - 5)}` : 'Not provided');
    console.log('Application will continue without bot functionality');
    botStatus.isLaunched = false;
    botStatus.error = err;
    
    // Log detailed error
    if (err.code === 'ETELEGRAM') {
      console.error('Telegram API error:', err.response?.description || err.message);
    } else if (err.code === 'EFATAL') {
      console.error('Fatal error with Telegram bot:', err.message);
    } else {
      console.error('Unknown error type:', err);
    }
  });

// Start Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Web interface available at http://localhost:${PORT}`);
  console.log(`Files will be stored in: ${path.resolve(uploadDir)}`);
});

// Enable graceful stop
process.once('SIGINT', () => {
  console.log('Shutting down application gracefully...');
  bot.stop('SIGINT');
  process.exit(0);
});
process.once('SIGTERM', () => {
  console.log('Shutting down application gracefully...');
  bot.stop('SIGTERM');
  process.exit(0);
});
