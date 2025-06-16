# TeleDrive

TeleDrive là một ứng dụng giúp biến Telegram thành hệ thống lưu trữ và quản lý file như Google Drive. Dự án này tận dụng không gian lưu trữ không giới hạn của Telegram để cung cấp giải pháp lưu trữ đám mây miễn phí và an toàn.

## Tính năng

- 🔐 **Xác thực an toàn**: Đăng nhập và quản lý tài khoản thông qua Telegram OAuth
- 📁 **Quản lý file**: Tải lên, tải xuống, xem trước, chia sẻ và quản lý file
- 🔄 **Đồng bộ tự động**: Tự động sao lưu file từ thiết bị của bạn
- 🔍 **Tìm kiếm thông minh**: Tìm kiếm file nhanh chóng và hiệu quả
- 📊 **Quản lý dung lượng**: Theo dõi việc sử dụng không gian lưu trữ của bạn
- 🔗 **Chia sẻ liên kết**: Tạo liên kết để chia sẻ file với người khác
- 🌐 **Truy cập mọi lúc, mọi nơi**: Truy cập file của bạn từ mọi thiết bị
- 🛑 **Kiểm soát quyền truy cập**: Quản lý ai có thể xem hoặc chỉnh sửa file của bạn

## Yêu cầu hệ thống

- Node.js 14.x trở lên
- MongoDB 4.x trở lên
- Tài khoản Telegram
- API key từ Telegram (https://core.telegram.org/api/obtaining_api_id)

## Cài đặt

1. Clone repository:
```
git clone https://github.com/username/teledrive.git
cd teledrive
```

2. Cài đặt dependencies:
```
npm install
```

3. Tạo file .env trong thư mục gốc với các giá trị sau:
```
PORT=3000
NODE_ENV=development
API_URL=http://localhost:3000
CLIENT_URL=http://localhost:3000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/teledrive

# JWT
JWT_SECRET=your_jwt_secret_key_change_this_in_production
JWT_EXPIRE=7d

# Telegram API (cập nhật từ https://my.telegram.org/apps)
TELEGRAM_API_ID=your_telegram_api_id
TELEGRAM_API_HASH=your_telegram_api_hash
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# Storage
MAX_FILE_SIZE=2000000000
CHUNK_SIZE=5242880

# Logger
LOG_LEVEL=info
```

4. Chạy ứng dụng:
```
npm run dev
```

5. Truy cập API tại: http://localhost:3000/api

## Kiến trúc

TeleDrive được xây dựng với kiến trúc microservices, bao gồm các dịch vụ sau:
- **Auth Service**: Quản lý xác thực và phân quyền người dùng
- **Storage Service**: Xử lý tải lên và tải xuống file
- **File Manager**: Quản lý dữ liệu và metadata của file
- **Telegram Client**: Giao tiếp với API của Telegram

## API Endpoints

### Xác thực
- `POST /api/auth/register`: Đăng ký tài khoản mới
- `POST /api/auth/login`: Đăng nhập với email và mật khẩu
- `POST /api/auth/telegram`: Đăng nhập với Telegram
- `GET /api/auth/me`: Lấy thông tin người dùng

### Quản lý file
- `POST /api/files/upload`: Tải file lên
- `POST /api/files/folders`: Tạo thư mục mới
- `GET /api/files`: Liệt kê file và thư mục
- `GET /api/files/:id/download`: Tải file xuống
- `PUT /api/files/:id/trash`: Di chuyển file vào thùng rác
- `PUT /api/files/:id/restore`: Khôi phục file từ thùng rác
- `DELETE /api/files/:id`: Xóa file vĩnh viễn

## Cấu trúc thư mục

```
teledrive/
  ├── src/
  │   ├── config/          # Cấu hình ứng dụng
  │   ├── controllers/     # Xử lý request/response
  │   ├── middleware/      # Middleware Express
  │   ├── models/          # MongoDB models
  │   ├── routes/          # API routes
  │   ├── services/        # Business logic
  │   ├── utils/           # Utility functions
  │   └── index.ts         # Entry point
  ├── uploads/             # Thư mục tạm cho file upload
  ├── logs/                # Log files
  ├── .env                 # Environment variables
  ├── .gitignore           # Git ignore file
  ├── package.json         # Dependencies
  ├── tsconfig.json        # TypeScript config
  └── README.md            # Documentation
```

## Frontend

TeleDrive có thể được tích hợp với một frontend riêng biệt được xây dựng bằng React/Vue/Angular. Frontend sẽ giao tiếp với backend thông qua RESTful API đã được định nghĩa.

## Hướng dẫn sử dụng

1. **Đăng ký / Đăng nhập**: Tạo tài khoản mới hoặc đăng nhập bằng Telegram
2. **Tải file lên**: Sử dụng nút "Upload" để tải file lên hệ thống
3. **Tạo thư mục**: Tổ chức file của bạn bằng cách tạo thư mục
4. **Quản lý file**: Xem, tải xuống, di chuyển hoặc xóa file
5. **Chia sẻ file**: Tạo liên kết chia sẻ cho file hoặc thư mục
6. **Khôi phục file**: Khôi phục file đã xóa từ thùng rác

## Đóng góp

Chúng tôi rất hoan nghênh mọi đóng góp từ cộng đồng. Vui lòng đọc [CONTRIBUTING.md](CONTRIBUTING.md) để biết thêm chi tiết.

## Giấy phép

Dự án này được cấp phép theo giấy phép MIT - xem file [LICENSE](LICENSE) để biết thêm chi tiết. 