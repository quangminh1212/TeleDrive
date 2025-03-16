/**
 * TeleDrive - Các tiện ích định dạng
 * File này chứa các hàm định dạng dữ liệu
 */

/**
 * Định dạng bytes thành đơn vị đọc được (KB, MB, GB...)
 * @param {Number} bytes Kích thước tính bằng bytes
 * @param {Number} decimals Số chữ số thập phân
 * @returns {String} Chuỗi đã định dạng
 */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Định dạng chuỗi ngày tháng
 * @param {String} dateString Chuỗi ngày tháng
 * @returns {String} Chuỗi ngày tháng đã định dạng
 */
function formatDate(dateString) {
  try {
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return dateString || 'Không rõ';
  }
}

module.exports = {
  formatBytes,
  formatDate
}; 