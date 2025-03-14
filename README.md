# TeleDrive

Ứng dụng lưu trữ file thông qua Telegram Bot, cho phép người dùng tải lên, quản lý và chia sẻ file một cách dễ dàng.

## Tính năng

- **Tải lên file** thông qua giao diện web hoặc bot Telegram
- **Quản lý file** dễ dàng với giao diện người dùng trực quan
- **Hỗ trợ nhiều loại file** như hình ảnh, video, tài liệu, âm thanh,...
- **Tự động phân loại file** dựa vào loại nội dung
- **Đồng bộ file** giữa web và Telegram Bot
- **Dọn dẹp tự động** file tạm thời

## Yêu cầu

- Node.js (v14+)
- Telegram Bot Token (đăng ký qua @BotFather)
- Telegram API Credentials (đăng ký tại https://my.telegram.org)

## Cài đặt

1. Clone repository:
   ```
   git clone https://github.com/your-username/teledrive.git
   cd teledrive
   ```

2. Cài đặt các gói phụ thuộc:
   ```
   npm install
   ```

3. Cấu hình môi trường:
   - Sao chép `.env.example` thành `.env`
   - Cập nhật `BOT_TOKEN`, `API_ID` và `API_HASH` trong file `.env`

4. Khởi động ứng dụng:
   ```
   npm run dev
   ```

5. Truy cập ứng dụng tại `http://localhost:5001`

## Cấu trúc thư mục

```
teledrive/
├── data/               # Thư mục lưu trữ dữ liệu
├── logs/               # Thư mục lưu trữ log
├── public/             # Tài nguyên tĩnh cho web
│   ├── css/            # CSS files
│   └── js/             # JavaScript files
├── temp/               # Thư mục lưu trữ tạm thời
├── uploads/            # Thư mục lưu trữ file người dùng tải lên
├── views/              # EJS templates
├── .env                # Cấu hình môi trường
├── .env.example        # Mẫu cấu hình môi trường
├── .gitignore          # Cấu hình Git ignore
├── index.js            # File chính của ứng dụng
├── package.json        # Cấu hình npm và dependencies
└── run.bat             # Script chạy ứng dụng trên Windows
```

## Các lệnh hữu ích

- `npm start`: Khởi động ứng dụng
- `npm run dev`: Khởi động ứng dụng với nodemon (tự động khởi động lại khi có thay đổi)
- `npm run clean`: Chạy chức năng dọn dẹp (gửi file lên Telegram)
- `npm run sync`: Đồng bộ file trong thư mục uploads với database
- `npm run clear-temp`: Dọn dẹp thư mục tạm thời

## Sử dụng Bot Telegram

1. Bắt đầu chat với Bot bằng cách gửi lệnh `/start`
2. Gửi file để lưu trữ
3. Bot sẽ tự động lưu trữ file và thông báo khi hoàn tất

## Sử dụng Web Interface

1. Truy cập vào địa chỉ `http://localhost:5001`
2. Tải lên file thông qua nút "Tải lên file"
3. Xem và quản lý danh sách file
4. Xóa file khi không cần thiết nữa

## Cấu hình

Các tùy chọn cấu hình có sẵn trong file `.env`:

- `PORT`: Cổng chạy ứng dụng (mặc định: 5001)
- `NODE_ENV`: Môi trường chạy ứng dụng (development/production)
- `BOT_TOKEN`: Token của Telegram Bot
- `API_ID` và `API_HASH`: Thông tin xác thực Telegram API
- `MAX_FILE_SIZE`: Kích thước tối đa cho mỗi file (MB)
- `STORAGE_PATH`: Đường dẫn thư mục lưu trữ
- `TEMP_DIR`: Thư mục lưu trữ tạm thời
- `DATA_DIR`: Thư mục lưu trữ dữ liệu

## License

MIT License 