import { Router } from 'express';
import { 
  uploadFile, 
  downloadFile, 
  deleteFile, 
  renameFile, 
  getFiles, 
  getFileById, 
  shareFile,
  moveFile,
  copyFile
} from '../controllers/files';
import { authMiddleware } from '../middleware/auth';
import upload from '../middleware/upload';

const router = Router();

// File routes
router.get('/', authMiddleware, getFiles);
router.get('/:id', authMiddleware, getFileById);
router.post('/upload', authMiddleware, upload.single('file'), uploadFile);
router.get('/download/:id', authMiddleware, downloadFile);
router.delete('/:id', authMiddleware, deleteFile);
router.put('/:id/rename', authMiddleware, renameFile);
router.post('/:id/share', authMiddleware, shareFile);
router.put('/:id/move', authMiddleware, moveFile);
router.post('/:id/copy', authMiddleware, copyFile);

export default router; 