# 🚀 Bắt đầu nhanh - TeleDrive Desktop

## Chỉ cần 1 lệnh!

```bat
run.bat
```

## ✨ Script tự động làm gì?

`run.bat` sẽ tự động:

1. ✅ **Kiểm tra Python** - Tìm Python 3.11 hoặc 3.12
2. ✅ **Cài Python 3.11** - Nếu chưa có (hỏi trước khi cài)
3. ✅ **Tạo virtual environment** - Tự động nếu chưa có
4. ✅ **Cài dependencies** - Tất cả packages cần thiết
5. ✅ **Cài webview** - pywebview hoặc tkinterweb
6. ✅ **Cleanup ports** - Dọn dẹp ports đang dùng
7. ✅ **Tạo thư mục** - data, logs, uploads, etc.
8. ✅ **Chạy ứng dụng** - Với embedded webview
9. ✅ **Auto-login** - Tự động đăng nhập từ Telegram Desktop

## 📋 Yêu cầu

- Windows 10/11
- Kết nối internet (lần đầu)
- Telegram Desktop (cho auto-login)

## 🎯 Các tình huống

### Lần đầu chạy (chưa có gì)

```bat
run.bat
```

Script sẽ:
- Hỏi có muốn cài Python 3.11 không → Chọn Y
- Tự động cài Python 3.11
- Tự động setup toàn bộ
- Chạy ứng dụng

### Đã có Python 3.11/3.12

```bat
run.bat
```

Script sẽ:
- Phát hiện Python tương thích
- Setup nếu cần
- Chạy ngay

### Đang dùng Python 3.14

```bat
run.bat
```

Script sẽ:
- Cảnh báo Python 3.14 có vấn đề
- Hỏi có muốn cài Python 3.11 không
- Nếu chọn N → Vẫn chạy được nhưng có thể lỗi

## 🔧 Các lệnh khác (tùy chọn)

### Kiểm tra Python versions
```bat
check_python.bat
```

### Cài Python 3.11 thủ công
```bat
install_python311.bat
```

### Setup lại từ đầu
```bat
setup_python311.bat
```

## 📱 Giao diện

Sau khi chạy `run.bat`:

1. **Cửa sổ desktop** mở ra (1280x800)
2. **Giao diện web** hiển thị ngay trong cửa sổ
3. **Tự động đăng nhập** nếu có Telegram Desktop
4. **Giao diện giống Google Drive** - Clean & professional

## ⚡ Tính năng Auto-login

Auto-login hoạt động khi:
- ✅ Dùng Python 3.11 hoặc 3.12
- ✅ Có Telegram Desktop đã đăng nhập
- ✅ Package `opentele` cài đặt thành công

Nếu auto-login không hoạt động:
- Vẫn có thể đăng nhập thủ công qua web interface
- Hoặc dùng Telegram bot authentication

## 🆘 Gặp vấn đề?

### Lỗi: "Python not found"
→ Chạy lại `run.bat`, chọn Y để cài Python 3.11

### Lỗi: "pywebview not available"
→ Bình thường! Ứng dụng sẽ dùng tkinterweb hoặc browser

### Lỗi: "opentele không tương thích"
→ Đang dùng Python 3.14, cài Python 3.11 để fix

### Lỗi: "Port already in use"
→ Script tự động cleanup, hoặc tắt ứng dụng đang chạy

## 💡 Tips

1. **Lần đầu chạy** có thể mất 2-5 phút (download & install)
2. **Lần sau** chỉ mất vài giây
3. **Giữ cửa sổ mở** khi dùng ứng dụng
4. **Ctrl+C** để thoát

## 📂 Cấu trúc thư mục

```
TeleDrive/
├── run.bat              ← CHẠY FILE NÀY
├── data/                ← Database & files
├── logs/                ← Log files
├── .venv/               ← Virtual environment (tự tạo)
└── app/                 ← Source code
```

## 🎉 Xong!

Chỉ cần chạy:
```bat
run.bat
```

Mọi thứ sẽ tự động!
