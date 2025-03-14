# TeleDrive

TeleDrive là ứng dụng lưu trữ file sử dụng Telegram Bot làm nơi lưu trữ. Ứng dụng cho phép người dùng tải lên file thông qua giao diện web hoặc gửi trực tiếp qua Telegram Bot, sau đó quản lý và chia sẻ các file này.

## Tính năng

- Tải lên file thông qua giao diện web
- Gửi file trực tiếp qua Telegram Bot
- Quản lý file (xem, tải xuống, xóa)
- Hỗ trợ nhiều loại file (hình ảnh, video, tài liệu, v.v.)
- Giao diện người dùng thân thiện

## Yêu cầu

- Node.js (v14 trở lên)
- Telegram Bot Token (tạo bot qua BotFather)

## Cài đặt

1. Clone repository:
   ```
   git clone https://github.com/yourusername/teledrive.git
   cd teledrive
   ```

2. Cài đặt dependencies:
   ```
   npm install
   ```

3. Cấu hình file `.env`:
   ```
   # Server Configuration
   PORT=5000
   NODE_ENV=development

   # Telegram API Credentials
   API_ID=your_api_id
   API_HASH=your_api_hash

   # Telegram Bot Token
   BOT_TOKEN=your_bot_token

   # Cấu hình lưu trữ
   STORAGE_PATH=./storage
   MAX_FILE_SIZE=2000 # MB

   # Thư mục lưu trữ tạm thời
   TEMP_DIR=temp
   DATA_DIR=data
   ```

4. Khởi động ứng dụng:
   ```
   npm start
   ```
   
   Hoặc sử dụng file batch:
   ```
   .\run.bat
   ```

## Sử dụng

1. Truy cập ứng dụng web tại `http://localhost:5000`
2. Tải lên file thông qua giao diện web
3. Hoặc gửi file trực tiếp đến Telegram Bot đã cấu hình

## Cấu trúc thư mục

- `data/`: Lưu trữ dữ liệu ứng dụng
- `uploads/`: Thư mục tạm thời cho file tải lên
- `temp/`: Thư mục tạm thời
- `views/`: Template EJS
- `public/`: File tĩnh (CSS, JS, hình ảnh)

## Lệnh hữu ích

- `npm start`: Khởi động ứng dụng
- `npm run dev`: Khởi động ứng dụng với nodemon (tự động khởi động lại khi có thay đổi)
- `.\run.bat`: Khởi động ứng dụng bằng file batch
- `.\run-test.bat`: Khởi động phiên bản test của ứng dụng

## Giấy phép

MIT 