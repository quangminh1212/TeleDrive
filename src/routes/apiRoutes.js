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
const { getMimeType, guessFileType, log, ensureDirectoryExists } = require('../utils/helpers');

const router = express.Router();

// Cấu hình multer cho upload file
const uploadDir = path.join(__dirname, '../../temp/uploads');
ensureDirectoryExists(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Use original filename but ensure uniqueness
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const fileExt = path.extname(file.originalname);
    const fileName = `${path.basename(file.originalname, fileExt)}-${uniqueSuffix}${fileExt}`;
    cb(null, fileName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024 // 2GB (Telegram max file size)
  }
});

// Áp dụng middleware xác thực cho tất cả các routes ngoại trừ telegram login
router.use((req, res, next) => {
  // Cho phép truy cập trực tiếp vào route đăng nhập Telegram mà không cần xác thực
  if (req.path === '/auth/telegram') {
    return next();
  }
  
  // Nếu không phải là route đăng nhập Telegram, áp dụng middleware xác thực
  authMiddleware.apiAuth(req, res, next);
});

// ===== ROUTES CHO XÁC THỰC =====

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

// Endpoint tạo mã xác thực mà không chuyển hướng
router.get('/auth/get-auth-code', (req, res) => {
  try {
    // Tạo mã xác thực ngẫu nhiên để xác minh
    const authCode = crypto.randomBytes(16).toString('hex');
    req.session.telegramAuthCode = authCode;
    
    log(`Tạo mã xác thực mới: ${authCode}`, 'info');
    
    // Trả về mã xác thực
    return res.json({
      success: true,
      authCode: authCode
    });
  } catch (error) {
    log(`Lỗi khi tạo mã xác thực: ${error.message}`, 'error');
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo mã xác thực: ' + error.message
    });
  }
});

// Route đăng nhập bằng Telegram
router.get('/auth/telegram', (req, res) => {
  try {
    // Tạo mã xác thực ngẫu nhiên để xác minh
    const authCode = crypto.randomBytes(16).toString('hex');
    req.session.telegramAuthCode = authCode;
    
    // Chuyển hướng đến trang xác thực Telegram Bot
    const botUsername = config.TELEGRAM_BOT_USERNAME;
    if (!botUsername) {
      return res.status(500).json({
        success: false,
        message: 'Thiếu cấu hình TELEGRAM_BOT_USERNAME'
      });
    }
    
    // URL callback sau khi xác thực
    const callbackUrl = encodeURIComponent(`${req.protocol}://${req.get('host')}/api/auth/telegram/callback`);
    
    // Thêm auth code vào state để kiểm tra chống CSRF
    res.redirect(`https://telegram.me/${botUsername}?start=auth_${authCode}`);
    
    log(`Chuyển hướng đến xác thực Telegram với code: ${authCode}`, 'info');
  } catch (error) {
    log(`Lỗi khi bắt đầu xác thực Telegram: ${error.message}`, 'error');
    res.status(500).json({
      success: false,
      message: 'Lỗi khi bắt đầu xác thực Telegram: ' + error.message
    });
  }
});

// Callback xác thực từ Telegram 
router.get('/auth/telegram/callback', (req, res) => {
  res.render('auth-waiting', {
    title: 'Đang xác thực với Telegram',
    authCode: req.session.telegramAuthCode
  });
});

// API endpoint để kiểm tra trạng thái xác thực qua mã code
router.post('/auth/check-status', async (req, res) => {
  try {
    const { authCode } = req.body;
    
    if (!authCode) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu mã xác thực',
        status: 'error'
      });
    }
    
    // Xác minh trạng thái yêu cầu xác thực
    const status = await telegramService.verifyAuthRequest(authCode);
    
    if (status) {
      // Thiết lập session
      req.session.isLoggedIn = true;
      req.session.user = status;
      
      return res.json({
        success: true,
        status: 'authenticated',
        user: status
      });
    }
    
    // Kiểm tra xem mã có tồn tại không
    const authRequests = await telegramService.loadDb('auth_requests', []);
    const request = authRequests.find(r => r.code === authCode);
    
    if (request) {
      return res.json({
        success: false,
        status: 'pending',
        message: 'Đang đợi xác thực từ Telegram'
      });
    }
    
    return res.json({
      success: false,
      status: 'not_found',
      message: 'Mã xác thực không hợp lệ hoặc đã hết hạn'
    });
  } catch (error) {
    log(`Lỗi khi kiểm tra trạng thái xác thực: ${error.message}`, 'error');
    return res.status(500).json({
      success: false,
      status: 'error',
      message: 'Lỗi server: ' + error.message
    });
  }
});

// Endpoint API để kiểm tra trạng thái xác thực
router.get('/auth/check', (req, res) => {
  // Kiểm tra xem người dùng đã đăng nhập chưa
  if (req.session && req.session.isLoggedIn) {
    return res.json({
      success: true,
      user: req.session.user
    });
  }
  
  return res.json({
    success: false,
    message: 'Chưa đăng nhập'
  });
});

// API endpoint để hoàn tất xác thực Telegram
router.post('/auth/verify', async (req, res) => {
  try {
    const authCode = req.body.authCode;
    
    if (!authCode) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu mã xác thực'
      });
    }
    
    // Kiểm tra trạng thái đăng nhập hiện tại
    if (req.session && req.session.isLoggedIn) {
      return res.json({
        success: true,
        user: req.session.user,
        message: 'Đã đăng nhập'
      });
    }
    
    // Xác minh yêu cầu xác thực từ Telegram
    const user = await telegramService.verifyAuthRequest(authCode);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Mã xác thực không hợp lệ hoặc đã hết hạn'
      });
    }
    
    // Thiết lập session
    req.session.isLoggedIn = true;
    req.session.user = user;
    
    // Đảm bảo session được lưu
    req.session.save(err => {
      if (err) {
        log(`Lỗi khi lưu session: ${err.message}`, 'error');
      }
      
      log(`Người dùng đã đăng nhập thành công qua xác thực Telegram: ${user.username}`, 'info');
      
      // Trả về kết quả
      return res.json({
        success: true,
        user: user,
        message: 'Đăng nhập thành công'
      });
    });
  } catch (error) {
    log(`Lỗi khi xác thực: ${error.message}`, 'error');
    return res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
});

// Endpoint reset bot khi có lỗi
router.post('/admin/reset-bot', async (req, res) => {
  try {
    // Kiểm tra quyền admin
    if (!req.session || !req.session.user || !req.session.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thực hiện hành động này'
      });
    }
    
    // Dừng bot hiện tại và reset trạng thái
    await telegramService.stopBot();
    telegramService.resetBotStatus();
    
    log('Bot Telegram đã được reset theo yêu cầu của admin', 'info');
    
    return res.json({
      success: true,
      message: 'Đã reset bot Telegram thành công'
    });
  } catch (error) {
    log(`Lỗi khi reset bot: ${error.message}`, 'error');
    return res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
});

// ===== ROUTES CHO FILE =====

// Lấy danh sách file
router.get('/files', async (req, res) => {
  try {
    const { showDeleted, sortBy, sortOrder, fileType, searchTerm } = req.query;
    
    const options = {
      showDeleted: showDeleted === 'true',
      sortBy: sortBy || 'uploadDate',
      sortOrder: sortOrder || 'desc',
      fileType,
      searchTerm
    };
    
    const files = fileService.getFiles(options);
    
    return res.json({
      success: true,
      files
    });
  } catch (error) {
    log(`Lỗi khi lấy danh sách file: ${error.message}`, 'error');
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi khi lấy danh sách file'
    });
  }
});

// Upload file mới
router.post('/files/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Không có file nào được tải lên'
      });
    }
    
    const filePath = req.file.path;
    const caption = req.body.caption || '';
    
    const result = await fileService.uploadFile(filePath, caption);
    
    return res.json({
      success: true,
      file: result
    });
  } catch (error) {
    log(`Lỗi khi tải file lên: ${error.message}`, 'error');
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi khi tải file lên'
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

// Đồng bộ file từ Telegram
router.post('/files/sync', async (req, res) => {
  try {
    log('Đã nhận yêu cầu đồng bộ file từ Telegram', 'info');
    
    // Kiểm tra xem người dùng đã đăng nhập chưa
    if (!req.session.isLoggedIn) {
      return res.status(401).json({
        success: false,
        message: 'Bạn cần đăng nhập để thực hiện hành động này'
      });
    }
    
    // Gọi hàm đồng bộ từ telegramService
    const result = await telegramService.syncFilesFromTelegram();
    
    return res.json({
      success: true,
      message: 'Đồng bộ file từ Telegram thành công',
      added: result.added,
      updated: result.updated,
      unchanged: result.unchanged
    });
  } catch (error) {
    log(`Lỗi khi đồng bộ file từ Telegram: ${error.message}`, 'error');
    return res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi đồng bộ file từ Telegram'
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
    const { name, parentFolder } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Tên thư mục không được để trống'
      });
    }
    
    const result = fileService.createFolder(name, parentFolder);
    
    return res.json({
      success: true,
      folder: result
    });
  } catch (error) {
    log(`Lỗi khi tạo thư mục: ${error.message}`, 'error');
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi khi tạo thư mục'
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
    const trashFiles = fileService.getTrashFiles();
    
    return res.json({
      success: true,
      files: trashFiles
    });
  } catch (error) {
    log(`Lỗi khi lấy danh sách file trong thùng rác: ${error.message}`, 'error');
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi khi lấy danh sách file trong thùng rác'
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
    const result = await telegramService.syncFilesFromTelegram();
    
    return res.json({
      success: true,
      result
    });
  } catch (error) {
    log(`Lỗi khi đồng bộ file: ${error.message}`, 'error');
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi khi đồng bộ file'
    });
  }
});

module.exports = router; 