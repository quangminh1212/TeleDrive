import { Router } from 'express';
import { 
  createFolder, 
  deleteFolder, 
  renameFolder, 
  getFolders, 
  getFolderById,
  getFolderContents,
  shareFolder,
  moveFolder
} from '../controllers/folders';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Folder routes
router.get('/', authMiddleware, getFolders);
router.get('/:id', authMiddleware, getFolderById);
router.get('/:id/contents', authMiddleware, getFolderContents);
router.post('/', authMiddleware, createFolder);
router.delete('/:id', authMiddleware, deleteFolder);
router.put('/:id/rename', authMiddleware, renameFolder);
router.post('/:id/share', authMiddleware, shareFolder);
router.put('/:id/move', authMiddleware, moveFolder);

export default router; 