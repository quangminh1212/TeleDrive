# TeleDrive - Telegram Channel File Manager

TeleDrive là một ứng dụng Python cho phép bạn quản lý files trong các Telegram channel một cách dễ dàng. Bạn có thể xem danh sách files, tìm kiếm, tải về và upload files lên channel.

## ✨ Tính năng

- 📋 **Liệt kê files**: Xem danh sách tất cả files trong channel
- 🔍 **Tìm kiếm files**: Tìm kiếm files theo tên hoặc caption
- ⬇️ **Tải files**: Download files từ channel về máy tính
- ⬆️ **Upload files**: Upload files từ máy tính lên channel
- 🎨 **Giao diện đẹp**: Interface màu sắc với Rich library
- ⚡ **Xử lý bất đồng bộ**: Tốc độ cao với asyncio

## 🚀 Cài đặt

### 1. Clone repository
```bash
git clone <repository-url>
cd TeleDrive
```

### 2. Cài đặt dependencies
```bash
pip install -r requirements.txt
```

### 3. Cấu hình Telegram API

1. Truy cập https://my.telegram.org/apps
2. Tạo một ứng dụng mới để lấy `API_ID` và `API_HASH`
3. Copy file `.env.example` thành `.env`:
```bash
cp .env.example .env
```

4. Chỉnh sửa file `.env` với thông tin của bạn:
```env
API_ID=your_api_id_here
API_HASH=your_api_hash_here
PHONE_NUMBER=+84123456789
SESSION_NAME=teledrive_session
DOWNLOAD_DIR=./downloads
DEFAULT_CHANNEL=@your_channel_username
```

## 📖 Hướng dẫn sử dụng

### Chạy ứng dụng
```bash
python main.py
```

### Các chức năng chính

#### 1. Liệt kê files trong channel
- Chọn option `1` từ menu chính
- Nhập username hoặc ID của channel (ví dụ: `@channel_name` hoặc `-1001234567890`)
- Nhập số lượng files muốn lấy (mặc định: 50)

#### 2. Tìm kiếm files
- Chọn option `2` từ menu chính
- Nhập channel và từ khóa tìm kiếm
- Ứng dụng sẽ tìm trong tên file và caption

#### 3. Tải files
- Sau khi liệt kê hoặc tìm kiếm files, chọn download
- Nhập số thứ tự của files muốn tải (cách nhau bằng dấu phẩy) hoặc `all` để tải tất cả
- Chọn thư mục lưu files

#### 4. Upload files
- Chọn option `4` từ menu chính
- Nhập đường dẫn files hoặc thư mục (cách nhau bằng dấu phẩy)
- Tùy chọn thêm caption cho files
- Xác nhận upload

## 🔧 Cấu hình nâng cao

### File config.py
Bạn có thể tùy chỉnh các cài đặt trong `config.py`:

- `MAX_FILE_SIZE`: Giới hạn kích thước file (mặc định: 2GB)
- `ALLOWED_EXTENSIONS`: Các loại file được hỗ trợ
- `DOWNLOAD_DIR`: Thư mục download mặc định

### Logging
Ứng dụng sử dụng Python logging. Bạn có thể điều chỉnh mức độ log trong `main.py`:
```python
logging.basicConfig(level=logging.INFO)  # Đổi thành DEBUG để xem chi tiết hơn
```

## 🛠️ Cấu trúc dự án

```
TeleDrive/
├── main.py              # Ứng dụng chính
├── telegram_client.py   # Telegram client wrapper
├── file_manager.py      # Quản lý files
├── config.py           # Cấu hình
├── requirements.txt    # Dependencies
├── .env.example       # Template environment variables
├── .gitignore         # Git ignore rules
├── downloads/         # Thư mục download mặc định
└── README.md          # Tài liệu này
```

## 🔒 Bảo mật

- File `.env` chứa thông tin nhạy cảm, không commit lên git
- Session files (`.session`) được tạo tự động và cũng không nên commit
- Chỉ sử dụng với các channel mà bạn có quyền truy cập

## ❗ Lưu ý quan trọng

1. **Quyền truy cập**: Bạn cần có quyền truy cập channel để có thể xem và tải files
2. **Giới hạn Telegram**: Files lớn hơn 2GB không thể upload lên Telegram
3. **Rate limiting**: Telegram có giới hạn số lượng request, ứng dụng sẽ tự động xử lý
4. **2FA**: Nếu tài khoản có bật 2FA, bạn cần tắt hoặc implement thêm code xử lý

## 🐛 Troubleshooting

### Lỗi kết nối
```
Failed to connect to Telegram
```
- Kiểm tra API_ID và API_HASH
- Kiểm tra kết nối internet
- Đảm bảo số điện thoại đúng định dạng

### Lỗi quyền truy cập
```
You don't have permission to access this channel
```
- Đảm bảo bạn đã join channel
- Kiểm tra channel username/ID đúng
- Một số channel private cần invite

### Lỗi file không tìm thấy
```
File not found
```
- Kiểm tra đường dẫn file khi upload
- Đảm bảo file tồn tại và có quyền đọc

## 📝 License

MIT License - Xem file LICENSE để biết chi tiết.

## 🤝 Đóng góp

Mọi đóng góp đều được chào đón! Hãy tạo issue hoặc pull request.

## 📞 Hỗ trợ

Nếu gặp vấn đề, hãy tạo issue trên GitHub hoặc liên hệ qua email.
