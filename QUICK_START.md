# 🚀 Quick Start - TeleDrive

## Chạy Dự Án Chỉ Với 2 Bước

### Bước 1: Cài Telegram Desktop (nếu chưa có)
- Tải: https://desktop.telegram.org/
- Đăng nhập tài khoản Telegram

### Bước 2: Chạy
```bash
run.bat
```

## Xong! 🎉

- Mở trình duyệt: http://localhost:3000
- Ứng dụng tự động đăng nhập từ Telegram Desktop
- Nếu không có Telegram Desktop, đăng nhập bằng số điện thoại

## Lưu Ý

- **Không cần** API_ID, API_HASH
- **Không cần** nhập mã xác thực (nếu có Telegram Desktop)
- **Không cần** chạy script riêng
- Chỉ cần `run.bat` - tất cả đã được tích hợp!

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
