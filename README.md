# Telegram File Scanner

Phần mềm quét và lấy thông tin tất cả các file trong kênh Telegram, bao gồm tên file và link download.

## Tính năng

- ✅ Quét tất cả file trong kênh Telegram (public/private)
- ✅ Hỗ trợ nhiều loại file: documents, photos, videos, audio, voice, stickers, animations
- ✅ Lấy thông tin chi tiết: tên file, kích thước, loại file, ngày tải lên
- ✅ Tạo link download cho từng file
- ✅ Export kết quả ra CSV, Excel, JSON
- ✅ Progress bar theo dõi tiến trình
- ✅ Thống kê chi tiết sau khi quét

## Cài đặt

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
2. Tạo ứng dụng mới để lấy `API_ID` và `API_HASH`
3. Copy file `.env.example` thành `.env`:
```bash
cp .env.example .env
```
4. Điền thông tin vào file `.env`:
```
TELEGRAM_API_ID=your_api_id_here
TELEGRAM_API_HASH=your_api_hash_here
TELEGRAM_PHONE=+84xxxxxxxxx
```

## Sử dụng

### Chạy chương trình
```bash
python telegram_file_scanner.py
```

### Nhập thông tin kênh
Khi được yêu cầu, nhập một trong các định dạng sau:
- Username: `@channelname`
- Link: `https://t.me/channelname`
- Chỉ tên: `channelname`

### Kết quả
Sau khi quét xong, kết quả sẽ được lưu trong thư mục `output/` với format:
- `YYYYMMDD_HHMMSS_telegram_files.csv`
- `YYYYMMDD_HHMMSS_telegram_files.xlsx`
- `YYYYMMDD_HHMMSS_telegram_files.json`

## Cấu hình nâng cao

Chỉnh sửa file `config.py` để tùy chỉnh:

```python
# Giới hạn số tin nhắn quét (None = tất cả)
MAX_MESSAGES = 1000

# Loại file cần quét
SCAN_DOCUMENTS = True
SCAN_PHOTOS = True
SCAN_VIDEOS = True
SCAN_AUDIO = True
SCAN_VOICE = True
SCAN_STICKERS = False
SCAN_ANIMATIONS = True

# Tạo link download
GENERATE_DOWNLOAD_LINKS = True
```

## Cấu trúc dữ liệu output

Mỗi file sẽ có các thông tin sau:

| Trường | Mô tả |
|--------|-------|
| message_id | ID tin nhắn chứa file |
| date | Ngày tải lên |
| file_type | Loại file (document, photo, video, audio, voice, sticker, animation) |
| file_name | Tên file |
| file_size | Kích thước file (bytes) |
| mime_type | MIME type |
| duration | Thời lượng (cho video/audio) |
| width/height | Kích thước (cho ảnh/video) |
| download_link | Link để download |
| message_text | Nội dung tin nhắn |
| sender_id | ID người gửi |

## Lưu ý

- Lần đầu chạy sẽ cần xác thực số điện thoại qua OTP
- Đối với kênh private, tài khoản phải là thành viên của kênh
- Quá trình quét có thể mất thời gian tùy thuộc vào số lượng tin nhắn
- Chương trình tự động xử lý rate limiting của Telegram API

## Troubleshooting

### Lỗi "Could not find the input entity"
- Kiểm tra tên kênh có đúng không
- Đảm bảo tài khoản có quyền truy cập kênh
- Thử với link đầy đủ thay vì username

### Lỗi "API credentials"
- Kiểm tra file `.env` có đúng format không
- Đảm bảo API_ID và API_HASH từ my.telegram.org là chính xác

### Lỗi "Phone number"
- Số điện thoại phải có mã quốc gia (+84 cho VN)
- Số điện thoại phải đã đăng ký Telegram

## License

MIT License
