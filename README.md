# TeleDrive

TeleDrive là ứng dụng lưu trữ file sử dụng Telegram làm nơi lưu trữ dữ liệu. Ứng dụng cho phép bạn tải lên, quản lý và chia sẻ file thông qua Telegram, tận dụng không gian lưu trữ không giới hạn của Telegram.

## Tính năng

- Tải file lên Telegram và quản lý thông qua giao diện web
- Tự động đồng bộ file từ Telegram
- Xem trước file (hình ảnh, video, âm thanh)
- Tải xuống file
- Thùng rác với khả năng khôi phục
- Tìm kiếm file
- Giao diện người dùng thân thiện

## Yêu cầu

- Node.js (v14 trở lên)
- Telegram Bot Token (từ [@BotFather](https://t.me/BotFather))
- Telegram Chat ID (có thể là ID của bạn hoặc một nhóm/kênh)

## Cài đặt

1. Clone repository:
```bash
git clone https://github.com/yourusername/teledrive.git
cd teledrive
```

2. Cài đặt các gói phụ thuộc:
```bash
npm install
```

3. Tạo file `.env` từ file mẫu:
```bash
cp .env.example .env
```

4. Chỉnh sửa file `.env` và thêm thông tin Telegram Bot Token và Chat ID:
```
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
```

5. Khởi động ứng dụng:
```bash
npm start
```

Ứng dụng sẽ chạy tại http://localhost:3000 (hoặc cổng được cấu hình trong file `.env`).

## Cách sử dụng

1. Truy cập vào ứng dụng qua trình duyệt web
2. Đăng nhập với thông tin mặc định (hoặc đã cấu hình trong file `.env`):
   - Tên đăng nhập: `admin`
   - Mật khẩu: `password`
3. Tải file lên bằng cách sử dụng trang "Tải lên"
4. Quản lý file trong trang chính
5. Xem và khôi phục file đã xóa trong "Thùng rác"

## Đồng bộ với Telegram

Ứng dụng sẽ tự động đồng bộ với Telegram theo khoảng thời gian được cấu hình. Bạn cũng có thể đồng bộ thủ công bằng cách:

1. Nhấn vào nút "Đồng bộ với Telegram" trong giao diện
2. Hoặc chạy lệnh: `npm run sync`

## Cấu hình nâng cao

Bạn có thể tùy chỉnh các cài đặt trong file `.env`:

- `PORT`: Cổng máy chủ (mặc định: 3000)
- `ADMIN_USERNAME` và `ADMIN_PASSWORD`: Thông tin đăng nhập
- `SYNC_INTERVAL`: Khoảng thời gian đồng bộ tự động (phút)
- `CLEANUP_INTERVAL`: Khoảng thời gian dọn dẹp tự động (phút)
- `TRASH_RETENTION`: Thời gian lưu giữ file trong thùng rác (ngày)

## Đóng góp

Mọi đóng góp đều được hoan nghênh! Vui lòng tạo issue hoặc pull request nếu bạn muốn cải thiện ứng dụng.

## Giấy phép

[MIT](LICENSE) 