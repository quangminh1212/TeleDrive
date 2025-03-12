# TeleDrive

TeleDrive là một bot Telegram giúp bạn quản lý file tương tự như Google Drive và OneDrive.

## Tính năng

- **Quản lý file**: Tải lên, tải xuống, xem trước, đổi tên, xóa file
- **Quản lý thư mục**: Tạo, di chuyển, liệt kê nội dung thư mục
- **Tìm kiếm**: Tìm kiếm file và thư mục theo tên
- **Giao diện thân thiện**: Menu và nút bấm trực quan

## Cài đặt

### Yêu cầu

- Node.js 12.x trở lên
- NPM hoặc Yarn

### Các bước cài đặt

1. Clone repository này:
```bash
git clone https://github.com/yourusername/teledrive.git
cd teledrive
```

2. Cài đặt các dependencies:
```bash
npm install
```

3. Tạo file `.env` với nội dung:
```
TELEGRAM_BOT_TOKEN=your_bot_token_here
STORAGE_PATH=./storage
SECRET_KEY=your_secret_key
BOT_USERNAME=your_bot_username
```

4. Chạy bot:
```bash
npm start
```

## Sử dụng

Sau khi khởi động bot, bạn có thể tương tác với bot qua Telegram. Các lệnh cơ bản:

- `/start` - Khởi động bot
- `/help` - Xem trợ giúp
- `/list` - Liệt kê file trong thư mục hiện tại
- `/mkdir [tên]` - Tạo thư mục mới
- `/cd [đường dẫn]` - Di chuyển đến thư mục
- `/search [từ khóa]` - Tìm kiếm file/thư mục

## Đóng góp

Mọi đóng góp đều được hoan nghênh! Hãy tự do fork dự án, tạo pull request hoặc báo cáo lỗi.

## Giấy phép

Dự án này được phân phối dưới giấy phép MIT. Xem tệp `LICENSE` để biết thêm chi tiết. 