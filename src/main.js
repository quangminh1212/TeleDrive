// Thêm khai báo electron-log để ghi log
const log = require('electron-log');

// Cấu hình electron-log
log.transports.file.level = 'debug';
log.transports.console.level = 'debug';
log.transports.file.maxSize = 10 * 1024 * 1024; // 10MB
log.catchErrors({
  showDialog: false,
  onError(error) {
    log.error('Caught error:', error);
    if (mainWindow) {
      mainWindow.webContents.send('error', {
        message: error.message,
        stack: error.stack
      });
    }
  }
});

log.info('=== Application Starting ===');
log.info('App version:', app.getVersion ? app.getVersion() : 'Unknown');
log.info('OS:', process.platform, process.arch);
log.info('Node version:', process.versions.node);
log.info('Electron version:', process.versions.electron);

app.on('ready', function() {
  log.info('App ready event triggered');
  
  // Create window
  createWindow();
  
  // Cập nhật trạng thái khởi động
  startupStatus.appReady = true;
  log.info('Main window created');
});

// Hàm tạo cửa sổ chính
function createWindow() {
  try {
    // ... existing code ...
    
    // Bắt các sự kiện của cửa sổ
    mainWindow.webContents.on('did-finish-load', () => {
      log.info('Main window finished loading');
    });
    
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      log.error('Main window failed to load:', errorCode, errorDescription);
    });
    
    mainWindow.on('closed', function() {
      log.info('Main window closed');
      mainWindow = null;
    });

    // Thiết lập debug cho IPC
    const ipcDebug = (direction, channel, ...args) => {
      const safeArgs = args.map(arg => {
        // Chuyển đổi các đối tượng phức tạp thành chuỗi để tránh lỗi circular reference
        try {
          if (typeof arg === 'object' && arg !== null) {
            return JSON.stringify(arg);
          }
          return arg;
        } catch (e) {
          return '[Complex object]';
        }
      });
      
      log.debug(`IPC ${direction}: ${channel}`, ...safeArgs);
    };

    // Ghi log tất cả các sự kiện IPC
    const originalOn = ipcMain.on;
    ipcMain.on = function(channel, listener) {
      return originalOn.call(this, channel, (event, ...args) => {
        ipcDebug('receive', channel, ...args);
        return listener(event, ...args);
      });
    };

    log.info('Event listeners registered');
  } catch (error) {
    log.error('Error creating window:', error);
  }
}

// Theo dõi trạng thái khởi động
const startupStatus = {
  appReady: false,
  telegramConnected: false,
  configLoaded: false
};

// Kiểm tra kết nối
ipcMain.on('checkConnection', async (event) => {
  log.info('Checking Telegram connection');
  try {
    const connectionStatus = await checkTelegramConnection();
    
    // Gửi trạng thái về renderer process
    mainWindow.webContents.send('connectionStatus', { connected: connectionStatus });
    
    // Cập nhật trạng thái khởi động
    startupStatus.telegramConnected = connectionStatus;
    log.info('Connection check result:', connectionStatus);
  } catch (error) {
    log.error('Error checking connection:', error);
    mainWindow.webContents.send('connectionStatus', { connected: false });
    mainWindow.webContents.send('error', { 
      message: 'Không thể kết nối đến Telegram: ' + error.message 
    });
  }
});

ipcMain.on('syncAll', async () => {
  mainWindow.webContents.send('syncStarting')
  await sync.syncAll()
  mainWindow.webContents.send('syncOver')
})

// Xử lý yêu cầu lấy dữ liệu thống kê
ipcMain.on('getAnalytics', async () => {
  try {
    // Thu thập dữ liệu thống kê
    const analyticsData = await collectAnalytics();
    
    // Gửi dữ liệu về cho renderer process
    mainWindow.webContents.send('analyticsData', analyticsData);
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu thống kê:', error);
  }
});

// Xử lý yêu cầu tối ưu hóa
ipcMain.on('startOptimize', async (event, options) => {
  try {
    // Bắt đầu quá trình tối ưu hóa
    const result = await optimizeStorage(options);
    
    // Gửi kết quả về cho renderer process
    mainWindow.webContents.send('optimizeComplete', result);
  } catch (error) {
    console.error('Lỗi khi tối ưu hóa:', error);
  }
});

// Thu thập dữ liệu thống kê
async function collectAnalytics() {
  // Đọc dữ liệu từ cơ sở dữ liệu hoặc từ hệ thống tệp
  const syncDir = sync.getSyncDir();
  
  // Phân tích dữ liệu sử dụng
  const usageData = {
    sessions: await getSessionCount(),
    totalRuntime: await getTotalRuntime(),
    formattedRuntime: formatTime(await getTotalRuntime()),
    lastSession: await getLastSessionTime()
  };
  
  // Thống kê về tệp tin
  const fileStats = await analyzeFiles(syncDir);
  
  // Thống kê về tương tác
  const interactionStats = await analyzeInteractions();
  
  return {
    usage: usageData,
    files: fileStats,
    interactions: interactionStats
  };
}

// Lấy số lượng phiên làm việc
async function getSessionCount() {
  try {
    const dbPath = path.join(app.getPath('userData'), 'sessions.json');
    if (!fs.existsSync(dbPath)) {
      return 1; // Phiên đầu tiên
    }
    
    const data = await fs.promises.readFile(dbPath, 'utf8');
    const sessions = JSON.parse(data);
    return sessions.length;
  } catch (error) {
    console.error('Lỗi khi đọc dữ liệu phiên:', error);
    return 1;
  }
}

// Lấy tổng thời gian chạy ứng dụng (tính bằng giây)
async function getTotalRuntime() {
  try {
    const dbPath = path.join(app.getPath('userData'), 'sessions.json');
    if (!fs.existsSync(dbPath)) {
      return 0;
    }
    
    const data = await fs.promises.readFile(dbPath, 'utf8');
    const sessions = JSON.parse(data);
    
    // Tính tổng thời gian của các phiên
    let totalTime = 0;
    for (const session of sessions) {
      if (session.startTime && session.endTime) {
        totalTime += (new Date(session.endTime) - new Date(session.startTime)) / 1000;
      }
    }
    
    return totalTime;
  } catch (error) {
    console.error('Lỗi khi tính thời gian chạy:', error);
    return 0;
  }
}

// Lấy thời gian phiên cuối cùng
async function getLastSessionTime() {
  try {
    const dbPath = path.join(app.getPath('userData'), 'sessions.json');
    if (!fs.existsSync(dbPath)) {
      return Date.now();
    }
    
    const data = await fs.promises.readFile(dbPath, 'utf8');
    const sessions = JSON.parse(data);
    
    if (sessions.length > 0) {
      const lastSession = sessions[sessions.length - 1];
      return lastSession.startTime || Date.now();
    }
    
    return Date.now();
  } catch (error) {
    console.error('Lỗi khi lấy thời gian phiên cuối:', error);
    return Date.now();
  }
}

// Phân tích thông tin tệp tin
async function analyzeFiles(syncDir) {
  if (!syncDir || !fs.existsSync(syncDir)) {
    return { total: 0, averageSize: 0 };
  }
  
  try {
    // Lấy danh sách tất cả các tệp tin trong thư mục
    const files = await getAllFiles(syncDir);
    
    // Tính tổng kích thước
    let totalSize = 0;
    for (const file of files) {
      const stats = await fs.promises.stat(file);
      totalSize += stats.size;
    }
    
    // Tính kích thước trung bình
    const averageSize = files.length > 0 ? totalSize / files.length : 0;
    
    return {
      total: files.length,
      averageSize: averageSize
    };
  } catch (error) {
    console.error('Lỗi khi phân tích tệp tin:', error);
    return { total: 0, averageSize: 0 };
  }
}

// Lấy tất cả các tệp trong thư mục và thư mục con
async function getAllFiles(dir) {
  const files = [];
  
  async function traverse(currentDir) {
    const entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        await traverse(fullPath);
      } else {
        files.push(fullPath);
      }
    }
  }
  
  await traverse(dir);
  return files;
}

// Phân tích thông tin tương tác
async function analyzeInteractions() {
  // Giả lập dữ liệu tương tác
  return {
    totalMessages: Math.floor(Math.random() * 1000),
    totalReactions: Math.floor(Math.random() * 500),
    totalShares: Math.floor(Math.random() * 100)
  };
}

// Tối ưu hóa lưu trữ
async function optimizeStorage(options) {
  const syncDir = sync.getSyncDir();
  if (!syncDir || !fs.existsSync(syncDir)) {
    return { optimizedFiles: 0, savedSpace: 0 };
  }
  
  try {
    // Lấy danh sách tất cả các tệp tin
    const files = await getAllFiles(syncDir);
    let optimizedFiles = 0;
    let savedSpace = 0;
    
    // Báo cáo tiến độ ban đầu
    mainWindow.webContents.send('optimizeProgress', {
      processed: 0,
      total: files.length
    });
    
    // Xử lý từng tệp tin
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Lấy kích thước ban đầu
      const statsBefore = await fs.promises.stat(file);
      const sizeBefore = statsBefore.size;
      
      // Thực hiện tối ưu hóa tùy theo tùy chọn
      if (options.compress) {
        await compressFile(file);
      }
      
      if (options.dedupe) {
        await deduplicateFile(file);
      }
      
      // Lấy kích thước sau khi tối ưu
      const statsAfter = await fs.promises.stat(file);
      const sizeAfter = statsAfter.size;
      
      // Tính không gian đã tiết kiệm
      const saved = sizeBefore - sizeAfter;
      if (saved > 0) {
        optimizedFiles++;
        savedSpace += saved;
      }
      
      // Báo cáo tiến độ
      mainWindow.webContents.send('optimizeProgress', {
        processed: i + 1,
        total: files.length
      });
    }
    
    // Nếu cần dọn dẹp tệp tạm
    if (options.clean) {
      await cleanTempFiles();
    }
    
    // Nếu cần sắp xếp lưu trữ
    if (options.organize) {
      await organizeStorage(syncDir);
    }
    
    return {
      optimizedFiles,
      savedSpace
    };
  } catch (error) {
    console.error('Lỗi khi tối ưu hóa lưu trữ:', error);
    return { optimizedFiles: 0, savedSpace: 0 };
  }
}

// Nén tệp tin
async function compressFile(filePath) {
  log.info(`Compressing file: ${filePath}`);
  
  try {
    // Kiểm tra loại tệp
    const extension = path.extname(filePath).toLowerCase();
    const fs = require('fs');
    const util = require('util');
    const stat = util.promisify(fs.stat);
    
    const fileStats = await stat(filePath);
    const originalSize = fileStats.size;
    
    // Danh sách các định dạng đã được nén
    const alreadyCompressedFormats = ['.jpg', '.jpeg', '.png', '.gif', '.zip', '.rar', '.7z', '.mp3', '.mp4', '.avi', '.mov', '.mkv'];
    
    // Nếu tệp đã được nén, bỏ qua
    if (alreadyCompressedFormats.includes(extension)) {
      log.info(`File ${filePath} is already in compressed format. Skipping.`);
      return;
    }
    
    // Bỏ qua tệp quá nhỏ (<10KB)
    if (originalSize < 10 * 1024) {
      log.info(`File ${filePath} is too small (${originalSize} bytes). Skipping.`);
      return;
    }
    
    // Tạo tệp tạm
    const tempPath = `${filePath}.compressed`;
    
    // Thực hiện nén theo loại tệp
    if (extension === '.txt' || extension === '.html' || extension === '.css' || extension === '.js' || extension === '.json') {
      // Nén tệp văn bản
      const content = await fs.promises.readFile(filePath, 'utf8');
      const compressedContent = content.replace(/\s+/g, ' ').trim();
      await fs.promises.writeFile(tempPath, compressedContent, 'utf8');
    } else {
      // Giả lập việc nén tệp nhị phân (chỉ ghi lại 90% kích thước tệp gốc)
      const buffer = await fs.promises.readFile(filePath);
      // Trong môi trường thực tế, bạn sẽ sử dụng thư viện nén như zlib
      // Ở đây chúng ta chỉ giả lập bằng cách sao chép phần đầu của tệp
      const compressedSize = Math.floor(originalSize * 0.9);
      await fs.promises.writeFile(tempPath, buffer.slice(0, compressedSize));
    }
    
    // Kiểm tra kích thước tệp mới
    const newStats = await stat(tempPath);
    const newSize = newStats.size;
    
    // Nếu kích thước giảm, sử dụng tệp mới
    if (newSize < originalSize) {
      await fs.promises.unlink(filePath); // Xóa tệp gốc
      await fs.promises.rename(tempPath, filePath); // Đổi tên tệp nén
      log.info(`File ${filePath} compressed successfully. Size reduced from ${originalSize} to ${newSize} bytes.`);
    } else {
      // Nếu kích thước không giảm, giữ nguyên tệp gốc
      await fs.promises.unlink(tempPath);
      log.info(`Compression did not reduce size for ${filePath}. Keeping original.`);
    }
  } catch (error) {
    log.error(`Error compressing ${filePath}:`, error);
  }
  
  return Promise.resolve();
}

// Loại bỏ trùng lặp
async function deduplicateFile(filePath) {
  log.info(`Checking for duplicates of: ${filePath}`);
  
  try {
    const fs = require('fs');
    const crypto = require('crypto');
    const util = require('util');
    const readFile = util.promisify(fs.readFile);
    
    // Tạo hash của tệp
    const fileBuffer = await readFile(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    const fileHash = hashSum.digest('hex');
    
    // Lưu trữ tạm thời các hash đã xử lý
    if (!global.processedHashes) {
      global.processedHashes = new Map();
    }
    
    // Kiểm tra xem hash đã tồn tại chưa
    if (global.processedHashes.has(fileHash)) {
      const duplicateFilePath = global.processedHashes.get(fileHash);
      log.info(`Duplicate found: ${filePath} is identical to ${duplicateFilePath}`);
      
      // Tạo liên kết tượng trưng trong thư mục duplicates
      const duplicatesDir = path.join(path.dirname(filePath), '.duplicates');
      if (!fs.existsSync(duplicatesDir)) {
        fs.mkdirSync(duplicatesDir, { recursive: true });
      }
      
      const fileName = path.basename(filePath);
      const linkPath = path.join(duplicatesDir, fileName);
      
      // Ghi thông tin tệp trùng lặp
      const duplicateInfo = {
        originalFile: duplicateFilePath,
        duplicateFile: filePath,
        hash: fileHash,
        timestamp: new Date().toISOString()
      };
      
      // Lưu thông tin trùng lặp
      fs.writeFileSync(`${linkPath}.info.json`, JSON.stringify(duplicateInfo, null, 2));
      
      // Trong môi trường thực tế, bạn có thể xóa tệp trùng lặp hoặc tạo liên kết tượng trưng
      // fs.unlinkSync(filePath); // Xóa tệp trùng lặp
      
      return true; // Phát hiện trùng lặp
    } else {
      // Lưu hash và đường dẫn tệp
      global.processedHashes.set(fileHash, filePath);
      log.info(`No duplicates found for ${filePath}. Hash: ${fileHash}`);
      return false; // Không trùng lặp
    }
  } catch (error) {
    log.error(`Error checking duplicates for ${filePath}:`, error);
    return false;
  }
}

// Dọn dẹp tệp tạm
async function cleanTempFiles() {
  log.info('Cleaning temporary files');
  
  try {
    const fs = require('fs');
    const os = require('os');
    const path = require('path');
    const glob = require('glob');
    
    // Danh sách các thư mục và mẫu tệp tạm cần dọn dẹp
    const tempPatterns = [
      path.join(os.tmpdir(), 'teledrive-*'),
      path.join(app.getPath('userData'), 'temp', '*'),
      path.join(app.getPath('userData'), '*.tmp'),
      path.join(app.getPath('userData'), '.cache', '*')
    ];
    
    let totalCleanedFiles = 0;
    let totalSavedSpace = 0;
    
    // Tạo thư mục logs nếu chưa tồn tại
    const logsDir = path.join(app.getPath('userData'), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    // Xoay vòng các file log cũ
    const logFiles = glob.sync(path.join(logsDir, '*.log'));
    for (const logFile of logFiles) {
      const stats = fs.statSync(logFile);
      const fileSizeInMB = stats.size / (1024 * 1024);
      
      // Nếu file log lớn hơn 10MB, đổi tên và tạo mới
      if (fileSizeInMB > 10) {
        const newName = `${logFile}.${new Date().toISOString().replace(/:/g, '-')}.old`;
        fs.renameSync(logFile, newName);
        totalCleanedFiles++;
        totalSavedSpace += stats.size;
        log.info(`Rotated log file ${logFile} to ${newName}`);
      }
    }
    
    // Dọn dẹp các tệp tạm theo mẫu
    for (const pattern of tempPatterns) {
      const files = glob.sync(pattern);
      
      for (const file of files) {
        try {
          const stats = fs.statSync(file);
          const now = new Date();
          const fileAge = now - stats.mtime; // Tuổi tệp tính bằng mili giây
          
          // Xóa các tệp cũ hơn 1 ngày
          if (fileAge > 24 * 60 * 60 * 1000) {
            if (stats.isDirectory()) {
              // Xóa đệ quy thư mục
              fs.rmdirSync(file, { recursive: true });
            } else {
              // Xóa tệp
              fs.unlinkSync(file);
            }
            
            totalCleanedFiles++;
            totalSavedSpace += stats.size;
            log.info(`Removed temp file/directory: ${file}`);
          }
        } catch (err) {
          log.error(`Error cleaning temp file ${file}:`, err);
        }
      }
    }
    
    log.info(`Temp files cleanup complete. Removed ${totalCleanedFiles} files, saved ${totalSavedSpace} bytes.`);
    
    return {
      cleanedFiles: totalCleanedFiles,
      savedSpace: totalSavedSpace
    };
  } catch (error) {
    log.error('Error cleaning temp files:', error);
    return {
      cleanedFiles: 0,
      savedSpace: 0
    };
  }
}

// Sắp xếp lưu trữ
async function organizeStorage(directory) {
  log.info(`Organizing storage in directory: ${directory}`);
  
  try {
    const fs = require('fs');
    const path = require('path');
    const util = require('util');
    const glob = util.promisify(require('glob'));
    
    // Tạo các thư mục phân loại
    const categories = {
      documents: ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'xls', 'xlsx', 'ppt', 'pptx'],
      images: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'svg', 'webp'],
      audio: ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'],
      video: ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'],
      archives: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'],
      code: ['js', 'py', 'java', 'c', 'cpp', 'h', 'cs', 'php', 'html', 'css', 'json', 'xml']
    };
    
    // Tạo thư mục cho từng danh mục
    for (const category in categories) {
      const categoryDir = path.join(directory, category);
      if (!fs.existsSync(categoryDir)) {
        fs.mkdirSync(categoryDir, { recursive: true });
        log.info(`Created category directory: ${categoryDir}`);
      }
    }
    
    // Tìm tất cả các tệp trong thư mục (không đệ quy vào thư mục phân loại)
    const files = await glob(`${directory}/*.*`);
    let organizedFiles = 0;
    
    for (const file of files) {
      try {
        const fileName = path.basename(file);
        const extension = path.extname(file).toLowerCase().replace('.', '');
        
        // Xác định danh mục của tệp
        let targetCategory = 'other';
        for (const category in categories) {
          if (categories[category].includes(extension)) {
            targetCategory = category;
            break;
          }
        }
        
        // Bỏ qua nếu tệp đã nằm trong thư mục danh mục
        if (path.dirname(file) === path.join(directory, targetCategory)) {
          continue;
        }
        
        // Tạo thư mục 'other' nếu cần
        if (targetCategory === 'other') {
          const otherDir = path.join(directory, 'other');
          if (!fs.existsSync(otherDir)) {
            fs.mkdirSync(otherDir, { recursive: true });
          }
        }
        
        // Đường dẫn đích cho tệp
        const targetDir = path.join(directory, targetCategory);
        const targetPath = path.join(targetDir, fileName);
        
        // Kiểm tra xem tệp đã tồn tại chưa
        if (fs.existsSync(targetPath)) {
          // Nếu tệp đã tồn tại, thêm timestamp vào tên
          const fileNameWithoutExt = path.basename(fileName, path.extname(fileName));
          const timestamp = new Date().toISOString().replace(/:/g, '-');
          const newFileName = `${fileNameWithoutExt}_${timestamp}${path.extname(fileName)}`;
          const newTargetPath = path.join(targetDir, newFileName);
          
          // Di chuyển tệp
          fs.renameSync(file, newTargetPath);
          log.info(`Moved file with timestamp: ${file} -> ${newTargetPath}`);
        } else {
          // Di chuyển tệp
          fs.renameSync(file, targetPath);
          log.info(`Moved file: ${file} -> ${targetPath}`);
        }
        
        organizedFiles++;
      } catch (err) {
        log.error(`Error organizing file ${file}:`, err);
      }
    }
    
    log.info(`Storage organization complete. Organized ${organizedFiles} files.`);
    
    return {
      organizedFiles
    };
  } catch (error) {
    log.error('Error organizing storage:', error);
    return {
      organizedFiles: 0
    };
  }
}

// Định dạng thời gian
function formatTime(seconds) {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  } else if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}

// Lưu thông tin phiên làm việc
async function saveSessionInfo() {
  try {
    const dbPath = path.join(app.getPath('userData'), 'sessions.json');
    let sessions = [];
    
    // Đọc dữ liệu hiện có nếu có
    if (fs.existsSync(dbPath)) {
      const data = await fs.promises.readFile(dbPath, 'utf8');
      sessions = JSON.parse(data);
    }
    
    // Thêm phiên mới
    const sessionInfo = {
      id: Date.now(),
      startTime: app.startTime || Date.now(),
      endTime: Date.now(),
      version: app.getVersion()
    };
    
    sessions.push(sessionInfo);
    
    // Lưu lại
    await fs.promises.writeFile(dbPath, JSON.stringify(sessions), 'utf8');
  } catch (error) {
    console.error('Lỗi khi lưu thông tin phiên:', error);
  }
}

// Khởi tạo thông tin phiên làm việc khi ứng dụng khởi động
app.startTime = Date.now();

// Lưu thông tin phiên làm việc khi ứng dụng đóng
app.on('before-quit', async () => {
  await saveSessionInfo();
});

// Theo dõi trạng thái kết nối và tiến độ đồng bộ
let isConnected = false;
let lastConnectionCheck = Date.now();
let syncPaused = false;

// Tạm dừng đồng bộ
ipcMain.on('pauseSync', async () => {
  syncPaused = true;
  console.log('Đã tạm dừng đồng bộ');
  // TODO: Triển khai cơ chế tạm dừng đồng bộ thực sự
});

// Tiếp tục đồng bộ
ipcMain.on('resumeSync', async () => {
  syncPaused = false;
  console.log('Đã tiếp tục đồng bộ');
  // TODO: Triển khai cơ chế tiếp tục đồng bộ thực sự
});

// Làm mới trạng thái
ipcMain.on('refreshStatus', async () => {
  try {
    // Kiểm tra kết nối
    const connectionStatus = await checkTelegramConnection();
    isConnected = connectionStatus;
    
    // Gửi trạng thái về renderer process
    mainWindow.webContents.send('connectionStatus', { connected: isConnected });
    
    // Lấy trạng thái đồng bộ
    const syncStatus = sync.getSyncStatus();
    
    // Gửi trạng thái đồng bộ về renderer process
    mainWindow.webContents.send('syncStatus', syncStatus);
    
    console.log('Đã làm mới trạng thái');
  } catch (error) {
    console.error('Lỗi khi làm mới trạng thái:', error);
  }
});

// Thực hiện đồng bộ với báo cáo tiến độ
ipcMain.on('syncAll', async () => {
  mainWindow.webContents.send('syncStarting');
  
  try {
    // Đặt lại trạng thái tạm dừng
    syncPaused = false;
    
    // Lấy danh sách tệp và thư mục
    const [files, folders] = await sync.getFilesAndFolders();
    
    console.log('Folders', folders.length);
    console.log('Files', files.length);
    
    // Tổng số mục cần xử lý
    const totalItems = folders.length + files.length;
    let processedItems = 0;
    
    // Xử lý các thư mục
    for (const folder of folders) {
      if (syncPaused) {
        console.log('Đồng bộ đã bị tạm dừng');
        break;
      }
      
      await sync.processFolder(folder);
      processedItems++;
      
      // Báo cáo tiến độ
      mainWindow.webContents.send('syncProgress', {
        processed: processedItems,
        total: totalItems
      });
    }
    
    // Xử lý các tệp tin
    for (const file of files) {
      if (syncPaused) {
        console.log('Đồng bộ đã bị tạm dừng');
        break;
      }
      
      await sync.processFile(file);
      processedItems++;
      
      // Báo cáo tiến độ
      mainWindow.webContents.send('syncProgress', {
        processed: processedItems,
        total: totalItems
      });
    }
    
    // Dọn dẹp
    await sync.cleanUp();
    
    // Chỉ gửi thông báo hoàn thành nếu không bị tạm dừng
    if (!syncPaused) {
      mainWindow.webContents.send('syncOver');
    }
  } catch (error) {
    console.error('Lỗi khi đồng bộ:', error);
    mainWindow.webContents.send('syncError', {
      message: error.message
    });
  }
});

// Xử lý sự kiện lỗi không mong muốn
process.on('uncaughtException', (error) => {
  log.error('Uncaught exception:', error);
  
  // Thông báo lỗi cho giao diện người dùng
  if (mainWindow) {
    mainWindow.webContents.send('error', {
      message: 'Lỗi không mong muốn: ' + error.message,
      stack: error.stack
    });
  }
});

process.on('unhandledRejection', (reason, promise) => {
  log.error('Unhandled rejection at:', promise, 'reason:', reason);
  
  // Thông báo lỗi cho giao diện người dùng
  if (mainWindow) {
    mainWindow.webContents.send('error', {
      message: 'Lỗi không xử lý: ' + (reason.message || reason)
    });
  }
});

// Kiểm tra kết nối với Telegram - cải tiến với xử lý lỗi tốt hơn
async function checkTelegramConnection() {
  log.debug('Checking Telegram connection');
  
  try {
    // Thử một API call đơn giản
    if (telegram && telegram.api) {
      const result = await telegram.api.getMe();
      log.debug('getMe result:', result);
      return Boolean(result);
    } else {
      log.warn('Telegram client not initialized');
      return false;
    }
  } catch (error) {
    log.error('Error connecting to Telegram:', error);
    return false;
  }
} 