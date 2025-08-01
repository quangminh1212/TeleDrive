# 📊 TeleDrive Logging System Guide

Hướng dẫn chi tiết về hệ thống logging của TeleDrive để theo dõi và debug ứng dụng.

## 🚀 Quick Start

### Khởi động với Logging
```bash
# Logging đã được tích hợp vào run.bat
run.bat

# Logging sẽ tự động khởi tạo và ghi vào thư mục logs/
# Không cần script riêng biệt
```

## 📁 Cấu trúc Log Files

```
logs/
├── teledrive.log    # Log chính của ứng dụng
├── config.log       # Thay đổi cấu hình
├── api.log          # API calls đến Telegram
├── files.log        # Thao tác file (tạo, xóa, di chuyển)
├── errors.log       # Lỗi chi tiết với stack trace
└── security.log     # Log bảo mật (nếu có)
```

## ⚙️ Cấu hình Logging

### Trong config.json
```json
{
  "logging": {
    "enabled": true,
    "level": "INFO",
    "console_output": true,
    "detailed_steps": true,
    "log_config_changes": true,
    "log_api_calls": true,
    "log_file_operations": true,
    "show_progress_details": true,
    "format": "%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s",
    "file": "logs/teledrive.log",
    "max_size_mb": 10,
    "backup_count": 5,
    "separate_files": {
      "enabled": true,
      "config_log": "logs/config.log",
      "api_log": "logs/api.log",
      "files_log": "logs/files.log",
      "errors_log": "logs/errors.log"
    }
  }
}
```

### Các tùy chọn cấu hình

| Tùy chọn | Mô tả | Giá trị mặc định |
|----------|-------|------------------|
| `enabled` | Bật/tắt logging chi tiết | `true` |
| `level` | Mức độ log (DEBUG, INFO, WARNING, ERROR) | `INFO` |
| `console_output` | Hiển thị log ra console | `true` |
| `detailed_steps` | Log từng bước chi tiết | `true` |
| `log_config_changes` | Log thay đổi cấu hình | `true` |
| `log_api_calls` | Log các API call | `true` |
| `log_file_operations` | Log thao tác file | `true` |
| `show_progress_details` | Hiển thị tiến trình chi tiết | `true` |
| `max_size_mb` | Kích thước tối đa file log (MB) | `10` |
| `backup_count` | Số file backup giữ lại | `5` |

## 📝 Các loại Log

### 1. Step Logging
Ghi log từng bước quan trọng:
```
2025-01-01 10:30:45 - main - INFO - main:188 - 
============================================================
🔧 [10:30:45] KHỞI TẠO CLIENT
   Chi tiết: Bắt đầu khởi tạo Telegram client
============================================================
```

### 2. API Call Logging
Ghi log các API call đến Telegram:
```
2025-01-01 10:31:00 - api - DEBUG - log_api_call:141 - API CALL: get_entity | Params: {'type': 'public', 'input': 'channelname'} | Result: success
```

### 3. File Operation Logging
Ghi log thao tác file:
```
2025-01-01 10:31:15 - files - INFO - log_file_operation:151 - FILE SAVE: output/20250101_103115_telegram_files.csv | CSV với 150 records
```

### 4. Progress Logging
Ghi log tiến trình:
```
2025-01-01 10:31:30 - main - INFO - log_progress:161 - PROGRESS: 50/100 files found (50.0%)
```

### 5. Error Logging
Ghi log lỗi chi tiết:
```json
{
  "error_type": "ConnectionError",
  "error_message": "Network connection failed",
  "context": "Client initialization",
  "traceback": "Traceback (most recent call last)..."
}
```

## 🔍 Theo dõi Log trong thời gian thực

### Trên Windows
```cmd
# Theo dõi log chính
powershell Get-Content logs\teledrive.log -Wait -Tail 10

# Theo dõi log lỗi
powershell Get-Content logs\errors.log -Wait -Tail 10
```

### Trên Linux/Mac
```bash
# Theo dõi log chính
tail -f logs/teledrive.log

# Theo dõi log lỗi
tail -f logs/errors.log
```

## 🛠️ Debug và Troubleshooting

### Bật Debug Mode
Thay đổi level trong config.json:
```json
{
  "logging": {
    "level": "DEBUG"
  }
}
```

### Kiểm tra Log Files
```bash
# Kiểm tra log files có được tạo không
dir logs\
```

### Các vấn đề thường gặp

1. **Log files không được tạo**
   - Kiểm tra quyền ghi thư mục `logs/`
   - Đảm bảo `logging.enabled = true` trong config

2. **Log quá nhiều/ít**
   - Điều chỉnh `level` trong config
   - Tắt/bật các loại log cụ thể

3. **File log quá lớn**
   - Giảm `max_size_mb` trong config
   - Tăng `backup_count` để giữ nhiều file backup hơn

## 📊 Phân tích Log

### Tìm lỗi
```bash
# Tìm tất cả lỗi
grep -i "error" logs/*.log

# Tìm lỗi kết nối
grep -i "connection" logs/errors.log
```

### Thống kê
```bash
# Đếm số API calls
grep "API CALL" logs/api.log | wc -l

# Đếm số file được xử lý
grep "FILE SAVE" logs/files.log | wc -l
```

## 🎯 Best Practices

1. **Kiểm tra log định kỳ** để phát hiện vấn đề sớm
2. **Backup log files** quan trọng trước khi xóa
3. **Điều chỉnh level** phù hợp với môi trường (DEBUG cho dev, INFO cho production)
4. **Sử dụng separate files** để dễ phân tích từng loại log
5. **Monitor disk space** vì log files có thể lớn

## 🔧 Tùy chỉnh Logging

### Thêm custom logger
```python
from logger import get_logger

# Tạo logger riêng
my_logger = get_logger('my_module')
my_logger.info("Custom log message")
```

### Thêm log step
```python
from logger import log_step

log_step("TÊN BƯỚC", "Chi tiết về bước này", "INFO")
```

---

💡 **Tip**: Chỉ cần chạy `run.bat` - logging chi tiết đã được tích hợp sẵn!
