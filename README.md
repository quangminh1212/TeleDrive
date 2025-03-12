# TeleDrive - Quản lý tệp trên Telegram

TeleDrive là một ứng dụng giúp bạn quản lý tệp trực tiếp từ Telegram, tương tự như Google Drive hoặc OneDrive. Bạn có thể tải lên, tải xuống, tổ chức và quản lý tệp của mình thông qua giao diện đơn giản và trực quan.

## Tính năng

- 📁 **Quản lý tệp** : Duyệt, tải lên và tải xuống các tệp
- 📂 **Quản lý thư mục** : Tạo thư mục để tổ chức tệp của bạn
- 🗑️ **Xóa tệp** : Xóa các tệp và thư mục bạn không cần nữa
- 🔒 **Lưu trữ riêng tư** : Mỗi người dùng có không gian lưu trữ riêng
- 📱 **Đa nền tảng** : Truy cập từ bất kỳ thiết bị nào thông qua Telegram hoặc giao diện web
- 🌐 **Giao diện web** : Quản lý tệp của bạn thông qua trình duyệt web

## Yêu cầu

- Python 3.7 trở lên
- Token bot Telegram (lấy từ [@BotFather](https://t.me/BotFather))
- MongoDB (tùy chọn, để triển khai trong tương lai)

## Cài đặt

1. Sao chép kho lưu trữ này:
```bash
git clone https://github.com/tên-người-dùng-của-bạn/teledrive.git
cd teledrive
```

2. Cài đặt các gói phụ thuộc:
```bash
pip install -r requirements.txt
```

3. Tạo file `.env` ở thư mục gốc của dự án với nội dung sau:
```
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
MONGODB_URI=mongodb://localhost:27017
DATABASE_NAME=teledrivedb
STORAGE_PATH=./storage
SECRET_KEY=your_secret_key_here
```

4. Thay thế `your_telegram_bot_token_here` bằng token bạn đã nhận từ [@BotFather](https://t.me/BotFather) và `your_secret_key_here` bằng một chuỗi ngẫu nhiên cho ứng dụng web.

## Sử dụng

1. Khởi động ứng dụng:
```bash
python run.py
```

2. Sử dụng qua Telegram:
   - Mở Telegram và tìm bot của bạn theo tên người dùng.
   - Bắt đầu cuộc trò chuyện bằng cách gửi `/start`.
   - Sử dụng các nút tương tác để điều hướng và quản lý tệp của bạn.

3. Sử dụng qua giao diện web:
   - Mở trình duyệt web và truy cập `http://localhost:5000`.
   - Đăng ký tài khoản mới hoặc đăng nhập.
   - Sử dụng giao diện web để quản lý tệp của bạn.

## Cấu trúc dự án

```
teledrive/
├── app.py           # Ứng dụng web Flask
├── bot.py           # Bot Telegram chính
├── run.py           # Script khởi động
├── requirements.txt # Các gói phụ thuộc
├── .env             # Biến môi trường (cần tạo)
├── .gitignore       # File bị bỏ qua bởi Git
├── README.md        # File này
├── static/          # Tệp tĩnh cho web (CSS, JS, hình ảnh)
├── templates/       # Mẫu HTML cho web
└── storage/         # Thư mục lưu trữ tệp (được tạo tự động)
```

## Tính năng sắp tới

- 🔄 Đồng bộ hóa với Google Drive và OneDrive
- 🔍 Tìm kiếm tệp
- 🏷️ Tổ chức bằng thẻ
- 📊 Thống kê sử dụng
- 🔐 Chia sẻ tệp với người dùng khác
- 📱 Ứng dụng di động (tùy chọn)

## Đóng góp

Chúng tôi hoan nghênh các đóng góp! Đừng ngần ngại mở vấn đề hoặc gửi yêu cầu kéo.

## Giấy phép

Dự án này được cấp phép theo giấy phép MIT. 