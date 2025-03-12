# TeleDrive - Lưu trữ đám mây không giới hạn với Telegram API

TeleDrive là ứng dụng lưu trữ đám mây sử dụng API Telegram để cung cấp không gian lưu trữ không giới hạn. Ứng dụng cho phép bạn tải lên, quản lý và chia sẻ file dễ dàng thông qua giao diện web hiện đại.

## Tính năng

- Đăng nhập bằng tài khoản Telegram
- Tải lên và lưu trữ file không giới hạn
- Phân loại file theo thư mục và loại
- Chia sẻ file dễ dàng
- Giao diện người dùng hiện đại và thân thiện
- Tương thích đa nền tảng

## Yêu cầu

- Node.js 14.x trở lên
- MongoDB (tùy chọn, để lưu thông tin người dùng)
- Tài khoản Telegram và API credentials

## Cài đặt

1. Clone repository:
```bash
git clone https://github.com/yourusername/teledrive.git
cd teledrive
```

2. Cài đặt dependencies:
```bash
npm run install:all
```

3. Cấu hình biến môi trường:
   - Tạo file `.env` trong thư mục `server`
   - Điền thông tin API Telegram (lấy từ https://my.telegram.org)
   - Cấu hình các thông số khác theo nhu cầu

4. Khởi động ứng dụng ở chế độ development:
```bash
npm run dev
```

5. Truy cập ứng dụng tại http://localhost:3000

## Sử dụng

1. Đăng nhập với tài khoản Telegram
2. Tải lên file bằng cách kéo và thả hoặc dùng nút "Tải lên"
3. Quản lý file trong dashboard
4. Tùy chỉnh cài đặt cá nhân trong trang Settings

## Hướng dẫn đăng ký Telegram API

1. Truy cập https://my.telegram.org
2. Đăng nhập với tài khoản Telegram của bạn
3. Truy cập "API development tools"
4. Tạo ứng dụng mới để nhận API_ID và API_HASH
5. Thêm các thông tin này vào file `.env`

## Đóng góp

Mọi đóng góp đều được chào đón! Hãy tạo Pull Request để cải thiện dự án.

## License

GPL-3.0 