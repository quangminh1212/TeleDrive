@echo off
chcp 65001 > nul
cls
title TeleDrive Starter
color 0A

echo ===== TELEDRIVE STARTER =====
echo Đang chuẩn bị khởi động TeleDrive...
echo.

:: Tạo các thư mục cần thiết nếu chưa tồn tại
echo [*] Tạo các thư mục cần thiết...
mkdir public\uploads 2>nul
mkdir temp 2>nul
mkdir logs 2>nul
mkdir downloads 2>nul
mkdir sessions 2>nul
echo    [DONE]
echo.

:: Kiểm tra và sửa lỗi encoding file-service.js
echo [*] Sửa lỗi file-service.js...
set FILE_SERVICE=src\modules\files\file-service.js

:: Tạo lại file với encoding UTF-8
echo Đang tạo lại file file-service.js...
(
echo const fs = require('fs');
echo const path = require('path');
echo const crypto = require('crypto');
echo const { promisify } = require('util');
echo const { tdlibStorage } = require('../storage/tdlib-client');
echo const File = require('../db/models/File');
echo const User = require('../db/models/User');
echo const logger = require('../common/logger');
echo const { config } = require('../common/config');
echo.
echo class FileService {
echo   constructor() {
echo     // Đảm bảo thư mục uploads tồn tại
echo     const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
echo     const tempDir = path.join(process.cwd(), 'temp');
echo     if (!fs.existsSync(uploadsDir)) {
echo       fs.mkdirSync(uploadsDir, { recursive: true });
echo     }
echo     if (!fs.existsSync(tempDir)) {
echo       fs.mkdirSync(tempDir, { recursive: true });
echo     }
echo   }
echo.
echo   async uploadFile(fileData, user) {
echo     try {
echo       // Kiểm tra file tồn tại
echo       if (!fileData ^|^| !fileData.path ^|^| !fs.existsSync(fileData.path)) {
echo         throw new Error('File không tồn tại hoặc đường dẫn không hợp lệ');
echo       }
echo.
echo       // Kiểm tra kích thước file
echo       const stats = await promisify(fs.stat)(fileData.path);
echo       if (stats.size === 0) {
echo         throw new Error('File rỗng');
echo       }
echo.
echo       // Log thông tin upload
echo       logger.info(`Đang tải lên file ${fileData.originalname} cho người dùng ${user.firstName} (${user.telegramId ^|^| user._id})`);
echo       logger.info(`Kích thước file: ${fileData.size} (reported) vs ${stats.size} (actual)`);
echo.
echo       // Tạo bản ghi file tạm thời
echo       const tempFile = await File.create({
echo         filename: fileData.originalname,
echo         mimetype: fileData.mimetype,
echo         size: fileData.size,
echo         userId: user._id,
echo         isUploading: true
echo       });
echo.
echo       logger.info(`Đã tạo bản ghi file tạm thời: ${tempFile._id}`);
echo.
echo       // Tải file lên Telegram sử dụng TDLib
echo       logger.info(`Đang tải file lên Telegram cho người dùng ${user.firstName} (${user.telegramId ^|^| user._id})`);
echo       const telegramFile = await this.uploadFileToTelegram(fileData, user);
echo.
echo       // Cập nhật bản ghi file
echo       const file = await File.findByIdAndUpdate(
echo         tempFile._id,
echo         {
echo           telegramFileId: telegramFile.fileId,
echo           telegramMessageId: telegramFile.messageId,
echo           isUploading: false,
echo           isUploaded: true
echo         }
echo       );
echo.
echo       // Xóa file tạm
echo       logger.info(`Đang xóa file tạm thời: ${fileData.path}`);
echo       await promisify(fs.unlink)(fileData.path);
echo       logger.info(`Đã xóa file tạm thời: ${fileData.path}`);
echo.
echo       logger.info(`Upload hoàn tất cho file ${file._id}`);
echo       return file;
echo     } catch (error) {
echo       // Xử lý lỗi
echo       logger.error(`Lỗi khi tải file lên: ${error.message}`);
echo       logger.error(`Stack: ${error.stack}`);
echo.
echo       // Xóa file tạm nếu có
echo       try {
echo         if (fileData ^&^& fileData.path ^&^& fs.existsSync(fileData.path)) {
echo           await promisify(fs.unlink)(fileData.path);
echo         }
echo       } catch (unlinkError) {
echo         logger.error(`Không thể xóa file tạm: ${unlinkError.message}`);
echo       }
echo.
echo       throw error;
echo     }
echo   }
echo.
echo   async uploadFileToTelegram(fileData, user) {
echo     try {
echo       // Với TDLib, quy trình tải lên sẽ khác nhau
echo       let telegramFile;
echo       
echo       // File nhỏ, tải trực tiếp
echo       logger.info(`Tải file lên Telegram thông qua TDLib...`);
echo       const result = await tdlibStorage.uploadFile(fileData.path, config.telegram.chatId);
echo       telegramFile = {
echo         fileId: result.fileId,
echo         messageId: result.messageId
echo       };
echo.
echo       logger.info(`Đã tải file lên Telegram, message ID: ${telegramFile.messageId}`);
echo       return telegramFile;
echo     } catch (error) {
echo       logger.error(`Lỗi khi tải file lên Telegram: ${error.message}`);
echo       throw error;
echo     }
echo   }
echo.
echo   async createShareLink(fileId, user) {
echo     try {
echo       // Tìm file theo ID
echo       const file = await File.findOne({
echo         _id: fileId,
echo         userId: user._id // Chỉ cho phép chủ sở hữu tạo link
echo       });
echo.
echo       if (!file) {
echo         throw new Error(`Không tìm thấy file có ID ${fileId} cho người dùng ${user._id}`);
echo       }
echo.
echo       // Tạo token chia sẻ nếu chưa có
echo       if (!file.shareToken) {
echo         // Tạo token ngẫu nhiên
echo         const token = crypto.randomBytes(32).toString('hex');
echo         
echo         // Cập nhật file với token mới
echo         file.shareToken = token;
echo         file.shareEnabled = true;
echo         await file.save();
echo       }
echo       
echo       // Tạo link chia sẻ
echo       const shareLink = `${config.baseUrl}/share/${file.shareToken}`;
echo       logger.info(`Đã tạo link chia sẻ cho file ${fileId}, link: ${shareLink}`);
echo       
echo       return shareLink;
echo     } catch (error) {
echo       logger.error(`Lỗi khi tạo link chia sẻ: ${error.message}`);
echo       throw error;
echo     }
echo   }
echo.
echo   async getFileByShareToken(token) {
echo     try {
echo       // Tìm file theo token chia sẻ
echo       const file = await File.findOne({
echo         shareToken: token,
echo         shareEnabled: true
echo       });
echo       
echo       if (!file) {
echo         throw new Error('Link chia sẻ không hợp lệ hoặc đã hết hạn');
echo       }
echo       
echo       logger.info(`Đã tìm thấy file qua share token: ${file._id}`);
echo       return file;
echo     } catch (error) {
echo       logger.error(`Lỗi khi lấy file theo share token: ${error.message}`);
echo       throw error;
echo     }
echo   }
echo.
echo   async deleteFile(fileId, user) {
echo     try {
echo       // Tìm file theo ID
echo       const file = await File.findOne({
echo         _id: fileId,
echo         userId: user._id // Chỉ cho phép chủ sở hữu xóa
echo       });
echo.
echo       if (!file) {
echo         throw new Error('File không tồn tại hoặc bạn không có quyền xóa');
echo       }
echo.
echo       // Xóa file khỏi Telegram nếu có thể
echo       try {
echo         if (file.telegramMessageId) {
echo           await tdlibStorage.deleteMessage(config.telegram.chatId, file.telegramMessageId);
echo           logger.info(`Đã xóa tin nhắn Telegram cho file ${fileId}`);
echo         }
echo       } catch (telegramError) {
echo         logger.warn(`Không thể xóa tin nhắn Telegram: ${telegramError.message}`);
echo         // Tiếp tục xóa file trong DB ngay cả khi không xóa được trên Telegram
echo       }
echo.
echo       // Xóa file trong database
echo       await File.findByIdAndDelete(fileId);
echo       logger.info(`Đã xóa file ${fileId}`);
echo.
echo       return { success: true, message: 'Đã xóa file thành công' };
echo     } catch (error) {
echo       logger.error(`Lỗi khi xóa file: ${error.message}`);
echo       throw error;
echo     }
echo   }
echo }
echo.
echo module.exports = new FileService();
) > "%FILE_SERVICE%"
echo    [DONE] File file-service.js đã được sửa.
echo.

:: Kiểm tra kết nối MongoDB
echo [*] Kiểm tra kết nối MongoDB...
powershell -Command "& {try { $result = Test-NetConnection -ComputerName localhost -Port 27017 -WarningAction SilentlyContinue; if ($result.TcpTestSucceeded) { Write-Host '   [OK] MongoDB đang chạy - Kết nối thành công' } else { Write-Host '   [WARNING] MongoDB không chạy - Sẽ sử dụng cơ sở dữ liệu giả lập' -ForegroundColor Yellow } } catch { Write-Host '   [WARNING] Không thể kiểm tra kết nối MongoDB - Sẽ sử dụng cơ sở dữ liệu giả lập' -ForegroundColor Yellow }}"
echo.

:: Thiết lập biến môi trường
echo [*] Thiết lập biến môi trường...
set NODE_ENV=development
set DEBUG=teledrive:*
set PORT=3000
echo    [DONE]
echo.

echo ===============================
echo Ứng dụng đang khởi động...
echo Truy cập vào http://localhost:3000 để sử dụng TeleDrive
echo Nhấn Ctrl+C để dừng ứng dụng
echo ===============================
echo.

:: Khởi động server
echo.
echo Đang khởi động TeleDrive server...
echo.
node src/server.js

:: Dừng lại nếu server kết thúc
echo.
echo Server đã dừng hoặc gặp lỗi!
echo Nhấn phím bất kỳ để đóng cửa sổ...
pause > nul 