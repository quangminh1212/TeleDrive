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
  // Chức năng nén tệp tin sẽ được triển khai sau
  // Đây chỉ là hàm giả lập
  return Promise.resolve();
}

// Loại bỏ trùng lặp
async function deduplicateFile(filePath) {
  // Chức năng loại bỏ trùng lặp sẽ được triển khai sau
  // Đây chỉ là hàm giả lập
  return Promise.resolve();
}

// Dọn dẹp tệp tạm
async function cleanTempFiles() {
  // Chức năng dọn dẹp tệp tạm sẽ được triển khai sau
  // Đây chỉ là hàm giả lập
  return Promise.resolve();
}

// Sắp xếp lưu trữ
async function organizeStorage(directory) {
  // Chức năng sắp xếp lưu trữ sẽ được triển khai sau
  // Đây chỉ là hàm giả lập
  return Promise.resolve();
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

// Kiểm tra kết nối
ipcMain.on('checkConnection', async (event) => {
  try {
    // Kiểm tra kết nối với Telegram
    const connectionStatus = await checkTelegramConnection();
    
    // Nếu trạng thái kết nối thay đổi
    if (connectionStatus !== isConnected) {
      isConnected = connectionStatus;
      
      // Gửi thông báo về renderer process
      if (isConnected) {
        mainWindow.webContents.send('connectionRestored');
      } else {
        mainWindow.webContents.send('connectionLost');
      }
    }
    
    // Cập nhật thời gian kiểm tra cuối cùng
    lastConnectionCheck = Date.now();
    
    // Gửi trạng thái về renderer process
    mainWindow.webContents.send('connectionStatus', { connected: isConnected });
  } catch (error) {
    console.error('Lỗi khi kiểm tra kết nối:', error);
    mainWindow.webContents.send('connectionStatus', { connected: false });
  }
});

// Kiểm tra kết nối với Telegram
async function checkTelegramConnection() {
  try {
    // Kiểm tra xem có thể thực hiện một API call đơn giản không
    // Đây chỉ là mã giả, cần thay thế bằng API call thực tế
    // const result = await telegram.getMe();
    // return result != null;
    
    // Tạm thời luôn trả về true
    return true;
  } catch (error) {
    console.error('Lỗi khi kiểm tra kết nối Telegram:', error);
    return false;
  }
}

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