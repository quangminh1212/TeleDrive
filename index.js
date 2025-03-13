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
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(filesDbPath, JSON.stringify(filesDb, null, 2), 'utf8');
    console.log(`Đã lưu cơ sở dữ liệu vào ${filesDbPath} (${filesDb.length} files)`);
    return true;
  } catch (error) {
    console.error('Lỗi khi lưu cơ sở dữ liệu:', error);
    return false;
  }
}

// Cải thiện hàm đọc dữ liệu
function loadFilesDb() {
  try {
    if (fs.existsSync(filesDbPath)) {
      const fileContent = fs.readFileSync(filesDbPath, 'utf8');
      filesDb = JSON.parse(fileContent);
      console.log(`Files database loaded successfully (${filesDb.length} files)`);
    } else {
      filesDb = [];
      console.log('Files database không tồn tại, tạo mới');
      saveFilesDb();
    }
  } catch (error) {
    console.error('Lỗi khi đọc cơ sở dữ liệu:', error);
    console.log('Tạo cơ sở dữ liệu mới');
    filesDb = [];
    saveFilesDb();
  }
}

// Log errors to file for debugging
function logErrorToFile(context, error, additionalInfo = {}) {
  try {
    const errorLogDir = path.join(__dirname, 'logs');
    
    // Create logs directory if it doesn't exist
    if (!fs.existsSync(errorLogDir)) {
      fs.mkdirSync(errorLogDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const errorLogFile = path.join(errorLogDir, `error_${timestamp}.json`);
    
    const errorData = {
      timestamp: new Date().toISOString(),
      context: context,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code
      },
      additionalInfo: additionalInfo
    };
    
    fs.writeFileSync(errorLogFile, JSON.stringify(errorData, null, 2));
    console.log(`Lỗi đã được ghi vào file: ${errorLogFile}`);
    return errorLogFile;
  } catch (logError) {
    console.error('Không thể ghi log lỗi vào file:', logError);
    return null;
  }
}

// Check if a file is potentially unsafe
function isPotentiallyUnsafeFile(fileName) {
  const unsafeExtensions = ['.exe', '.bat', '.cmd', '.msi', '.dll', '.vbs', '.js', '.ps1', '.sh'];
  const lowerFileName = fileName.toLowerCase();
  
  return unsafeExtensions.some(ext => lowerFileName.endsWith(ext));
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

// Hàm hỗ trợ định dạng kích thước file
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
    console.log('Nhận được file từ Telegram:', ctx.message);
    let fileId, fileType, messageObj, fileName, originalFileName, fileSize, fileLink;
    
    // Xác định loại file và lấy thông tin cơ bản
    try {
      if (ctx.message.document) {
        messageObj = ctx.message.document;
        fileType = 'document';
        originalFileName = messageObj.file_name || `document_${Date.now()}`;
        console.log(`File document "${originalFileName}" đã nhận, mime type: ${messageObj.mime_type}`);
      } else if (ctx.message.photo) {
        messageObj = ctx.message.photo[ctx.message.photo.length - 1];
        fileType = 'photo';
        originalFileName = `photo_${Date.now()}.jpg`;
        console.log(`File photo đã nhận, độ phân giải: ${messageObj.width}x${messageObj.height}`);
      } else if (ctx.message.video) {
        messageObj = ctx.message.video;
        fileType = 'video';
        originalFileName = messageObj.file_name || `video_${Date.now()}.mp4`;
        console.log(`File video đã nhận, duration: ${messageObj.duration}s`);
      } else if (ctx.message.audio) {
        messageObj = ctx.message.audio;
        fileType = 'audio';
        originalFileName = messageObj.file_name || `audio_${Date.now()}.mp3`;
        console.log(`File audio đã nhận, duration: ${messageObj.duration}s`);
      }
      
      fileName = generateUniqueFilename(originalFileName);
      fileId = messageObj.file_id;
      fileSize = messageObj.file_size;
      
      console.log(`Xử lý file: ${fileName} (${fileType}, ${fileSize} bytes)`);
      
      // Kiểm tra kích thước file
      if (fileSize > 20 * 1024 * 1024) { // Giới hạn 20MB
        const errorMsg = `File quá lớn (${Math.round(fileSize / (1024 * 1024))}MB). Telegram bot chỉ hỗ trợ file tối đa 20MB.`;
        console.error(errorMsg);
        await ctx.reply(errorMsg);
        return;
      }
      
      // Kiểm tra file nguy hiểm
      if (isPotentiallyUnsafeFile(originalFileName)) {
        console.warn(`Cảnh báo: Phát hiện file tiềm ẩn nguy hiểm: ${originalFileName}`);
      }

      // Lấy link file từ Telegram API
      console.log(`Đang lấy link file từ Telegram API với fileId: ${fileId}`);
      fileLink = await ctx.telegram.getFileLink(fileId);
      console.log(`File link từ Telegram: ${fileLink}`);

      // Lưu metadata vào cơ sở dữ liệu mà không tải file
      const newFile = {
        _id: generateId(),
        fileId: fileId,
        fileName: fileName,
        originalFileName: originalFileName,
        fileType: fileType,
        filePath: null, // Không lưu đường dẫn local
        fileLink: fileLink.toString(), // Lưu link Telegram trực tiếp
        fileSize: fileSize,
        uploadDate: new Date().toISOString(),
        uploadedBy: {
          userId: ctx.from.id.toString(),
          firstName: ctx.from.first_name,
          lastName: ctx.from.last_name,
          username: ctx.from.username
        },
        directLink: true // Đánh dấu file này sử dụng link trực tiếp
      };
      
      filesDb.push(newFile);
      saveFilesDb();
      console.log('Đã lưu metadata vào cơ sở dữ liệu JSON');
      
      await ctx.reply(`File "${originalFileName}" đã được lưu thành công! Truy cập nó từ web interface.`);
    } catch (error) {
      console.error('Lỗi chi tiết khi xử lý file:', error);
      console.error('Stack trace:', error.stack);
      
      let errorMessage = `Xin lỗi, có lỗi khi xử lý file của bạn: ${error.message}.`;
      if (error.message.includes('size') || error.message.includes('quá lớn')) {
        errorMessage += ' Hãy thử gửi file nhỏ hơn 20MB.';
      }
      errorMessage += ' Log chi tiết đã được lưu để kiểm tra.';
      await ctx.reply(errorMessage);
      
      const logFile = logErrorToFile('general_file_processing', error, { message: ctx.message });
    }
  } catch (error) {
    console.error('Lỗi tổng quát khi xử lý file:', error);
    console.error('Stack trace đầy đủ:', error.stack);
    const logFile = logErrorToFile('general_file_processing', error, { message: ctx.message });
    
    let errorMessage = `Xin lỗi, có lỗi khi xử lý file của bạn: ${error.message}.`;
    if (error.message.includes('size') || error.message.includes('quá lớn')) {
      errorMessage += ' Hãy thử gửi file nhỏ hơn 20MB.';
    }
    errorMessage += ' Log chi tiết đã được lưu để kiểm tra.';
    await ctx.reply(errorMessage);
  }
});

bot.command('start', (ctx) => {
  ctx.reply('Welcome to TeleDrive! Send me any file (under 20MB), and I will save it for you.');
});

bot.command('help', (ctx) => {
  ctx.reply('Just send me any file (document, photo, video, audio) under 20MB, and I will save it for you. You can manage your files through the web interface.\n\nLưu ý: Telegram Bot API giới hạn tải xuống file 20MB. File lớn hơn sẽ không thể xử lý.');
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
      return res.status(404).render('error', { message: 'File not found' });
    }
    
    // Thông tin file
    let fileInfo = {
      ...file,
      sizeFormatted: formatFileSize(file.fileSize),
      dateFormatted: new Date(file.uploadDate).toLocaleString(),
      previewAvailable: false,
      directLink: file.directLink || false
    };
    
    // Kiểm tra khả năng xem trước
    if (file.fileType === 'photo' || 
        (file.fileType === 'document' && 
         (file.originalFileName.endsWith('.jpg') || 
          file.originalFileName.endsWith('.jpeg') || 
          file.originalFileName.endsWith('.png') || 
          file.originalFileName.endsWith('.gif')))) {
      fileInfo.previewAvailable = true;
    }
    
    res.render('file-details', { file: fileInfo });
  } catch (error) {
    console.error('Error fetching file details:', error);
    res.status(500).render('error', { message: 'Server error while fetching file details' });
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
  console.log('Đang thử khởi động lại bot...');
  
  try {
    // Stop the bot safely
    console.log('Dừng bot hiện tại...');
    bot.stop('restart');
    
    setTimeout(() => {
      // Restart the bot
      console.log('Khởi động lại bot với token:', process.env.BOT_TOKEN ? `${process.env.BOT_TOKEN.substring(0, 5)}...` : 'không có token');
      bot.launch()
        .then(() => {
          console.log('Bot Telegram đã khởi động lại thành công');
          botStatus.isLaunched = true;
          botStatus.startTime = Date.now();
          botStatus.error = null;
          
          // Get updated info
          return bot.telegram.getMe();
        })
        .then(botInfo => {
          botStatus.botInfo = botInfo;
          botStatus.lastCheck = Date.now();
          
          console.log(`Bot đã online: @${botInfo.username} (${botInfo.first_name})`);
          
          res.json({
            success: true,
            message: 'Bot đã khởi động lại thành công',
            botInfo: botStatus.botInfo
          });
        })
        .catch(err => {
          console.error('Lỗi khi khởi động lại bot Telegram:', err);
          
          // Log chi tiết về lỗi
          let detailedError = {
            message: err.message,
            code: err.code,
            name: err.name
          };
          
          if (err.response) {
            detailedError.response = err.response;
          }
          
          console.error('Chi tiết lỗi:', JSON.stringify(detailedError, null, 2));
          
          // Cập nhật trạng thái bot
          botStatus.isLaunched = false;
          botStatus.error = err;
          botStatus.lastCheck = Date.now();
          
          logErrorToFile('restart_bot', err, {
            token_length: process.env.BOT_TOKEN ? process.env.BOT_TOKEN.length : 0,
            token_preview: process.env.BOT_TOKEN ? `${process.env.BOT_TOKEN.substring(0, 5)}...` : 'none'
          });
          
          res.status(500).json({
            success: false,
            message: 'Không thể khởi động lại bot',
            error: err.message,
            details: detailedError,
            recommendations: [
              'Kiểm tra token bot có đúng không',
              'Đảm bảo bot chưa bị dừng bởi @BotFather',
              'Kiểm tra kết nối internet',
              'Xem logs để biết thêm chi tiết'
            ]
          });
        });
    }, 1000); // Đợi 1 giây sau khi dừng bot để khởi động lại
  } catch (error) {
    console.error('Lỗi ngoại lệ khi khởi động lại bot:', error);
    
    const logFile = logErrorToFile('restart_bot_exception', error);
    
    res.status(500).json({
      success: false,
      message: 'Lỗi ngoại lệ khi khởi động lại',
      error: error.message,
      logFile: path.basename(logFile || '')
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

// API endpoint để xem log lỗi gần nhất
app.get('/api/error-logs', (req, res) => {
  try {
    const errorLogDir = path.join(__dirname, 'logs');
    
    if (!fs.existsSync(errorLogDir)) {
      return res.json({ logs: [] });
    }
    
    // Đọc danh sách file log
    const logFiles = fs.readdirSync(errorLogDir)
      .filter(file => file.startsWith('error_') && file.endsWith('.json'))
      .sort((a, b) => {
        // Sắp xếp theo thời gian tạo file, mới nhất lên đầu
        const statsA = fs.statSync(path.join(errorLogDir, a));
        const statsB = fs.statSync(path.join(errorLogDir, b));
        return statsB.mtime.getTime() - statsA.mtime.getTime();
      })
      .slice(0, 10); // Giới hạn chỉ 10 file log gần nhất
    
    // Đọc nội dung file log
    const logs = logFiles.map(file => {
      try {
        const filePath = path.join(errorLogDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        return {
          file,
          time: fs.statSync(filePath).mtime,
          content: JSON.parse(content)
        };
      } catch (error) {
        return {
          file,
          error: `Không thể đọc file log: ${error.message}`
        };
      }
    });
    
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: `Lỗi khi đọc log: ${error.message}` });
  }
});

// Thêm API endpoint để lấy danh sách file
app.get('/api/files', (req, res) => {
  try {
    // Đọc lại từ đĩa để đảm bảo dữ liệu mới nhất
    loadFilesDb();
    
    // Sắp xếp theo thời gian tải lên, mới nhất lên đầu
    const sortedFiles = [...filesDb].sort((a, b) => 
      new Date(b.uploadDate) - new Date(a.uploadDate)
    );
    
    res.json({
      success: true,
      count: sortedFiles.length,
      files: sortedFiles
    });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách file:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API endpoint để kiểm tra lưu trữ dữ liệu
app.get('/api/debug-files', (req, res) => {
  try {
    // Kiểm tra file trên đĩa
    let diskData = null;
    if (fs.existsSync(filesDbPath)) {
      const fileContent = fs.readFileSync(filesDbPath, 'utf8');
      diskData = JSON.parse(fileContent);
    }
    
    // Trả về cả dữ liệu trong bộ nhớ và trên đĩa để so sánh
    res.json({
      success: true,
      memoryData: {
        count: filesDb.length,
        files: filesDb
      },
      diskData: {
        count: diskData ? diskData.length : 0,
        files: diskData
      },
      fileDbPath: filesDbPath,
      fileDbExists: fs.existsSync(filesDbPath)
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
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
const PORT = process.env.PORT || 3005;
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
