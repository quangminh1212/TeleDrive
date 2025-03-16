/**
 * TeleDrive - API Routes
 * File này định nghĩa các routes cho API
 */

const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const folderController = require('../controllers/folderController');
const authController = require('../controllers/authController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config/config');

// Cấu hình multer để upload file
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Đảm bảo thư mục uploads tồn tại
    const uploadDir = path.join(config.STORAGE_PATH, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Tạo tên file duy nhất
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // Giới hạn 50MB
  } 
});

// Middleware kiểm tra xác thực nếu cần
function checkAuth(req, res, next) {
  // Kiểm tra xác thực ở đây nếu cần
  // Ví dụ: kiểm tra token, session, v.v.
  next();
}

// =================== FILE API ROUTES ===================

// Đồng bộ files với Telegram
router.post('/sync', checkAuth, fileController.syncFiles);

// Kiểm tra và sửa dữ liệu file
router.post('/check-files', checkAuth, fileController.checkFiles);

// Lấy danh sách file
router.get('/files', checkAuth, fileController.getFiles);

// Lấy thông tin chi tiết file
router.get('/files/:id', checkAuth, fileController.getFileDetails);

// Tải file
router.get('/download/:id', checkAuth, fileController.downloadFile);

// Thống kê file
router.get('/stats', checkAuth, fileController.getFileStats);

// Kiểm tra trạng thái file
router.get('/file-status', checkAuth, fileController.getFileStatus);

// =================== FOLDER API ROUTES ===================

// Lấy danh sách thư mục
router.get('/folders', checkAuth, folderController.getFolders);

// Tạo thư mục mới
router.post('/folders', checkAuth, folderController.createFolder);

// Đổi tên thư mục
router.put('/folders/:id/rename', checkAuth, folderController.renameFolder);

// Xóa thư mục
router.delete('/folders/:id', checkAuth, folderController.deleteFolder);

// =================== UPLOAD API ROUTES ===================

// Upload file
router.post('/upload', checkAuth, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Không có file nào được upload'
      });
    }

    // Lấy thông tin file đã upload
    const fileInfo = {
      id: req.file.filename,
      name: req.file.originalname,
      size: req.file.size,
      localPath: req.file.path,
      relativePath: req.body.folder || '',
      uploadDate: new Date().toISOString(),
      fileType: path.extname(req.file.originalname).slice(1).toLowerCase() || 'unknown',
      mimeType: req.file.mimetype,
      needsSync: true,
      fileStatus: 'local'
    };

    // Đọc cơ sở dữ liệu file hiện tại
    const filesData = fileController.readFilesDb();
    
    // Thêm file mới vào danh sách
    filesData.push(fileInfo);
    
    // Lưu cơ sở dữ liệu file
    fileController.saveFilesDb(filesData);
    
    // Tự động đồng bộ file với Telegram nếu cấu hình cho phép
    if (config.AUTO_SYNC === 'true') {
      fileController.autoSyncFile(fileInfo);
    }
    
    return res.json({
      success: true,
      file: fileInfo
    });
  } catch (error) {
    console.error('Lỗi khi upload file:', error);
    return res.status(500).json({
      success: false,
      error: 'Lỗi server: ' + (error.message || 'Không xác định')
    });
  }
});

// Upload nhiều file
router.post('/upload-multiple', checkAuth, upload.array('files', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Không có file nào được upload'
      });
    }

    // Lấy thông tin các file đã upload
    const uploadedFiles = req.files.map(file => ({
      id: file.filename,
      name: file.originalname,
      size: file.size,
      localPath: file.path,
      relativePath: req.body.folder || '',
      uploadDate: new Date().toISOString(),
      fileType: path.extname(file.originalname).slice(1).toLowerCase() || 'unknown',
      mimeType: file.mimetype,
      needsSync: true,
      fileStatus: 'local'
    }));

    // Đọc cơ sở dữ liệu file hiện tại
    const filesData = fileController.readFilesDb();
    
    // Thêm các file mới vào danh sách
    filesData.push(...uploadedFiles);
    
    // Lưu cơ sở dữ liệu file
    fileController.saveFilesDb(filesData);
    
    // Tự động đồng bộ các file với Telegram nếu cấu hình cho phép
    if (config.AUTO_SYNC === 'true') {
      for (const file of uploadedFiles) {
        fileController.autoSyncFile(file);
      }
    }
    
    return res.json({
      success: true,
      files: uploadedFiles,
      count: uploadedFiles.length
    });
  } catch (error) {
    console.error('Lỗi khi upload nhiều file:', error);
    return res.status(500).json({
      success: false,
      error: 'Lỗi server: ' + (error.message || 'Không xác định')
    });
  }
});

// =================== TRASH API ROUTES ===================

// Chuyển file vào thùng rác
router.post('/trash/:id', checkAuth, (req, res) => {
  try {
    const fileId = req.params.id;
    const filesData = fileController.readFilesDb();
    const fileIndex = filesData.findIndex(f => f.id === fileId);
    
    if (fileIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'File không tồn tại'
      });
    }
    
    // Đánh dấu file đã bị xóa (vào thùng rác)
    filesData[fileIndex].deleted = true;
    filesData[fileIndex].deleteDate = new Date().toISOString();
    
    // Lưu cơ sở dữ liệu file
    fileController.saveFilesDb(filesData);
    
    return res.json({
      success: true,
      message: 'File đã được chuyển vào thùng rác'
    });
  } catch (error) {
    console.error('Lỗi khi chuyển file vào thùng rác:', error);
    return res.status(500).json({
      success: false,
      error: 'Lỗi server: ' + (error.message || 'Không xác định')
    });
  }
});

// Lấy danh sách file trong thùng rác
router.get('/trash', checkAuth, (req, res) => {
  try {
    const filesData = fileController.readFilesDb();
    const trashedFiles = filesData.filter(file => file.deleted);
    
    return res.json({
      success: true,
      files: trashedFiles,
      total: trashedFiles.length
    });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách file trong thùng rác:', error);
    return res.status(500).json({
      success: false,
      error: 'Lỗi server: ' + (error.message || 'Không xác định')
    });
  }
});

// Khôi phục file từ thùng rác
router.post('/restore/:id', checkAuth, (req, res) => {
  try {
    const fileId = req.params.id;
    const filesData = fileController.readFilesDb();
    const fileIndex = filesData.findIndex(f => f.id === fileId);
    
    if (fileIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'File không tồn tại'
      });
    }
    
    // Nếu file không ở trong thùng rác
    if (!filesData[fileIndex].deleted) {
      return res.status(400).json({
        success: false,
        error: 'File không ở trong thùng rác'
      });
    }
    
    // Khôi phục file từ thùng rác
    filesData[fileIndex].deleted = false;
    delete filesData[fileIndex].deleteDate;
    
    // Lưu cơ sở dữ liệu file
    fileController.saveFilesDb(filesData);
    
    return res.json({
      success: true,
      message: 'File đã được khôi phục từ thùng rác'
    });
  } catch (error) {
    console.error('Lỗi khi khôi phục file từ thùng rác:', error);
    return res.status(500).json({
      success: false,
      error: 'Lỗi server: ' + (error.message || 'Không xác định')
    });
  }
});

// Xóa vĩnh viễn file từ thùng rác
router.delete('/trash/:id', checkAuth, (req, res) => {
  try {
    const fileId = req.params.id;
    const filesData = fileController.readFilesDb();
    const fileIndex = filesData.findIndex(f => f.id === fileId);
    
    if (fileIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'File không tồn tại'
      });
    }
    
    // Nếu file không ở trong thùng rác
    if (!filesData[fileIndex].deleted) {
      return res.status(400).json({
        success: false,
        error: 'File không ở trong thùng rác'
      });
    }
    
    // Lấy thông tin file trước khi xóa
    const file = filesData[fileIndex];
    
    // Xóa file khỏi cơ sở dữ liệu
    filesData.splice(fileIndex, 1);
    
    // Lưu cơ sở dữ liệu file
    fileController.saveFilesDb(filesData);
    
    // Xóa file khỏi đĩa nếu tồn tại
    if (file.localPath && fs.existsSync(file.localPath)) {
      fs.unlinkSync(file.localPath);
    }
    
    return res.json({
      success: true,
      message: 'File đã được xóa vĩnh viễn'
    });
  } catch (error) {
    console.error('Lỗi khi xóa vĩnh viễn file:', error);
    return res.status(500).json({
      success: false,
      error: 'Lỗi server: ' + (error.message || 'Không xác định')
    });
  }
});

// Làm trống thùng rác
router.delete('/empty-trash', checkAuth, (req, res) => {
  try {
    const filesData = fileController.readFilesDb();
    
    // Lọc ra các file đã bị xóa (trong thùng rác)
    const trashedFiles = filesData.filter(file => file.deleted);
    
    // Xóa các file khỏi đĩa nếu tồn tại
    for (const file of trashedFiles) {
      if (file.localPath && fs.existsSync(file.localPath)) {
        fs.unlinkSync(file.localPath);
      }
    }
    
    // Lọc ra các file không bị xóa (không ở trong thùng rác)
    const remainingFiles = filesData.filter(file => !file.deleted);
    
    // Lưu cơ sở dữ liệu file chỉ với các file không bị xóa
    fileController.saveFilesDb(remainingFiles);
    
    return res.json({
      success: true,
      message: `Đã xóa vĩnh viễn ${trashedFiles.length} file từ thùng rác`
    });
  } catch (error) {
    console.error('Lỗi khi làm trống thùng rác:', error);
    return res.status(500).json({
      success: false,
      error: 'Lỗi server: ' + (error.message || 'Không xác định')
    });
  }
});

// =================== SEARCH API ROUTES ===================

// Tìm kiếm file
router.get('/search', checkAuth, (req, res) => {
  try {
    const query = req.query.q || '';
    const filesData = fileController.readFilesDb();
    
    // Nếu không có từ khóa tìm kiếm
    if (!query.trim()) {
      return res.json({
        success: true,
        files: [],
        total: 0,
        query: ''
      });
    }
    
    // Tìm kiếm file theo tên
    const searchResults = filesData.filter(file => {
      // Chỉ tìm kiếm file không ở trong thùng rác
      if (file.deleted) return false;
      
      // Tìm kiếm không phân biệt chữ hoa/thường
      const fileName = (file.name || '').toLowerCase();
      const searchQuery = query.toLowerCase();
      
      return fileName.includes(searchQuery);
    });
    
    return res.json({
      success: true,
      files: searchResults,
      total: searchResults.length,
      query: query
    });
  } catch (error) {
    console.error('Lỗi khi tìm kiếm file:', error);
    return res.status(500).json({
      success: false,
      error: 'Lỗi server: ' + (error.message || 'Không xác định')
    });
  }
});

// =================== BOT API ROUTES ===================

// Kiểm tra trạng thái bot
router.get('/bot-status', checkAuth, (req, res) => {
  try {
    const botActive = fileController.isBotActive();
    const botInfo = {
      active: botActive,
      token: process.env.BOT_TOKEN ? '***' + process.env.BOT_TOKEN.slice(-8) : 'Not configured',
      chatId: process.env.CHAT_ID || 'Not configured'
    };
    
    return res.json({
      success: true,
      bot: botInfo
    });
  } catch (error) {
    console.error('Lỗi khi kiểm tra trạng thái bot:', error);
    return res.status(500).json({
      success: false,
      error: 'Lỗi server: ' + (error.message || 'Không xác định')
    });
  }
});

// Khởi động lại bot
router.post('/restart-bot', checkAuth, async (req, res) => {
  try {
    console.log('===== RESTART BOT REQUEST =====');
    
    // Khởi động lại bot
    const result = await fileController.restartBot();
    
    return res.json({
      success: result.success,
      message: result.success ? 'Bot đã được khởi động lại thành công' : 'Không thể khởi động lại bot',
      details: result
    });
  } catch (error) {
    console.error('Lỗi khi khởi động lại bot:', error);
    return res.status(500).json({
      success: false,
      error: 'Lỗi server: ' + (error.message || 'Không xác định')
    });
  }
});

module.exports = router; 