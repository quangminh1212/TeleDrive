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
