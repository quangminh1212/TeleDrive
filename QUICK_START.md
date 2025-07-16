# TeleDrive v2.0 - Quick Start Guide

## 🚀 Khởi Chạy Nhanh

### 1. Chạy ứng dụng
```bash
run.bat
```

### 2. Nếu gặp lỗi, chạy test trước
```bash
test_config.bat
```

## 🔧 Cấu Hình

### Cấu hình tương tác (Khuyến nghị)
```bash
python config_setup.py
```

### Cấu hình thủ công
Chỉnh sửa file `config.json`:

```json
{
  "telegram": {
    "api_id": "21272067",
    "api_hash": "b7690dc86952dbc9b16717b101164af3", 
    "phone_number": "+84936374950"
  },
  "channels": {
    "list": [
      {
        "id": "my_channel",
        "name": "Kênh của tôi",
        "type": "public",
        "identifier": "@mychannel",
        "enabled": true
      }
    ]
  }
}
```

## 📺 Thêm Kênh

### Thêm kênh public
```python
from config_manager import ConfigManager
cm = ConfigManager()

cm.add_channel({
    'id': 'public_channel',
    'name': 'Kênh Public',
    'type': 'public', 
    'identifier': '@channelname'
})
```

### Thêm kênh private
```python
cm.add_channel({
    'id': 'private_channel',
    'name': 'Kênh Private',
    'type': 'private',
    'identifier': '@privatechannel',
    'invite_link': 'https://t.me/joinchat/XXXXXXXXX'
})
```

## 🔍 Kiểm Tra

### Kiểm tra cấu hình
```python
from config_manager import ConfigManager
cm = ConfigManager()
cm.validate_configuration()
```

### Xem kênh được bật
```python
channels = cm.get_enabled_channels()
print(f"Có {len(channels)} kênh được bật")
```

## 📁 Cấu Trúc File

```
TeleDrive/
├── config.json          # Cấu hình chính
├── config_manager.py    # Quản lý cấu hình
├── config_setup.py      # Thiết lập tương tác
├── run.bat             # Script khởi chạy
├── main.py             # Ứng dụng chính
├── output/             # Kết quả quét
├── logs/               # Log files
└── data/               # Database
```

## ❓ Troubleshooting

### Lỗi encoding trong batch file
- Sử dụng `run.bat` thay vì `run_simple.bat`
- Chạy từ Command Prompt thay vì PowerShell

### Lỗi import config_manager
```bash
pip install -r requirements.txt
```

### Lỗi cấu hình
```bash
python config_setup.py
```

### Reset cấu hình
```python
from config_manager import ConfigManager
cm = ConfigManager()
cm.config = cm.get_default_config()
cm.save_config()
```

## 📞 Hỗ Trợ

- 📖 Hướng dẫn chi tiết: `CONFIG_GUIDE.md`
- 🧪 Test cấu hình: `test_config.bat`
- 🔧 Cấu hình tương tác: `python config_setup.py`

---

**TeleDrive v2.0** - Hệ thống cấu hình tập trung hoàn chỉnh!
