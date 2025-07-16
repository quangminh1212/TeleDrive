# Telegram File Scanner - Hướng dẫn sử dụng

## Tổng quan

Telegram File Scanner đã được tối ưu hóa để chạy đơn giản chỉ với một lệnh duy nhất. Tất cả cấu hình được quản lý tự động thông qua file `run_config.json`.

## Cách sử dụng

### 1. Chạy scanner (Cách chính)

```batch
run.bat
```

Scanner sẽ tự động:
- Tạo cấu hình mặc định nếu chưa có
- Áp dụng cấu hình từ `run_config.json`
- Chạy quét file mà không cần input

### 2. Cấu hình nhanh

```batch
run.bat config
```

Mở menu cấu hình cho phép:
- Xem cấu hình hiện tại
- Thay đổi channel
- Thay đổi số tin nhắn tối đa
- Chọn loại file cần quét
- Chọn định dạng đầu ra
- Reset về mặc định

### 3. Cài đặt ban đầu (chỉ lần đầu)

```batch
setup.bat
```

Cài đặt dependencies và tạo file cấu hình cơ bản.

## Cấu trúc file run_config.json (Tối giản)

File `run_config.json` được thiết kế tối giản với chỉ những tham số cần thiết nhất:

```json
{
  "channel": "@duongtinhchat92",    // Channel cần quét
  "max_messages": 1000,            // Số tin nhắn tối đa (null = không giới hạn)
  "batch_size": 50,                // Kích thước batch
  "file_types": {                  // Loại file cần quét
    "documents": true,
    "photos": true,
    "videos": true,
    "audio": true
  },
  "output_formats": {              // Định dạng file đầu ra
    "csv": true,
    "json": true,
    "excel": true
  },
  "show_progress": true,           // Hiển thị thanh tiến trình
  "language": "vi"                 // Ngôn ngữ hiển thị
}
```

### Các tham số:

- **`channel`** - Channel Telegram cần quét (username hoặc invite link)
- **`max_messages`** - Số tin nhắn tối đa để quét (null = không giới hạn)
- **`batch_size`** - Số tin nhắn xử lý trong mỗi batch
- **`file_types`** - Loại file cần quét (documents, photos, videos, audio)
- **`output_formats`** - Định dạng file đầu ra (csv, json, excel)
- **`show_progress`** - Hiển thị thanh tiến trình
- **`language`** - Ngôn ngữ giao diện (vi/en)

## Quy trình hoạt động

1. **Khi chạy `run.bat`:**
   - Tự động tạo `run_config.json` nếu chưa có
   - Kiểm tra file `.env`
   - Đồng bộ từ `.env` sang `config.json`
   - Áp dụng `run_config.json` vào `config.json`
   - Chạy scanner tự động mà không cần input

2. **Khi chạy `run.bat config`:**
   - Mở menu cấu hình trực quan
   - Cho phép thay đổi các tham số nhanh chóng
   - Lưu thay đổi vào `run_config.json`
   - Có thể chạy scanner ngay từ menu

## Ví dụ sử dụng

### Cấu hình nhanh cho quét channel cụ thể
```json
{
  "channel": "@mychannel",
  "max_messages": 500,
  "file_types": {
    "documents": true,
    "photos": false,
    "videos": true,
    "audio": false
  }
}
```

### Cấu hình cho batch lớn
```json
{
  "channel": "@duongtinhchat92",
  "max_messages": null,
  "batch_size": 100,
  "file_types": {
    "documents": true,
    "photos": true,
    "videos": true,
    "audio": true
  }
}
```

### Cấu hình chỉ xuất CSV
```json
{
  "channel": "@duongtinhchat92",
  "output_formats": {
    "csv": true,
    "json": false,
    "excel": false
  }
}
```

## Lưu ý quan trọng

1. **Backup tự động:** Hệ thống tự động backup file cũ trước khi thay đổi
2. **Validation:** Tất cả thay đổi đều được kiểm tra tính hợp lệ
3. **Fallback:** Nếu `run_config.json` có lỗi, hệ thống sẽ dùng cấu hình mặc định
4. **Ưu tiên:** `run_config.json` sẽ ghi đè lên `config.json` khi chạy `run.bat`

## Troubleshooting

### File run_config.json không tồn tại
- Chạy `run_config.bat` và chọn "Reset về cấu hình mặc định"
- Hoặc copy từ template có sẵn

### Lỗi khi áp dụng cấu hình
- Kiểm tra syntax JSON trong file `run_config.json`
- Chạy `python run_config_manager.py show` để debug
- Xem log chi tiết trong thư mục `logs/`

### Cấu hình không có hiệu lực
- Đảm bảo đã chạy `python run_config_manager.py apply`
- Hoặc chạy lại `run.bat` để tự động áp dụng

## Hỗ trợ

Nếu gặp vấn đề, hãy:
1. Kiểm tra file log trong thư mục `logs/`
2. Chạy `run_config.bat` để sử dụng giao diện trực quan
3. Backup và reset về cấu hình mặc định nếu cần
