const express = require('express');
const path = require('path');
const fileManager = require('../utils/fileManager');
const fs = require('fs-extra');
const multer = require('multer');
const mime = require('mime-types');
const logger = require('../utils/logger');
const { formatSize, formatDate } = require('../utils/helpers');

// Khởi tạo Express app
const app = express();
const PORT = process.env.WEB_PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Cấu hình multer để upload file
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.params.userId || '000000000'; // ID mặc định nếu không có
    const currentPath = fileManager.getCurrentPath(userId);
    const { fullPath } = fileManager.getAbsolutePath(userId);
    fs.ensureDirSync(fullPath);
    cb(null, fullPath);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage });

// Routes

// Trang chủ
app.get('/', (req, res) => {
  res.render('index', {
    title: 'TeleDrive - Home'
  });
});

// Đăng nhập/Đăng ký
app.get('/login', (req, res) => {
  res.render('login', {
    title: 'TeleDrive - Login'
  });
});

// Trang Dashboard
app.get('/drive/:userId?', (req, res) => {
  const userId = req.params.userId || '000000000'; // ID mặc định nếu không có
  const path = req.query.path || '/';
  
  try {
    // Đảm bảo thư mục người dùng tồn tại
    fileManager.ensureUserDirectory(userId);
    
    // Thiết lập đường dẫn hiện tại
    if (path !== fileManager.getCurrentPath(userId)) {
      fileManager.changeDirectory(userId, path);
    }
    
    // Lấy danh sách file/thư mục
    const result = fileManager.listDirectory(userId);
    
    if (!result.success) {
      return res.status(404).render('error', {
        title: 'Error',
        error: result.error
      });
    }
    
    // Phân loại items
    const folders = result.contents.filter(item => item.isDirectory);
    const files = result.contents.filter(item => !item.isDirectory);
    
    // Sắp xếp theo tên
    folders.sort((a, b) => a.name.localeCompare(b.name));
    files.sort((a, b) => a.name.localeCompare(b.name));
    
    // Tạo breadcrumb
    const breadcrumbs = [];
    if (path !== '/') {
      const parts = path.split('/').filter(Boolean);
      let currentPath = '';
      
      // Thêm Home
      breadcrumbs.push({ name: 'Home', path: '/' });
      
      // Thêm các thư mục con
      parts.forEach(part => {
        currentPath += '/' + part;
        breadcrumbs.push({ name: part, path: currentPath });
      });
    } else {
      breadcrumbs.push({ name: 'Home', path: '/' });
    }
    
    res.render('drive', {
      title: 'TeleDrive - My Drive',
      userId,
      currentPath: path,
      breadcrumbs,
      folders,
      files,
      formatSize,
      formatDate
    });
  } catch (error) {
    logger.error(`Web error: ${error.message}`);
    res.status(500).render('error', {
      title: 'Error',
      error: 'Internal server error'
    });
  }
});

// API Endpoints

// Lấy danh sách file
app.get('/api/files/:userId', (req, res) => {
  const userId = req.params.userId;
  const path = req.query.path || '/';
  
  try {
    // Đảm bảo thư mục người dùng tồn tại
    fileManager.ensureUserDirectory(userId);
    
    // Thiết lập đường dẫn hiện tại nếu cần
    if (path !== fileManager.getCurrentPath(userId)) {
      fileManager.changeDirectory(userId, path);
    }
    
    // Lấy danh sách file/thư mục
    const result = fileManager.listDirectory(userId);
    
    if (!result.success) {
      return res.status(404).json({ success: false, error: result.error });
    }
    
    return res.json({
      success: true,
      path: result.path,
      contents: result.contents.map(item => ({
        ...item,
        sizeFormatted: formatSize(item.size),
        modifiedFormatted: formatDate(item.modified)
      }))
    });
  } catch (error) {
    logger.error(`API error: ${error.message}`);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Tạo thư mục mới
app.post('/api/folders/:userId', (req, res) => {
  const userId = req.params.userId;
  const { folderName } = req.body;
  
  if (!folderName || folderName.trim() === '') {
    return res.status(400).json({ success: false, error: 'Folder name is required' });
  }
  
  try {
    const result = fileManager.createDirectory(userId, folderName);
    
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }
    
    return res.json({ success: true, path: result.path });
  } catch (error) {
    logger.error(`API error: ${error.message}`);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Upload file
app.post('/api/upload/:userId', upload.single('file'), (req, res) => {
  const userId = req.params.userId;
  const file = req.file;
  
  if (!file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }
  
  try {
    const filePath = file.path;
    const stats = fs.statSync(filePath);
    
    return res.json({
      success: true,
      file: {
        name: file.originalname,
        path: filePath,
        size: stats.size,
        sizeFormatted: formatSize(stats.size),
        mimeType: mime.lookup(filePath) || 'application/octet-stream'
      }
    });
  } catch (error) {
    logger.error(`API error: ${error.message}`);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Tải file
app.get('/api/download/:userId', (req, res) => {
  const userId = req.params.userId;
  const filePath = req.query.path;
  
  if (!filePath) {
    return res.status(400).json({ success: false, error: 'File path is required' });
  }
  
  try {
    const result = fileManager.getFileForSending(userId, filePath);
    
    if (!result.success) {
      return res.status(404).json({ success: false, error: result.error });
    }
    
    const mimeType = mime.lookup(result.path) || 'application/octet-stream';
    
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.name}"`);
    
    result.stream.pipe(res);
  } catch (error) {
    logger.error(`API error: ${error.message}`);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Xóa file hoặc thư mục
app.delete('/api/items/:userId', (req, res) => {
  const userId = req.params.userId;
  const { path } = req.body;
  
  if (!path) {
    return res.status(400).json({ success: false, error: 'Path is required' });
  }
  
  try {
    const result = fileManager.deleteItem(userId, path);
    
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }
    
    return res.json({ success: true, path: result.path });
  } catch (error) {
    logger.error(`API error: ${error.message}`);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Đổi tên file hoặc thư mục
app.put('/api/items/:userId', (req, res) => {
  const userId = req.params.userId;
  const { oldPath, newName } = req.body;
  
  if (!oldPath || !newName) {
    return res.status(400).json({ success: false, error: 'Old path and new name are required' });
  }
  
  try {
    const result = fileManager.renameItem(userId, oldPath, newName);
    
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }
    
    return res.json({ 
      success: true, 
      oldPath: result.oldPath,
      newPath: result.newPath
    });
  } catch (error) {
    logger.error(`API error: ${error.message}`);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Tìm kiếm file hoặc thư mục
app.get('/api/search/:userId', (req, res) => {
  const userId = req.params.userId;
  const query = req.query.q;
  
  if (!query || query.trim() === '') {
    return res.status(400).json({ success: false, error: 'Search query is required' });
  }
  
  try {
    const result = fileManager.searchItems(userId, query);
    
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }
    
    return res.json({
      success: true,
      query: result.searchTerm,
      results: result.results.map(item => ({
        ...item,
        sizeFormatted: formatSize(item.size),
        modifiedFormatted: formatDate(item.modified)
      }))
    });
  } catch (error) {
    logger.error(`API error: ${error.message}`);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Khởi động server
function startWebServer() {
  app.listen(PORT, () => {
    logger.info(`Web Server đang chạy tại địa chỉ http://localhost:${PORT}`);
  });
}

module.exports = { startWebServer }; 