const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const dotenv = require('dotenv');
const { Telegraf } = require('telegraf');
const axios = require('axios');

// Đọc cấu hình từ file .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3008;
const BOT_TOKEN = process.env.BOT_TOKEN;

// Khởi tạo bot Telegram nếu có token
let bot = null;
if (BOT_TOKEN && BOT_TOKEN !== 'your_telegram_bot_token') {
  bot = new Telegraf(BOT_TOKEN);
  
  bot.command('start', (ctx) => {
    ctx.reply('Chào mừng đến với TeleDrive! Gửi file (dưới 20MB) và tôi sẽ lưu trữ cho bạn.');
  });
  
  bot.command('help', (ctx) => {
    ctx.reply('Chỉ cần gửi file (tài liệu, hình ảnh, video, âm thanh) dưới 20MB, và tôi sẽ lưu trữ cho bạn. Bạn có thể quản lý file qua giao diện web.\n\nLưu ý: Telegram Bot API giới hạn kích thước file 20MB.');
  });

  // Xử lý file từ người dùng
  bot.on('document', async (ctx) => {
    try {
      console.log('Nhận file document từ user:', ctx.from.username || ctx.from.id);
      await processIncomingFile(ctx, 'document');
    } catch (error) {
      console.error('Lỗi xử lý document:', error);
      ctx.reply(`Có lỗi xảy ra khi xử lý file: ${error.message}`);
    }
  });
  
  bot.on('photo', async (ctx) => {
    try {
      console.log('Nhận file ảnh từ user:', ctx.from.username || ctx.from.id);
      await processIncomingFile(ctx, 'photo');
    } catch (error) {
      console.error('Lỗi xử lý photo:', error);
      ctx.reply(`Có lỗi xảy ra khi xử lý ảnh: ${error.message}`);
    }
  });
  
  bot.on('video', async (ctx) => {
    try {
      console.log('Nhận file video từ user:', ctx.from.username || ctx.from.id);
      await processIncomingFile(ctx, 'video');
    } catch (error) {
      console.error('Lỗi xử lý video:', error);
      ctx.reply(`Có lỗi xảy ra khi xử lý video: ${error.message}`);
    }
  });
  
  bot.on('audio', async (ctx) => {
    try {
      console.log('Nhận file audio từ user:', ctx.from.username || ctx.from.id);
      await processIncomingFile(ctx, 'audio');
    } catch (error) {
      console.error('Lỗi xử lý audio:', error);
      ctx.reply(`Có lỗi xảy ra khi xử lý audio: ${error.message}`);
    }
  });

  // Khởi động bot
  bot.launch()
    .then(() => {
      console.log('Bot Telegram đã khởi động thành công!');
      bot.telegram.getMe().then(botInfo => {
        console.log(`Bot đang online: @${botInfo.username}`);
      });
    })
    .catch(err => {
      console.error('Lỗi khởi động bot:', err);
      console.warn('Bot Telegram không hoạt động. Ứng dụng sẽ chạy ở chế độ chỉ có web.');
      bot = null; // Reset bot to null if failed
    });
} else {
  console.warn('Không tìm thấy BOT_TOKEN hợp lệ trong file .env. Tính năng bot không hoạt động. Ứng dụng sẽ chạy ở chế độ chỉ có web.');
}

/**
 * Xử lý file nhận từ Telegram Bot
 * @param {Object} ctx - Context từ Telegraf
 * @param {String} fileType - Loại file: document, photo, video, audio
 */
async function processIncomingFile(ctx, fileType) {
  try {
    let fileId, fileName, fileSize, mimeType;
    
    // Lấy thông tin file dựa vào loại
    if (fileType === 'photo') {
      // Lấy phiên bản chất lượng cao nhất của ảnh
      const photos = ctx.message.photo;
      const photo = photos[photos.length - 1];
      fileId = photo.file_id;
      fileName = `photo_${Date.now()}.jpg`;
      fileSize = photo.file_size;
      mimeType = 'image/jpeg';
    } else if (fileType === 'document') {
      const doc = ctx.message.document;
      fileId = doc.file_id;
      fileName = doc.file_name || `document_${Date.now()}`;
      fileSize = doc.file_size;
      mimeType = doc.mime_type || 'application/octet-stream';
    } else if (fileType === 'video') {
      const video = ctx.message.video;
      fileId = video.file_id;
      fileName = video.file_name || `video_${Date.now()}.mp4`;
      fileSize = video.file_size;
      mimeType = video.mime_type || 'video/mp4';
    } else if (fileType === 'audio') {
      const audio = ctx.message.audio;
      fileId = audio.file_id;
      fileName = audio.file_name || `audio_${Date.now()}.mp3`;
      fileSize = audio.file_size;
      mimeType = audio.mime_type || 'audio/mpeg';
    } else {
      throw new Error('Không hỗ trợ loại file này');
    }
    
    // Lưu trữ tên file gốc cho hiển thị
    const originalFileName = fileName;
    
    // Kiểm tra kích thước file
    if (fileSize > 20 * 1024 * 1024) {
      return ctx.reply('File quá lớn (>20MB). Vui lòng gửi file nhỏ hơn.');
    }
    
    // Lấy thông tin file từ Telegram
    ctx.reply('⏳ Đang xử lý file... Vui lòng đợi.');
    const fileInfo = await ctx.telegram.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileInfo.file_path}`;
    
    // Tạo thông tin người dùng
    const user = {
      userId: ctx.from.id.toString(),
      firstName: ctx.from.first_name || '',
      lastName: ctx.from.last_name || '',
      username: ctx.from.username || ''
    };
    
    // Tạo ID duy nhất cho file
    const fileHash = crypto.createHash('md5').update(fileId + Date.now()).digest('hex').substring(0, 8);
    const uniqueId = uuidv4().replace(/-/g, '').substring(0, 12);
    
    // Tạo thông tin file - không lưu file local mà chỉ lưu tham chiếu tới Telegram
    const fileData = {
      _id: uniqueId,
      fileName: originalFileName,
      originalFileName: originalFileName,
      fileType: fileType,
      fileSize: fileSize,
      mimeType: mimeType,
      uploadDate: new Date().toISOString(),
      uploadedBy: user,
      fileId: fileId,
      fileUrl: fileUrl,
      telegramFileInfo: fileInfo,
      telegramMessageId: ctx.message.message_id,
      chatId: ctx.chat.id,
      sentToTelegram: true,
      storedOnTelegram: true,
      localFileStored: false
    };
    
    // Lưu thông tin file vào database
    const filesData = readFilesDb();
    filesData.push(fileData);
    saveFilesDb(filesData);
    
    // Thông báo hoàn thành
    ctx.reply(`✅ File "${fileName}" đã được lưu thành công!\nKích thước: ${(fileSize / 1024 / 1024).toFixed(2)}MB\nTruy cập web để xem và tải xuống file.`);
    console.log(`Đã lưu thông tin file Telegram: ${fileId} (${fileSize} bytes)`);
    
  } catch (error) {
    console.error('Lỗi trong quá trình xử lý file:', error);
    
    // Thông báo lỗi người dùng
    let errorMessage = `Xin lỗi, có lỗi khi xử lý file của bạn: ${error.message}.`;
    if (error.message.includes('size') || error.message.includes('quá lớn')) {
      errorMessage += ' Hãy thử gửi file nhỏ hơn 20MB.';
    }
    ctx.reply(errorMessage);
    throw error;
  }
}

// Thư mục data chứa file JSON
const dataDir = path.join(__dirname, process.env.DATA_DIR || 'data');
const filesDbPath = path.join(dataDir, 'files.json');
const tempDir = path.join(__dirname, process.env.TEMP_DIR || 'temp'); // Thư mục tạm thời để upload file

// Đảm bảo các thư mục tồn tại
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Middleware cho upload file tạm thời
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    // Tạo tên file tạm thời để upload
    const originalName = file.originalname || 'unknown_file';
    const timestamp = Date.now();
    const fileHash = crypto.createHash('md5').update(originalName + timestamp).digest('hex').substring(0, 8);
    
    // Tạo tên file an toàn để lưu trữ tạm thời
    const safeFileName = `temp_${timestamp}_${fileHash}${path.extname(originalName)}`;
    cb(null, safeFileName);
  }
});

// Giới hạn kích thước file 20MB - giống giới hạn của Telegram Bot API
const upload = multer({
  storage: storage,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});

// Đọc database files
function readFilesDb() {
  try {
    if (fs.existsSync(filesDbPath)) {
      const content = fs.readFileSync(filesDbPath, 'utf8');
      return JSON.parse(content);
    }
    return [];
  } catch (error) {
    console.error('Lỗi đọc database:', error);
    return [];
  }
}

// Lưu database files
function saveFilesDb(filesData) {
  try {
    fs.writeFileSync(filesDbPath, JSON.stringify(filesData, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Lỗi lưu database:', error);
    return false;
  }
}

// Lấy thông tin cơ bản của người dùng hiện tại
function getCurrentUser() {
  return {
    userId: "web_upload",
    firstName: "Web",
    lastName: "Upload",
    username: "web_uploader"
  };
}

// Gửi file qua bot Telegram
async function sendFileToTelegram(filePath, fileName, user) {
  if (!bot) {
    throw new Error('Bot không khả dụng. Kiểm tra BOT_TOKEN của bạn.');
  }
  
  try {
    // Tìm các admin chat đã tương tác với bot
    const updates = await bot.telegram.getUpdates(0, 100, 0, ["message"]);
    let chatId = null;
    
    if (updates && updates.length > 0) {
      // Lấy chat ID đầu tiên từ tin nhắn gần nhất
      for (const update of updates) {
        if (update.message && update.message.chat) {
          chatId = update.message.chat.id;
          break;
        }
      }
    }
    
    if (!chatId) {
      throw new Error('Không tìm thấy chat ID nào để gửi file. Vui lòng gửi tin nhắn tới bot trước.');
    }
    
    // Đảm bảo tên file hiển thị chính xác
    let displayName = fileName;
    try {
      // Nếu tên file chứa ký tự đặc biệt
      if (displayName.includes('%')) {
        displayName = decodeURIComponent(displayName);
      }
    } catch (e) {
      console.error('Lỗi giải mã tên file:', e);
    }
    
    // Gửi file như một document
    const sentMessage = await bot.telegram.sendDocument(
      chatId,
      { source: filePath },
      { 
        caption: `📁 File: "${displayName}"\n👤 Uploaded by: ${user.firstName} ${user.lastName || ''}\n📅 Date: ${new Date().toLocaleString()}`,
        file_name: displayName
      }
    );
    
    console.log('Đã gửi file thành công qua Telegram bot');
    
    // Trả về thông tin Telegram
    return {
      fileId: sentMessage.document.file_id,
      messageId: sentMessage.message_id,
      chatId: chatId,
      success: true
    };
  } catch (error) {
    console.error('Lỗi khi gửi file qua Telegram:', error);
    throw error;
  }
}

// Phục vụ file tĩnh trong thư mục uploads
app.use('/uploads', express.static(tempDir));

// Cho phép truy cập trực tiếp đến thư mục data để đọc files.json
app.use('/data', express.static(dataDir));

// Route để xem file simple-viewer.html
app.get('/viewer', (req, res) => {
  res.sendFile(path.join(__dirname, 'simple-viewer.html'));
});

// API để lấy danh sách file
app.get('/api/files', (req, res) => {
  try {
    const filesData = readFilesDb();
    console.log(`API loaded ${filesData.length} files from database`);
    res.json(filesData);
  } catch (error) {
    console.error('Error loading files:', error);
    res.status(500).json({ error: error.message });
  }
});

// API để xóa file
app.delete('/api/files/:id', async (req, res) => {
  try {
    const filesData = readFilesDb();
    const fileIndex = filesData.findIndex(f => f._id === req.params.id);
    
    if (fileIndex === -1) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const file = filesData[fileIndex];
    
    // Xóa tin nhắn khỏi Telegram nếu có bot và messageId
    if (bot && file.telegramMessageId && file.chatId) {
      try {
        await bot.telegram.deleteMessage(file.chatId, file.telegramMessageId);
        console.log(`Đã xóa tin nhắn Telegram: ${file.telegramMessageId}`);
      } catch (telegramError) {
        console.error('Không thể xóa tin nhắn Telegram:', telegramError.message);
        // Tiếp tục quy trình xóa ngay cả khi không thể xóa tin nhắn Telegram
      }
    }
    
    // Xóa khỏi database
    filesData.splice(fileIndex, 1);
    saveFilesDb(filesData);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: error.message });
  }
});

// API upload file
app.post('/api/upload', upload.single('file'), async (req, res) => {
  console.log('API upload được gọi');
  
  try {
    if (!req.file) {
      console.error('Không có file nào được gửi lên');
      return res.status(400).json({ error: 'Không có file nào được gửi lên' });
    }
    
    const file = req.file;
    const user = getCurrentUser();
    
    console.log(`File đã upload: ${file.originalname} (${file.size} bytes)`);
    console.log('File path:', file.path);
    
    // Kiểm tra kích thước file
    if (file.size > 20 * 1024 * 1024) {
      // Xóa file tạm thời vừa upload nếu vượt quá giới hạn
      fs.unlinkSync(file.path);
      console.error('File vượt quá giới hạn kích thước');
      return res.status(413).json({ 
        error: 'Kích thước file vượt quá giới hạn 20MB (giới hạn của Telegram Bot API)' 
      });
    }
    
    // Thông tin file ban đầu
    const fileInfo = {
      _id: uuidv4().replace(/-/g, '').substring(0, 12),
      fileName: file.originalname,
      originalFileName: file.originalname,
      fileType: file.mimetype.startsWith('image/') ? 'photo' : 
                file.mimetype.startsWith('video/') ? 'video' : 
                file.mimetype.startsWith('audio/') ? 'audio' : 'document',
      fileSize: file.size,
      uploadDate: new Date().toISOString(),
      uploadedBy: user,
      localFileStored: false
    };
    
    console.log('Thông tin file đã tạo:', fileInfo);
    
    // Đồng bộ với Telegram nếu bot khả dụng
    if (bot) {
      try {
        console.log('Bắt đầu gửi file đến Telegram');
        const telegramInfo = await sendFileToTelegram(file.path, file.originalname, user);
        
        // Cập nhật thông tin file với thông tin từ Telegram
        fileInfo.fileId = telegramInfo.fileId;
        fileInfo.telegramMessageId = telegramInfo.messageId;
        fileInfo.chatId = telegramInfo.chatId;
        fileInfo.sentToTelegram = true;
        fileInfo.storedOnTelegram = true;
        
        console.log('Đã gửi file đến Telegram thành công');
        
        // Sau khi đã gửi lên Telegram thành công, xóa file tạm thời
        try {
          fs.unlinkSync(file.path);
          console.log(`Đã xóa file tạm thời: ${file.path}`);
        } catch (deleteError) {
          console.error('Lỗi khi xóa file tạm thời:', deleteError);
        }
      } catch (telegramError) {
        console.error('Lỗi khi đồng bộ với Telegram:', telegramError);
        fileInfo.sentToTelegram = false;
        fileInfo.telegramError = telegramError.message;
        
        // Nếu không gửi được lên Telegram, vẫn xóa file tạm thời
        try {
          fs.unlinkSync(file.path);
        } catch (deleteError) {
          console.error('Lỗi khi xóa file tạm thời:', deleteError);
        }
        
        return res.status(500).json({ 
          error: 'Không thể gửi file lên Telegram. Vui lòng thử lại sau.' 
        });
      }
    } else {
      console.warn('Bot không khả dụng, không thể gửi file đến Telegram');
      fileInfo.sentToTelegram = false;
      fileInfo.telegramError = 'Bot không khả dụng';
      
      // Nếu không có bot, xóa file tạm thời
      try {
        fs.unlinkSync(file.path);
      } catch (deleteError) {
        console.error('Lỗi khi xóa file tạm thời:', deleteError);
      }
      
      return res.status(503).json({ 
        error: 'Bot Telegram không khả dụng. Không thể lưu trữ file.' 
      });
    }
    
    // Lưu thông tin file vào database
    const filesData = readFilesDb();
    filesData.push(fileInfo);
    saveFilesDb(filesData);
    console.log('Đã lưu thông tin file vào database');
    
    res.json({
      success: true,
      file: fileInfo
    });
    console.log('Đã trả về kết quả thành công');
  } catch (error) {
    console.error('Lỗi khi xử lý upload file:', error);
    
    // Đảm bảo file tạm thời được xóa nếu có lỗi
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (deleteError) {
        console.error('Lỗi khi xóa file tạm thời:', deleteError);
      }
    }
    
    res.status(500).json({ error: error.message });
  }
});

// API để đổi tên file
app.put('/api/files/:id/rename', async (req, res) => {
  try {
    const { newName } = req.body;
    
    if (!newName || newName.trim() === '') {
      return res.status(400).json({ error: 'Tên file mới không được để trống' });
    }
    
    const filesData = readFilesDb();
    const fileIndex = filesData.findIndex(f => f._id === req.params.id);
    
    if (fileIndex === -1) {
      return res.status(404).json({ error: 'File không tìm thấy' });
    }
    
    const file = filesData[fileIndex];
    const oldName = file.originalFileName;
    
    // Cập nhật tên file
    file.originalFileName = newName;
    file.renamed = true;
    file.lastModified = new Date().toISOString();
    
    // Cập nhật tin nhắn trong Telegram nếu có thể
    if (bot && file.telegramMessageId && file.chatId) {
      try {
        const displayName = newName;
        const user = file.uploadedBy || getCurrentUser();
        
        await bot.telegram.editMessageCaption(
          file.chatId, 
          file.telegramMessageId,
          undefined,
          `📁 File: "${displayName}" (đổi tên từ "${oldName}")\n👤 Uploaded by: ${user.firstName} ${user.lastName || ''}\n📅 Date: ${new Date(file.uploadDate).toLocaleString()}\n✏️ Renamed: ${new Date().toLocaleString()}`
        );
        console.log(`Đã cập nhật tin nhắn Telegram cho file: ${newName}`);
      } catch (telegramError) {
        console.error('Không thể cập nhật tin nhắn Telegram:', telegramError.message);
        // Tiếp tục quy trình đổi tên ngay cả khi không thể cập nhật tin nhắn Telegram
      }
    }
    
    // Lưu thay đổi vào database
    saveFilesDb(filesData);
    
    res.json({ 
      success: true,
      file: file
    });
  } catch (error) {
    console.error('Lỗi khi đổi tên file:', error);
    res.status(500).json({ error: error.message });
  }
});

// Hàm trích xuất tên file hiển thị
function getDisplayFileName(file) {
  try {
    // 1. Ưu tiên sử dụng originalFileName nếu có
    if (file.originalFileName) {
      // Giải mã nếu cần
      if (file.originalFileName.includes('%')) {
        return decodeURIComponent(file.originalFileName);
      }
      return file.originalFileName;
    }
    
    // 2. Nếu không có originalFileName, xử lý fileName
    if (file.fileName) {
      // Trích xuất tên gốc từ fileName
      let extractedName = '';
      
      // Trường hợp 1: fileName dạng BraveBrowserSetup-BRV010.exe_1741870007961_68b877ce.exe
      if (file.fileName.match(/\d{10,}_[a-f0-9]{8}\.[^_]+$/)) {
        extractedName = file.fileName.replace(/(_\d{10,}_[a-f0-9]{8}\.[^_]+)$/, '');
        return extractedName;
      }
      
      // Trường hợp 2: fileName dạng file_1234567890_abcdef12.png
      if (file.fileName.startsWith('file_') || 
          file.fileName.startsWith('photo_') || 
          file.fileName.startsWith('document_') || 
          file.fileName.startsWith('video_') || 
          file.fileName.startsWith('audio_')) {
        // Lấy phần mở rộng
        const ext = path.extname(file.fileName);
        // Lấy loại file
        const fileType = file.fileName.split('_')[0];
        
        // Nếu là thư mục /uploads/ thì cố gắng trích xuất
        if (file.filePath && file.filePath.includes('/uploads/')) {
          // Trả về tên file dựa trên loại file
          switch(fileType) {
            case 'photo': return `Hình ảnh${ext}`;
            case 'video': return `Video${ext}`;
            case 'audio': return `Âm thanh${ext}`;
            case 'document': return `Tài liệu${ext}`;
            case 'file': return `Tệp tin${ext}`;
            default: return `Tệp tin${ext}`;
          }
        }
      }
      
      // Trường hợp 3: fileName với ký tự đặc biệt hoặc tiếng Việt
      const parts = file.fileName.split('_');
      if (parts.length >= 3) {
        const timestamp = parts[parts.length - 2];
        const hash = parts[parts.length - 1].split('.')[0];
        
        const isTimestamp = /^\d{10,}$/.test(timestamp);
        const isHash = /^[a-f0-9]{8}$/i.test(hash);
        
        if (isTimestamp && isHash) {
          // Lấy tất cả các phần trước timestamp và hash
          return parts.slice(0, parts.length - 2).join('_');
        }
      }
      
      // Nếu không khớp với bất kỳ mẫu nào, trả về tên file gốc
      return path.basename(file.fileName);
    }
    
    // Nếu không có gì, trả về tên mặc định
    return 'Unknown file';
  } catch (err) {
    console.error('Lỗi khi xử lý tên file:', err);
    // Trả về tên file gốc nếu có lỗi xảy ra
    return file.fileName || file.originalFileName || 'Unknown file';
  }
}

// Route để xem danh sách file
app.get('/', (req, res) => {
  let filesData = readFilesDb();
  
  try {
    console.log(`Loaded ${filesData.length} files from database`);
    
    // Tạo HTML với các file đã tìm thấy
    let fileGrid = '';
    if (filesData.length > 0) {
      // Sort by newest first
      filesData.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
      
      fileGrid = '<div class="file-grid">';
      
      for (const file of filesData) {
        // Lấy tên hiển thị phù hợp
        const displayName = getDisplayFileName(file);
        
        let fileIcon = '';
        if (file.fileType === 'photo') {
          fileIcon = `<img src="/telegram-file/${file._id}" alt="${displayName}" style="max-width:100%; max-height:150px; object-fit:contain; display:block; margin:0 auto;" onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
                     <div style="display:none">🖼️</div>`;
        } else if (file.fileType === 'video') {
          fileIcon = '🎬';
        } else if (file.fileType === 'audio') {
          fileIcon = '🎵';
        } else {
          fileIcon = '📄';
        }
        
        fileGrid += `
          <div class="file-card">
            <div class="file-icon">
              ${fileIcon}
            </div>
            <div class="file-name" title="${displayName}">${displayName}</div>
            <div class="file-meta">
              ${file.fileSize ? (file.fileSize / 1024 / 1024).toFixed(2) + ' MB' : 'Unknown size'}<br>
              ${new Date(file.uploadDate).toLocaleString()}
            </div>
            <div class="file-actions">
              <a href="/telegram-file/${file._id}?download=true" class="download-btn">
                Download
              </a>
              <button onclick="renameFile('${file._id}', '${displayName.replace(/'/g, "\\'")}')" class="rename-btn">
                Rename
              </button>
              <button onclick="deleteFile('${file._id}')" class="delete-btn">
                Delete
              </button>
            </div>
          </div>
        `;
      }
      
      fileGrid += '</div>';
    }
    
    // File container content
    let fileContainerContent = '';
    if (filesData.length === 0) {
      fileContainerContent = `<div class="no-files">
        <p>No files have been uploaded yet. Send files to your Telegram bot to get started.</p>
      </div>`;
    } else {
      fileContainerContent = fileGrid;
    }
    
    // Gửi HTML trang danh sách file
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>TeleDrive Files</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .container { max-width: 1200px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
          .file-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px; }
          .file-card { border: 1px solid #ddd; border-radius: 8px; padding: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .file-icon { font-size: 48px; margin-bottom: 10px; text-align: center; }
          .file-name { 
            font-weight: bold; 
            margin-bottom: 5px; 
            word-break: break-word; 
            overflow: hidden;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            text-overflow: ellipsis;
            min-height: 2.4em;
          }
          .file-meta { color: #666; font-size: 14px; margin-bottom: 10px; }
          .file-actions { display: flex; flex-direction: column; gap: 5px; }
          .download-btn, .rename-btn, .delete-btn { 
            padding: 8px 12px; 
            border: none; 
            border-radius: 4px; 
            cursor: pointer; 
            text-decoration: none; 
            display: inline-block; 
            width: 100%;
            text-align: center;
            font-size: 14px;
          }
          .download-btn { 
            background: #4285F4; 
            color: white; 
          }
          .rename-btn {
            background: #fbbc05;
            color: white;
          }
          .delete-btn {
            background: #ea4335;
            color: white;
          }
          
          /* Modal styles */
          .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.7);
          }
          .modal-content {
            background-color: #fff;
            margin: 15% auto;
            padding: 20px;
            border-radius: 8px;
            width: 80%;
            max-width: 500px;
          }
          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
          }
          .modal-title {
            font-size: 1.2rem;
            font-weight: bold;
          }
          .close {
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
          }
          .modal-body {
            margin-bottom: 20px;
          }
          .modal-footer {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
          }
          .modal-btn {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          }
          .modal-btn-primary {
            background-color: #4285F4;
            color: white;
          }
          .modal-btn-secondary {
            background-color: #ddd;
            color: #333;
          }
          .modal-input {
            width: 100%;
            padding: 8px;
            margin-bottom: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
          }
          .no-files { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .viewer-link { margin-top: 20px; text-align: center; }
          .viewer-link a { color: #4285F4; text-decoration: none; font-weight: bold; }
          #auto-refresh { margin-left: 10px; }
          .refresh-status { font-size: 12px; color: #666; margin-left: 10px; }
          .spinner { 
            display: inline-block; 
            width: 16px; 
            height: 16px; 
            border: 2px solid rgba(0,0,0,0.1); 
            border-radius: 50%; 
            border-top-color: #4285F4; 
            animation: spin 1s linear infinite; 
            margin-right: 5px; 
            vertical-align: middle; 
          }
          @keyframes spin { to { transform: rotate(360deg); } }
          
          /* Upload form styles */
          .upload-container {
            margin: 20px 0;
            padding: 20px;
            background: #f9f9f9;
            border-radius: 8px;
            border: 1px solid #eee;
          }
          .upload-form {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          .upload-input {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .file-input-container {
            position: relative;
            flex-grow: 1;
          }
          .file-input {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
          }
          .upload-btn {
            padding: 10px 15px;
            background: #4285F4;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          }
          .upload-btn:hover {
            background: #3b78e7;
          }
          .upload-btn:disabled {
            background: #ccc;
            cursor: not-allowed;
          }
          .upload-progress {
            height: 5px;
            width: 100%;
            background-color: #f0f0f0;
            border-radius: 3px;
            margin-top: 5px;
            overflow: hidden;
          }
          .progress-bar {
            height: 100%;
            width: 0%;
            background-color: #4CAF50;
            transition: width 0.3s;
          }
          .upload-status {
            margin-top: 10px;
            font-size: 14px;
          }
          .success { color: #4CAF50; }
          .error { color: #f44336; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>TeleDrive Files</h1>
            <div>
              <button id="refresh-btn" onclick="refreshFiles()">Refresh</button>
              <label id="auto-refresh">
                <input type="checkbox" id="auto-refresh-toggle" checked> 
                Tự động làm mới
              </label>
              <span id="refresh-status" class="refresh-status"></span>
            </div>
          </div>
          
          <div class="upload-container">
            <h3>Upload File</h3>
            <div class="upload-form">
              <div class="upload-input">
                <div class="file-input-container">
                  <input type="file" id="file-input" class="file-input">
                </div>
                <button id="upload-btn" class="upload-btn" onclick="uploadFile()">Upload</button>
              </div>
              <div class="upload-progress">
                <div id="progress-bar" class="progress-bar"></div>
              </div>
              <div id="upload-status" class="upload-status"></div>
            </div>
          </div>
          
          <div class="viewer-link">
            <a href="/viewer">Xem với giao diện nâng cao</a>
          </div>
          
          <div id="file-container">
            ${fileContainerContent}
          </div>
          
          <div style="margin-top: 30px; background: #f5f5f5; padding: 15px; border-radius: 8px;">
            <h3>File Size Limits</h3>
            <p>Telegram Bot API limits file downloads to <strong>20MB</strong>.</p>
            <p>Larger files will show an error: "Bad Request: file is too big"</p>
          </div>
        </div>
        
        <!-- Rename Modal -->
        <div id="renameModal" class="modal">
          <div class="modal-content">
            <div class="modal-header">
              <span class="modal-title">Đổi tên file</span>
              <span class="close" onclick="closeRenameModal()">&times;</span>
            </div>
            <div class="modal-body">
              <input type="hidden" id="fileIdToRename">
              <label for="newFileName">Tên mới:</label>
              <input type="text" id="newFileName" class="modal-input">
            </div>
            <div class="modal-footer">
              <button class="modal-btn modal-btn-secondary" onclick="closeRenameModal()">Hủy</button>
              <button class="modal-btn modal-btn-primary" onclick="submitRename()">Lưu</button>
            </div>
          </div>
        </div>
        
        <script>
          // Biến để theo dõi số lượng file hiện tại
          let currentFileCount = ${filesData.length};
          let autoRefreshInterval = null;
          const refreshStatus = document.getElementById('refresh-status');
          const autoRefreshToggle = document.getElementById('auto-refresh-toggle');
          const fileContainer = document.getElementById('file-container');
          const uploadBtn = document.getElementById('upload-btn');
          const fileInput = document.getElementById('file-input');
          const progressBar = document.getElementById('progress-bar');
          const uploadStatus = document.getElementById('upload-status');
          
          // Hàm kiểm tra file mới từ server
          async function checkForNewFiles() {
            try {
              const response = await fetch('/api/files');
              if (!response.ok) {
                throw new Error('Network response was not ok');
              }
              
              const files = await response.json();
              
              // Nếu số lượng file thay đổi, làm mới trang
              if (files.length !== currentFileCount) {
                console.log('Phát hiện file mới, đang làm mới...');
                refreshStatus.innerHTML = '<div class="spinner"></div> Đang làm mới...';
                currentFileCount = files.length;
                refreshFiles(false);
                return true;
              }
              
              // Cập nhật trạng thái
              const now = new Date();
              const timeStr = now.getHours().toString().padStart(2, '0') + ':' + 
                             now.getMinutes().toString().padStart(2, '0') + ':' + 
                             now.getSeconds().toString().padStart(2, '0');
              refreshStatus.textContent = 'Kiểm tra lúc: ' + timeStr;
              return false;
            } catch (error) {
              console.error('Error checking for new files:', error);
              refreshStatus.textContent = 'Lỗi: ' + error.message;
              return false;
            }
          }
          
          // Hàm làm mới danh sách file
          async function refreshFiles(showSpinner = true) {
            if (showSpinner) {
              refreshStatus.innerHTML = '<div class="spinner"></div> Đang làm mới...';
            }
            
            // Đơn giản là tải lại trang để lấy dữ liệu mới nhất
            location.reload();
          }
          
          // Thiết lập auto refresh
          function toggleAutoRefresh() {
            if (autoRefreshToggle.checked) {
              // Kiểm tra mỗi 10 giây
              autoRefreshInterval = setInterval(checkForNewFiles, 10000);
              refreshStatus.textContent = 'Auto refresh: Đang bật';
            } else {
              clearInterval(autoRefreshInterval);
              refreshStatus.textContent = 'Auto refresh: Đã tắt';
            }
          }
          
          // Hàm upload file
          async function uploadFile() {
            const file = fileInput.files[0];
            if (!file) {
              uploadStatus.textContent = 'Vui lòng chọn file để upload';
              uploadStatus.className = 'upload-status error';
              return;
            }
            
            // Kiểm tra kích thước file
            if (file.size > 20 * 1024 * 1024) {
              uploadStatus.textContent = 'Kích thước file vượt quá giới hạn 20MB';
              uploadStatus.className = 'upload-status error';
              return;
            }
            
            // Disable upload button và hiển thị trạng thái
            uploadBtn.disabled = true;
            uploadStatus.textContent = 'Đang upload...';
            uploadStatus.className = 'upload-status';
            progressBar.style.width = '0%';
            
            // Tạo form data và thêm file
            const formData = new FormData();
            formData.append('file', file);
            
            try {
              console.log('Bắt đầu upload file:', file.name);
              
              // Upload file với progress
              const xhr = new XMLHttpRequest();
              
              xhr.upload.addEventListener('progress', function(event) {
                if (event.lengthComputable) {
                  const percentComplete = (event.loaded / event.total) * 100;
                  progressBar.style.width = percentComplete + '%';
                  uploadStatus.textContent = 'Đang upload: ' + Math.round(percentComplete) + '%';
                  console.log('Upload progress:', Math.round(percentComplete) + '%');
                }
              });
              
              xhr.addEventListener('load', function() {
                console.log('Upload completed with status:', xhr.status);
                if (xhr.status >= 200 && xhr.status < 300) {
                  try {
                    const response = JSON.parse(xhr.responseText);
                    console.log('Upload response:', response);
                    uploadStatus.textContent = 'Upload thành công! File đã được lưu và đồng bộ với Telegram.';
                    uploadStatus.className = 'upload-status success';
                    
                    // Clear file input và làm mới danh sách sau 1 giây
                    fileInput.value = '';
                    setTimeout(() => {
                      refreshFiles();
                    }, 1000);
                  } catch (e) {
                    console.error('Error parsing response:', e);
                    uploadStatus.textContent = 'Lỗi khi xử lý phản hồi từ server';
                    uploadStatus.className = 'upload-status error';
                  }
                } else {
                  let errorMsg = 'Lỗi khi upload file';
                  try {
                    const response = JSON.parse(xhr.responseText);
                    errorMsg = response.error || errorMsg;
                    console.error('Upload error response:', response);
                  } catch (e) {
                    console.error('Error parsing error response:', e, 'Raw response:', xhr.responseText);
                  }
                  
                  uploadStatus.textContent = errorMsg;
                  uploadStatus.className = 'upload-status error';
                }
                uploadBtn.disabled = false;
              });
              
              xhr.addEventListener('error', function(e) {
                console.error('XHR error:', e);
                uploadStatus.textContent = 'Lỗi kết nối khi upload file';
                uploadStatus.className = 'upload-status error';
                uploadBtn.disabled = false;
              });
              
              xhr.addEventListener('abort', function() {
                console.log('Upload aborted');
                uploadStatus.textContent = 'Upload đã bị hủy';
                uploadStatus.className = 'upload-status error';
                uploadBtn.disabled = false;
              });
              
              // Đảm bảo URL đúng
              const uploadUrl = '/api/upload';
              console.log('Sending upload request to:', uploadUrl);
              
              xhr.open('POST', uploadUrl);
              xhr.send(formData);
            } catch (error) {
              console.error('Upload error:', error);
              uploadStatus.textContent = 'Lỗi: ' + error.message;
              uploadStatus.className = 'upload-status error';
              uploadBtn.disabled = false;
            }
          }
          
          // Khởi động auto refresh khi trang tải xong
          document.addEventListener('DOMContentLoaded', () => {
            toggleAutoRefresh();
            
            // Thêm event listener cho checkbox
            autoRefreshToggle.addEventListener('change', toggleAutoRefresh);
            
            // Kiểm tra ngay khi trang tải xong
            setTimeout(checkForNewFiles, 1000);
          });

          // Hàm hiển thị modal đổi tên
          function renameFile(fileId, currentName) {
            document.getElementById('fileIdToRename').value = fileId;
            document.getElementById('newFileName').value = currentName;
            document.getElementById('renameModal').style.display = 'block';
          }

          // Đóng modal đổi tên
          function closeRenameModal() {
            document.getElementById('renameModal').style.display = 'none';
          }

          // Gửi yêu cầu đổi tên
          async function submitRename() {
            const fileId = document.getElementById('fileIdToRename').value;
            const newName = document.getElementById('newFileName').value.trim();
            
            if (!newName) {
              alert('Tên file không được để trống');
              return;
            }
            
            try {
              const response = await fetch('/api/files/' + fileId + '/rename', {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  newName: newName
                })
              });
              
              if (response.ok) {
                closeRenameModal();
                // Làm mới trang để hiển thị tên mới
                refreshFiles();
              } else {
                const data = await response.json();
                alert('Lỗi: ' + (data.error || 'Không thể đổi tên file'));
              }
            } catch (error) {
              console.error('Lỗi khi đổi tên:', error);
              alert('Lỗi kết nối: ' + error.message);
            }
          }

          // Xóa file
          async function deleteFile(fileId) {
            if (!confirm('Bạn có chắc chắn muốn xóa file này?')) {
              return;
            }
            
            try {
              const response = await fetch('/api/files/' + fileId, {
                method: 'DELETE'
              });
              
              if (response.ok) {
                // Làm mới trang để cập nhật danh sách
                refreshFiles();
              } else {
                const data = await response.json();
                alert('Lỗi: ' + (data.error || 'Không thể xóa file'));
              }
            } catch (error) {
              console.error('Lỗi khi xóa file:', error);
              alert('Lỗi kết nối: ' + error.message);
            }
          }
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send(`
      <h1>Error</h1>
      <p>${error.message}</p>
      <a href="/">Try again</a>
    `);
  }
});

// Cập nhật tên file cho các file cũ
function upgradeExistingFiles() {
  try {
    console.log('Kiểm tra và cập nhật tên file cho các file cũ...');
    const filesData = readFilesDb();
    let updateCount = 0;
    
    for (const file of filesData) {
      // Nếu không có originalFileName hoặc originalFileName trùng với fileName
      if (!file.originalFileName || file.originalFileName === file.fileName) {
        // Trích xuất tên gốc từ fileName
        const extractedName = extractOriginalFileName(file.fileName);
        
        if (extractedName && extractedName !== file.originalFileName) {
          console.log(`Cập nhật tên file cho: ${file.fileName} -> ${extractedName}`);
          file.originalFileName = extractedName;
          updateCount++;
        }
      }
    }
    
    if (updateCount > 0) {
      console.log(`Đã cập nhật ${updateCount} file.`);
      saveFilesDb(filesData);
    } else {
      console.log('Không có file nào cần cập nhật.');
    }
  } catch (error) {
    console.error('Lỗi khi cập nhật tên file:', error);
  }
}

// Hàm trích xuất tên gốc từ tên file
function extractOriginalFileName(fileName) {
  if (!fileName) return null;
  
  // Trường hợp 1: fileName dạng name_timestamp_hash.ext
  if (fileName.match(/\d{10,}_[a-f0-9]{8}\.[^_]+$/)) {
    const extractedName = fileName.replace(/(_\d{10,}_[a-f0-9]{8}\.[^_]+)$/, '');
    return extractedName;
  }
  
  // Trường hợp 2: fileName dạng file_timestamp_hash.ext
  if (fileName.match(/^(file|photo|document|video|audio)_\d{10,}_[a-f0-9]{8}\.[^_]+$/)) {
    const parts = fileName.split('_');
    const fileType = parts[0];
    const ext = path.extname(fileName);
    
    switch(fileType) {
      case 'photo': return `Hình ảnh${ext}`;
      case 'video': return `Video${ext}`;
      case 'audio': return `Âm thanh${ext}`;
      case 'document': return `Tài liệu${ext}`;
      case 'file': return `Tệp tin${ext}`;
      default: return path.basename(fileName);
    }
  }
  
  return path.basename(fileName);
}

// Dọn dẹp thư mục tạm thời định kỳ
function cleanupTempDir() {
  try {
    if (!fs.existsSync(tempDir)) {
      return; // Thư mục không tồn tại
    }
    
    console.log('Bắt đầu dọn dẹp thư mục tạm thời...');
    const files = fs.readdirSync(tempDir);
    let deletedCount = 0;
    
    for (const file of files) {
      try {
        const filePath = path.join(tempDir, file);
        const stats = fs.statSync(filePath);
        
        // Kiểm tra xem file có cũ hơn 1 giờ không
        const fileAge = Date.now() - stats.mtime.getTime();
        if (fileAge > 60 * 60 * 1000) { // 1 giờ
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      } catch (error) {
        console.error(`Lỗi khi xóa file tạm thời ${file}:`, error);
      }
    }
    
    console.log(`Đã dọn dẹp ${deletedCount} file tạm thời.`);
  } catch (error) {
    console.error('Lỗi khi dọn dẹp thư mục tạm thời:', error);
  }
}

// Đặt hàm dọn dẹp chạy mỗi giờ
setInterval(cleanupTempDir, 60 * 60 * 1000); // 1 giờ

// Dọn dẹp ngay khi khởi động
cleanupTempDir();

// Khởi động server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Data directory: ${dataDir}`);
  console.log(`Files database: ${filesDbPath}`);
  
  // Cập nhật tên file cho các file cũ khi khởi động
  upgradeExistingFiles();
});

// Route để lấy file từ Telegram
app.get('/telegram-file/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const download = req.query.download === 'true';
    
    // Tìm file trong database
    const filesData = readFilesDb();
    const file = filesData.find(f => f._id === fileId);
    
    if (!file) {
      return res.status(404).send('File không tìm thấy');
    }
    
    if (!file.fileId || !file.storedOnTelegram) {
      return res.status(404).send('File này không được lưu trữ trên Telegram');
    }
    
    // Lấy thông tin file từ Telegram
    let fileInfo;
    try {
      if (!file.telegramFileInfo) {
        fileInfo = await bot.telegram.getFile(file.fileId);
      } else {
        fileInfo = file.telegramFileInfo;
      }
    } catch (error) {
      console.error('Lỗi khi lấy thông tin file từ Telegram:', error);
      return res.status(500).send('Không thể lấy thông tin file từ Telegram');
    }
    
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileInfo.file_path}`;
    
    // Nếu cần tải xuống, stream file từ Telegram qua response
    if (download) {
      try {
        // Đặt headers cho tải xuống
        const fileName = file.originalFileName || 'unknown_file';
        res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(fileName)}`);
        
        // Stream file từ Telegram
        const response = await axios({
          method: 'GET',
          url: fileUrl,
          responseType: 'stream'
        });
        
        // Đặt content-type và các headers khác
        if (response.headers['content-type']) {
          res.setHeader('Content-Type', response.headers['content-type']);
        }
        if (response.headers['content-length']) {
          res.setHeader('Content-Length', response.headers['content-length']);
        }
        
        // Stream dữ liệu
        response.data.pipe(res);
      } catch (error) {
        console.error('Lỗi khi stream file từ Telegram:', error);
        return res.status(500).send('Không thể tải file từ Telegram');
      }
    } else {
      // Chuyển hướng đến URL file Telegram
      res.redirect(fileUrl);
    }
  } catch (error) {
    console.error('Lỗi khi xử lý request:', error);
    res.status(500).send('Đã xảy ra lỗi khi xử lý yêu cầu');
  }
});