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

// Handle errors from Telegram bot
bot.catch((err, ctx) => {
  console.error('Telegram bot error:', err);
  ctx.reply('An error occurred with the bot. Please try again later.').catch(e => {
    console.error('Failed to send error message to user:', e);
  });
});

// Start the bot with error handling
bot.launch()
  .then(() => console.log('Telegram bot started successfully'))
  .catch(err => {
    console.error('Error starting Telegram bot:', err);
    console.log('Application will continue without bot functionality');
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