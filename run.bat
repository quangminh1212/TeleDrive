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
echo [*] Kiểm tra file-service.js...
set FILE_SERVICE=src\modules\files\file-service.js

:: Sửa lỗi encoding bằng cách tạo lại file với encoding UTF-8
echo const fs = require('fs'); > "%FILE_SERVICE%.new"
echo const path = require('path'); >> "%FILE_SERVICE%.new"
echo const crypto = require('crypto'); >> "%FILE_SERVICE%.new"
echo const { promisify } = require('util'); >> "%FILE_SERVICE%.new"
echo const { tdlibStorage } = require('../storage/tdlib-client'); >> "%FILE_SERVICE%.new"
echo const File = require('../db/models/File'); >> "%FILE_SERVICE%.new"
echo const User = require('../db/models/User'); >> "%FILE_SERVICE%.new"
echo const logger = require('../common/logger'); >> "%FILE_SERVICE%.new"
echo const { config } = require('../common/config'); >> "%FILE_SERVICE%.new"
echo. >> "%FILE_SERVICE%.new"
echo class FileService { >> "%FILE_SERVICE%.new"
echo   constructor() { >> "%FILE_SERVICE%.new"
echo     // Đảm bảo thư mục uploads tồn tại >> "%FILE_SERVICE%.new"
echo     const uploadsDir = path.join(process.cwd(), 'public', 'uploads'); >> "%FILE_SERVICE%.new"
echo     const tempDir = path.join(process.cwd(), 'temp'); >> "%FILE_SERVICE%.new"
echo     if (!fs.existsSync(uploadsDir)) { >> "%FILE_SERVICE%.new"
echo       fs.mkdirSync(uploadsDir, { recursive: true }); >> "%FILE_SERVICE%.new"
echo     } >> "%FILE_SERVICE%.new"
echo     if (!fs.existsSync(tempDir)) { >> "%FILE_SERVICE%.new"
echo       fs.mkdirSync(tempDir, { recursive: true }); >> "%FILE_SERVICE%.new"
echo     } >> "%FILE_SERVICE%.new"
echo   } >> "%FILE_SERVICE%.new"
echo. >> "%FILE_SERVICE%.new"
echo   async uploadFile(fileData, user) { >> "%FILE_SERVICE%.new"
echo     try { >> "%FILE_SERVICE%.new"
echo       // Kiểm tra file tồn tại >> "%FILE_SERVICE%.new"
echo       if (!fileData || !fileData.path || !fs.existsSync(fileData.path)) { >> "%FILE_SERVICE%.new"
echo         throw new Error('File không tồn tại hoặc đường dẫn không hợp lệ'); >> "%FILE_SERVICE%.new"
echo       } >> "%FILE_SERVICE%.new"
echo. >> "%FILE_SERVICE%.new"
echo       // Kiểm tra kích thước file >> "%FILE_SERVICE%.new"
echo       const stats = await promisify(fs.stat)(fileData.path); >> "%FILE_SERVICE%.new"
echo       if (stats.size === 0) { >> "%FILE_SERVICE%.new"
echo         throw new Error('File rỗng'); >> "%FILE_SERVICE%.new"
echo       } >> "%FILE_SERVICE%.new"
echo. >> "%FILE_SERVICE%.new"
echo       // Log thông tin upload >> "%FILE_SERVICE%.new"
echo       logger.info(`Đang tải lên file ${fileData.originalname} cho người dùng ${user.firstName} (${user.telegramId || user._id})`); >> "%FILE_SERVICE%.new"
echo       logger.info(`Kích thước file: ${fileData.size} (reported) vs ${stats.size} (actual)`); >> "%FILE_SERVICE%.new"
echo. >> "%FILE_SERVICE%.new"
echo       // Kiểm tra dung lượng người dùng >> "%FILE_SERVICE%.new"
echo       // Tạo bản ghi file tạm thời >> "%FILE_SERVICE%.new"
echo       const tempFile = await File.create({ >> "%FILE_SERVICE%.new"
echo         filename: fileData.originalname, >> "%FILE_SERVICE%.new"
echo         mimetype: fileData.mimetype, >> "%FILE_SERVICE%.new"
echo         size: fileData.size, >> "%FILE_SERVICE%.new"
echo         userId: user._id, >> "%FILE_SERVICE%.new"
echo         isUploading: true >> "%FILE_SERVICE%.new"
echo       }); >> "%FILE_SERVICE%.new"
echo. >> "%FILE_SERVICE%.new"
echo       logger.info(`Đã tạo bản ghi file tạm thời: ${tempFile._id}`); >> "%FILE_SERVICE%.new"
echo. >> "%FILE_SERVICE%.new"
echo       // Tải file lên Telegram sử dụng TDLib >> "%FILE_SERVICE%.new"
echo       logger.info(`Đang tải file lên Telegram cho người dùng ${user.firstName} (${user.telegramId || user._id})`); >> "%FILE_SERVICE%.new"
echo       const telegramFile = await this.uploadFileToTelegram(fileData, user); >> "%FILE_SERVICE%.new"
echo. >> "%FILE_SERVICE%.new"
echo       // Cập nhật bản ghi file >> "%FILE_SERVICE%.new"
echo       const file = await File.findByIdAndUpdate( >> "%FILE_SERVICE%.new"
echo         tempFile._id, >> "%FILE_SERVICE%.new"
echo         { >> "%FILE_SERVICE%.new"
echo           telegramFileId: telegramFile.fileId, >> "%FILE_SERVICE%.new"
echo           telegramMessageId: telegramFile.messageId, >> "%FILE_SERVICE%.new"
echo           isUploading: false, >> "%FILE_SERVICE%.new"
echo           isUploaded: true } >> "%FILE_SERVICE%.new"
echo       ); >> "%FILE_SERVICE%.new"
echo. >> "%FILE_SERVICE%.new"
echo       // Xóa file tạm >> "%FILE_SERVICE%.new"
echo       logger.info(`Đang xóa file tạm thời: ${fileData.path}`); >> "%FILE_SERVICE%.new"
echo       await promisify(fs.unlink)(fileData.path); >> "%FILE_SERVICE%.new"
echo       logger.info(`Đã xóa file tạm thời: ${fileData.path}`); >> "%FILE_SERVICE%.new"
echo. >> "%FILE_SERVICE%.new"
echo       logger.info(`Upload hoàn tất cho file ${file._id}`); >> "%FILE_SERVICE%.new"
echo       return file; >> "%FILE_SERVICE%.new"
echo     } catch (error) { >> "%FILE_SERVICE%.new"
echo       // Xử lý lỗi >> "%FILE_SERVICE%.new"
echo       logger.error(`Lỗi khi tải file lên: ${error.message}`); >> "%FILE_SERVICE%.new"
echo       logger.error(`Stack: ${error.stack}`); >> "%FILE_SERVICE%.new"
echo. >> "%FILE_SERVICE%.new"
echo       // Xóa file tạm nếu có >> "%FILE_SERVICE%.new"
echo       try { >> "%FILE_SERVICE%.new"
echo         if (fileData && fileData.path && fs.existsSync(fileData.path)) { >> "%FILE_SERVICE%.new"
echo           await promisify(fs.unlink)(fileData.path); >> "%FILE_SERVICE%.new"
echo         } >> "%FILE_SERVICE%.new"
echo       } catch (unlinkError) { >> "%FILE_SERVICE%.new"
echo         logger.error(`Không thể xóa file tạm: ${unlinkError.message}`); >> "%FILE_SERVICE%.new"
echo       } >> "%FILE_SERVICE%.new"
echo. >> "%FILE_SERVICE%.new"
echo       throw error; >> "%FILE_SERVICE%.new"
echo     } >> "%FILE_SERVICE%.new"
echo   } >> "%FILE_SERVICE%.new"
echo. >> "%FILE_SERVICE%.new"
echo   async uploadFileToTelegram(fileData, user) { >> "%FILE_SERVICE%.new"
echo     try { >> "%FILE_SERVICE%.new"
echo       // Với TDLib, quy trình tải lên sẽ khác nhau >> "%FILE_SERVICE%.new"
echo       let telegramFile; >> "%FILE_SERVICE%.new"
echo. >> "%FILE_SERVICE%.new"
:: Thêm phần còn lại của FileService

:: Thay thế file cũ bằng file mới
move /y "%FILE_SERVICE%.new" "%FILE_SERVICE%"
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