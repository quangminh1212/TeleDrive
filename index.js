require('dotenv').config();
const express = require('express');
const { Telegraf } = require('telegraf');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Create upload directory if it doesn't exist
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
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

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Define File schema
const fileSchema = new mongoose.Schema({
  fileId: { type: String, required: true, unique: true },
  fileName: { type: String, required: true },
  fileType: { type: String },
  filePath: { type: String, required: true },
  fileSize: { type: Number },
  uploadDate: { type: Date, default: Date.now },
  uploadedBy: {
    userId: { type: String },
    firstName: { type: String },
    lastName: { type: String },
    username: { type: String }
  }
});

const File = mongoose.model('File', fileSchema);

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
    
    // Save file metadata to database
    const newFile = new File({
      fileId,
      fileName,
      fileType,
      filePath: `/uploads/${fileName}`,
      fileSize,
      uploadedBy: {
        userId: ctx.from.id.toString(),
        firstName: ctx.from.first_name,
        lastName: ctx.from.last_name,
        username: ctx.from.username
      }
    });
    
    await newFile.save();
    
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
    const files = await File.find().sort({ uploadDate: -1 });
    res.render('index', { files });
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).send('Error fetching files');
  }
});

app.get('/files/:id', async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
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
    const file = await File.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Delete file from filesystem
    const filePath = path.join(__dirname, file.filePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // Delete from database
    await File.findByIdAndDelete(req.params.id);
    
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