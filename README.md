# TeleDrive - Lưu trữ file thông qua Telegram

TeleDrive là một ứng dụng web cho phép bạn lưu trữ và quản lý file thông qua Telegram. Ứng dụng này sử dụng Telegram API để lưu trữ file và cung cấp giao diện web để quản lý chúng.

## Tính năng

- Tải lên file thông qua giao diện web
- Tải lên file thông qua Telegram Bot (tùy chọn)
- Quản lý file: xem, tải xuống, xóa
- Hỗ trợ nhiều loại file: hình ảnh, video, âm thanh, tài liệu
- Giao diện người dùng thân thiện, dễ sử dụng

## Yêu cầu

- Node.js (v14 trở lên)
- Telegram API ID và API Hash (đăng ký tại [my.telegram.org](https://my.telegram.org))
- Telegram Bot Token (tùy chọn, tạo qua [@BotFather](https://t.me/BotFather))

## Cài đặt

1. Clone repository:
   ```
   git clone https://github.com/yourusername/teledrive.git
   cd teledrive
   ```

2. Cài đặt các gói phụ thuộc:
   ```
   npm install
   ```

3. Tạo file `.env` trong thư mục gốc với nội dung sau:
   ```
   # Server Configuration
   PORT=5002
   NODE_ENV=development

   # Telegram API Credentials
   API_ID=your_api_id
   API_HASH=your_api_hash

   # Cấu hình lưu trữ
   STORAGE_PATH=./storage
   MAX_FILE_SIZE=2000 # MB

   # Telegram Bot Token (nếu sử dụng bot)
   BOT_TOKEN=your_bot_token

   # Thư mục lưu trữ tạm thời
   TEMP_DIR=temp
   DATA_DIR=data
   ```

4. Tạo các thư mục cần thiết:
   ```
   mkdir -p uploads temp data storage logs
   ```

5. Khởi động ứng dụng:
   ```
   node index.js
   ```

## Sử dụng

1. Truy cập ứng dụng web tại `http://localhost:5002` (hoặc port bạn đã cấu hình).
2. Sử dụng nút "Tải lên file" để tải file lên từ máy tính của bạn.
3. Nếu bạn đã cấu hình Telegram Bot, bạn có thể gửi file trực tiếp đến bot để lưu trữ.
4. Quản lý file của bạn thông qua giao diện web: xem, tải xuống hoặc xóa.

## Cấu trúc thư mục

```
teledrive/
├── index.js           # File chính của ứng dụng
├── package.json       # Cấu hình npm
├── .env               # Cấu hình môi trường
├── public/            # File tĩnh (CSS, JS)
│   ├── css/
│   └── js/
├── views/             # Template EJS
├── uploads/           # Thư mục lưu trữ file tải lên
├── temp/              # Thư mục tạm thời
├── data/              # Dữ liệu ứng dụng
└── logs/              # File log
```

## Các lệnh hữu ích

- Khởi động ứng dụng: `node index.js`
- Khởi động với nodemon (tự động khởi động lại khi có thay đổi): `npx nodemon index.js`

## Giấy phép

Dự án này được phân phối dưới giấy phép MIT. Xem file `LICENSE` để biết thêm chi tiết.

## Lưu ý

- Đối với file lớn hơn 20MB, Telegram API có thể yêu cầu xác thực bổ sung.
- Đảm bảo rằng bạn có đủ dung lượng lưu trữ trên máy chủ của mình.
- Không sử dụng ứng dụng này để lưu trữ nội dung bất hợp pháp hoặc vi phạm điều khoản dịch vụ của Telegram. 