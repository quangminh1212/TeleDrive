# TeleDrive - Telegram File Manager

TeleDrive là ứng dụng web cho phép bạn quản lý các file được gửi đến bot Telegram của bạn. Nó cung cấp giao diện thân thiện để xem, tải xuống và xóa các file đã được gửi đến bot.

## Tính năng

- Nhận và lưu trữ file gửi đến bot Telegram (tài liệu, hình ảnh, video, âm thanh)
- Xem tất cả file trong giao diện web trực quan
- Tải xuống file trực tiếp từ giao diện web
- Xem thông tin chi tiết về từng file
- Xóa file khi không cần thiết nữa
- Hỗ trợ xem trước hình ảnh
- Hỗ trợ link trực tiếp từ Telegram (không cần lưu trên server)

## Yêu cầu

- Node.js (v14+)
- Bot Telegram (tạo qua [@BotFather](https://t.me/botfather))

## Cài đặt

1. Clone repository:
   ```
   git clone https://github.com/your-username/teledrive.git
   cd teledrive
   ```

2. Cài đặt dependencies:
   ```
   npm install
   ```

3. Tạo file `.env` trong thư mục gốc:
   ```
   cp .env.example .env
   ```

4. Chỉnh sửa file `.env` và thêm:
   - Token Bot Telegram (từ BotFather)
   - Port (tùy chọn, mặc định là 3005)

## Sử dụng

1. Khởi động ứng dụng:
   ```
   node start.js
   ```

2. Truy cập giao diện web tại:
   - Giao diện cơ bản: `http://localhost:3005`
   - Giao diện nâng cao: `http://localhost:3005/viewer`

3. Gửi file đến bot Telegram của bạn, và chúng sẽ xuất hiện trong giao diện web

## Thiết lập Bot

1. Tạo bot thông qua [@BotFather](https://t.me/botfather) của Telegram
2. Lấy token bot và thêm vào file `.env`
3. Bắt đầu cuộc trò chuyện với bot của bạn trong Telegram
4. Bắt đầu gửi file đến bot của bạn (tài liệu, hình ảnh, video, âm thanh)

## Lưu trữ File

File được lưu trữ cục bộ trong thư mục `uploads` và metadata file được lưu trữ trong file JSON trong thư mục `data`. Đối với sử dụng trong môi trường production, bạn có thể cân nhắc sử dụng giải pháp lưu trữ đám mây.

## Giới hạn

- Bot Telegram chỉ hỗ trợ tải xuống file có kích thước tối đa 20MB
- Các file lớn hơn sẽ hiển thị thông báo lỗi "Bad Request: file is too big"

## Xử lý lỗi

Nếu gặp lỗi khi chạy ứng dụng, bạn có thể:

1. Kiểm tra logs trong thư mục `logs`
2. Đảm bảo token bot hợp lệ
3. Kiểm tra quyền truy cập thư mục `uploads` và `data`
4. Đảm bảo cổng không bị chiếm bởi ứng dụng khác

## License

MIT 