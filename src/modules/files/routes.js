const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { config } = require('../common/config');
const fileService = require('./file-service');
const { isAuthenticated } = require('../auth/middleware');
const router = express.Router();

// Set up multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure temp directory exists
    if (!fs.existsSync(config.paths.temp)) {
      fs.mkdirSync(config.paths.temp, { recursive: true });
    }
    cb(null, config.paths.temp);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// Create multer upload instance
const upload = multer({
  storage,
  limits: {
    fileSize: config.file.maxSize,
  },
  fileFilter: (req, file, cb) => {
    // Accept all file types for now
    cb(null, true);
  }
});

/**
 * @route GET /files
 * @desc List user files
 */
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const options = {
      page: parseInt(req.query.page, 10) || 1,
      limit: parseInt(req.query.limit, 10) || 10,
      sortBy: req.query.sortBy || 'createdAt',
      sortOrder: req.query.sortOrder || 'desc',
      search: req.query.search || '',
      tag: req.query.tag || '',
      deleted: req.query.trash === 'true',
    };
    
    const result = await fileService.listFiles(req.user, options);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route POST /files/upload
 * @desc Upload a new file
 */
router.post('/upload', isAuthenticated, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Không có file nào được tải lên' });
    }
    
    const file = await fileService.uploadFile(req.file, req.user);
    
    res.status(201).json(file);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /files/:id
 * @desc Get file details
 */
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const file = await fileService.getFileInfo(req.params.id, req.user);
    
    res.json(file);
  } catch (error) {
    if (error.message.includes('không tồn tại') || error.message.includes('không có quyền')) {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /files/:id/download
 * @desc Download a file
 */
router.get('/:id/download', isAuthenticated, async (req, res) => {
  try {
    const filePath = await fileService.downloadFile(req.params.id, req.user);
    
    res.download(filePath);
  } catch (error) {
    if (error.message.includes('không tồn tại') || error.message.includes('không có quyền')) {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route DELETE /files/:id
 * @desc Delete a file (move to trash)
 */
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const permanent = req.query.permanent === 'true';
    const file = await fileService.deleteFile(req.params.id, req.user, permanent);
    
    res.json({ message: permanent ? 'File đã bị xóa vĩnh viễn' : 'File đã được chuyển vào thùng rác' });
  } catch (error) {
    if (error.message.includes('không tồn tại') || error.message.includes('không có quyền')) {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route POST /files/:id/restore
 * @desc Restore a file from trash
 */
router.post('/:id/restore', isAuthenticated, async (req, res) => {
  try {
    const file = await fileService.restoreFile(req.params.id, req.user);
    
    res.json({ message: 'File đã được khôi phục' });
  } catch (error) {
    if (error.message.includes('không tồn tại') || error.message.includes('không có quyền')) {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route POST /files/:id/share
 * @desc Share a file
 */
router.post('/:id/share', isAuthenticated, async (req, res) => {
  try {
    const expiresInHours = parseInt(req.body.expiresInHours, 10) || 24;
    const file = await fileService.shareFile(req.params.id, req.user, expiresInHours);
    
    res.json({
      message: 'File đã được chia sẻ',
      shareLink: `${req.protocol}://${req.get('host')}/share/${file.shareLink}`,
      expiresAt: file.shareExpiresAt,
    });
  } catch (error) {
    if (error.message.includes('không tồn tại') || error.message.includes('không có quyền')) {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route PATCH /files/:id
 * @desc Update file metadata
 */
router.patch('/:id', isAuthenticated, async (req, res) => {
  try {
    const metadata = {
      name: req.body.name,
      description: req.body.description,
      isPublic: req.body.isPublic,
      tags: req.body.tags,
    };
    
    const file = await fileService.updateFileMetadata(req.params.id, req.user, metadata);
    
    res.json(file);
  } catch (error) {
    if (error.message.includes('không tồn tại') || error.message.includes('không có quyền')) {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /files/share/:token
 * @desc Access a shared file
 */
router.get('/share/:token', async (req, res) => {
  try {
    const file = await fileService.getFileByShareLink(req.params.token);
    
    // For API access
    if (req.query.download === 'true') {
      const tempUser = {
        _id: 'share_' + req.params.token,
        firstName: 'Guest',
        telegramId: 'share_' + req.params.token,
      };
      
      const filePath = await fileService.downloadFile(file._id, tempUser);
      
      return res.download(filePath);
    }
    
    // For web interface
    res.json(file);
  } catch (error) {
    if (error.message.includes('không hợp lệ') || error.message.includes('hết hạn')) {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
