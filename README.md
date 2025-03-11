# TeleDrive

TeleDrive là ứng dụng cho phép sử dụng Telegram làm dịch vụ lưu trữ đám mây. Tương tự như Google Drive, nhưng lưu trữ trên Telegram.

## Tính năng

- Đăng nhập bằng Telegram
- Upload file lên Telegram
- Xem và tải xuống file
- Giao diện người dùng thân thiện
- Hỗ trợ dark/light mode
- Responsive design cho mobile

## Yêu cầu

- Docker và Docker Compose
- Hoặc Node.js 16+

## Cách sử dụng với Docker

1. Sao chép dự án:
```bash
git clone https://github.com/yourusername/TeleDrive.git
cd TeleDrive
```

2. Cấu hình biến môi trường:
```bash
cp .env.example .env
```

3. Chỉnh sửa file `.env` với thông tin Telegram Bot của bạn:
```bash
BOT_TOKEN=<your_telegram_bot_token>
TELEGRAM_API_ID=<your_telegram_api_id>
TELEGRAM_API_HASH=<your_telegram_api_hash>
TELEGRAM_CHAT_ID=<your_telegram_chat_id>
```

4. Chạy ứng dụng với Docker:
```bash
chmod +x start.sh
./start.sh
```

5. Dừng ứng dụng:
```bash
chmod +x stop.sh
./stop.sh
```

## Cách sử dụng không có Docker

1. Cài đặt dependencies:
```bash
npm install
```

2. Chạy ứng dụng:
```bash
npm start
```

3. Hoặc chạy ở chế độ development:
```bash
npm run dev
```

## Cách lấy Telegram API credentials

1. Đăng ký ứng dụng tại [my.telegram.org](https://my.telegram.org/)
2. Tạo Telegram bot qua [BotFather](https://t.me/botfather)
3. Lấy Telegram Chat ID bằng cách:
   - Thêm bot [@userinfobot](https://t.me/userinfobot) vào chat
   - Gửi tin nhắn `/start` để lấy Chat ID

## Đóng góp

Các pull request được chào đón. Đối với những thay đổi lớn, vui lòng mở issue trước để thảo luận về những gì bạn muốn thay đổi.

## License

[MIT](https://choosealicense.com/licenses/mit/)