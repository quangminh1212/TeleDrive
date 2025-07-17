# TeleDrive - Telegram File Manager

Công cụ quét và quản lý file từ các kênh Telegram với giao diện web hiện đại theo phong cách Telegram.

## 🚀 Sử dụng đơn giản

### Lần đầu:
```batch
setup.bat
```

### Chạy scanner:
```batch
run.bat
```

### Khởi động Web Interface:
```batch
start.bat          # Khởi động đầy đủ với kiểm tra
web.bat           # Khởi động nhanh
run.bat web       # Từ menu chính
```

### Cấu hình nhanh:
```batch
run.bat config
```

## ✨ Tính năng

### Scanner
- ✅ **Tự động hoàn toàn** - Không cần input
- ✅ **Menu cấu hình** - Thay đổi setting dễ dàng
- ✅ **Đa định dạng** - CSV, JSON, Excel
- ✅ **Tiếng Việt** - Giao diện tiếng Việt
- ✅ **Logging chi tiết** - Theo dõi quá trình

### Web Interface 🌐
- ✅ **Giao diện Telegram-style** - Thiết kế theo phong cách Telegram
- ✅ **File Manager** - Quản lý file trực quan
- ✅ **Tìm kiếm & Lọc** - Tìm file nhanh chóng
- ✅ **Responsive** - Tương thích mobile
- ✅ **Chi tiết file** - Xem thông tin đầy đủ
- ✅ **Download links** - Tải file trực tiếp
- ✅ **Multiple sessions** - Quản lý nhiều lần scan

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

## 🌐 Web Interface

Sau khi chạy scanner, bạn có thể sử dụng giao diện web để quản lý file:

1. **Khởi động web interface:**
   ```batch
   run_web.bat
   ```

2. **Truy cập:** http://localhost:5000

3. **Tính năng:**
   - Xem danh sách file theo dạng grid/list
   - Tìm kiếm file theo tên
   - Lọc theo loại file (document, photo, video, audio...)
   - Sắp xếp theo tên, kích thước, ngày
   - Xem chi tiết file trong modal
   - Download file trực tiếp
   - Responsive design cho mobile

4. **Giao diện:**
   - **Header:** Logo, search bar, thống kê tổng quan
   - **Sidebar:** Danh sách các scan sessions
   - **Main:** File grid với toolbar và pagination
   - **Modal:** Chi tiết file với thông tin đầy đủ

## 🎮 Các file batch

### `setup.bat` - Cài đặt ban đầu
- Cài đặt Python packages
- Tạo file .env từ template
- Tạo thư mục output

### `run.bat` - Script chính (đã tích hợp web)
- `run.bat` - Chạy scanner
- `run.bat config` - Menu cấu hình
- `run.bat web` - Khởi động web interface
- `run.bat web-setup` - Cài đặt web dependencies

### `start.bat` - Khởi động web interface (đầy đủ)
- Kiểm tra Python và virtual environment
- Tự động cài đặt Flask dependencies
- Kiểm tra dữ liệu scan
- Khởi động web server với thông báo chi tiết

### `web.bat` - Khởi động web nhanh
- Khởi động web interface đơn giản
- Tự động tạo venv và cài Flask
- Ít thông báo, khởi động nhanh

## 🛠️ Troubleshooting

- **Lỗi API:** Kiểm tra `.env`
- **Lỗi config:** Chạy `run.bat config`
- **Thiếu dependencies:** Chạy `setup.bat`
- **Web interface không khởi động:** Chạy `start.bat` hoặc `web.bat`
- **Lỗi config.json.tmp:** Đã được khắc phục trong phiên bản mới
- **Không có dữ liệu:** Chạy scanner trước khi mở web interface
