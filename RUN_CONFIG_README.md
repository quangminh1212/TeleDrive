# Run Config - Hệ thống cấu hình tham số đầu vào

## Tổng quan

Hệ thống Run Config cho phép bạn cấu hình các tham số đầu vào cho `run.bat` một cách dễ dàng và linh hoạt. Thay vì phải chỉnh sửa file `config.json` phức tạp, bạn có thể sử dụng file `run_config.json` đơn giản hơn.

## Các file liên quan

- **`run_config.json`** - File cấu hình chính chứa các tham số đầu vào
- **`run_config_manager.py`** - Script Python để quản lý cấu hình
- **`run_config.bat`** - Giao diện batch để cấu hình dễ dàng
- **`run.bat`** - Đã được cập nhật để sử dụng run_config.json

## Cách sử dụng

### 1. Sử dụng giao diện batch (Khuyến nghị)

```batch
run_config.bat
```

Giao diện menu cho phép bạn:
- Xem cấu hình hiện tại
- Áp dụng cấu hình vào config.json
- Chỉnh sửa cấu hình nhanh
- Reset về cấu hình mặc định

### 2. Sử dụng script Python trực tiếp

```bash
# Xem cấu hình hiện tại
python run_config_manager.py show

# Áp dụng cấu hình vào config.json
python run_config_manager.py apply
```

### 3. Chỉnh sửa file JSON trực tiếp

Mở file `run_config.json` và chỉnh sửa các giá trị theo nhu cầu.

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
   - Kiểm tra file `.env`
   - Đồng bộ từ `.env` sang `config.json`
   - **Áp dụng `run_config.json` vào `config.json`** (MỚI)
   - Kiểm tra tính hợp lệ của cấu hình
   - Chạy scanner với cấu hình đã được áp dụng

2. **Khi sử dụng `run_config.bat`:**
   - Quản lý file `run_config.json`
   - Áp dụng thay đổi vào `config.json`
   - Không cần restart để thay đổi có hiệu lực

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
