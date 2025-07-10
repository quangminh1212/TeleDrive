# TeleDrive

Ứng dụng quản lý file Telegram đơn giản với giao diện desktop và dòng lệnh.

## Tính năng

- 📋 Liệt kê file từ Telegram channel
- 🔍 Tìm kiếm file theo tên
- ⬇️ Tải file về máy
- ⬆️ Upload file lên channel
- 🖥️ Giao diện desktop hiện đại
- 💻 Giao diện dòng lệnh
- 🎨 Thiết kế đơn giản, dễ sử dụng

## Cài đặt nhanh

1. **Cài đặt thư viện:**
   ```bash
   # Windows
   install.bat

   # Hoặc thủ công
   pip install -r requirements.txt
   ```

2. **Cấu hình:**
   Chỉnh sửa file `.env` với thông tin API Telegram của bạn

3. **Chạy ứng dụng:**
   ```bash
   # Windows (khuyến nghị)
   run.bat              # Desktop app
   run.bat cmd          # Command line

   # Cross-platform
   python run.py        # Desktop app
   python run.py cmd    # Command line

   # Chạy trực tiếp
   python app.py        # Desktop app
   python cmd.py        # Command line
   ```

## Sử dụng dòng lệnh

```bash
# Liệt kê file
python cmd.py list @mychannel 10

# Tìm kiếm file
python cmd.py search @mychannel "video" 5

# Tải file (theo số thứ tự)
python cmd.py download @mychannel 1

# Upload file
python cmd.py upload @mychannel ./file.pdf "Mô tả file"
```

## Cấu hình

Chỉnh sửa file `.env`:

```env
API_ID=your_api_id
API_HASH=your_api_hash
SESSION_NAME=session
DOWNLOAD_DIR=./downloads
```

## Lấy API Telegram

1. Truy cập https://my.telegram.org/apps
2. Tạo ứng dụng mới
3. Copy API_ID và API_HASH vào file `.env`

## Cấu trúc file

```
app.py              # Ứng dụng desktop
cmd.py              # Giao diện dòng lệnh
telegram.py         # Xử lý Telegram API
requirements.txt    # Thư viện cần thiết
.env                # Cấu hình
README.md           # Hướng dẫn
downloads/          # Thư mục tải file
```

## Tính năng ứng dụng desktop

- 🖥️ **Giao diện desktop** - Ứng dụng desktop thực sự
- 🎨 **Giao diện hiện đại** - Thiết kế đẹp, chuyên nghiệp
- 🚀 **Hiệu suất cao** - Không cần trình duyệt
- 📁 **Quản lý file** - Duyệt, tìm kiếm, tải file
- ⬆️ **Upload dễ dàng** - Hỗ trợ chọn file
- 🔐 **Đăng nhập Telegram** - Tích hợp đăng nhập an toàn

## Ví dụ sử dụng

```bash
# Liệt kê 20 file từ channel
python cmd.py list @mychannel 20

# Tìm file PDF
python cmd.py search @mychannel "pdf" 10

# Tải file đầu tiên
python cmd.py download @mychannel 1

# Upload tài liệu
python cmd.py upload @mychannel ./document.pdf "Tài liệu quan trọng"
```
