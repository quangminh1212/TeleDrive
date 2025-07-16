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

### File `run_config.json` (Tham số)
```json
{
  "channel": "@duongtinhchat92",
  "max_messages": 1000,
  "file_types": {
    "documents": true,
    "photos": true,
    "videos": true,
    "audio": true
  },
  "output_formats": {
    "csv": true,
    "json": true,
    "excel": true
  }
}
```

## 📊 Kết quả

File lưu trong `output/`:
- `telegram_files.csv`
- `telegram_files.json`  
- `telegram_files.xlsx`

## 🛠️ Troubleshooting

- **Lỗi API:** Kiểm tra `.env`
- **Lỗi config:** Chạy `run.bat config`
- **Thiếu dependencies:** Chạy `setup.bat`
