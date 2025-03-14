/**
 * Hướng dẫn sửa lỗi TeleDrive
 * 
 * Vấn đề hiện tại:
 * 1. Token bot Telegram không hợp lệ
 * 2. Lỗi khai báo biến trùng lặp trong file index.js
 * 
 * Cách khắc phục:
 * 
 * 1. Tạo bot Telegram mới:
 *    - Truy cập https://t.me/BotFather
 *    - Gõ lệnh /newbot
 *    - Đặt tên cho bot và username (phải kết thúc bằng "bot")
 *    - Sao chép token được cung cấp
 * 
 * 2. Cập nhật file .env:
 *    - Mở file .env
 *    - Thay thế giá trị BOT_TOKEN bằng token mới
 * 
 * 3. Sửa lỗi khai báo biến trùng lặp:
 *    - Mở file index.js
 *    - Tìm và xóa các phần khai báo biến trùng lặp:
 *      + Dòng 170-177: Khai báo lại dataDir, tempDir, uploadsDir, filesDbPath, logsDir
 *      + Dòng 180-199: Khai báo lại storage và upload
 *      + Dòng 217-218: Khai báo lại bot và botActive
 * 
 * 4. Khởi động lại ứng dụng:
 *    - Chạy lệnh: node index.js
 */

console.log('Hướng dẫn sửa lỗi TeleDrive');
console.log('Vui lòng làm theo các bước trong file này để sửa lỗi.');
console.log('Xem chi tiết tại: https://t.me/BotFather để tạo bot mới.');
console.log('Sau khi có token mới, cập nhật vào file .env và khởi động lại ứng dụng.'); 