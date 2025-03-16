/**
 * TeleDrive - API Routes
 * File này chứa các định nghĩa route API
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const config = require('../config/config');
const fileService = require('../services/fileService');
const telegramService = require('../services/telegramService');
const authMiddleware = require('../middlewares/authMiddleware');
const { getMimeType, guessFileType } = require('../utils/helpers');

const router = express.Router();

// Cấu hình multer cho upload file
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    // Tạo thư mục uploads nếu chưa tồn tại
    const uploadDir = path.join(config.STORAGE_PATH, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    // Tạo tên file bảo mật
    const secureFilename = fileService.getSecureFilePath(file.originalname);
    cb(null, secureFilename);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: config.MAX_FILE_SIZE
  }
});

// Áp dụng middleware xác thực cho tất cả các routes ngoại trừ login
router.use((req, res, next) => {
  if (req.path === '/auth/login') {
    return next();
  }
  authMiddleware.authenticate(req, res, next);
});

// ===== ROUTES CHO XÁC THỰC =====

// Đăng nhập
router.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Kiểm tra thông tin đăng nhập
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập tên đăng nhập và mật khẩu'
      });
    }
    
    // Kiểm tra đúng thông tin đăng nhập trong config
    if (username === config.ADMIN_USERNAME && password === config.ADMIN_PASSWORD) {
      // Tạo session
      req.session.isLoggedIn = true;
      req.session.username = username;
      
      return res.json({
        success: true,
        message: 'Đăng nhập thành công'
      });
    } else {
      return res.status(401).json({
        success: false,
        message: 'Tên đăng nhập hoặc mật khẩu không đúng'
      });
    }
  } catch (error) {
    console.error('Lỗi khi đăng nhập:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + (error.message || 'Lỗi không xác định')
    });
  }
});

// Đăng xuất
router.post('/auth/logout', async (req, res) => {
  try {
    // Xóa session
    req.session.destroy(err => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Lỗi khi đăng xuất: ' + err.message
        });
      }
      
      res.json({
        success: true,
        message: 'Đăng xuất thành công'
      });
    });
  } catch (error) {
    console.error('Lỗi khi đăng xuất:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + (error.message || 'Lỗi không xác định')
    });
  }
});

// Đổi mật khẩu
router.post('/auth/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Kiểm tra mật khẩu hiện tại
    if (currentPassword !== config.ADMIN_PASSWORD) {
      return res.status(401).json({
        success: false,
        message: 'Mật khẩu hiện tại không đúng'
      });
    }
    
    // TODO: Cập nhật mật khẩu mới trong file .env
    // (Cần triển khai phương thức để cập nhật file .env)
    
    res.json({
      success: true,
      message: 'Đã đổi mật khẩu thành công'
    });
  } catch (error) {
    console.error('Lỗi khi đổi mật khẩu:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + (error.message || 'Lỗi không xác định')
    });
  }
});

// ===== ROUTES CHO FILE =====

// Lấy danh sách file
router.get('/files', async (req, res) => {
  try {
    // Lấy danh sách file từ DB
    const files = fileService.readFilesDb();
    
    // Lọc các file không nằm trong thùng rác
    const activeFiles = files.filter(file => !file.isDeleted);
    
    // Nếu có tham số folder, lọc theo folder
    let filteredFiles = activeFiles;
    if (req.query.folder) {
      filteredFiles = activeFiles.filter(file => file.folder === req.query.folder);
    }
    
    res.json({
      success: true,
      files: filteredFiles
    });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách file:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + (error.message || 'Lỗi không xác định')
    });
  }
});

// Upload file mới
router.post('/files/upload', upload.single('file'), async (req, res) => {
  try {
    // Kiểm tra file đã upload chưa
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy file để upload'
      });
    }
    
    const file = req.file;
    const folder = req.body.folder || '';
    
    console.log(`Đã nhận file upload: ${file.originalname} (${file.size} bytes)`);
    
    // Tạo thông tin file
    const fileId = crypto.randomUUID();
    const fileInfo = {
      id: fileId,
      name: file.originalname,
      localPath: file.path,
      mimeType: file.mimetype || getMimeType(file.originalname),
      size: file.size,
      folder: folder,
      fileType: guessFileType(file.originalname),
      uploadDate: new Date().toISOString(),
      telegramFileId: null,
      telegramUrl: null,
      isDeleted: false,
      needsSync: true,
      fileStatus: 'local'
    };
    
    // Lưu thông tin file vào DB
    const files = fileService.readFilesDb();
    files.push(fileInfo);
    fileService.saveFilesDb(files);
    
    // Đồng bộ file với Telegram (nếu có bot hoạt động)
    const botActive = telegramService.isBotActive();
    if (botActive) {
      res.json({
        success: true,
        message: 'Đã upload file thành công và đang đồng bộ với Telegram',
        file: fileInfo
      });
      
      // Thực hiện đồng bộ với Telegram sau khi đã trả về kết quả
      fileService.autoSyncFile(fileInfo)
        .then(syncResult => {
          if (syncResult.success) {
            console.log(`Đã đồng bộ thành công file ${fileInfo.name} với Telegram`);
          } else {
            console.error(`Lỗi khi đồng bộ file ${fileInfo.name} với Telegram:`, syncResult.error);
          }
        })
        .catch(error => {
          console.error(`Lỗi khi đồng bộ file ${fileInfo.name} với Telegram:`, error);
        });
    } else {
      res.json({
        success: true,
        message: 'Đã upload file thành công',
        file: fileInfo
      });
    }
  } catch (error) {
    console.error('Lỗi khi upload file:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + (error.message || 'Lỗi không xác định')
    });
  }
});

// Tải file
router.get('/files/download/:fileId', async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const isSharedLink = req.query.shared === 'true';
    
    // Xác thực nếu không phải link chia sẻ
    if (!isSharedLink) {
      // Kiểm tra xem người dùng đã đăng nhập chưa
      if (!req.session.isLoggedIn) {
        // Kiểm tra API key nếu có
        const apiKey = req.query.apiKey || req.headers['x-api-key'];
        if (!apiKey || apiKey !== config.API_KEY) {
          return res.status(401).json({
            success: false,
            message: 'Không có quyền truy cập'
          });
        }
      }
    }
    
    // Lấy thông tin file từ DB
    const files = fileService.readFilesDb();
    const fileInfo = files.find(file => file.id === fileId);
    
    if (!fileInfo) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy file'
      });
    }
    
    if (fileInfo.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'File đã bị xóa'
      });
    }
    
    // Kiểm tra file tồn tại ở local
    if (fileInfo.localPath && fs.existsSync(fileInfo.localPath)) {
      // Cấu hình headers cho download
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileInfo.name)}"`);
      if (fileInfo.mimeType) {
        res.setHeader('Content-Type', fileInfo.mimeType);
      }
      
      // Stream file từ local
      const fileStream = fs.createReadStream(fileInfo.localPath);
      fileStream.pipe(res);
    } else if (fileInfo.telegramFileId) {
      // Nếu không có ở local, tải từ Telegram
      const tempDir = path.join(config.STORAGE_PATH, 'temp');
      
      // Tạo thư mục temp nếu chưa tồn tại
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const tempFilePath = path.join(tempDir, fileInfo.name);
      
      // Tải file từ Telegram
      const downloadResult = await telegramService.downloadFileFromTelegram(
        fileInfo.telegramFileId,
        tempFilePath
      );
      
      if (downloadResult.success) {
        // Cấu hình headers cho download
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileInfo.name)}"`);
        if (fileInfo.mimeType) {
          res.setHeader('Content-Type', fileInfo.mimeType);
        }
        
        // Stream file từ temp
        const fileStream = fs.createReadStream(tempFilePath);
        fileStream.pipe(res);
        
        // Xóa file sau khi download xong
        fileStream.on('end', () => {
          try {
            fs.unlink(tempFilePath, (err) => {
              if (err) console.error(`Lỗi khi xóa file tạm ${tempFilePath}:`, err);
            });
          } catch (error) {
            console.error(`Lỗi khi xóa file tạm ${tempFilePath}:`, error);
          }
        });
      } else {
        return res.status(500).json({
          success: false,
          message: 'Lỗi khi tải file từ Telegram'
        });
      }
    } else {
      return res.status(404).json({
        success: false,
        message: 'File không tồn tại ở cả local và Telegram'
      });
    }
  } catch (error) {
    console.error('Lỗi khi tải file:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + (error.message || 'Lỗi không xác định')
    });
  }
});

// Xem thông tin file
router.get('/files/:fileId', async (req, res) => {
  try {
    const fileId = req.params.fileId;
    
    // Lấy thông tin file từ DB
    const files = fileService.readFilesDb();
    const fileInfo = files.find(file => file.id === fileId);
    
    if (!fileInfo || fileInfo.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy file'
      });
    }
    
    res.json({
      success: true,
      file: fileInfo
    });
  } catch (error) {
    console.error('Lỗi khi lấy thông tin file:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + (error.message || 'Lỗi không xác định')
    });
  }
});

// Đổi tên file
router.put('/files/:fileId/rename', async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const { newName } = req.body;
    
    if (!newName || newName.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Tên file mới không hợp lệ'
      });
    }
    
    // Lấy thông tin file từ DB
    const files = fileService.readFilesDb();
    const fileIndex = files.findIndex(file => file.id === fileId);
    
    if (fileIndex === -1 || files[fileIndex].isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy file'
      });
    }
    
    // Cập nhật tên file
    files[fileIndex].name = newName;
    
    // Lưu lại thông tin file
    fileService.saveFilesDb(files);
    
    res.json({
      success: true,
      message: 'Đã đổi tên file thành công',
      file: files[fileIndex]
    });
  } catch (error) {
    console.error('Lỗi khi đổi tên file:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + (error.message || 'Lỗi không xác định')
    });
  }
});

// Di chuyển file
router.put('/files/:fileId/move', async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const { targetFolder } = req.body;
    
    // Lấy thông tin file từ DB
    const files = fileService.readFilesDb();
    const fileIndex = files.findIndex(file => file.id === fileId);
    
    if (fileIndex === -1 || files[fileIndex].isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy file'
      });
    }
    
    // Cập nhật thư mục của file
    files[fileIndex].folder = targetFolder || '';
    
    // Lưu lại thông tin file
    fileService.saveFilesDb(files);
    
    res.json({
      success: true,
      message: 'Đã di chuyển file thành công',
      file: files[fileIndex]
    });
  } catch (error) {
    console.error('Lỗi khi di chuyển file:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + (error.message || 'Lỗi không xác định')
    });
  }
});

// Xóa file (chuyển vào thùng rác)
router.delete('/files/:fileId', async (req, res) => {
  try {
    const fileId = req.params.fileId;
    
    // Lấy thông tin file từ DB
    const files = fileService.readFilesDb();
    const fileIndex = files.findIndex(file => file.id === fileId);
    
    if (fileIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy file'
      });
    }
    
    // Đánh dấu file đã bị xóa
    files[fileIndex].isDeleted = true;
    files[fileIndex].deletedAt = new Date().toISOString();
    
    // Lưu lại thông tin file
    fileService.saveFilesDb(files);
    
    res.json({
      success: true,
      message: 'Đã chuyển file vào thùng rác',
      file: files[fileIndex]
    });
  } catch (error) {
    console.error('Lỗi khi xóa file:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + (error.message || 'Lỗi không xác định')
    });
  }
});

// Tạo link chia sẻ file
router.post('/files/:fileId/share', async (req, res) => {
  try {
    const fileId = req.params.fileId;
    
    // Lấy thông tin file từ DB
    const files = fileService.readFilesDb();
    const fileInfo = files.find(file => file.id === fileId);
    
    if (!fileInfo || fileInfo.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy file'
      });
    }
    
    // Tạo link chia sẻ (URL download với tham số shared=true)
    const shareLink = `${config.BASE_URL}/api/files/download/${fileId}?shared=true`;
    
    res.json({
      success: true,
      shareLink: shareLink,
      file: fileInfo
    });
  } catch (error) {
    console.error('Lỗi khi tạo link chia sẻ:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + (error.message || 'Lỗi không xác định')
    });
  }
});

// ===== ROUTES CHO THƯ MỤC =====

// Lấy danh sách thư mục
router.get('/folders', async (req, res) => {
  try {
    // Lấy danh sách file từ DB
    const files = fileService.readFilesDb();
    
    // Tìm tất cả các thư mục duy nhất
    const folders = [...new Set(files
      .filter(file => !file.isDeleted && file.folder)
      .map(file => file.folder)
    )];
    
    res.json({
      success: true,
      folders: folders
    });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách thư mục:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + (error.message || 'Lỗi không xác định')
    });
  }
});

// Tạo thư mục mới
router.post('/folders', async (req, res) => {
  try {
    const { folderName } = req.body;
    
    if (!folderName || folderName.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Tên thư mục không hợp lệ'
      });
    }
    
    // Lấy danh sách file từ DB
    const files = fileService.readFilesDb();
    
    // Kiểm tra xem thư mục đã tồn tại chưa
    const folders = [...new Set(files
      .filter(file => !file.isDeleted && file.folder)
      .map(file => file.folder)
    )];
    
    if (folders.includes(folderName)) {
      return res.status(400).json({
        success: false,
        message: 'Thư mục đã tồn tại'
      });
    }
    
    // Tạo một file trống trong thư mục này để đánh dấu
    const fileId = crypto.randomUUID();
    const placeholderFile = {
      id: fileId,
      name: '.folder_placeholder',
      localPath: null,
      mimeType: 'text/plain',
      size: 0,
      folder: folderName,
      fileType: 'placeholder',
      uploadDate: new Date().toISOString(),
      isPlaceholder: true,
      isDeleted: false
    };
    
    files.push(placeholderFile);
    fileService.saveFilesDb(files);
    
    res.json({
      success: true,
      message: 'Đã tạo thư mục mới',
      folderName: folderName
    });
  } catch (error) {
    console.error('Lỗi khi tạo thư mục:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + (error.message || 'Lỗi không xác định')
    });
  }
});

// Đổi tên thư mục
router.put('/folders/:folderName/rename', async (req, res) => {
  try {
    const folderName = req.params.folderName;
    const { newName } = req.body;
    
    if (!newName || newName.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Tên thư mục mới không hợp lệ'
      });
    }
    
    // Lấy danh sách file từ DB
    const files = fileService.readFilesDb();
    
    // Cập nhật tên thư mục cho tất cả các file trong thư mục
    let updateCount = 0;
    files.forEach(file => {
      if (!file.isDeleted && file.folder === folderName) {
        file.folder = newName;
        updateCount++;
      }
    });
    
    if (updateCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thư mục'
      });
    }
    
    // Lưu lại danh sách file
    fileService.saveFilesDb(files);
    
    res.json({
      success: true,
      message: `Đã đổi tên thư mục từ "${folderName}" thành "${newName}"`,
      updatedCount: updateCount
    });
  } catch (error) {
    console.error('Lỗi khi đổi tên thư mục:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + (error.message || 'Lỗi không xác định')
    });
  }
});

// Xóa thư mục
router.delete('/folders/:folderName', async (req, res) => {
  try {
    const folderName = req.params.folderName;
    
    // Lấy danh sách file từ DB
    const files = fileService.readFilesDb();
    
    // Đánh dấu tất cả các file trong thư mục là đã xóa
    let deleteCount = 0;
    files.forEach(file => {
      if (!file.isDeleted && file.folder === folderName) {
        file.isDeleted = true;
        file.deletedAt = new Date().toISOString();
        deleteCount++;
      }
    });
    
    if (deleteCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thư mục hoặc thư mục trống'
      });
    }
    
    // Lưu lại danh sách file
    fileService.saveFilesDb(files);
    
    res.json({
      success: true,
      message: `Đã xóa thư mục "${folderName}" và chuyển ${deleteCount} file vào thùng rác`,
      deletedCount: deleteCount
    });
  } catch (error) {
    console.error('Lỗi khi xóa thư mục:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + (error.message || 'Lỗi không xác định')
    });
  }
});

// ===== ROUTES CHO THÙNG RÁC =====

// Lấy danh sách file trong thùng rác
router.get('/trash', async (req, res) => {
  try {
    // Lấy danh sách file từ DB
    const files = fileService.readFilesDb();
    
    // Lọc các file đã bị xóa
    const deletedFiles = files.filter(file => file.isDeleted);
    
    res.json({
      success: true,
      files: deletedFiles
    });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách file trong thùng rác:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + (error.message || 'Lỗi không xác định')
    });
  }
});

// Khôi phục file từ thùng rác
router.post('/trash/:fileId/restore', async (req, res) => {
  try {
    const fileId = req.params.fileId;
    
    // Lấy danh sách file từ DB
    const files = fileService.readFilesDb();
    const fileIndex = files.findIndex(file => file.id === fileId);
    
    if (fileIndex === -1 || !files[fileIndex].isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy file trong thùng rác'
      });
    }
    
    // Khôi phục file
    files[fileIndex].isDeleted = false;
    delete files[fileIndex].deletedAt;
    
    // Lưu lại danh sách file
    fileService.saveFilesDb(files);
    
    res.json({
      success: true,
      message: 'Đã khôi phục file từ thùng rác',
      file: files[fileIndex]
    });
  } catch (error) {
    console.error('Lỗi khi khôi phục file:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + (error.message || 'Lỗi không xác định')
    });
  }
});

// Xóa vĩnh viễn file
router.delete('/trash/:fileId', async (req, res) => {
  try {
    const fileId = req.params.fileId;
    
    // Lấy danh sách file từ DB
    const files = fileService.readFilesDb();
    const fileIndex = files.findIndex(file => file.id === fileId);
    
    if (fileIndex === -1 || !files[fileIndex].isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy file trong thùng rác'
      });
    }
    
    const fileInfo = files[fileIndex];
    
    // Xóa file vật lý nếu có ở local
    if (fileInfo.localPath && fs.existsSync(fileInfo.localPath)) {
      try {
        fs.unlinkSync(fileInfo.localPath);
        console.log(`Đã xóa file vật lý: ${fileInfo.localPath}`);
      } catch (error) {
        console.error(`Lỗi khi xóa file vật lý ${fileInfo.localPath}:`, error);
      }
    }
    
    // Xóa thông tin file khỏi DB
    files.splice(fileIndex, 1);
    
    // Lưu lại danh sách file
    fileService.saveFilesDb(files);
    
    res.json({
      success: true,
      message: 'Đã xóa vĩnh viễn file',
      fileId: fileId
    });
  } catch (error) {
    console.error('Lỗi khi xóa vĩnh viễn file:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + (error.message || 'Lỗi không xác định')
    });
  }
});

// Xóa vĩnh viễn tất cả file trong thùng rác
router.delete('/trash', async (req, res) => {
  try {
    // Lấy danh sách file từ DB
    const files = fileService.readFilesDb();
    
    // Lọc các file đã bị xóa
    const deletedFiles = files.filter(file => file.isDeleted);
    
    if (deletedFiles.length === 0) {
      return res.json({
        success: true,
        message: 'Thùng rác trống',
        deletedCount: 0
      });
    }
    
    // Xóa các file vật lý
    for (const file of deletedFiles) {
      if (file.localPath && fs.existsSync(file.localPath)) {
        try {
          fs.unlinkSync(file.localPath);
          console.log(`Đã xóa file vật lý: ${file.localPath}`);
        } catch (error) {
          console.error(`Lỗi khi xóa file vật lý ${file.localPath}:`, error);
        }
      }
    }
    
    // Lọc bỏ các file đã bị xóa khỏi DB
    const remainingFiles = files.filter(file => !file.isDeleted);
    
    // Lưu lại danh sách file
    fileService.saveFilesDb(remainingFiles);
    
    res.json({
      success: true,
      message: `Đã xóa vĩnh viễn ${deletedFiles.length} file từ thùng rác`,
      deletedCount: deletedFiles.length
    });
  } catch (error) {
    console.error('Lỗi khi xóa tất cả file trong thùng rác:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + (error.message || 'Lỗi không xác định')
    });
  }
});

// ===== ROUTES CHO CÀI ĐẶT =====

// Cập nhật cài đặt
router.post('/settings', async (req, res) => {
  try {
    const { setting, value } = req.body;
    
    // Kiểm tra tham số
    if (!setting || value === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin cài đặt'
      });
    }
    
    // TODO: Triển khai phương thức cập nhật cài đặt
    // (Cần xây dựng module quản lý cài đặt riêng)
    
    res.json({
      success: true,
      message: 'Đã cập nhật cài đặt thành công',
      setting,
      value
    });
  } catch (error) {
    console.error('Lỗi khi cập nhật cài đặt:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + (error.message || 'Lỗi không xác định')
    });
  }
});

// Route đồng bộ tất cả các file với Telegram
router.post('/sync', async (req, res) => {
  try {
    // Thực hiện đồng bộ
    const syncResult = await fileService.syncFiles();
    
    if (syncResult.success) {
      res.json({
        success: true,
        message: `Đã đồng bộ ${syncResult.syncedCount} file, bỏ qua ${syncResult.skippedCount} file, lỗi ${syncResult.errorCount} file`,
        stats: {
          synced: syncResult.syncedCount,
          skipped: syncResult.skippedCount,
          errors: syncResult.errorCount
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: syncResult.error || 'Lỗi khi đồng bộ các file',
        stats: {
          synced: syncResult.syncedCount,
          skipped: syncResult.skippedCount, 
          errors: syncResult.errorCount
        }
      });
    }
  } catch (error) {
    console.error('Lỗi khi đồng bộ các file:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + (error.message || 'Lỗi không xác định')
    });
  }
});

module.exports = router; 