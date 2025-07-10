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

### Cách 1: Cài đặt tự động (Windows)
```bash
# Cài đặt và chạy ngay
install.bat

# Hoặc chỉ setup môi trường
setup.bat

# Chạy ứng dụng
run.bat
```

### Cách 2: Cài đặt thủ công
```bash
# 1. Cài đặt dependencies
pip install -r requirements.txt

# 2. Tạo file cấu hình
copy .env.example .env
```

### 3. Cấu hình Telegram API

API credentials đã được cấu hình sẵn trong dự án. Bạn chỉ cần:

1. Cập nhật số điện thoại trong file `.env`:
```env
PHONE_NUMBER=+84123456789  # Thay bằng số điện thoại của bạn
```

2. Hoặc chạy script setup để kiểm tra và cấu hình:
```bash
python setup_check.py
```

**Thông tin API đã cấu hình:**
- API ID: 21272067
- API Hash: b7690dc86952dbc9b16717b101164af3
- App Name: Telegram Unlimited Driver

## 📖 Hướng dẫn sử dụng

### Cách 1: Sử dụng file batch (Windows)
```bash
# Chạy trực tiếp (tự động kiểm tra cấu hình)
run.bat
```

### Cách 2: Chạy thủ công
```bash
# Kiểm tra cấu hình trước
python setup_check.py

# Chạy ứng dụng
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
├── main.py              # Ứng dụng chính với menu tương tác
├── telegram_client.py   # Wrapper cho Telegram API
├── file_manager.py      # Quản lý files (list, download, upload)
├── config.py           # Cấu hình và environment variables
├── setup_check.py      # Script kiểm tra cấu hình
├── requirements.txt    # Dependencies cần thiết
├── install.bat         # Script cài đặt tự động (Windows)
├── setup.bat          # Script setup môi trường (Windows)
├── run.bat            # Script chạy ứng dụng (Windows)
├── .env.example       # Template cho cấu hình
├── .env              # File cấu hình thực tế
├── .gitignore        # Git ignore rules
├── downloads/        # Thư mục download mặc định
└── README.md         # Hướng dẫn chi tiết
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
