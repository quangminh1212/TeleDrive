# Telegram File Scanner

Công cụ quét và tải file từ các kênh Telegram private một cách tự động.

## 🚀 Sử dụng đơn giản

### Lần đầu:
```batch
setup.bat
```

### Chạy scanner:
```batch
run.bat
```

### Cấu hình nhanh:
```batch
run.bat config
```

## ✨ Tính năng

- ✅ **Tự động hoàn toàn** - Không cần input
- ✅ **Menu cấu hình** - Thay đổi setting dễ dàng  
- ✅ **Đa định dạng** - CSV, JSON, Excel
- ✅ **Tiếng Việt** - Giao diện tiếng Việt
- ✅ **Logging chi tiết** - Theo dõi quá trình

## 📁 Cấu hình

### File `.env` (API)
```env
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash  
TELEGRAM_PHONE=+84xxxxxxxxx
```

### File `config.json` (Cấu hình chính)
```json
{
  "telegram": {
    "api_id": "your_api_id",
    "api_hash": "your_api_hash",
    "phone_number": "+84xxxxxxxxx"
  },
  "channels": {
    "use_default_channel": true,
    "default_channel": "@your_channel_here"
  },
  "scanning": {
    "max_messages": 1000,
    "batch_size": 50,
    "file_types": {
      "documents": true,
      "photos": true,
      "videos": true,
      "audio": true
    }
  },
  "output": {
    "formats": {
      "csv": {"enabled": true},
      "json": {"enabled": true},
      "excel": {"enabled": true}
    }
  }
}
```

**⚠️ Quan trọng:**
- Thay `@your_channel_here` bằng channel thực tế
- **Public channel:** `@channelname`
- **Private channel:** `https://t.me/+xxxxx`

## 📊 Kết quả

File lưu trong `output/`:
- `telegram_files.csv`
- `telegram_files.json`  
- `telegram_files.xlsx`

## 🛠️ Troubleshooting

- **Lỗi API:** Kiểm tra `.env`
- **Lỗi config:** Chạy `run.bat config`
- **Thiếu dependencies:** Chạy `setup.bat`
