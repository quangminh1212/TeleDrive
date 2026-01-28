# 🚀 Hướng Dẫn Đăng Nhập TeleDrive

## ✨ Đăng Nhập Tự Động (Auto-Login)

TeleDrive sử dụng **auto-login từ Telegram Desktop** - không cần nhập số điện thoại hay mã xác thực!

---

## 📋 Yêu Cầu

### 1. Telegram Desktop
- ✅ Đã cài đặt Telegram Desktop
- ✅ Đã đăng nhập vào account
- ✅ Telegram Desktop đang chạy hoặc đã từng chạy

**Tải Telegram Desktop:** https://desktop.telegram.org/

### 2. Python 3.11
- ✅ **Bắt buộc**: Python 3.11 (opentele chỉ hoạt động với 3.11)
- ❌ **Không hỗ trợ**: Python 3.12, 3.13, 3.14+

**Cài Python 3.11 portable:**
```bash
setup_portable_python.bat
```

---

## 🎯 Cách Đăng Nhập

### Bước 1: Chuẩn Bị

1. **Mở Telegram Desktop**
2. **Đăng nhập** vào account của bạn
3. **Đợi sync xong** (thấy tin nhắn cũ hiện ra)
4. Có thể đóng Telegram Desktop hoặc để chạy

### Bước 2: Khởi Động TeleDrive

```bash
run.bat
```

### Bước 3: Đăng Nhập

1. Ứng dụng sẽ **tự động thử đăng nhập** khi mở
2. Nếu thành công → Chuyển thẳng vào dashboard
3. Nếu thất bại → Hiển thị trang login với nút "Login from Telegram Desktop"
4. Click nút để thử lại

---

## ❌ Xử Lý Lỗi

### Lỗi: "Telegram Desktop chưa có account nào được đăng nhập"

**Nguyên nhân:** Telegram Desktop chưa đăng nhập

**Giải pháp:**
1. Mở Telegram Desktop
2. Đăng nhập vào account
3. Đợi sync xong (thấy tin nhắn)
4. Quay lại TeleDrive và click nút "Login from Telegram Desktop"

---

### Lỗi: "Không tìm thấy Telegram Desktop"

**Nguyên nhân:** Telegram Desktop chưa được cài đặt

**Giải pháp:**
1. Tải và cài Telegram Desktop: https://desktop.telegram.org/
2. Đăng nhập vào account
3. Thử lại

---

### Lỗi: "opentele không tương thích với Python hiện tại"

**Nguyên nhân:** Đang dùng Python 3.12+ thay vì Python 3.11

**Giải pháp:**
```bash
setup_portable_python.bat
```

Hoặc cài Python 3.11 system-wide

---

## 🔍 Kiểm Tra

### Kiểm tra Telegram Desktop đã đăng nhập

**Windows:**
```cmd
dir "%APPDATA%\Telegram Desktop\tdata"
```

Bạn nên thấy:
- ✅ Folder có tên dạng `D877F783D5D3EF8C`
- ✅ File `key_data` hoặc `key_datas`
- ✅ File `settings`

### Kiểm tra Python version

```cmd
python --version
```

Phải là **Python 3.11.x**

### Kiểm tra opentele

```cmd
python -c "import opentele; print('opentele OK')"
```

Nếu lỗi:
```cmd
pip install opentele
```

---

## 💡 Tips

### Tăng Tỷ Lệ Thành Công

1. **Luôn giữ Telegram Desktop đã đăng nhập**
   - Không logout
   - Không xóa folder tdata

2. **Sử dụng Python 3.11**
   - Chạy `setup_portable_python.bat`
   - Hoặc cài Python 3.11 system-wide

3. **Đợi Telegram Desktop sync xong**
   - Sau khi đăng nhập Telegram Desktop
   - Đợi thấy tin nhắn cũ hiện ra
   - Mới khởi động TeleDrive

---

## 🔐 Bảo Mật

- ✅ Session được mã hóa
- ✅ Không lưu password
- ✅ Chỉ copy session, không modify Telegram Desktop
- ✅ Session được lưu local trong `data/`

---

## 📝 Lưu Ý

### Giới Hạn
- ❌ Chỉ hoạt động với Python 3.11
- ❌ Cần Telegram Desktop đã đăng nhập
- ❌ Không hoạt động với Telegram Web

### Telegram Desktop
- ⚠️ Không cần Telegram Desktop đang chạy khi dùng TeleDrive
- ⚠️ Nhưng phải đã từng đăng nhập ít nhất 1 lần
- ⚠️ Không xóa folder `%APPDATA%\Telegram Desktop\tdata`

---

## 🎯 Tóm Tắt Nhanh

```
1. Cài Telegram Desktop
2. Đăng nhập vào account
3. Đợi sync xong
4. Chạy: run.bat
5. ✅ Tự động đăng nhập!
```

---

## 🆘 Vẫn Gặp Vấn Đề?

1. **Kiểm tra log:**
   ```
   type teledrive.log
   ```

2. **Xem hướng dẫn chi tiết:**
   - `FIX_AUTO_LOGIN_ISSUE.md`
   - `AUTO_LOGIN_GUIDE.md`

3. **Báo lỗi:**
   - Copy log từ `teledrive.log`
   - Mô tả chi tiết vấn đề
   - Gửi issue trên GitHub

---

**Chúc bạn sử dụng vui vẻ! 🎉**
