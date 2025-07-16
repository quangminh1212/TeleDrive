<<<<<<< HEAD
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
=======
# TeleDrive - Troubleshooting Guide

## 🚨 Lỗi Virtual Environment

### Vấn đề: "The system cannot find the path specified"

**Nguyên nhân:** Virtual environment không được tạo đúng hoặc đường dẫn bị lỗi.

**Giải pháp:**

#### 1. Chạy setup đơn giản:
```bash
setup_simple.bat
```

#### 2. Hoặc tạo virtual environment thủ công:
```bash
python -m venv venv
venv\Scripts\activate.bat
pip install -r requirements.txt
```

#### 3. Chạy mà không cần virtual environment:
```bash
pip install -r requirements.txt
python launcher.py
```

## 🔧 Các Cách Khởi Chạy

### 1. Launcher Python (Khuyến nghị)
```bash
python launcher.py
```

### 2. Batch file đơn giản
```bash
run_direct.bat
```

### 3. Trực tiếp
```bash
python main.py
```

### 4. Cấu hình trước
```bash
python config_setup.py
```

## 📋 Kiểm Tra Hệ Thống

### Test dependencies:
```bash
python -c "import telethon, pandas, tqdm, aiofiles; print('All OK')"
```

### Test config manager:
```bash
python -c "from config_manager import ConfigManager; print('Config OK')"
```

### Test configuration:
```bash
test_config.bat
```

## 🔄 Reset Hoàn Toàn

### 1. Xóa virtual environment:
```bash
rmdir /s venv
```

### 2. Cài đặt lại:
```bash
python -m venv venv
venv\Scripts\activate.bat
pip install -r requirements.txt
```

### 3. Reset config:
```python
from config_manager import ConfigManager
cm = ConfigManager()
cm.config = cm.get_default_config()
cm.save_config()
```

## 🐛 Lỗi Thường Gặp

### 1. ImportError: No module named 'telethon'
```bash
pip install telethon pandas tqdm aiofiles openpyxl
```

### 2. Config validation failed
```bash
python config_setup.py
```

### 3. No channels configured
- Chạy `python config_setup.py`
- Chọn option 2 (Quản lý kênh)
- Thêm ít nhất một kênh

### 4. Telegram API not configured
- Lấy API credentials từ https://my.telegram.org/apps
- Chạy `python config_setup.py`
- Chọn option 1 (Cấu hình Telegram API)

## 📞 Hỗ Trợ Nhanh

### Kiểm tra nhanh:
```bash
python -c "
import sys
print('Python:', sys.version)
try:
    from config_manager import ConfigManager
    cm = ConfigManager()
    print('Config: OK')
    channels = cm.get_enabled_channels()
    print(f'Channels: {len(channels)} enabled')
    tg = cm.get_config('telegram')
    print(f'Telegram: {\"Configured\" if tg.get(\"api_id\") else \"Not configured\"}')
except Exception as e:
    print('Error:', e)
"
```

### Chạy đơn giản nhất:
```bash
python -c "
from config_manager import ConfigManager
import subprocess
import sys

print('Starting TeleDrive...')
try:
    subprocess.run([sys.executable, 'main.py'])
except Exception as e:
    print('Error:', e)
"
```

## 🎯 Khuyến Nghị

1. **Sử dụng Python launcher:** `python launcher.py`
2. **Cấu hình trước khi chạy:** `python config_setup.py`
3. **Kiểm tra dependencies:** `setup_simple.bat`
4. **Tránh virtual environment nếu có vấn đề**

---

**Nếu vẫn gặp vấn đề, hãy chạy:** `python launcher.py`
>>>>>>> 5cd311c28ab0746a2cc2ce9f78e7bad7d2103098
