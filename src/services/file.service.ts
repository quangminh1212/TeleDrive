import { Api } from 'telegram';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import os from 'os';
import File, { IFileDocument } from '../models/file.model';
import User, { IUserDocument } from '../models/user.model';
import config from '../config';
import { Buffer } from 'buffer';
import telegramService from './telegram.service';
import logger from '../utils/logger';
import { AppError } from '../utils/error-handler';
import { Express } from 'express';

// Định nghĩa interface cho file upload
interface IUploadFile {
  file: Express.Multer.File;
  parentId?: string;
  isPublic?: boolean;
}

class FileService {
  /**
   * Tải file lên Telegram
   */
  async uploadFile(userId: string, fileData: IUploadFile): Promise<IFileDocument> {
    // Kiểm tra người dùng
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('Không tìm thấy người dùng', 404);
    }

    // Kiểm tra thư mục cha nếu có
    if (fileData.parentId) {
      const parentFolder = await File.findOne({ 
        _id: fileData.parentId,
        owner: userId,
        isFolder: true,
      });
      
      if (!parentFolder) {
        throw new AppError('Thư mục cha không tồn tại', 404);
      }
    }

    try {
      // Upload file lên Telegram
      logger.info(`Đang tải file ${fileData.file.originalname} lên Telegram...`);
      const result = await telegramService.uploadFile(fileData.file.path);

      // Tạo record mới trong database
      const newFile = await File.create({
        name: fileData.file.originalname,
        originalName: fileData.file.originalname,
        mimeType: fileData.file.mimetype,
        size: fileData.file.size,
        path: fileData.file.path,
        telegramMessageId: result.messageId,
        telegramChatId: result.chatId,
        owner: userId,
        parent: fileData.parentId || null,
        isFolder: false,
        accessControl: {
          isPublic: fileData.isPublic || false,
          allowedUsers: [],
        },
      });

      // Cập nhật dung lượng đã sử dụng của người dùng
      user.storageUsed += fileData.file.size;
      await user.save();

      // Xóa file tạm sau khi đã upload lên Telegram
      if (fs.existsSync(fileData.file.path)) {
        fs.unlinkSync(fileData.file.path);
      }

      logger.info(`File ${newFile.name} đã được tải lên thành công, id: ${newFile._id}`);
      return newFile;
    } catch (error) {
      // Xóa file tạm nếu có lỗi
      if (fileData.file.path && fs.existsSync(fileData.file.path)) {
        fs.unlinkSync(fileData.file.path);
      }

      logger.error('Lỗi khi tải file lên', error);
      throw new AppError(`Không thể tải file lên: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Tải file xuống từ Telegram
   */
  async downloadFile(fileId: string, userId: string): Promise<{ filePath: string; fileName: string; mimeType: string }> {
    // Tìm file trong database
    const file = await File.findOne({ 
      _id: fileId,
      $or: [
        { owner: userId },
        { 'accessControl.isPublic': true },
        { 'accessControl.allowedUsers': userId }
      ]
    });

    if (!file) {
      throw new AppError('Không tìm thấy file hoặc bạn không có quyền truy cập', 404);
    }

    if (!file.telegramMessageId || !file.telegramChatId) {
      throw new AppError('Không tìm thấy thông tin file trên Telegram', 404);
    }

    try {
      // Tạo đường dẫn tạm để lưu file
      const tempFilePath = path.join(os.tmpdir(), `teledrive_${crypto.randomBytes(8).toString('hex')}_${file.originalName}`);
      
      // Tải file từ Telegram
      logger.info(`Đang tải file ${file.name} từ Telegram...`);
      await telegramService.downloadFile(file.telegramChatId, file.telegramMessageId, tempFilePath);
      
      return {
        filePath: tempFilePath,
        fileName: file.originalName,
        mimeType: file.mimeType,
      };
    } catch (error) {
      logger.error(`Lỗi khi tải file ${file.name} từ Telegram`, error);
      throw new AppError(`Không thể tải file: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Tạo thư mục mới
   */
  async createFolder(userId: string, folderData: {
    name: string;
    parentId?: string;
  }): Promise<IFileDocument> {
    // Kiểm tra người dùng
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('Không tìm thấy người dùng', 404);
    }

    // Kiểm tra thư mục cha nếu có
    if (folderData.parentId) {
      const parentFolder = await File.findOne({ 
        _id: folderData.parentId,
        owner: userId,
        isFolder: true,
      });
      
      if (!parentFolder) {
        throw new AppError('Thư mục cha không tồn tại', 404);
      }
    }

    try {
      // Tạo folder mới
      const newFolder = await File.create({
        name: folderData.name,
        originalName: folderData.name,
        mimeType: 'folder',
        size: 0,
        path: '',
        owner: userId,
        parent: folderData.parentId || null,
        isFolder: true,
        accessControl: {
          isPublic: false,
          allowedUsers: [],
        },
      });

      logger.info(`Thư mục ${newFolder.name} đã được tạo thành công, id: ${newFolder._id}`);
      return newFolder;
    } catch (error) {
      logger.error('Lỗi khi tạo thư mục', error);
      throw new AppError(`Không thể tạo thư mục: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Liệt kê files và folders
   */
  async listFiles(userId: string, options: {
    parentId?: string;
    isTrash?: boolean;
    isStarred?: boolean;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }): Promise<{ files: IFileDocument[]; total: number; page: number; limit: number }> {
    try {
      // Xây dựng query
      const query: any = { owner: userId, trashed: options.isTrash || false };
      
      if (options.parentId) {
        query.parent = options.parentId;
      } else if (!options.isTrash && !options.isStarred) {
        // Root level
        query.parent = null;
      }

      if (options.isStarred) {
        query.starred = true;
      }

      if (options.search) {
        query.$text = { $search: options.search };
      }

      // Sắp xếp
      const sortConfig: any = {};
      sortConfig[options.sortBy || 'createdAt'] = options.sortOrder === 'asc' ? 1 : -1;
      // Thư mục luôn hiện đầu tiên
      sortConfig.isFolder = -1;

      // Phân trang
      const page = options.page || 1;
      const limit = options.limit || 20;
      const skip = (page - 1) * limit;

      // Thực hiện truy vấn
      const files = await File.find(query)
        .sort(sortConfig)
        .skip(skip)
        .limit(limit);

      const total = await File.countDocuments(query);

      return {
        files,
        total,
        page,
        limit,
      };
    } catch (error) {
      logger.error('Lỗi khi truy vấn danh sách file', error);
      throw new AppError(`Không thể lấy danh sách file: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Di chuyển file vào thùng rác
   */
  async moveToTrash(userId: string, fileId: string): Promise<IFileDocument> {
    const file = await File.findOne({ _id: fileId, owner: userId });
    if (!file) {
      throw new AppError('File không tồn tại hoặc bạn không có quyền truy cập', 404);
    }

    try {
      file.trashed = true;
      await file.save();

      logger.info(`File ${file.name} đã được di chuyển vào thùng rác, id: ${file._id}`);
      return file;
    } catch (error) {
      logger.error(`Lỗi khi di chuyển file ${fileId} vào thùng rác`, error);
      throw new AppError(`Không thể di chuyển file vào thùng rác: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Khôi phục file từ thùng rác
   */
  async restoreFromTrash(userId: string, fileId: string): Promise<IFileDocument> {
    const file = await File.findOne({ _id: fileId, owner: userId, trashed: true });
    if (!file) {
      throw new AppError('File không tồn tại trong thùng rác hoặc bạn không có quyền truy cập', 404);
    }

    try {
      file.trashed = false;
      await file.save();
      
      logger.info(`File ${file.name} đã được khôi phục từ thùng rác, id: ${file._id}`);
      return file;
    } catch (error) {
      logger.error(`Lỗi khi khôi phục file ${fileId} từ thùng rác`, error);
      throw new AppError(`Không thể khôi phục file từ thùng rác: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Xóa file vĩnh viễn
   */
  async deleteFile(userId: string, fileId: string): Promise<void> {
    const file = await File.findOne({ _id: fileId, owner: userId });
    if (!file) {
      throw new AppError('File không tồn tại hoặc bạn không có quyền truy cập', 404);
    }

    try {
      // Xóa file khỏi Telegram nếu không phải là folder
      if (!file.isFolder && file.telegramMessageId && file.telegramChatId) {
        await telegramService.deleteFile(file.telegramChatId, file.telegramMessageId);
      }

      // Nếu là thư mục, xóa tất cả file con
      if (file.isFolder) {
        await this.deleteFolder(userId, fileId);
      }

      // Cập nhật dung lượng đã sử dụng của người dùng
      const user = await User.findById(userId);
      if (user) {
        user.storageUsed = Math.max(0, user.storageUsed - file.size);
        await user.save();
      }

      // Xóa file khỏi database
      await file.deleteOne();
      
      logger.info(`File ${file.name} đã được xóa vĩnh viễn, id: ${fileId}`);
    } catch (error) {
      logger.error(`Lỗi khi xóa file ${fileId}`, error);
      throw new AppError(`Không thể xóa file: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Xóa thư mục và tất cả nội dung bên trong
   */
  private async deleteFolder(userId: string, folderId: string): Promise<void> {
    try {
      // Lấy tất cả file con
      const childFiles = await File.find({ parent: folderId, owner: userId });
      
      // Xóa từng file con đệ quy
      for (const childFile of childFiles) {
        if (childFile.isFolder) {
          await this.deleteFolder(userId, childFile._id.toString());
        } else if (childFile.telegramMessageId && childFile.telegramChatId) {
          // Xóa file con khỏi Telegram trước
          await telegramService.deleteFile(childFile.telegramChatId, childFile.telegramMessageId);
        }
        
        // Xóa file con khỏi database
        await childFile.deleteOne();
        
        logger.info(`File con ${childFile.name} đã được xóa, id: ${childFile._id}`);
      }
    } catch (error) {
      logger.error(`Lỗi khi xóa thư mục ${folderId}`, error);
      throw new AppError(`Không thể xóa thư mục: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Khởi tạo Telegram client
   */
  private async initTelegramClient(session?: string): Promise<TelegramClient> {
    const stringSession = new StringSession(session || '');
    
    const client = new TelegramClient(
      stringSession, 
      config.telegram.apiId, 
      config.telegram.apiHash, 
      { connectionRetries: 5 }
    );
    
    await client.connect();

    // Nếu chưa được xác thực, trả về lỗi
    if (!client.connected) {
      throw new Error('Không thể kết nối tới Telegram');
    }

    return client;
  }
}

export default new FileService(); 