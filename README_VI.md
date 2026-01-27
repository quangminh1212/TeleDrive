# 🚀 TeleDrive Desktop

Quản lý files trên Telegram như Google Drive!

## ⚠️ VẤN ĐỀ QUAN TRỌNG - CHỈ PYTHON 3.11!

**OPENTELE chỉ hoạt động với Python 3.11**

Các version khác KHÔNG hoạt động:
- ❌ Python 3.12 - opentele không build được
- ❌ Python 3.13 - opentele không build được
- ❌ Python 3.14 - opentele không build được
- ✅ **Python 3.11 - DUY NHẤT hoạt động!**

## ✅ GIẢI PHÁP NHANH

### Bước 1: Cài Python 3.11

```bat
run.bat
```

Script sẽ **TỰ ĐỘNG** cài Python 3.11 nếu không tìm thấy!

Hoặc cài thủ công:
```bat
QUICK_FIX.bat
```

Hoặc download thủ công:
1. Truy cập: https://www.python.org/downloads/release/python-31110/
2. Tải: **Windows installer (64-bit)**
3. Chạy installer
4. **✅ QUAN TRỌNG: Tick "Add Python 3.11 to PATH"**
5. Click "Install Now"

### Bước 2: Chạy ứng dụng

**Đóng CMD hiện tại, mở CMD mới**, sau đó:

```bat
run.bat
```

## 🎯 Tại sao CHỈ Python 3.11?

| Tính năng | Python 3.12+ | Python 3.11 |
|-----------|-------------|-------------|
| Auto-login | ❌ opentele không build | ✅ Hoạt động |
| Embedded webview | ⚠️ Một số lỗi | ✅ Hoạt động |
| Tất cả packages | ❌ Nhiều lỗi | ✅ Ổn định |

**Lý do kỹ thuật:**
- OPENTELE sử dụng các API nội bộ của Python
- Python 3.12+ có thay đổi breaking changes
- OPENTELE chưa cập nhật hỗ trợ Python 3.12+
- Không có cách nào khác ngoài dùng Python 3.11

## 📋 Sau khi cài Python 3.11

### Kiểm tra:
```bat
py -3.11 --version
```

Hoặc:
```bat
python3.11 --version
```

### Chạy ứng dụng:
```bat
run.bat
```

Script `run.bat` sẽ tự động:
1. ✅ Phát hiện Python 3.11
2. ✅ Tạo virtual environment
3. ✅ Cài đặt dependencies
4. ✅ Cài webview libraries
5. ✅ Chạy ứng dụng với auto-login

## 🔧 Các lệnh hữu ích

### Kiểm tra Python versions
```bat
check_python.bat
```

### Cài Python 3.11
```bat
install_python311.bat
```

### Setup lại từ đầu
```bat
setup_python311.bat
```

### Chạy ứng dụng
```bat
run.bat
```

## 📱 Giao diện

- 🎨 Giao diện giống Google Drive
- 📂 Sidebar với navigation
- 🔍 Search bar
- 📊 File grid view
- 🔐 Auto-login từ Telegram Desktop (CHỈ với Python 3.11!)

## 🆘 Troubleshooting

### "opentele không tương thích"
→ Đang dùng Python 3.12+, PHẢI dùng Python 3.11
→ Chạy `run.bat` để tự động cài Python 3.11

### "pywebview not available"
→ Bình thường với Python 3.12+, cài Python 3.11 để fix

### "pythonnet build failed"
→ Bình thường với Python 3.12+, cài Python 3.11 để fix

### "Auto-login failed"
→ Cần Python 3.11 và Telegram Desktop đã đăng nhập

## 💡 Tips

1. **CHỈ dùng Python 3.11** - không dùng version khác!
2. **Đóng và mở lại CMD** sau khi cài Python mới
3. **Giữ Telegram Desktop mở** để auto-login hoạt động
4. **Chạy `run.bat`** - mọi thứ tự động!
5. **Python 3.11 có thể cài song song** với Python khác

## 📂 Cấu trúc

```
TeleDrive/
├── QUICK_FIX.bat        ← Cài Python 3.11 nhanh
├── run.bat              ← Chạy ứng dụng (tự động mọi thứ)
├── check_python.bat     ← Kiểm tra Python versions
├── install_python311.bat ← Cài Python 3.11
├── setup_python311.bat  ← Setup với Python 3.11
├── data/                ← Database & files
├── logs/                ← Log files
└── app/                 ← Source code
```

## 🎉 Tóm tắt

1. Chạy `run.bat` (tự động cài Python 3.11)
2. Đóng CMD, mở CMD mới
3. Chạy lại `run.bat`
4. Enjoy! 🚀

---

**Lưu ý:** Python 3.12+ quá mới, OPENTELE chưa hỗ trợ. Python 3.11 là phiên bản DUY NHẤT tương thích!
