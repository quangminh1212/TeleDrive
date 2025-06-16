import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware } from '../middleware/auth.middleware';
import fileController from '../controllers/file.controller';

const router = express.Router();

// Cấu hình multer để upload file
const storage = multer.diskStorage({
  destination: (req: Express.Request, file: Express.Multer.File, cb: Function) => {
    cb(null, './uploads/');
  },
  filename: (req: Express.Request, file: Express.Multer.File, cb: Function) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 200, // Giới hạn 200MB
  },
});

// Áp dụng middleware xác thực cho tất cả routes
router.use(authMiddleware);

/**
 * @route POST /api/files/upload
 * @desc Tải file lên
 * @access Private
 */
router.post('/upload', upload.single('file'), fileController.uploadFile);

/**
 * @route POST /api/files/folders
 * @desc Tạo thư mục mới
 * @access Private
 */
router.post('/folders', fileController.createFolder);

/**
 * @route GET /api/files
 * @desc Lấy danh sách file và thư mục
 * @access Private
 */
router.get('/', fileController.listFiles);

/**
 * @route GET /api/files/:id/download
 * @desc Tải file xuống
 * @access Private
 */
router.get('/:id/download', fileController.downloadFile);

/**
 * @route PUT /api/files/:id/trash
 * @desc Di chuyển file vào thùng rác
 * @access Private
 */
router.put('/:id/trash', fileController.moveToTrash);

/**
 * @route PUT /api/files/:id/restore
 * @desc Khôi phục file từ thùng rác
 * @access Private
 */
router.put('/:id/restore', fileController.restoreFromTrash);

/**
 * @route DELETE /api/files/:id
 * @desc Xóa file vĩnh viễn
 * @access Private
 */
router.delete('/:id', fileController.deleteFile);

export default router; 