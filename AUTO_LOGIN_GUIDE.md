# 🔐 Auto-Login Guide - TeleDrive

## Tính Năng Auto-Login

TeleDrive hỗ trợ **tự động đăng nhập** từ Telegram Desktop, giúp bạn không cần nhập số điện thoại và mã xác thực.

---

## 🎯 Yêu Cầu

### 1. Python 3.11
- ✅ **Bắt buộc**: Python 3.11 (opentele chỉ hoạt động với Python 3.11)
- ❌ **Không hỗ trợ**: Python 3.12, 3.13, 3.14+

### 2. Telegram Desktop
- ✅ Đã cài đặt Telegram Desktop
- ✅ Đã đăng nhập ít nhất 1 account
- ✅ Telegram Desktop đang chạy hoặc đã từng chạy

### 3. Package opentele
- Tự động cài đặt khi chạy `setup_portable_python.bat`
- Hoặc cài thủ công: `pip install opentele`

---

## 🚀 Cách Sử Dụng

### Phương Pháp 1: Tự Động (Khi Khởi Động)

Khi bạn mở TeleDrive lần đầu, ứng dụng sẽ **tự động thử** đăng nhập từ Telegram Desktop:

1. Chạy `run.bat`
2. Ứng dụng tự động kiểm tra Telegram Desktop
3. Nếu tìm thấy session → tự động đăng nhập
4. Nếu không → hiển thị trang login

### Phương Pháp 2: Thủ Công (Nút Auto-Login)

Nếu auto-login tự động thất bại, bạn có thể thử lại:

1. Vào trang login (`/telegram_login`)
2. Click nút **"Try Auto-Login from Telegram Desktop"** (màu xanh lá)
3. Chờ xử lý (icon quay)
4. Kết quả:
   - ✅ **Thành công**: Tự động redirect về dashboard
   - ❌ **Thất bại**: Hiển thị lỗi chi tiết + hint

---

## 🐛 Xử Lý Lỗi

### Lỗi 1: "Không tìm thấy Telegram Desktop"

**Nguyên nhân**: Telegram Desktop chưa được cài đặt hoặc không ở vị trí mặc định

**Giải pháp**:
1. Cài đặt Telegram Desktop từ: https://desktop.telegram.org/
2. Đăng nhập vào Telegram Desktop
3. Thử lại auto-login

**Vị trí tìm kiếm**:
- Windows: `%APPDATA%\Telegram Desktop\tdata`
- macOS: `~/Library/Application Support/Telegram Desktop/tdata`
- Linux: `~/.local/share/TelegramDesktop/tdata`

---

### Lỗi 2: "Telegram Desktop chưa có account nào được đăng nhập"

**Nguyên nhân**: Telegram Desktop chưa đăng nhập hoặc session bị lỗi

**Giải pháp**:
1. Mở Telegram Desktop
2. Đăng nhập vào account của bạn
3. Đợi sync xong
4. Đóng Telegram Desktop (hoặc để chạy)
5. Thử lại auto-login trong TeleDrive

---

### Lỗi 3: "opentele không tương thích với Python hiện tại"

**Nguyên nhân**: Đang dùng Python 3.12+ thay vì Python 3.11

**Giải pháp**:
1. Cài Python 3.11 portable:
   ```bash
   setup_portable_python.bat
   ```
2. Hoặc cài Python 3.11 system-wide
3. Chạy lại `run.bat`

**Kiểm tra Python version**:
```bash
python --version
# Hoặc
python311\python.exe --version
```

---

### Lỗi 4: "Auto-login đã được thử trước đó"

**Nguyên nhân**: Flag ngăn retry để tránh loop

**Giải pháp**:
1. Click nút **"Try Auto-Login"** để reset flag và thử lại
2. Hoặc refresh trang và thử lại

---

## 🔧 Troubleshooting

### Kiểm Tra Telegram Desktop Session

**Windows**:
```bash
dir "%APPDATA%\Telegram Desktop\tdata"
```

Nên thấy các file:
- `key_data` hoặc `key_datas`
- Các folder có tên dạng `D877F783D5D3EF8C`
- File `settings` hoặc `settings0`

### Kiểm Tra opentele

```bash
python -c "import opentele; print('opentele OK')"
```

Nếu lỗi:
```bash
pip install opentele
```

### Kiểm Tra Python Version

```bash
python --version
```

Phải là `Python 3.11.x`

---

## 📝 Lưu Ý

### Bảo Mật
- ✅ Session được mã hóa
- ✅ Không lưu password
- ✅ Chỉ copy session, không modify Telegram Desktop
- ✅ Session được lưu local trong `data/`

### Giới Hạn
- ❌ Chỉ hoạt động với Python 3.11
- ❌ Cần Telegram Desktop đã đăng nhập
- ❌ Không hoạt động với Telegram Web

### Fallback
Nếu auto-login không hoạt động, bạn vẫn có thể:
1. Đăng nhập thủ công bằng số điện thoại
2. Nhập mã xác thực từ Telegram
3. Sử dụng bình thường

---

## 🎯 Flow Chart

```
Start
  ↓
Chạy run.bat
  ↓
Tìm Python 3.11? ──No──→ Cài Python 3.11 portable
  ↓ Yes
Tìm Telegram Desktop? ──No──→ Hiển thị login page
  ↓ Yes
Load session từ tdata
  ↓
Session hợp lệ? ──No──→ Hiển thị login page
  ↓ Yes
Convert sang Telethon
  ↓
Authorize? ──No──→ Hiển thị login page
  ↓ Yes
✅ Đăng nhập thành công!
  ↓
Redirect to Dashboard
```

---

## 💡 Tips

### Tăng Tỷ Lệ Thành Công

1. **Đảm bảo Telegram Desktop đã đăng nhập**
   - Mở Telegram Desktop
   - Kiểm tra có thấy tin nhắn không
   - Đợi sync xong

2. **Sử dụng Python 3.11**
   - Dùng Python portable từ `setup_portable_python.bat`
   - Hoặc cài Python 3.11 system-wide

3. **Không xóa tdata**
   - Không xóa folder `%APPDATA%\Telegram Desktop\tdata`
   - Không logout khỏi Telegram Desktop

4. **Thử lại nếu thất bại**
   - Click nút "Try Auto-Login" để retry
   - Hoặc refresh trang

---

## 📚 Tài Liệu Liên Quan

- [opentele Documentation](https://github.com/thedemons/opentele)
- [Telegram Desktop](https://desktop.telegram.org/)
- [TeleDrive README](README.md)

---

**Chúc bạn sử dụng vui vẻ! 🎉**
