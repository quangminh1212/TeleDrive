# 🔧 HƯỚNG DẪN SỬA LỖI - TeleDrive

## 🚨 Các lỗi thường gặp và cách khắc phục

### ❌ Lỗi "EOFError" hoặc "Không thể nhập mã xác thực"

**Triệu chứng:**
```
EOFError
Please enter the code you received:
```

**Nguyên nhân:** 
- Chạy script qua file .bat khi chưa đăng nhập lần đầu
- Telegram cần input từ người dùng nhưng không có terminal tương tác

**Giải pháp:**
1. **Đăng nhập lần đầu:**
   ```bash
   login.bat
   ```
   HOẶC
   ```bash
   python login_telegram.py
   ```

2. **Sau khi đăng nhập thành công, dùng:**
   ```bash
   run.bat
   ```

---

### ❌ Lỗi "CancelledError" khi đóng ứng dụng

**Triệu chứng:**
```
asyncio.exceptions.CancelledError
await self.client.disconnect()
```

**Nguyên nhân:** Lỗi khi đóng kết nối Telegram

**Giải pháp:** 
- ✅ **Đã được sửa tự động** trong phiên bản mới
- Có thể bỏ qua lỗi này, không ảnh hưởng đến kết quả

---

### ❌ Lỗi Session không hợp lệ

**Triệu chứng:**
```
Session không hợp lệ - cần đăng nhập lại
```

**Kiểm tra:**
```bash
python check_session.py
```

**Giải pháp:**
1. **Nếu session không hợp lệ:**
   ```bash
   python login_telegram.py
   ```

2. **Nếu muốn đăng nhập tài khoản khác:**
   - Xóa file `telegram_scanner_session.session`
   - Chạy `login.bat`

---

### ❌ Lỗi cấu hình API

**Triệu chứng:**
```
CHUA CAU HINH PHONE_NUMBER trong config
API_ID phải là số nguyên
```

**Giải pháp:**
1. **Chạy config manager:**
   ```bash
   config.bat
   ```

2. **Hoặc sửa thủ công config.json:**
   ```json
   {
     "telegram": {
       "api_id": "21272067",
       "api_hash": "b7690dc86952dbc9b16717b101164af3",
       "phone_number": "+84936374950"
     }
   }
   ```

3. **Lấy API credentials:** https://my.telegram.org/apps

---

### ❌ Lỗi kết nối mạng

**Triệu chứng:**
```
Connection timeout
Network error
```

**Giải pháp:**
1. **Kiểm tra internet**
2. **Thử proxy (nếu cần)** - cấu hình trong config.json:
   ```json
   {
     "advanced": {
       "proxy": {
         "enabled": true,
         "type": "socks5",
         "host": "127.0.0.1",
         "port": 1080
       }
     }
   }
   ```

---

### ❌ Lỗi thiếu dependencies

**Triệu chứng:**
```
ModuleNotFoundError: No module named 'telethon'
```

**Giải pháp:**
```bash
setup.bat
```
HOẶC
```bash
pip install -r requirements.txt
```

---

## 🔄 Quy trình khắc phục tổng quát

### 1. Lần đầu sử dụng:
```bash
setup.bat → config.bat → login.bat → run.bat
```

### 2. Khi có lỗi session:
```bash
check_session.py → login.bat → run.bat
```

### 3. Khi có lỗi cấu hình:
```bash
config.bat → login.bat → run.bat
```

### 4. Reset hoàn toàn:
```bash
# Xóa session cũ
del telegram_scanner_session.session*

# Cài đặt lại
setup.bat → config.bat → login.bat → run.bat
```

---

## 📋 Checklist debug

- [ ] Python đã cài đặt? (`python --version`)
- [ ] Dependencies đã cài? (`pip list | findstr telethon`)
- [ ] Config.json đã đúng? (`python -c "import config; print('OK')"`)
- [ ] Session hợp lệ? (`python check_session.py`)
- [ ] Internet kết nối? (`ping google.com`)
- [ ] API credentials đúng? (Kiểm tra https://my.telegram.org/apps)

---

## 🆘 Khi vẫn không được

1. **Xem log chi tiết:**
   ```bash
   type logs\errors.log
   ```

2. **Chạy với debug mode:**
   ```bash
   python main.py
   ```

3. **Reset hoàn toàn:**
   - Xóa thư mục `logs/`
   - Xóa file `telegram_scanner_session.session*`
   - Chạy lại từ đầu

4. **Liên hệ hỗ trợ** với thông tin:
   - Hệ điều hành
   - Phiên bản Python
   - Nội dung file `logs/errors.log`
   - Các bước đã thực hiện
