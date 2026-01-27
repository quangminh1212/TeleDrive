================================================================================
TeleDrive Desktop - Portable Version
================================================================================

GIỚI THIỆU
----------
Đây là phiên bản portable của TeleDrive Desktop. Bạn có thể chạy trực tiếp
mà không cần cài đặt.

YÊU CẦU HỆ THỐNG
----------------
- Windows 10 hoặc mới hơn
- 4GB RAM
- 500MB dung lượng trống
- Kết nối Internet

HƯỚNG DẪN SỬ DỤNG
------------------
1. Giải nén toàn bộ thư mục vào vị trí bạn muốn
2. Chạy TeleDrive.exe
3. Đăng nhập bằng Telegram của bạn
4. Bắt đầu sử dụng!

CẤU TRÚC THỦ MỤC
-----------------
TeleDrive-Portable/
├── TeleDrive.exe       - Chương trình chính
├── _internal/          - Thư viện và dependencies
├── data/               - Dữ liệu ứng dụng (tự động tạo)
│   ├── uploads/        - Files đã upload
│   ├── temp/           - Files tạm
│   └── teledrive.db    - Database
├── logs/               - Log files (tự động tạo)
├── .env.example        - File cấu hình mẫu
└── README.txt          - File này

CẤU HÌNH (TÙY CHỌN)
-------------------
Nếu muốn sử dụng API credentials riêng:

1. Copy .env.example thành .env
2. Chỉnh sửa .env và thêm:
   TELEGRAM_API_ID=your_api_id
   TELEGRAM_API_HASH=your_api_hash
3. Lấy API credentials từ: https://my.telegram.org

DI CHUYỂN DỮ LIỆU
------------------
Để di chuyển TeleDrive sang máy khác:
1. Copy toàn bộ thư mục TeleDrive-Portable
2. Dữ liệu của bạn nằm trong thư mục data/

GỠ BỎ
------
Chỉ cần xóa thư mục TeleDrive-Portable

LƯU Ý BẢO MẬT
--------------
- File .session chứa thông tin đăng nhập Telegram
- Không chia sẻ thư mục data/ với người khác
- Backup thường xuyên nếu có dữ liệu quan trọng

KHẮC PHỤC SỰ CỐ
----------------
Nếu gặp lỗi:
1. Kiểm tra file teledrive.log trong thư mục gốc
2. Xóa thư mục data/temp/ và thử lại
3. Chạy lại TeleDrive.exe

Nếu không khởi động được:
1. Kiểm tra Windows Defender/Antivirus
2. Thêm exception cho TeleDrive.exe
3. Chạy với quyền Administrator (chuột phải > Run as administrator)

HỖ TRỢ
------
- GitHub: https://github.com/yourusername/teledrive
- Issues: https://github.com/yourusername/teledrive/issues

PHIÊN BẢN
---------
Version: 2.0.0
Build Date: 2026-01-28
Type: Portable

LICENSE
-------
MIT License - Xem file LICENSE để biết thêm chi tiết

================================================================================
TeleDrive Team - https://github.com/yourusername/teledrive
================================================================================
