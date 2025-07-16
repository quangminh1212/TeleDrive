# TeleDrive v2.0 - Hướng Dẫn Cấu Hình

## 📋 Tổng Quan

TeleDrive v2.0 sử dụng hệ thống cấu hình tập trung trong file `config.json` để lưu trữ tất cả thông tin và tham số cần thiết cho dự án. Điều này giúp:

- ✅ Quản lý cấu hình tập trung
- ✅ Dễ dàng backup và restore
- ✅ Validation tự động
- ✅ Hỗ trợ nhiều môi trường
- ✅ Cấu hình UI và API

## 🚀 Khởi Chạy Nhanh

### 1. Chạy TeleDrive
```bash
run.bat
```

### 2. Cấu hình lần đầu
```bash
python config_setup.py
```

## 📁 Cấu Trúc Config

### 🔧 Các Section Chính

#### 1. **Project** - Thông tin dự án
```json
{
  "project": {
    "name": "TeleDrive",
    "version": "2.0.0",
    "debug_mode": false,
    "auto_update": true
  }
}
```

#### 2. **Telegram** - API Configuration
```json
{
  "telegram": {
    "api_id": "21272067",
    "api_hash": "b7690dc86952dbc9b16717b101164af3",
    "phone_number": "+84936374950",
    "session_name": "telegram_scanner_session",
    "auto_login": true,
    "two_factor_auth": {
      "enabled": false,
      "password": ""
    }
  }
}
```

#### 3. **Channels** - Quản lý kênh/group
```json
{
  "channels": {
    "global_settings": {
      "auto_join_private": true,
      "parallel_scan": false,
      "max_concurrent_channels": 3
    },
    "list": [
      {
        "id": "my_channel",
        "name": "Kênh của tôi",
        "type": "public",
        "identifier": "@mychannel",
        "enabled": true,
        "settings": {
          "max_messages": null,
          "file_types": {
            "documents": true,
            "photos": true,
            "videos": true
          }
        }
      }
    ]
  }
}
```

#### 4. **Output** - Cấu hình xuất file
```json
{
  "output": {
    "directory": "output",
    "formats": {
      "csv": {"enabled": true, "filename": "telegram_files.csv"},
      "json": {"enabled": true, "filename": "telegram_files.json"},
      "excel": {"enabled": true, "filename": "telegram_files.xlsx"}
    }
  }
}
```

#### 5. **UI** - Giao diện web
```json
{
  "ui": {
    "enabled": true,
    "server": {
      "host": "127.0.0.1",
      "port": 8080
    },
    "theme": {
      "default": "telegram",
      "dark_mode": true
    }
  }
}
```

#### 6. **Database** - Cơ sở dữ liệu
```json
{
  "database": {
    "enabled": true,
    "type": "sqlite",
    "connection": {
      "sqlite": {
        "file": "data/teledrive.db"
      }
    }
  }
}
```

## 🛠️ Công Cụ Quản Lý

### 1. Config Setup (Khuyến nghị)
```bash
python config_setup.py
```
- Menu tương tác thân thiện
- Validation tự động
- Hỗ trợ đầy đủ tính năng

### 2. Config Manager (Nâng cao)
```bash
python config_manager.py
```
- Công cụ dòng lệnh
- Sync từ .env
- Validation chi tiết

### 3. Programmatic API
```python
from config_manager import ConfigManager

# Khởi tạo
cm = ConfigManager()

# Thêm kênh
cm.add_channel({
    'id': 'new_channel',
    'name': 'Kênh mới',
    'type': 'public',
    'identifier': '@newchannel'
})

# Cập nhật UI
cm.update_ui_config('theme', {'dark_mode': False})

# Lưu cấu hình
cm.save_config()
```

## 📺 Quản Lý Kênh

### Thêm Kênh Public
```python
channel_data = {
    'id': 'public_channel',
    'name': 'Kênh Public',
    'type': 'public',
    'identifier': '@channelname',
    'enabled': True
}
cm.add_channel(channel_data)
```

### Thêm Kênh Private
```python
channel_data = {
    'id': 'private_channel',
    'name': 'Kênh Private',
    'type': 'private',
    'identifier': '@privatechannel',
    'invite_link': 'https://t.me/joinchat/XXXXXXXXX',
    'auto_join': True,
    'enabled': True
}
cm.add_channel(channel_data)
```

### Cấu Hình File Types
```python
file_types = {
    'documents': True,
    'photos': True,
    'videos': False,
    'audio': True,
    'voice': False,
    'stickers': False,
    'animations': True,
    'video_notes': False
}

cm.update_channel('channel_id', {
    'settings': {'file_types': file_types}
})
```

## 🔍 Validation & Debugging

### Kiểm Tra Cấu Hình
```python
from config_manager import ConfigManager, ConfigValidator

cm = ConfigManager()
validator = ConfigValidator()

# Validate config.json
if validator.validate_config_json():
    print("✅ Config hợp lệ!")
else:
    print("❌ Config có lỗi:")
    print(validator.get_validation_report())
```

### Debug Mode
```json
{
  "project": {
    "debug_mode": true
  },
  "logging": {
    "level": "DEBUG",
    "detailed_steps": true
  }
}
```

## 🔄 Migration & Backup

### Auto Migration
- Config tự động migrate từ v1.0 lên v2.0
- Giữ nguyên cài đặt cũ
- Thêm các tính năng mới

### Backup Config
```python
import json
import shutil
from datetime import datetime

# Backup config
backup_name = f"config_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
shutil.copy('config.json', f'backups/{backup_name}')
```

### Restore Config
```python
# Restore từ backup
shutil.copy('backups/config_backup_20250116_120000.json', 'config.json')
```

## 🎯 Best Practices

### 1. **Luôn Backup Trước Khi Thay Đổi**
```bash
copy config.json config_backup.json
```

### 2. **Sử dụng Templates**
```python
# Sử dụng template có sẵn
document_template = cm.get_config('channels')['templates']['document_only']
cm.update_channel('channel_id', {'settings': document_template})
```

### 3. **Validate Sau Mỗi Thay Đổi**
```python
if not cm.validate_configuration():
    print("❌ Cấu hình không hợp lệ!")
    # Rollback hoặc sửa lỗi
```

### 4. **Sử dụng Environment Variables Cho Sensitive Data**
```json
{
  "telegram": {
    "api_id": "${TELEGRAM_API_ID}",
    "api_hash": "${TELEGRAM_API_HASH}",
    "phone_number": "${TELEGRAM_PHONE}"
  }
}
```

## 🆘 Troubleshooting

### Lỗi Thường Gặp

#### 1. **Config không hợp lệ**
```bash
python -c "from config_manager import ConfigValidator; v = ConfigValidator(); v.validate_config_json(); print(v.get_validation_report())"
```

#### 2. **Kênh không quét được**
- Kiểm tra `enabled: true`
- Kiểm tra `identifier` đúng format
- Kiểm tra quyền truy cập kênh

#### 3. **API lỗi**
- Kiểm tra API_ID, API_HASH
- Kiểm tra số điện thoại format
- Kiểm tra session file

### Reset Config
```python
from config_manager import ConfigManager
cm = ConfigManager()
cm.config = cm.get_default_config()
cm.save_config()
```

## 📞 Hỗ Trợ

- 📧 Email: support@teledrive.app
- 🐛 Issues: GitHub Issues
- 📖 Docs: https://teledrive.app/docs
- 💬 Community: Telegram Group

---

**TeleDrive v2.0** - Advanced Telegram File Scanner with Complete Configuration Management
