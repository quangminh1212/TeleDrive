// Thêm phương thức để truy xuất thư mục đồng bộ
exports.getSyncDir = function() {
  return teleConf.syncDir || null;
};

// Thêm phương thức để kiểm tra trạng thái đồng bộ
exports.getSyncStatus = function() {
  return {
    isProcessing: processingSyncAll,
    stats: {
      uploaded: uploadedCount,
      downloaded: downloadedCount,
      skipped: skippedCount
    }
  };
};

// Thêm phương thức để lấy thống kê chi tiết về các tệp đã đồng bộ
exports.getDetailedStats = function() {
  return {
    startTime: syncStartTime,
    endTime: syncEndTime,
    fileTypes: fileTypeStats,
    sizesProcessed: sizeStats,
    errors: errorCount
  };
};

// Biến để theo dõi thống kê
let uploadedCount = 0;
let downloadedCount = 0;
let skippedCount = 0;
let errorCount = 0;
let syncStartTime = null;
let syncEndTime = null;
let fileTypeStats = {};
let sizeStats = {
  total: 0,
  min: Infinity,
  max: 0,
  average: 0
};

// Cải thiện hàm syncAll để theo dõi thống kê
exports.syncAll = async function() {
  console.log('==== Sync Started ====');
  processingSyncAll = true;
  
  // Đặt lại thống kê
  resetStats();
  
  // Ghi lại thời gian bắt đầu
  syncStartTime = Date.now();

  const [files, folders] = await getFilesAndFolders();
  console.log('Folders', folders.length);
  console.log('Files', files.length);
  let changes = 0;

  try {
    for (const folder of folders) {
      changes += await processFolder(folder);
    }

    for (const file of files) {
      changes += await processFile(file);
    }
  } finally {
    processingSyncAll = false;
    
    // Ghi lại thời gian kết thúc
    syncEndTime = Date.now();
    
    // Tính toán thống kê cuối cùng
    if (uploadedCount + downloadedCount > 0) {
      sizeStats.average = sizeStats.total / (uploadedCount + downloadedCount);
    }
    
    console.log('==== Sync Completed ====');
    console.log(`Uploaded: ${uploadedCount}, Downloaded: ${downloadedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`);
    console.log(`Time taken: ${(syncEndTime - syncStartTime) / 1000} seconds`);
  }

  // Clean empty files
  await cleanUp();

  return changes;
};

// Đặt lại thống kê
function resetStats() {
  uploadedCount = 0;
  downloadedCount = 0;
  skippedCount = 0;
  errorCount = 0;
  syncStartTime = null;
  syncEndTime = null;
  fileTypeStats = {};
  sizeStats = {
    total: 0,
    min: Infinity,
    max: 0,
    average: 0
  };
}

// Cập nhật hàm processFile để theo dõi thống kê
async function processFile(fileInfo) {
  try {
    // ... existing code ...
    
    // Theo dõi thống kê thêm
    const fileExt = path.extname(filePath).toLowerCase();
    if (fileExt) {
      fileTypeStats[fileExt] = (fileTypeStats[fileExt] || 0) + 1;
    }
    
    // Nếu tải lên hoặc tải xuống thành công, cập nhật thống kê
    const isUploaded = false; // Thay bằng điều kiện thực tế
    const isDownloaded = false; // Thay bằng điều kiện thực tế
    const fileSize = 0; // Thay bằng kích thước thực tế
    
    if (isUploaded) {
      uploadedCount++;
      updateSizeStats(fileSize);
    } else if (isDownloaded) {
      downloadedCount++;
      updateSizeStats(fileSize);
    } else {
      skippedCount++;
    }
    
    return 1; // Có thay đổi
  } catch (error) {
    console.error(`Error processing file ${fileInfo.relativePath}:`, error);
    errorCount++;
    return 0; // Không có thay đổi
  }
}

// Cập nhật thống kê kích thước
function updateSizeStats(size) {
  sizeStats.total += size;
  sizeStats.min = Math.min(sizeStats.min, size);
  sizeStats.max = Math.max(sizeStats.max, size);
}

// ... existing code ... 