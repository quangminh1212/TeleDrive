# TeleDrive

Ứng dụng quản lý file và lưu trữ thông qua Telegram Bot. Sử dụng Telegram làm nơi lưu trữ dữ liệu.

## Tính năng chính

- **Web Interface**: Quản lý, xem và tải file thông qua giao diện web
- **Telegram Bot**: Gửi file qua bot để lưu trữ
- **Lưu trữ đám mây miễn phí**: Tận dụng Telegram làm nơi lưu trữ dữ liệu
- **Tải lên từ Web**: Tải file thông qua giao diện web
- **Đồng bộ tự động**: Sao lưu file lên Telegram để giải phóng không gian đĩa

## Yêu cầu

- Node.js 14.x trở lên
- Bot Telegram (tạo qua BotFather)

## Cài đặt & Sử dụng

### Cách 1: Chạy từ source code

1. Clone repository:
   ```
   git clone https://github.com/username/teledrive.git
   cd teledrive
   ```

2. Cài đặt các gói phụ thuộc:
   ```
   npm install
   ```

3. Tạo file `.env` từ `.env.example`:
   ```
   cp .env.example .env
   ```

4. Cấu hình thông tin bot trong file `.env`:
   ```
   BOT_TOKEN=your_telegram_bot_token
   PORT=3010
   MAX_FILE_SIZE=20971520  # 20MB
   TEMP_DIR=temp
   DATA_DIR=data
   ```

5. Khởi động ứng dụng:
   ```
   npm start
   ```
   
   Hoặc sử dụng script đã cung cấp:
   ```
   # Windows
   .\run.bat
   
   # Linux/Mac
   chmod +x run.sh
   ./run.sh
   ```

6. Truy cập ứng dụng: http://localhost:3010

### Cách 2: Chạy với Docker (sắp cập nhật)

## Cấu trúc dự án (Sau khi tối ưu)

```
TeleDrive/
├── index.js           # File chính của ứng dụng
├── run.bat            # Script chạy trên Windows
├── run.sh             # Script chạy trên Linux/Mac
├── .env               # Cấu hình ứng dụng
├── .env.example       # Mẫu cấu hình
├── package.json       # Quản lý phụ thuộc
├── data/              # Thư mục lưu trữ dữ liệu
│   └── files.json     # Database file
├── uploads/           # Thư mục tạm để lưu file tải lên
├── temp/              # Thư mục tạm
├── logs/              # Log ứng dụng
└── views/             # Giao diện người dùng
    └── index.ejs      # Trang chủ
```

## Cách sử dụng

### Bot Telegram

1. Tìm bot của bạn trên Telegram (tên do bạn đặt khi tạo với BotFather)
2. Gửi file cho bot (ảnh, video, document...)
3. Bot sẽ lưu trữ và gửi lại ID của file

### Giao diện Web

1. Truy cập http://localhost:3010
2. Xem danh sách file đã lưu trữ
3. Tải lên file mới
4. Xem và tải xuống các file

## Các lệnh CLI

```
# Khởi động ứng dụng
npm start

# Chế độ phát triển
npm run dev

# Dọn dẹp uploads (gửi lên Telegram)
npm run clean
```

## Phát triển

Dự án đã được tối ưu và tích hợp tất cả chức năng chính vào một file duy nhất `index.js`. Trước đây, dự án sử dụng nhiều file riêng biệt (`app.js`, `start-app.js`, `sync-files.js`, `clean-uploads.js`).

### Quy trình hoạt động

1. **Tải file lên**:
   - Người dùng gửi file qua Telegram hoặc giao diện web
   - File được lưu vào `/uploads` (tạm thời) hoặc trực tiếp vào Telegram

2. **Đồng bộ**:
   - Chức năng `syncFiles()` quét thư mục uploads và cập nhật database

3. **Dọn dẹp**:
   - Chức năng `cleanUploads()` gửi file lên Telegram và xóa bản local
   - Giúp giảm dung lượng ổ đĩa nhưng vẫn giữ thông tin file

## Đóng góp

Mọi đóng góp đều được chào đón! Vui lòng gửi Pull Request hoặc báo lỗi qua Issues.

## Giấy phép

MIT License 