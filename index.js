require('dotenv').config();
const express = require('express');
const { Telegraf } = require('telegraf');
const path = require('path');
const fs = require('fs');

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

// Initialize Express app
const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Telegram bot
const bot = new Telegraf(process.env.BOT_TOKEN);

// Bot middleware to handle files
bot.on(['document', 'photo', 'video', 'audio'], async (ctx) => {
  try {
    let fileId, fileName, fileType, fileSize;
    let messageObj;
    
    if (ctx.message.document) {
      messageObj = ctx.message.document;
      fileType = 'document';
      fileName = messageObj.file_name;
    } else if (ctx.message.photo) {
      // Photos come in an array of different sizes, take the last one (highest quality)
      messageObj = ctx.message.photo[ctx.message.photo.length - 1];
      fileType = 'photo';
      fileName = `photo_${Date.now()}.jpg`;
    } else if (ctx.message.video) {
      messageObj = ctx.message.video;
      fileType = 'video';
      fileName = messageObj.file_name || `video_${Date.now()}.mp4`;
    } else if (ctx.message.audio) {
      messageObj = ctx.message.audio;
      fileType = 'audio';
      fileName = messageObj.file_name || `audio_${Date.now()}.mp3`;
    }
    
    fileId = messageObj.file_id;
    fileSize = messageObj.file_size;
    
    // Get file link from Telegram
    const fileLink = await ctx.telegram.getFileLink(fileId);
    
    // Prepare local file path
    const filePath = path.join(uploadDir, fileName);
    
    // Download file from Telegram
    const response = await fetch(fileLink);
    const fileStream = fs.createWriteStream(filePath);
    
    await new Promise((resolve, reject) => {
      response.body.pipe(fileStream);
      response.body.on('error', reject);
      fileStream.on('finish', resolve);
    });
    
    // Save file metadata to our JSON database
    const newFile = {
      _id: generateId(),
      fileId: fileId,
      fileName: fileName,
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
    
    await ctx.reply(`File "${fileName}" has been saved successfully! Access it from the web interface.`);
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

// Start the bot
bot.launch()
  .then(() => console.log('Telegram bot started'))
  .catch(err => console.error('Error starting bot:', err));

// Start Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM')); 