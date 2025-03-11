# TeleDrive

TeleDrive là ứng dụng cho phép sử dụng Telegram làm dịch vụ lưu trữ đám mây, tương tự như Google Drive.

## Tính năng

- Đăng nhập bằng Telegram
- Upload file lên Telegram
- Xem và tải xuống file
- Giao diện người dùng thân thiện
- Hỗ trợ dark/light mode
- Responsive design cho mobile

## Yêu cầu

- Node.js 16+ hoặc Docker

## Cài đặt và sử dụng

TeleDrive cung cấp một file thực thi duy nhất (`runapp.bat`) để quản lý tất cả các chức năng. Chạy lệnh sau để xem hướng dẫn:

```
runapp help
```

### Cài đặt ban đầu

```
runapp setup
```

### Chạy ứng dụng

**Chạy bình thường:**
```
runapp run
```

**Chạy ở chế độ development:**
```
runapp dev
```

**Chạy với Docker:**
```
runapp docker start
```

**Dừng Docker container:**
```
runapp docker stop
```

**Xem logs Docker:**
```
runapp docker logs
```

## Cấu hình Telegram API

Trước khi sử dụng, bạn cần cập nhật file `.env` với các thông tin Telegram API:

```env
BOT_TOKEN=<your_telegram_bot_token>
TELEGRAM_API_ID=<your_telegram_api_id>
TELEGRAM_API_HASH=<your_telegram_api_hash>
TELEGRAM_CHAT_ID=<your_telegram_chat_id>
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

## Cấu trúc thư mục

```
TeleDrive/
├── public/              # Static files
│   ├── css/             # CSS styles
│   ├── js/              # JavaScript files
│   └── index.html       # Main HTML file
├── uploads/             # Temporary uploads directory
├── Dockerfile           # Docker configuration
├── docker-compose.yml   # Docker Compose configuration
├── server.js            # Node.js server
├── package.json         # Dependencies and scripts
└── runapp.bat           # Main executable script
```

## Đóng góp

Các pull request được chào đón. Đối với những thay đổi lớn, vui lòng mở issue trước để thảo luận về những gì bạn muốn thay đổi.

## License

[MIT](https://choosealicense.com/licenses/mit/)