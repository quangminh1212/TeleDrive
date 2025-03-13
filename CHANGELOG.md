# Changelog

Tất cả các thay đổi đáng chú ý của dự án TeleDrive sẽ được ghi lại trong file này.

## [1.2.0] - 2025-03-14

### Thêm mới
- Thêm tính năng tự động làm mới danh sách file khi có file mới
- Thêm API endpoint `/api/files` để truy vấn danh sách file từ client
- Thêm hiển thị thời gian kiểm tra file mới gần nhất

### Thay đổi
- Cải thiện logic hiển thị danh sách file để tránh lỗi cú pháp
- Thay thế minimal.js bằng minimal-fixed.js với cú pháp chính xác hơn
- Cập nhật start.js để sử dụng minimal-fixed.js

### Sửa lỗi
- Sửa lỗi cú pháp template string trong minimal.js
- Sửa lỗi không tự động phát hiện file mới

## [1.1.0] - 2025-03-13

### Thêm mới
- Thêm script `start.js` để khởi động ứng dụng dễ dàng hơn
- Thêm thông tin giới hạn kích thước file (20MB) trong giao diện người dùng
- Thêm footer trong trang chi tiết file
- Thêm hỗ trợ xem trước hình ảnh trong giao diện
- Thêm API endpoint để xem logs lỗi gần nhất
- Thêm cơ chế sao lưu logs lỗi

### Thay đổi
- Thay đổi port mặc định từ 3000 sang 3005
- Cải thiện giao diện người dùng với thông tin rõ ràng hơn
- Cập nhật README.md sang tiếng Việt với hướng dẫn chi tiết hơn
- Cải thiện xử lý lỗi khi tải file từ Telegram
- Cải thiện thông báo lỗi khi file vượt quá kích thước cho phép

### Sửa lỗi
- Sửa lỗi khi tải xuống file lớn hơn 20MB từ Telegram
- Sửa lỗi hiển thị kích thước file không chính xác
- Sửa lỗi không hiển thị thông báo lỗi khi gửi file .exe
- Sửa lỗi không tạo thư mục uploads và data khi khởi động

## [1.0.0] - 2025-03-10

### Tính năng ban đầu
- Nhận và lưu trữ file gửi đến bot Telegram
- Xem danh sách file trong giao diện web
- Tải xuống file từ giao diện web
- Xem thông tin chi tiết về từng file
- Xóa file khi không cần thiết nữa 