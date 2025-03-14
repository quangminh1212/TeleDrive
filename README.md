# TeleDrive

Ứng dụng lưu trữ và chia sẻ file qua Telegram Bot.

## Cài đặt

1. Clone repository:
```
git clone https://github.com/yourusername/TeleDrive.git
cd TeleDrive
```

2. Cài đặt các gói phụ thuộc:
```
npm install
```

3. Tạo file `.env` từ `.env.example`:
```
cp .env.example .env
```

4. Cấu hình file `.env`:
   - Tạo bot Telegram mới tại [BotFather](https://t.me/BotFather)
   - Cập nhật `BOT_TOKEN` với token được cung cấp

## Sử dụng

1. Khởi động ứng dụng:
```
node index.js
```

2. Truy cập ứng dụng tại: http://localhost:5001

## Cấu hình Bot Telegram

1. Truy cập [BotFather](https://t.me/BotFather) trên Telegram
2. Gõ lệnh `/newbot`
3. Đặt tên cho bot (ví dụ: My TeleDrive)
4. Đặt username cho bot (phải kết thúc bằng "bot", ví dụ: my_teledrive_bot)
5. Sao chép token được cung cấp
6. Cập nhật token vào file `.env`

## Xử lý sự cố

### Bot không hoạt động

Nếu bot không hoạt động, hãy kiểm tra:

1. Token bot có đúng định dạng không (dạng: 123456789:ABCDefGhIJKlmNoPQRsTUVwxyZ)
2. Bot có đang hoạt động không (kiểm tra bằng cách nhắn tin cho bot)
3. Kiểm tra log lỗi trong terminal

### Lỗi khi tải file

Nếu gặp lỗi khi tải file, hãy kiểm tra:

1. Kích thước file có vượt quá giới hạn không (mặc định: 2000MB)
2. Thư mục `uploads` có tồn tại và có quyền ghi không
3. Bot có quyền truy cập vào file không

## Giấy phép

[MIT](LICENSE) 