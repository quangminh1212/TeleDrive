import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import fileService from '../services/file.service';

class FileController {
  /**
   * Tải file lên
   * @route POST /api/files/upload
   */
  async uploadFile(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: 'Không có file nào được tải lên' 
        });
      }
      
      const userId = (req as any).user.id;
      const { parentId, isPublic } = req.body;

      const file = await fileService.uploadFile(userId, {
        file: req.file,
        parentId,
        isPublic: isPublic === 'true',
      });

      return res.status(201).json({ 
        success: true, 
        data: file, 
        message: 'Tải file lên thành công' 
      });
    } catch (error) {
      return res.status(500).json({ 
        success: false, 
        message: (error as Error).message 
      });
    }
  }

  /**
   * Tải file xuống
   * @route GET /api/files/:id/download
   */
  async downloadFile(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const fileId = req.params.id;

      const fileData = await fileService.downloadFile(fileId, userId);

      // Trả về file cho client
      res.setHeader('Content-Disposition', `attachment; filename="${fileData.fileName}"`);
      res.setHeader('Content-Type', fileData.mimeType);

      // Đọc file từ đường dẫn tạm và pipe đến response
      const fileStream = fs.createReadStream(fileData.filePath);
      fileStream.pipe(res);

      // Xóa file tạm sau khi hoàn tất
      fileStream.on('end', () => {
        fs.unlinkSync(fileData.filePath);
      });
    } catch (error) {
      return res.status(500).json({ 
        success: false, 
        message: (error as Error).message 
      });
    }
  }

  /**
   * Tạo thư mục mới
   * @route POST /api/files/folders
   */
  async createFolder(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { name, parentId } = req.body;

      if (!name) {
        return res.status(400).json({ 
          success: false, 
          message: 'Tên thư mục là bắt buộc' 
        });
      }

      const folder = await fileService.createFolder(userId, { name, parentId });

      return res.status(201).json({ 
        success: true, 
        data: folder, 
        message: 'Tạo thư mục thành công' 
      });
    } catch (error) {
      return res.status(500).json({ 
        success: false, 
        message: (error as Error).message 
      });
    }
  }

  /**
   * Liệt kê file và thư mục
   * @route GET /api/files
   */
  async listFiles(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { 
        parentId, 
        trash = 'false', 
        starred = 'false', 
        search, 
        sortBy = 'createdAt', 
        sortOrder = 'desc',
        page = '1',
        limit = '20'
      } = req.query;

      const result = await fileService.listFiles(userId, {
        parentId: parentId as string,
        isTrash: trash === 'true',
        isStarred: starred === 'true',
        search: search as string,
        sortBy: sortBy as string,
        sortOrder: (sortOrder as 'asc' | 'desc'),
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      });

      return res.status(200).json({ 
        success: true, 
        data: result, 
        message: 'Lấy danh sách file thành công' 
      });
    } catch (error) {
      return res.status(500).json({ 
        success: false, 
        message: (error as Error).message 
      });
    }
  }

  /**
   * Di chuyển file vào thùng rác
   * @route PUT /api/files/:id/trash
   */
  async moveToTrash(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const fileId = req.params.id;

      const file = await fileService.moveToTrash(userId, fileId);

      return res.status(200).json({ 
        success: true, 
        data: file, 
        message: 'Di chuyển vào thùng rác thành công' 
      });
    } catch (error) {
      return res.status(500).json({ 
        success: false, 
        message: (error as Error).message 
      });
    }
  }

  /**
   * Khôi phục file từ thùng rác
   * @route PUT /api/files/:id/restore
   */
  async restoreFromTrash(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const fileId = req.params.id;

      const file = await fileService.restoreFromTrash(userId, fileId);

      return res.status(200).json({ 
        success: true, 
        data: file, 
        message: 'Khôi phục từ thùng rác thành công' 
      });
    } catch (error) {
      return res.status(500).json({ 
        success: false, 
        message: (error as Error).message 
      });
    }
  }

  /**
   * Xóa file vĩnh viễn
   * @route DELETE /api/files/:id
   */
  async deleteFile(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const fileId = req.params.id;

      await fileService.deleteFile(userId, fileId);

      return res.status(200).json({ 
        success: true, 
        message: 'Xóa file thành công' 
      });
    } catch (error) {
      return res.status(500).json({ 
        success: false, 
        message: (error as Error).message 
      });
    }
  }
}

export default new FileController(); 