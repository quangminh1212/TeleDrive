/**
 * TeleDrive - Main Application
 * Ứng dụng lưu trữ file dùng Telegram làm nơi lưu trữ
 */

// Imports
const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
// Remove external dependencies
// const cors = require('cors');
// const helmet = require('helmet');
// const session = require('express-session');
// const bodyParser = require('body-parser');

// Nạp biến môi trường
dotenv.config();

// Imports từ modules 
const config = require('./src/config/config');
const telegramService = require('./src/services/telegramService');
const fileService = require('./src/services/fileService');
const apiRoutes = require('./src/routes/apiRoutes');
const webRoutes = require('./src/routes/webRoutes');
const { ensureDirectories, log } = require('./src/utils/helpers');

// Đảm bảo các thư mục cần thiết tồn tại
ensureDirectories();

// Khởi tạo app
const app = express();

// Thiết lập view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Thiết lập middleware cơ bản
// app.use(cors());
// app.use(helmet({
//   contentSecurityPolicy: false
// }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Thiết lập session - Vô hiệu hóa
// app.use(session({
//   secret: config.SESSION_SECRET || 'teledrive-secret-key',
//   resave: false,
//   saveUninitialized: false,
//   cookie: {
//     secure: config.NODE_ENV === 'production',
//     maxAge: 24 * 60 * 60 * 1000 // 24 giờ
//   }
// }));

// Thiết lập static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/downloads', express.static(path.join(__dirname, 'downloads')));

// Middleware xác thực API key
app.use((req, res, next) => {
  // Bỏ qua xác thực cho route đăng nhập Telegram
  if (req.path === '/api/auth/telegram') {
    return next();
  }
  
  // Nếu là API request và có API key
  if (req.path.startsWith('/api/') && req.headers['x-api-key']) {
    if (req.headers['x-api-key'] === config.API_KEY) {
      return next();
    }
    return res.status(401).json({ success: false, error: 'Invalid API key' });
  }
  
  // Nếu là API request mà không có API key 
  // (bỏ kiểm tra session vì chưa cài đặt express-session)
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  
  next();
});

// Đăng ký routes
app.use('/api', apiRoutes);
app.use('/', webRoutes);

// Xử lý 404
app.use((req, res) => {
  if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
    return res.status(404).json({
      success: false,
      message: 'Route not found'
    });
  }
  
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// Xử lý lỗi
app.use((err, req, res, next) => {
  log(`Error: ${err.message}`, 'error');
  console.error(err);
  
  if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
    return res.status(500).json({
      success: false,
      message: config.NODE_ENV === 'production' ? 'Internal Server Error' : err.message
    });
  }
  
  res.status(500).sendFile(path.join(__dirname, 'public', '500.html'));
});

// Hàm khởi động ứng dụng
async function startApp() {
  try {
    // Khởi tạo Telegram bot (nếu cấu hình sẵn)
    if (config.TELEGRAM_BOT_TOKEN && config.TELEGRAM_CHAT_ID) {
      telegramService.initBot();
    } else {
      log('Thiếu cấu hình Telegram Bot. Một số chức năng có thể không hoạt động đúng.', 'warn');
    }
    
    // Lắng nghe trên cổng đã cấu hình
    const server = app.listen(config.PORT, () => {
      log(`Server đang chạy tại http://${config.HOST}:${config.PORT}`);
      log(`Môi trường: ${config.NODE_ENV}`);
    }).on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        log(`Cổng ${config.PORT} đã được sử dụng, thử cổng khác`, 'error');
        // Thử lại với cổng khác
        const newPort = parseInt(config.PORT) + 1;
        app.listen(newPort, () => {
          log(`Server đang chạy tại http://${config.HOST}:${newPort} (cổng dự phòng)`);
          log(`Môi trường: ${config.NODE_ENV}`);
        });
      } else {
        log(`Lỗi khi khởi động server: ${err.message}`, 'error');
      }
    });
    
    // Xử lý tắt server
    process.on('SIGINT', async () => {
      log('Đang dừng server...');
      
      // Dừng Telegram bot
      telegramService.stopBot();
      
      // Thoát
      process.exit(0);
    });
    
    // Đồng bộ files khi khởi động
    setTimeout(async () => {
      try {
        log('Bắt đầu đồng bộ file ban đầu...');
        const syncResult = await fileService.syncFiles();
        if (syncResult.success) {
          log(`Đồng bộ ban đầu hoàn tất: ${syncResult.syncedCount} file đồng bộ, ${syncResult.newFiles} file mới, ${syncResult.skippedCount} file bỏ qua, ${syncResult.errorCount} lỗi`);
        } else {
          log(`Đồng bộ ban đầu thất bại: ${syncResult.error}`, 'error');
        }
      } catch (error) {
        log(`Lỗi khi đồng bộ ban đầu: ${error.message}`, 'error');
      }
    }, 5000); // Đợi 5 giây sau khi khởi động
    
    // Lập lịch đồng bộ file
    if (config.AUTO_SYNC) {
      log(`Đã bật đồng bộ tự động. Sẽ đồng bộ mỗi ${config.SYNC_INTERVAL / (60 * 60 * 1000)} giờ.`);
      
      // Đồng bộ lần đầu sau khi khởi động
      setTimeout(() => {
        fileService.syncFiles()
          .then(result => {
            if (result.success) {
              log(`Đồng bộ tự động hoàn tất: ${result.syncedCount} file đồng bộ, ${result.newFiles} file mới, ${result.skippedCount} file bỏ qua, ${result.errorCount} lỗi`);
            } else {
              log(`Đồng bộ tự động thất bại: ${result.error}`, 'error');
            }
          })
          .catch(error => {
            log(`Lỗi khi đồng bộ tự động: ${error.message}`, 'error');
          });
      }, 10000); // Đợi 10 giây sau khi khởi động
      
      // Lập lịch đồng bộ định kỳ
      setInterval(() => {
        fileService.syncFiles()
          .then(result => {
            if (result.success) {
              log(`Đồng bộ tự động hoàn tất: ${result.syncedCount} file đồng bộ, ${result.newFiles} file mới, ${result.skippedCount} file bỏ qua, ${result.errorCount} lỗi`);
            } else {
              log(`Đồng bộ tự động thất bại: ${result.error}`, 'error');
            }
          })
          .catch(error => {
            log(`Lỗi khi đồng bộ tự động: ${error.message}`, 'error');
          });
      }, config.SYNC_INTERVAL);
    } else {
      log('Tự động đồng bộ đã bị tắt trong cấu hình.', 'warn');
    }
    
    // Lập lịch dọn dẹp tự động
    if (config.CLEANUP_ENABLED) {
      log(`Đã bật dọn dẹp tự động. Sẽ dọn dẹp mỗi ${config.CLEANUP_INTERVAL / (60 * 60 * 1000)} giờ.`);
      
      // Dọn dẹp lần đầu sau 15 phút
      setTimeout(() => {
        fileService.cleanupFiles()
          .then(result => {
            if (result.success) {
              log(`Dọn dẹp tự động hoàn tất: Đã xóa ${result.stats.cleaned} files thừa`);
            } else {
              log(`Dọn dẹp tự động thất bại: ${result.error}`, 'error');
            }
          })
          .catch(error => {
            log(`Lỗi khi dọn dẹp tự động: ${error.message}`, 'error');
          });
      }, 15 * 60 * 1000); // Đợi 15 phút
      
      // Lập lịch dọn dẹp định kỳ
      setInterval(() => {
        fileService.cleanupFiles()
          .then(result => {
            if (result.success) {
              log(`Dọn dẹp tự động hoàn tất: Đã xóa ${result.stats.cleaned} files thừa`);
            } else {
              log(`Dọn dẹp tự động thất bại: ${result.error}`, 'error');
            }
          })
          .catch(error => {
            log(`Lỗi khi dọn dẹp tự động: ${error.message}`, 'error');
          });
      }, config.CLEANUP_INTERVAL);
    }
    
    // Kiểm tra trạng thái file
    setTimeout(() => {
      fileService.checkFiles()
        .then(result => {
          if (result.success) {
            log(`Kiểm tra file hoàn tất: ${result.stats.fixed} file đã được sửa`);
          } else {
            log(`Kiểm tra file thất bại: ${result.error}`, 'error');
          }
        })
        .catch(error => {
          log(`Lỗi khi kiểm tra file: ${error.message}`, 'error');
        });
    }, 5 * 60 * 1000); // Đợi 5 phút
  } catch (error) {
    log(`Lỗi khi khởi động server: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  }
}

// Khởi động ứng dụng
startApp(); 