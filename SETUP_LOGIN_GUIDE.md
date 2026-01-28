# 🔐 Hướng Dẫn Setup Login

## 📋 Tổng Quan

File `setup_login.py` giúp bạn đăng nhập Telegram **một lần duy nhất** để tạo session. Sau đó TeleDrive sẽ tự động sử dụng session này.

---

## 🚀 Cách Sử Dụng

### Bước 1: Chạy Setup

```bash
python setup_login.py
```

### Bước 2: Nhập Thông Tin

Script sẽ hỏi:

1. **Số điện thoại** (với mã quốc gia)
   ```
   📱 Nhập số điện thoại (với mã quốc gia, vd: +84987654321): +84987654321
   ```

2. **Mã xác thực** (từ Telegram)
   ```
   🔑 Nhập mã xác thực (5-6 chữ số): 12345
   ```

3. **Mật khẩu 2FA** (nếu có)
   ```
   🔑 Nhập mật khẩu 2FA: your_password
   ```

### Bước 3: Hoàn Tất

```
✅ Đăng nhập thành công!

👤 Đã đăng nhập:
   Tên: John Doe
   Username: @johndoe
   Phone: +84987654321
   ID: 123456789

💾 Session đã được lưu: data/session.session
✅ Bạn có thể sử dụng TeleDrive ngay bây giờ!

🎉 SETUP HOÀN TẤT!
```

---

## ✅ Sau Khi Setup

Session đã được tạo tại: `data/session.session`

Bây giờ bạn có thể:

1. **Chạy TeleDrive:**
   ```bash
   run.bat
   ```
   hoặc
   ```bash
   python main.py
   ```

2. **TeleDrive sẽ tự động:**
   - Sử dụng session đã tạo
   - Không cần nhập số điện thoại
   - Không cần nhập mã xác thực
   - Đăng nhập tự động!

---

## 💡 Ưu Điểm

### So với opentele:
- ✅ **Hoạt động với mọi Python version** (3.7+)
- ✅ **Không cần Python 3.11**
- ✅ **Không phụ thuộc Telegram Desktop**
- ✅ **Đơn giản, dễ hiểu**

### So với đăng nhập mỗi lần:
- ✅ **Chỉ cần đăng nhập 1 lần**
- ✅ **Session được lưu vĩnh viễn**
- ✅ **Tự động đăng nhập sau này**

---

## 🔍 Kiểm Tra Session

Sau khi setup, kiểm tra session:

```bash
dir data\session.session
```

Nếu thấy file → ✅ Setup thành công!

---

## 🔄 Đăng Nhập Lại

Nếu muốn đăng nhập account khác:

1. **Xóa session cũ:**
   ```bash
   del data\session.session
   ```

2. **Chạy lại setup:**
   ```bash
   python setup_login.py
   ```

---

## ❌ Xử Lý Lỗi

### Lỗi: "Mã xác thực không đúng"

**Nguyên nhân:** Nhập sai mã hoặc mã đã hết hạn

**Giải pháp:**
1. Kiểm tra lại mã trong Telegram
2. Nhập đúng 5-6 chữ số
3. Nếu hết hạn, chạy lại setup để nhận mã mới

---

### Lỗi: "Số điện thoại không hợp lệ"

**Nguyên nhân:** Định dạng số điện thoại sai

**Giải pháp:**
- Phải có mã quốc gia: `+84987654321`
- Không có khoảng trắng
- Không có dấu gạch ngang

---

### Lỗi: "Không thể kết nối"

**Nguyên nhân:** 
- Không có internet
- Telegram bị chặn
- API credentials sai

**Giải pháp:**
1. Kiểm tra kết nối internet
2. Thử dùng VPN nếu Telegram bị chặn
3. Kiểm tra API_ID và API_HASH trong config.json

---

## 🔐 Bảo Mật

### Session File
- ✅ Được mã hóa
- ✅ Chỉ hoạt động trên máy tạo ra
- ✅ Không chứa password
- ⚠️ **Không chia sẻ với người khác**

### Backup Session
Nếu muốn backup:
```bash
copy data\session.session data\session_backup.session
```

### Xóa Session
Nếu muốn logout:
```bash
del data\session.session
```

---

## 📊 So Sánh Các Phương Pháp

| Phương Pháp | Python Version | Telegram Desktop | Độ Khó | Khuyến Nghị |
|-------------|----------------|------------------|--------|-------------|
| **setup_login.py** | Mọi version | Không cần | ⭐ Dễ | ✅ Khuyến nghị |
| opentele | Chỉ 3.11 | Cần có | ⭐⭐ Trung bình | ⚠️ Có thể lỗi |
| Đăng nhập mỗi lần | Mọi version | Không cần | ⭐⭐⭐ Khó | ❌ Không khuyến nghị |

---

## 🎯 Tóm Tắt

```
1. Chạy: python setup_login.py
2. Nhập số điện thoại
3. Nhập mã xác thực
4. ✅ Xong! Session đã được tạo
5. Chạy: run.bat
6. 🎉 TeleDrive tự động đăng nhập!
```

---

**Chúc bạn setup thành công! 🎉**
