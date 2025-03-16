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
  authMiddleware.authenticate(req, res, next);
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

// Route đăng nhập bằng Telegram
router.get('/auth/telegram', async (req, res) => {
  try {
    // Kiểm tra xem bot token đã được cấu hình chưa
    const botToken = config.TELEGRAM_BOT_TOKEN;
    console.log('=== Xử lý đăng nhập Telegram ===');
    console.log('Bot token có sẵn:', !!botToken);
    
    if (!botToken) {
      console.error('Chưa cấu hình TELEGRAM_BOT_TOKEN');
      return res.redirect('/login?error=' + encodeURIComponent('Lỗi cấu hình Telegram Bot, vui lòng kiểm tra TELEGRAM_BOT_TOKEN'));
    }
    
    // Nếu có dữ liệu callback từ Telegram
    if (req.query.id || req.query.auth_date || req.query.hash) {
      console.log('Nhận callback từ Telegram với ID:', req.query.id);
      
      // Xử lý dữ liệu xác thực từ callback
      const telegramData = {
        id: req.query.id,
        first_name: req.query.first_name,
        last_name: req.query.last_name,
        username: req.query.username,
        photo_url: req.query.photo_url,
        auth_date: req.query.auth_date,
        hash: req.query.hash
      };
      
      // Kiểm tra xem có đủ thông tin cần thiết không
      if (!telegramData.id || !telegramData.auth_date || !telegramData.hash) {
        console.error('Thiếu thông tin xác thực từ Telegram:', { 
          providedData: Object.keys(req.query) 
        });
        return res.redirect('/login?error=' + encodeURIComponent('Thiếu thông tin xác thực từ Telegram, vui lòng thử lại'));
      }
      
      // Tạo secret key từ token của bot theo đúng chuẩn Telegram
      // secret_key = SHA256(bot_token)
      const secretKey = crypto.createHash('sha256').update(botToken).digest();
      
      // Kiểm tra xem thời gian xác thực có quá cũ không (> 1 giờ)
      const authTime = parseInt(telegramData.auth_date);
      const currentTime = Math.floor(Date.now() / 1000);
      if (currentTime - authTime > 3600) {
        console.error('Xác thực Telegram hết hạn:', { 
          authTime, 
          currentTime, 
          diff: currentTime - authTime 
        });
        return res.redirect('/login?error=' + encodeURIComponent('Xác thực đã hết hạn, vui lòng thử lại'));
      }
      
      // Tạo data string để kiểm tra hash
      // Loại bỏ hash từ object và sắp xếp theo key
      const { hash, ...checkData } = telegramData;
      const dataCheckString = Object.keys(checkData)
        .sort()
        .map(key => `${key}=${checkData[key]}`)
        .join('\n');
      
      // Tính hash HMAC để so sánh
      const calculatedHash = crypto.createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');
      
      // Nếu hash không khớp, từ chối yêu cầu
      if (hash !== calculatedHash) {
        console.error('Hash Telegram không khớp', { 
          expected: calculatedHash, 
          received: hash 
        });
        return res.redirect('/login?error=' + encodeURIComponent('Dữ liệu xác thực không hợp lệ, vui lòng thử lại'));
      }
      
      // Tạo session và lưu thông tin người dùng Telegram
      req.session.authenticated = true;
      req.session.isLoggedIn = true;
      req.session.telegramUser = {
        id: telegramData.id,
        username: telegramData.username || `user_${telegramData.id}`,
        firstName: telegramData.first_name,
        lastName: telegramData.last_name,
        photoUrl: telegramData.photo_url
      };
      
      console.log(`Người dùng Telegram đăng nhập thành công: ${telegramData.username || telegramData.id}`);
      
      // Chuyển hướng người dùng đến dashboard
      return res.redirect('/dashboard');
    } else {
      console.log('Tạo URL đăng nhập Telegram');
      
      // Lấy thông tin tổng quan cấu hình
      console.log('Cấu hình BASE_URL:', config.BASE_URL);
      console.log('PORT:', config.PORT);
      console.log('Host hiện tại:', req.get('host'));
      console.log('Origin hiện tại:', req.protocol + '://' + req.get('host'));
      
      // Không có dữ liệu callback - tạo URL đăng nhập Telegram
      // Lấy thông tin bot
      const botInfo = await telegramService.verifyBotToken();
      console.log('Kết quả xác thực bot token:', botInfo);
      
      if (!botInfo.success) {
        console.error('Không thể lấy thông tin bot:', botInfo.error);
        return res.redirect('/login?error=' + encodeURIComponent('Không thể kết nối đến Telegram Bot API. Vui lòng thử lại sau.'));
      }
      
      // Lấy thông tin từ config và request
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const botUsername = botInfo.botInfo.username;
      
      if (!botUsername) {
        console.error('Không tìm thấy tên người dùng bot');
        return res.redirect('/login?error=' + encodeURIComponent('Lỗi cấu hình Telegram Bot, vui lòng liên hệ quản trị viên'));
      }
      
      // Lấy bot id (số) từ token
      const botId = botToken.split(':')[0];
      console.log('Bot ID từ token:', botId);
      
      // Tạo URL đăng nhập Telegram với bot_id là số ID từ token
      const callbackUrl = `${baseUrl}/api/auth/telegram`;
      const telegramAuthUrl = `https://oauth.telegram.org/auth?bot_id=${botId}&origin=${encodeURIComponent(baseUrl)}&return_to=${encodeURIComponent(callbackUrl)}`;
      
      console.log('Đã tạo URL đăng nhập Telegram:', telegramAuthUrl);
      
      // Chuyển hướng đến trang xác thực Telegram
      return res.redirect(telegramAuthUrl);
    }
  } catch (error) {
    console.error('Lỗi khi xác thực Telegram:', error);
    res.redirect('/login?error=' + encodeURIComponent('Lỗi server khi xác thực Telegram: ' + error.message));
  }
});

// Route callback cho Telegram Login Widget
router.get('/auth/telegram-callback', async (req, res) => {
  try {
    console.log('=== Xử lý callback từ Telegram Widget ===');
    console.log('Dữ liệu nhận được:', req.query);
    
    const telegramData = {
      id: req.query.id,
      first_name: req.query.first_name,
      last_name: req.query.last_name,
      username: req.query.username,
      photo_url: req.query.photo_url,
      auth_date: req.query.auth_date,
      hash: req.query.hash
    };
    
    // Kiểm tra xem có đủ thông tin cần thiết không
    if (!telegramData.id || !telegramData.auth_date || !telegramData.hash) {
      console.error('Thiếu thông tin xác thực từ Telegram Widget:', { 
        providedData: Object.keys(req.query) 
      });
      return res.status(400).json({
        success: false,
        error: 'Thiếu thông tin xác thực từ Telegram'
      });
    }
    
    // Lấy bot token từ config
    const botToken = config.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      console.error('Chưa cấu hình TELEGRAM_BOT_TOKEN');
      return res.status(500).json({
        success: false,
        error: 'Lỗi cấu hình Telegram Bot'
      });
    }
    
    // Tạo secret key từ token của bot theo đúng chuẩn Telegram
    // secret_key = SHA256(bot_token)
    const secretKey = crypto.createHash('sha256').update(botToken).digest();
    
    // Kiểm tra xem thời gian xác thực có quá cũ không (> 1 giờ)
    const authTime = parseInt(telegramData.auth_date);
    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime - authTime > 3600) {
      console.error('Xác thực Telegram Widget hết hạn:', { 
        authTime, 
        currentTime, 
        diff: currentTime - authTime 
      });
      return res.status(401).json({
        success: false,
        error: 'Xác thực đã hết hạn'
      });
    }
    
    // Tạo data string để kiểm tra hash
    // Loại bỏ hash từ object và sắp xếp theo key
    const { hash, ...checkData } = telegramData;
    const dataCheckString = Object.keys(checkData)
      .sort()
      .map(key => `${key}=${checkData[key]}`)
      .join('\n');
    
    // Tính hash HMAC để so sánh
    const calculatedHash = crypto.createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');
    
    // Nếu hash không khớp, từ chối yêu cầu
    if (hash !== calculatedHash) {
      console.error('Hash Telegram Widget không khớp', { 
        expected: calculatedHash, 
        received: hash 
      });
      return res.status(401).json({
        success: false,
        error: 'Dữ liệu xác thực không hợp lệ'
      });
    }
    
    // Tạo session và lưu thông tin người dùng Telegram
    req.session.authenticated = true;
    req.session.isLoggedIn = true;
    req.session.telegramUser = {
      id: telegramData.id,
      username: telegramData.username || `user_${telegramData.id}`,
      firstName: telegramData.first_name,
      lastName: telegramData.last_name,
      photoUrl: telegramData.photo_url
    };
    
    console.log(`Người dùng Telegram đăng nhập thành công qua Widget: ${telegramData.username || telegramData.id}`);
    
    // Trả về kết quả thành công
    return res.json({
      success: true,
      user: req.session.telegramUser,
      message: 'Đăng nhập thành công'
    });
  } catch (error) {
    console.error('Lỗi khi xử lý callback từ Telegram Widget:', error);
    return res.status(500).json({
      success: false,
      error: 'Lỗi server: ' + error.message
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