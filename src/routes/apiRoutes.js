/**
 * TeleDrive - API Routes
 * File này định nghĩa các routes cho API
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const fileController = require('../controllers/fileController');
const folderController = require('../controllers/folderController');
const authController = require('../controllers/authController');
const { ensureDirectories, getMimeType, guessFileType } = require('../utils/helpers');
const config = require('../config/config');
const fileService = require('../services/fileService');
const telegramService = require('../services/telegramService');
const authMiddleware = require('../middlewares/authMiddleware');

// Middleware kiểm tra xác thực
function checkAuth(req, res, next) {
  // Skip authentication for login route
  if (req.path === '/auth/login') {
    return next();
  }
  
  // Skip authentication if they have valid API key
  if (req.headers['x-api-key']) {
    // TODO: Implement API key validation
    return next();
  }
  
  // Check session authentication
  if (!req.session || !req.session.authenticated) {
    return res.status(401).json({ 
      success: false, 
      error: 'Unauthorized' 
    });
  }
  
  next();
}

// Cấu hình multer để upload file
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = req.query.folder 
      ? path.join(config.UPLOADS_DIR, req.query.folder) 
      : config.UPLOADS_DIR;
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    // Đảm bảo tên file an toàn, tránh lỗi đường dẫn
    const originalName = file.originalname;
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueName = Date.now() + '-' + sanitizedName;
    
    // Lưu tên gốc vào request để sử dụng sau này
    req.originalFileName = originalName;
    
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: parseInt(config.MAX_FILE_SIZE) } 
});

// Auth routes
router.post('/auth/login', authController.login);
router.get('/auth/logout', checkAuth, authController.logout);
router.post('/auth/change-password', checkAuth, authController.changePassword);
router.get('/auth/settings', checkAuth, authController.getSettings);
router.post('/auth/settings', checkAuth, authController.updateSettings);

// File routes
router.get('/files', checkAuth, fileController.getFiles);
router.get('/files/:id', checkAuth, fileController.getFileDetails);
router.get('/files/:id/download', checkAuth, fileController.downloadFile);
router.post('/files/:id/share', checkAuth, (req, res) => {
  // TODO: Move to fileController
  try {
    const fileId = req.params.id;
    if (!fileId) {
      return res.status(400).json({
        success: false,
        error: 'ID file không được để trống'
      });
    }
    
    const { expiryTime } = req.body;
    
    // Đọc database
    const filesData = fileController.readFilesDb();
    
    // Tìm file
    const fileIndex = filesData.findIndex(file => file.id === fileId);
    if (fileIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'File không tồn tại'
      });
    }
    
    // Tạo token chia sẻ
    const shareToken = require('crypto').randomBytes(16).toString('hex');
    
    // Cập nhật thông tin chia sẻ
    filesData[fileIndex].shareToken = shareToken;
    
    // Tạo hoặc cập nhật thời gian hết hạn
    if (expiryTime) {
      // Chuyển đổi giờ thành milliseconds
      const expiryHours = parseInt(expiryTime);
      if (!isNaN(expiryHours) && expiryHours > 0) {
        const expiryDate = new Date();
        expiryDate.setHours(expiryDate.getHours() + expiryHours);
        
        filesData[fileIndex].shareExpiry = expiryDate.toISOString();
      }
    } else {
      // Không có thời hạn
      filesData[fileIndex].shareExpiry = null;
    }
    
    // Lưu thay đổi
    fileController.saveFilesDb(filesData);
    
    // Tạo URL chia sẻ
    const shareUrl = `${req.protocol}://${req.get('host')}/share/${shareToken}`;
    
    return res.json({
      success: true,
      shareUrl,
      shareToken,
      shareExpiry: filesData[fileIndex].shareExpiry
    });
  } catch (error) {
    console.error('Lỗi khi chia sẻ file:', error);
    return res.status(500).json({
      success: false,
      error: 'Lỗi server: ' + (error.message || 'Không xác định')
    });
  }
});

router.delete('/files/:id/share', checkAuth, (req, res) => {
  // TODO: Move to fileController
  try {
    const fileId = req.params.id;
    if (!fileId) {
      return res.status(400).json({
        success: false,
        error: 'ID file không được để trống'
      });
    }
    
    // Đọc database
    const filesData = fileController.readFilesDb();
    
    // Tìm file
    const fileIndex = filesData.findIndex(file => file.id === fileId);
    if (fileIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'File không tồn tại'
      });
    }
    
    const file = filesData[fileIndex];
    
    // Kiểm tra file có đang được chia sẻ không
    if (!file.shareToken) {
      return res.status(400).json({
        success: false,
        error: 'File này không được chia sẻ'
      });
    }
    
    // Hủy chia sẻ
    filesData[fileIndex].shareToken = null;
    filesData[fileIndex].shareExpiry = null;
    
    // Lưu thay đổi
    fileController.saveFilesDb(filesData);
    
    return res.json({
      success: true,
      message: 'Đã hủy chia sẻ file'
    });
  } catch (error) {
    console.error('Lỗi khi hủy chia sẻ file:', error);
    return res.status(500).json({
      success: false,
      error: 'Lỗi server: ' + (error.message || 'Không xác định')
    });
  }
});

// Folder routes
router.get('/folders', checkAuth, folderController.getFolders);
router.post('/folders', checkAuth, folderController.createFolder);
router.put('/folders/:id', checkAuth, folderController.renameFolder);
router.delete('/folders/:id', checkAuth, folderController.deleteFolder);

// Upload route
router.post('/upload', checkAuth, upload.single('file'), (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'Không có file nào được tải lên'
      });
    }
    
    const originalName = req.originalFileName || file.originalname;
    const relativePath = req.query.folder || '';
    
    // Extract file info
    const fileInfo = {
      id: 'file_' + Date.now() + '_' + Math.round(Math.random() * 1000000),
      name: originalName,
      originalName: originalName,
      filename: file.filename,
      localPath: file.path,
      relativePath: relativePath,
      size: file.size,
      mimeType: file.mimetype || getMimeType(path.extname(originalName)),
      fileType: guessFileType(file.mimetype || getMimeType(path.extname(originalName))),
      uploadDate: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      needsSync: config.AUTO_SYNC === 'true',
      fileStatus: 'local',
      shareToken: null,
      shareExpiry: null,
      telegramFileId: null,
      telegramUrl: null,
      isDeleted: false
    };
    
    // Lưu thông tin file vào database
    const filesData = fileController.readFilesDb();
    filesData.push(fileInfo);
    fileController.saveFilesDb(filesData);
    
    return res.json({
      success: true,
      file: fileInfo
    });
  } catch (error) {
    console.error('Lỗi khi tải file lên:', error);
    return res.status(500).json({
      success: false,
      error: 'Lỗi server: ' + (error.message || 'Không xác định')
    });
  }
});

// Sync route
router.post('/sync', checkAuth, fileController.syncFiles);

// Stats routes
router.get('/stats', checkAuth, fileController.getFileStats);
router.get('/files-status', checkAuth, fileController.getFileStatus);
router.post('/check-files', checkAuth, fileController.checkFiles);

// Trash routes
router.get('/trash', checkAuth, (req, res) => {
  try {
    // Đọc database
    const filesData = fileController.readFilesDb();
    
    // Lọc các file đã xóa
    const trashedFiles = filesData.filter(file => file.isDeleted);
    
    // Định dạng dữ liệu trước khi gửi đi
    const formattedFiles = trashedFiles.map(file => ({
      id: file.id,
      name: file.name,
      size: file.size,
      mimeType: file.mimeType,
      fileType: file.fileType,
      uploadDate: file.uploadDate,
      deletedDate: file.deletedDate || file.lastModified,
      hasTelegramCopy: !!file.telegramFileId
    }));
    
    return res.json({
      success: true,
      files: formattedFiles,
      total: trashedFiles.length
    });
  } catch (error) {
    console.error('Lỗi khi lấy thùng rác:', error);
    return res.status(500).json({
      success: false,
      error: 'Lỗi server: ' + (error.message || 'Không xác định')
    });
  }
});

router.post('/trash/:id/restore', checkAuth, (req, res) => {
  try {
    const fileId = req.params.id;
    if (!fileId) {
      return res.status(400).json({
        success: false,
        error: 'ID file không được để trống'
      });
    }
    
    // Đọc database
    const filesData = fileController.readFilesDb();
    
    // Tìm file
    const fileIndex = filesData.findIndex(file => file.id === fileId && file.isDeleted);
    if (fileIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'File không tồn tại trong thùng rác'
      });
    }
    
    // Khôi phục file
    filesData[fileIndex].isDeleted = false;
    filesData[fileIndex].lastModified = new Date().toISOString();
    
    // Lưu thay đổi
    fileController.saveFilesDb(filesData);
    
    return res.json({
      success: true,
      message: 'Đã khôi phục file thành công',
      file: {
        id: filesData[fileIndex].id,
        name: filesData[fileIndex].name
      }
    });
  } catch (error) {
    console.error('Lỗi khi khôi phục file:', error);
    return res.status(500).json({
      success: false,
      error: 'Lỗi server: ' + (error.message || 'Không xác định')
    });
  }
});

router.delete('/trash/:id', checkAuth, (req, res) => {
  try {
    const fileId = req.params.id;
    if (!fileId) {
      return res.status(400).json({
        success: false,
        error: 'ID file không được để trống'
      });
    }
    
    // Đọc database
    const filesData = fileController.readFilesDb();
    
    // Tìm file
    const fileIndex = filesData.findIndex(file => file.id === fileId && file.isDeleted);
    if (fileIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'File không tồn tại trong thùng rác'
      });
    }
    
    const file = filesData[fileIndex];
    
    // Xóa file từ local nếu có
    if (file.localPath && fs.existsSync(file.localPath)) {
      fs.unlinkSync(file.localPath);
    }
    
    // Xóa file từ database
    const deletedFile = filesData.splice(fileIndex, 1)[0];
    
    // Lưu thay đổi
    fileController.saveFilesDb(filesData);
    
    return res.json({
      success: true,
      message: 'Đã xóa vĩnh viễn file thành công',
      deletedFile: {
        id: deletedFile.id,
        name: deletedFile.name
      }
    });
  } catch (error) {
    console.error('Lỗi khi xóa vĩnh viễn file:', error);
    return res.status(500).json({
      success: false,
      error: 'Lỗi server: ' + (error.message || 'Không xác định')
    });
  }
});

router.delete('/trash', checkAuth, (req, res) => {
  try {
    // Đọc database
    let filesData = fileController.readFilesDb();
    
    // Đếm số file trong thùng rác
    const trashedCount = filesData.filter(file => file.isDeleted).length;
    
    if (trashedCount === 0) {
      return res.json({
        success: true,
        message: 'Thùng rác đã trống',
        deletedCount: 0
      });
    }
    
    // Xóa các file local nếu có
    filesData.forEach(file => {
      if (file.isDeleted && file.localPath && fs.existsSync(file.localPath)) {
        try {
          fs.unlinkSync(file.localPath);
        } catch (err) {
          console.error(`Không thể xóa file ${file.localPath}:`, err);
        }
      }
    });
    
    // Lọc ra các file không bị xóa
    filesData = filesData.filter(file => !file.isDeleted);
    
    // Lưu thay đổi
    fileController.saveFilesDb(filesData);
    
    return res.json({
      success: true,
      message: 'Đã làm trống thùng rác',
      deletedCount: trashedCount
    });
  } catch (error) {
    console.error('Lỗi làm trống thùng rác:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi server khi làm trống thùng rác'
    });
  }
});

// Settings routes
router.post('/settings', express.json(), async (req, res) => {
  try {
    const { apiKey, chatId, maxFileSize, enableSync } = req.body;
    
    // Đọc file .env
    const envPath = path.join(__dirname, '../../.env');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    let newEnvContent = envContent;
    let restartAfterSave = false;
    
    // Cập nhật BOT_TOKEN nếu có thay đổi
    if (apiKey && apiKey !== process.env.BOT_TOKEN) {
      newEnvContent = newEnvContent.replace(/BOT_TOKEN=.*(\r?\n|$)/, `BOT_TOKEN=${apiKey}$1`);
      if (!newEnvContent.includes('BOT_TOKEN=')) {
        newEnvContent += `\nBOT_TOKEN=${apiKey}`;
      }
      process.env.BOT_TOKEN = apiKey;
      restartAfterSave = true;
    }
    
    // Cập nhật CHAT_ID nếu có thay đổi
    if (chatId && chatId !== process.env.CHAT_ID) {
      newEnvContent = newEnvContent.replace(/CHAT_ID=.*(\r?\n|$)/, `CHAT_ID=${chatId}$1`);
      if (!newEnvContent.includes('CHAT_ID=')) {
        newEnvContent += `\nCHAT_ID=${chatId}`;
      }
      process.env.CHAT_ID = chatId;
      restartAfterSave = true;
    }
    
    // Cập nhật MAX_FILE_SIZE nếu có thay đổi
    if (maxFileSize && maxFileSize !== process.env.MAX_FILE_SIZE / (1024 * 1024)) {
      const maxFileSizeBytes = maxFileSize * 1024 * 1024;
      newEnvContent = newEnvContent.replace(/MAX_FILE_SIZE=.*(\r?\n|$)/, `MAX_FILE_SIZE=${maxFileSizeBytes}$1`);
      if (!newEnvContent.includes('MAX_FILE_SIZE=')) {
        newEnvContent += `\nMAX_FILE_SIZE=${maxFileSizeBytes}`;
      }
      process.env.MAX_FILE_SIZE = maxFileSizeBytes.toString();
    }
    
    // Cập nhật ENABLE_SYNC nếu có thay đổi
    if (enableSync !== undefined) {
      const enableSyncValue = enableSync ? 'true' : 'false';
      newEnvContent = newEnvContent.replace(/AUTO_SYNC=.*(\r?\n|$)/, `AUTO_SYNC=${enableSyncValue}$1`);
      if (!newEnvContent.includes('AUTO_SYNC=')) {
        newEnvContent += `\nAUTO_SYNC=${enableSyncValue}`;
      }
      process.env.AUTO_SYNC = enableSyncValue;
    }
    
    // Lưu file .env nếu có thay đổi
    if (newEnvContent !== envContent) {
      fs.writeFileSync(envPath, newEnvContent);
      
      // Khởi động lại bot nếu cần
      if (restartAfterSave) {
        setTimeout(async () => {
          try {
            // Khởi động lại bot
            const telegramService = require('../services/telegramService');
            await telegramService.restartBot();
          } catch (error) {
            console.error('Lỗi khởi động lại bot:', error);
          }
        }, 1000);
      }
    }
    
    res.json({
      success: true,
      message: 'Đã lưu cài đặt thành công',
      needsRestart: restartAfterSave
    });
  } catch (error) {
    console.error('Lỗi cập nhật cài đặt:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi cập nhật cài đặt'
    });
  }
});

// Share route (public)
router.get('/share/:token', (req, res) => {
  try {
    const shareToken = req.params.token;
    
    // Tìm file được chia sẻ
    const filesData = fileController.readFilesDb();
    const file = filesData.find(file => file.shareToken === shareToken);
    
    if (!file) {
      return res.status(404).send('Link chia sẻ không tồn tại hoặc đã hết hạn');
    }
    
    // Kiểm tra thời hạn chia sẻ
    if (file.shareExpiry && new Date(file.shareExpiry) < new Date()) {
      // Xóa thông tin chia sẻ đã hết hạn
      file.shareToken = null;
      file.shareExpiry = null;
      fileController.saveFilesDb(filesData);
      
      return res.status(400).send('Link chia sẻ đã hết hạn');
    }
    
    // Redirect đến trang xem trước hoặc tải file
    const isPreviewable = ['image', 'video', 'audio', 'pdf'].includes(file.fileType);
    
    if (isPreviewable) {
      return res.redirect(`/preview/${file.id}?token=${shareToken}`);
    } else {
      return res.redirect(`/download/${file.id}?token=${shareToken}`);
    }
  } catch (error) {
    console.error('Lỗi khi xử lý link chia sẻ:', error);
    return res.status(500).send('Lỗi server khi xử lý link chia sẻ');
  }
});

module.exports = router; 