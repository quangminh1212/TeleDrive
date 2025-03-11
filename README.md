# TeleDrive

TeleDrive là ứng dụng cho phép sử dụng Telegram làm dịch vụ lưu trữ đám mây, tương tự như Google Drive.

## Tính năng

- Đăng nhập bằng Telegram
- Upload file lên Telegram
- Xem và tải xuống file
- Giao diện người dùng thân thiện
- Hỗ trợ dark/light mode
- Responsive design cho mobile
- **Mới**: Tích hợp với Telegram Desktop cho đăng nhập nhanh chóng

## Yêu cầu

- Node.js 16+ hoặc Docker
- Telegram Desktop (tùy chọn, để đăng nhập nhanh)

## Cài đặt và sử dụng

TeleDrive cung cấp một file thực thi duy nhất (`runapp.bat`) để quản lý tất cả các chức năng:

### Hiển thị trợ giúp

```
runapp help
```

### Cài đặt ban đầu

```
runapp setup
```

### Chạy ứng dụng

```
runapp run
```

### Chạy ở chế độ development

```
runapp dev
```

### Sử dụng Docker

```
runapp docker start    # Khởi động container
runapp docker stop     # Dừng container
runapp docker restart  # Khởi động lại container
runapp docker logs     # Xem logs
```

## Đăng nhập Telegram

### Cách 1: Đăng nhập thủ công
Khi chạy ứng dụng lần đầu, bạn sẽ được yêu cầu nhập số điện thoại và mã xác thực để đăng nhập vào Telegram.

### Cách 2: Đăng nhập tự động với Telegram Desktop
TeleDrive có thể sử dụng Telegram Desktop đã đăng nhập sẵn để tăng tốc quá trình đăng nhập:

1. Đảm bảo Telegram Desktop đã được cài đặt và đăng nhập trên máy tính của bạn
2. Mở file `.env` và thêm các dòng sau:
   ```
   USE_TELEGRAM_DESKTOP=true
   # TELEGRAM_DESKTOP_PATH= (tùy chọn, để trống để tự động phát hiện)
   ```
3. Khi chạy TeleDrive, ứng dụng sẽ tự động phát hiện và sử dụng tài khoản Telegram Desktop.

## Cấu hình Telegram API

Trước khi sử dụng, bạn cần cập nhật file `.env` với các thông tin Telegram API:

```env
BOT_TOKEN=<your_telegram_bot_token>
TELEGRAM_API_ID=<your_telegram_api_id>
TELEGRAM_API_HASH=<your_telegram_api_hash>
TELEGRAM_CHAT_ID=<your_telegram_chat_id>
USE_TELEGRAM_DESKTOP=true  # Bật tính năng đăng nhập với Telegram Desktop
```

### Cách lấy thông tin Telegram API:

1. **Telegram Bot Token**:
   - Mở Telegram, tìm [@BotFather](https://t.me/botfather)
   - Gửi `/newbot` để tạo bot mới
   - Làm theo hướng dẫn và nhận BOT_TOKEN

2. **API ID và API Hash**:
   - Vào [my.telegram.org](https://my.telegram.org/auth)
   - Đăng nhập vào tài khoản Telegram của bạn
   - Chọn "API development tools"
   - Điền thông tin và lấy API_ID và API_HASH

3. **Chat ID**:
   - Tạo một kênh chat với bot của bạn
   - Thêm bot [@userinfobot](https://t.me/userinfobot) vào kênh
   - Gửi tin nhắn bất kỳ và copy Chat ID

## Cấu trúc thư mục tinh gọn

```
TeleDrive/
├── public/              # Static files
│   ├── css/             # CSS styles
│   ├── js/              # JavaScript files
│   └── index.html       # Main HTML file
├── src/                 # Mã nguồn
├── uploads/             # Temporary uploads directory (tự động tạo)
├── .env                 # Cấu hình môi trường
├── Dockerfile           # Docker configuration
├── docker-compose.yml   # Docker Compose configuration
├── server.js            # Node.js server
├── package.json         # Dependencies and scripts
└── runapp.bat           # Main executable script (duy nhất)
```

## Đóng góp

Các pull request được chào đón. Đối với những thay đổi lớn, vui lòng mở issue trước để thảo luận về những gì bạn muốn thay đổi.

## License

[MIT](https://choosealicense.com/licenses/mit/)