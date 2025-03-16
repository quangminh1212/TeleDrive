/**
 * TeleDrive - Utilities - Formatters
 * File này chứa các hàm tiện ích để định dạng dữ liệu
 */

/**
 * Format kích thước tệp tin từ byte sang đơn vị đọc được
 * @param {number} bytes Kích thước tệp tin tính bằng byte
 * @param {number} decimals Số chữ số thập phân (mặc định: 2)
 * @returns {string} Chuỗi kích thước đã định dạng
 */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  if (!bytes || isNaN(bytes)) return 'Unknown';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format thời gian từ ISO string sang định dạng dễ đọc
 * @param {string} isoString Chuỗi thời gian dạng ISO
 * @returns {string} Chuỗi thời gian đã định dạng
 */
function formatDate(isoString) {
  if (!isoString) return 'Unknown';
  
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'Invalid date';
    
    // Format: "DD/MM/YYYY HH:MM:SS"
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
  } catch (error) {
    console.error('Lỗi khi định dạng thời gian:', error);
    return 'Error';
  }
}

/**
 * Format thời gian tương đối (ví dụ: "3 giờ trước")
 * @param {string} isoString Chuỗi thời gian dạng ISO
 * @returns {string} Chuỗi thời gian tương đối
 */
function formatRelativeTime(isoString) {
  if (!isoString) return 'Unknown';
  
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'Invalid date';
    
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffMonth = Math.floor(diffDay / 30);
    const diffYear = Math.floor(diffMonth / 12);
    
    if (diffSec < 60) return `${diffSec} giây trước`;
    if (diffMin < 60) return `${diffMin} phút trước`;
    if (diffHour < 24) return `${diffHour} giờ trước`;
    if (diffDay < 30) return `${diffDay} ngày trước`;
    if (diffMonth < 12) return `${diffMonth} tháng trước`;
    return `${diffYear} năm trước`;
  } catch (error) {
    console.error('Lỗi khi định dạng thời gian tương đối:', error);
    return 'Error';
  }
}

/**
 * Format tên tệp tin nếu quá dài
 * @param {string} fileName Tên tệp tin
 * @param {number} maxLength Độ dài tối đa (mặc định: 20)
 * @returns {string} Tên tệp tin đã định dạng
 */
function formatFileName(fileName, maxLength = 20) {
  if (!fileName) return 'Unknown';
  
  if (fileName.length <= maxLength) return fileName;
  
  const extension = fileName.lastIndexOf('.') > -1 
    ? fileName.substring(fileName.lastIndexOf('.')) 
    : '';
  
  const nameWithoutExt = fileName.substring(0, fileName.length - extension.length);
  
  if (extension.length >= maxLength - 3) {
    // Trường hợp đặc biệt: phần mở rộng quá dài
    return `...${extension}`;
  }
  
  const availableLength = maxLength - 3 - extension.length;
  return `${nameWithoutExt.substring(0, availableLength)}...${extension}`;
}

/**
 * Format trạng thái của tệp tin thành chuỗi có thể đọc được
 * @param {string} status Trạng thái của tệp tin
 * @returns {string} Chuỗi trạng thái đã định dạng
 */
function formatFileStatus(status) {
  if (!status) return 'Unknown';
  
  const statusMap = {
    'local': 'Chỉ lưu local',
    'telegram': 'Chỉ lưu Telegram',
    'synced': 'Đã đồng bộ',
    'syncing': 'Đang đồng bộ',
    'pending': 'Chờ đồng bộ',
    'error': 'Lỗi',
    'missing': 'Không tìm thấy'
  };
  
  return statusMap[status] || status;
}

/**
 * Tạo progress bar dạng chuỗi
 * @param {number} current Giá trị hiện tại
 * @param {number} total Giá trị tổng
 * @param {number} length Độ dài của progress bar (mặc định: 20)
 * @returns {string} Chuỗi progress bar
 */
function createProgressBar(current, total, length = 20) {
  if (isNaN(current) || isNaN(total) || total === 0) {
    return '[' + '□'.repeat(length) + '] 0%';
  }
  
  const percentage = Math.min(100, Math.floor((current / total) * 100));
  const filledLength = Math.floor((percentage / 100) * length);
  
  const filled = '■'.repeat(filledLength);
  const empty = '□'.repeat(length - filledLength);
  
  return `[${filled}${empty}] ${percentage}%`;
}

/**
 * Tạo chuỗi ID ngắn gọn từ một ID dài
 * @param {string} id ID gốc
 * @param {number} length Độ dài chuỗi ID mới (mặc định: 8)
 * @returns {string} Chuỗi ID ngắn gọn
 */
function shortenId(id, length = 8) {
  if (!id) return 'Unknown';
  
  if (id.length <= length) return id;
  
  // Lấy 'length' ký tự đầu tiên của ID
  return id.substring(0, length) + '...';
}

module.exports = {
  formatBytes,
  formatDate,
  formatRelativeTime,
  formatFileName,
  formatFileStatus,
  createProgressBar,
  shortenId
}; 