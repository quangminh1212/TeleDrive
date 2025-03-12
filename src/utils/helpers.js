// Format file size to human readable format
function formatSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Format date to human readable format
function formatDate(date) {
    if (!date) return 'N/A';
    
    const d = new Date(date);
    
    // Get day, month, year
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    
    // Get hours, minutes
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

// Create main menu keyboard
function createMainMenu() {
    return {
        keyboard: [
            [{ text: '📂 Danh sách file' }, { text: '📤 Tải lên file' }],
            [{ text: '📁 Tạo thư mục' }, { text: '🔍 Tìm kiếm' }],
            [{ text: '📊 Thông tin' }, { text: '❓ Trợ giúp' }]
        ],
        resize_keyboard: true
    };
}

module.exports = {
    formatSize,
    formatDate,
    createMainMenu
}; 