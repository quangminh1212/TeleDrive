const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const logger = require('../utils/logger');
const fileManager = require('../utils/fileManager');
const helpers = require('../utils/helpers');

// Khởi tạo Express app
const app = express();
const port = process.env.WEB_PORT || 3000;

// Thiết lập middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Thiết lập view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Cấu hình multer cho việc tải file lên
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const userId = req.params.userId;
    const currentPath = req.query.path || '/';
    const absolutePath = fileManager.getAbsolutePath(userId, currentPath);
    
    // Đảm bảo thư mục tồn tại
    if (!fs.existsSync(absolutePath)) {
      fs.mkdirSync(absolutePath, { recursive: true });
    }
    
    cb(null, absolutePath);
  },
  filename: function (req, file, cb) {
    // Giữ nguyên tên file gốc
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });

// Hàm helper để định dạng dung lượng file
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Hàm helper để định dạng ngày tháng
function formatDate(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Hàm lấy breadcrumbs từ đường dẫn
function getBreadcrumbs(currentPath) {
  const parts = currentPath.split('/').filter(Boolean);
  const breadcrumbs = [{ name: 'Home', path: '/' }];
  
  let currentBuildPath = '';
  for (const part of parts) {
    currentBuildPath += '/' + part;
    breadcrumbs.push({
      name: part,
      path: currentBuildPath
    });
  }
  
  return breadcrumbs;
}

// Endpoint trang chủ
app.get('/', (req, res) => {
  res.render('index', { title: 'TeleDrive - Telegram Cloud Storage Solution' });
});

// Endpoint đăng nhập
app.get('/login', (req, res) => {
  res.render('login', { title: 'Đăng nhập - TeleDrive' });
});

// Endpoint drive chính
app.get('/drive/:userId?', async (req, res) => {
  try {
    const userId = req.params.userId || 'guest';
    const currentPath = req.query.path || '/';
    
    // Lấy danh sách thư mục và file
    const absolutePath = fileManager.getAbsolutePath(userId, currentPath);
    
    // Kiểm tra thư mục tồn tại
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).render('error', {
        title: 'Lỗi 404',
        message: 'Thư mục không tồn tại'
      });
    }
    
    // Lấy breadcrumbs
    const breadcrumbs = getBreadcrumbs(currentPath);
    
    // Đọc nội dung thư mục
    const dirContent = fs.readdirSync(absolutePath);
    const folders = [];
    const files = [];
    
    for (const item of dirContent) {
      const itemPath = path.join(absolutePath, item);
      const stats = fs.statSync(itemPath);
      const relativePath = path.join(currentPath, item).replace(/\\/g, '/');
      
      if (stats.isDirectory()) {
        folders.push({
          name: item,
          relativePath: relativePath,
          modified: stats.mtime
        });
      } else {
        files.push({
          name: item,
          relativePath: relativePath,
          size: stats.size,
          modified: stats.mtime
        });
      }
    }
    
    // Sắp xếp: thư mục trước, file sau
    folders.sort((a, b) => a.name.localeCompare(b.name));
    files.sort((a, b) => a.name.localeCompare(b.name));
    
    res.render('drive', {
      title: 'TeleDrive - My Files',
      userId,
      currentPath,
      breadcrumbs,
      folders,
      files,
      formatSize: formatFileSize,
      formatDate
    });
  } catch (error) {
    logger.error(`Error loading drive: ${error.message}`);
    res.status(500).render('error', {
      title: 'Lỗi 500',
      message: 'Đã xảy ra lỗi khi tải dữ liệu.'
    });
  }
});

// API endpoint để lấy danh sách file
app.get('/api/files/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const currentPath = req.query.path || '/';
    const absolutePath = fileManager.getAbsolutePath(userId, currentPath);
    
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ success: false, error: 'Thư mục không tồn tại' });
    }
    
    const dirContent = fs.readdirSync(absolutePath);
    const items = [];
    
    for (const item of dirContent) {
      const itemPath = path.join(absolutePath, item);
      const stats = fs.statSync(itemPath);
      const relativePath = path.join(currentPath, item).replace(/\\/g, '/');
      
      items.push({
        name: item,
        path: relativePath,
        isDirectory: stats.isDirectory(),
        size: stats.size,
        modified: stats.mtime
      });
    }
    
    items.sort((a, b) => {
      // Thư mục trước
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      
      // Sau đó sắp xếp theo tên
      return a.name.localeCompare(b.name);
    });
    
    res.json({ success: true, items });
  } catch (error) {
    logger.error(`Error listing files: ${error.message}`);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// API endpoint để tạo thư mục mới
app.post('/api/folders/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const currentPath = req.query.path || '/';
    const { folderName } = req.body;
    
    if (!folderName) {
      return res.status(400).json({ success: false, error: 'Tên thư mục không được để trống' });
    }
    
    const absolutePath = fileManager.getAbsolutePath(userId, currentPath);
    const newFolderPath = path.join(absolutePath, folderName);
    
    if (fs.existsSync(newFolderPath)) {
      return res.status(400).json({ success: false, error: 'Thư mục đã tồn tại' });
    }
    
    fs.mkdirSync(newFolderPath);
    
    res.json({ success: true, message: 'Tạo thư mục thành công' });
  } catch (error) {
    logger.error(`Error creating folder: ${error.message}`);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// API endpoint để tải file lên
app.post('/api/upload/:userId', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Không có file nào được tải lên' });
    }
    
    res.json({
      success: true,
      message: 'Tải file lên thành công',
      file: {
        name: req.file.originalname,
        size: req.file.size
      }
    });
  } catch (error) {
    logger.error(`Error uploading file: ${error.message}`);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// API endpoint để tải file xuống
app.get('/api/download/:userId', (req, res) => {
  try {
    const userId = req.params.userId;
    const filePath = req.query.path;
    
    if (!filePath) {
      return res.status(400).json({ success: false, error: 'Đường dẫn file không hợp lệ' });
    }
    
    const absolutePath = fileManager.getAbsolutePath(userId, filePath);
    
    if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
      return res.status(404).json({ success: false, error: 'File không tồn tại' });
    }
    
    const fileName = path.basename(absolutePath);
    
    res.download(absolutePath, fileName, (err) => {
      if (err) {
        logger.error(`Error downloading file: ${err.message}`);
        res.status(500).json({ success: false, error: 'Lỗi khi tải file xuống' });
      }
    });
  } catch (error) {
    logger.error(`Error preparing download: ${error.message}`);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// API endpoint để xóa item (file hoặc thư mục)
app.delete('/api/items/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const { path: itemPath } = req.body;
    
    if (!itemPath) {
      return res.status(400).json({ success: false, error: 'Đường dẫn không hợp lệ' });
    }
    
    const absolutePath = fileManager.getAbsolutePath(userId, itemPath);
    
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ success: false, error: 'Item không tồn tại' });
    }
    
    const stats = fs.statSync(absolutePath);
    
    if (stats.isDirectory()) {
      // Xóa thư mục và tất cả nội dung bên trong
      fs.rmdirSync(absolutePath, { recursive: true });
    } else {
      // Xóa file
      fs.unlinkSync(absolutePath);
    }
    
    res.json({ success: true, message: 'Xóa thành công' });
  } catch (error) {
    logger.error(`Error deleting item: ${error.message}`);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// API endpoint để đổi tên item
app.put('/api/items/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const { oldPath, newName } = req.body;
    
    if (!oldPath || !newName) {
      return res.status(400).json({ success: false, error: 'Thông tin không đầy đủ' });
    }
    
    const absolutePath = fileManager.getAbsolutePath(userId, oldPath);
    
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ success: false, error: 'Item không tồn tại' });
    }
    
    const directory = path.dirname(absolutePath);
    const newAbsolutePath = path.join(directory, newName);
    
    if (fs.existsSync(newAbsolutePath)) {
      return res.status(400).json({ success: false, error: 'Đã tồn tại item với tên này' });
    }
    
    fs.renameSync(absolutePath, newAbsolutePath);
    
    res.json({ success: true, message: 'Đổi tên thành công' });
  } catch (error) {
    logger.error(`Error renaming item: ${error.message}`);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// API endpoint tìm kiếm
app.get('/api/search/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const searchTerm = req.query.q;
    
    if (!searchTerm) {
      return res.status(400).json({ success: false, error: 'Từ khóa tìm kiếm không được để trống' });
    }
    
    // Tìm kiếm file và thư mục
    const results = await fileManager.searchFilesByName(userId, searchTerm);
    
    res.json({ success: true, results });
  } catch (error) {
    logger.error(`Error searching: ${error.message}`);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Trang tìm kiếm
app.get('/drive/:userId/search', async (req, res) => {
  try {
    const userId = req.params.userId;
    const searchTerm = req.query.q;
    
    if (!searchTerm) {
      return res.redirect(`/drive/${userId}`);
    }
    
    // Tìm kiếm file và thư mục
    const results = await fileManager.searchFilesByName(userId, searchTerm);
    
    // Phân loại kết quả
    const folders = [];
    const files = [];
    
    results.forEach(item => {
      if (item.isDirectory) {
        folders.push(item);
      } else {
        files.push(item);
      }
    });
    
    res.render('search', {
      title: `Kết quả tìm kiếm: ${searchTerm}`,
      userId,
      searchTerm,
      folders,
      files,
      formatSize: formatFileSize,
      formatDate
    });
  } catch (error) {
    logger.error(`Error handling search: ${error.message}`);
    res.status(500).render('error', {
      title: 'Lỗi 500',
      message: 'Đã xảy ra lỗi khi tìm kiếm.'
    });
  }
});

// Cập nhật fileManager.js để thêm các hàm mới
fileManager.getAbsolutePath = function(userId, relativePath) {
  const basePath = path.join(process.cwd(), 'storage', userId);
  
  // Đảm bảo thư mục người dùng tồn tại
  if (!fs.existsSync(basePath)) {
    fs.mkdirSync(basePath, { recursive: true });
  }
  
  // Nếu là đường dẫn root
  if (!relativePath || relativePath === '/') {
    return basePath;
  }
  
  // Chuẩn hóa đường dẫn: loại bỏ dấu '/' đầu tiên nếu có
  let normalizedPath = relativePath;
  if (normalizedPath.startsWith('/')) {
    normalizedPath = normalizedPath.substring(1);
  }
  
  return path.join(basePath, normalizedPath);
};

fileManager.searchFilesByName = async function(userId, keyword) {
  const basePath = path.join(process.cwd(), 'storage', userId);
  const results = [];
  
  if (!fs.existsSync(basePath)) {
    return results;
  }
  
  async function searchRecursively(dir, basePath) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stats = fs.statSync(itemPath);
      const relativePath = path.relative(basePath, itemPath).replace(/\\/g, '/');
      
      // Kiểm tra nếu tên file/thư mục chứa từ khóa
      if (item.toLowerCase().includes(keyword.toLowerCase())) {
        results.push({
          name: item,
          relativePath: relativePath,
          isDirectory: stats.isDirectory(),
          size: stats.size,
          modified: stats.mtime
        });
      }
      
      // Nếu là thư mục, tiếp tục tìm kiếm đệ quy bên trong
      if (stats.isDirectory()) {
        await searchRecursively(itemPath, basePath);
      }
    }
  }
  
  await searchRecursively(basePath, basePath);
  return results;
};

// Khởi động server
function startServer() {
  app.listen(port, () => {
    logger.info(`TeleDrive Web Interface is running on http://localhost:${port}`);
  });
}

module.exports = {
  startServer
}; 