# 🚀 Quick Start - TeleDrive

## ⚡ Chạy Dự Án KHÔNG CẦN API

### Bước 1: Cài Telegram Desktop
- Tải: https://desktop.telegram.org/
- Đăng nhập tài khoản Telegram

### Bước 2: Chạy
```bash
run.bat
```

## 🎉 Xong! KHÔNG CẦN API!

- Mở trình duyệt: http://localhost:3000
- Ứng dụng tự động đăng nhập từ Telegram Desktop
- **KHÔNG CẦN** API_ID, API_HASH
- **KHÔNG CẦN** nhập mã xác thực

## 💡 Cách Hoạt Động

1. Telegram Desktop lưu session trong `%APPDATA%\Telegram Desktop\tdata`
2. TeleDrive dùng `opentele` để đọc session này
3. Session đã chứa sẵn API credentials của Telegram Desktop
4. Tự động đăng nhập - không cần làm gì thêm!

## 📝 Lưu Ý

### ✅ Với Telegram Desktop (Khuyến nghị)
- **KHÔNG CẦN** API_ID, API_HASH
- **KHÔNG CẦN** nhập số điện thoại
- **KHÔNG CẦN** nhập mã xác thực
- Chỉ cần `run.bat` → Tự động đăng nhập!

### ⚠️ Không có Telegram Desktop
- Cần lấy API_ID, API_HASH từ https://my.telegram.org
- Cấu hình trong `.env`:
  ```env
  TELEGRAM_API_ID=your_api_id
  TELEGRAM_API_HASH=your_api_hash
  ```
- Đăng nhập bằng số điện thoại + mã xác thực

## Troubleshooting

**Port 3000 đang được sử dụng?**
- `run.bat` tự động dọn dẹp port
- Hoặc chạy: `netstat -ano | findstr :3000` và `taskkill /f /pid <PID>`

**Lỗi Python?**
- Cài Python 3.8+: https://python.org
- Đảm bảo Python trong PATH

**Lỗi dependencies?**
- `run.bat` tự động cài đặt
- Hoặc chạy thủ công: `pip install -r requirements.txt`
