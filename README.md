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

#### Cho Public Channel:
```bash
python run.py
```

#### Cho Private Channel:
```bash
python private_channel_scanner.py
```

### Nhập thông tin kênh

#### Public Channel:
- Username: `@channelname`
- Link: `https://t.me/channelname`
- Chỉ tên: `channelname`

#### Private Channel:
- Invite link: `https://t.me/joinchat/AAAxxxxxxxxxxxxx`
- Invite link mới: `https://t.me/+xxxxxxxxxxxxx`
- Hoặc username nếu đã là thành viên: `@privatechannelname`

**Lưu ý cho Private Channel:**
- Bạn phải là thành viên của kênh private
- Hoặc có invite link hợp lệ để join
- Script sẽ tự động join nếu bạn cung cấp invite link

### Kết quả
Sau khi quét xong, kết quả sẽ được lưu trong thư mục `output/` với format:
- `YYYYMMDD_HHMMSS_telegram_files.csv` - Dữ liệu đầy đủ dạng bảng
- `YYYYMMDD_HHMMSS_telegram_files.xlsx` - Excel với format đẹp
- `YYYYMMDD_HHMMSS_telegram_files.json` - JSON chi tiết với cấu trúc rõ ràng
- `YYYYMMDD_HHMMSS_simple_files.json` - JSON đơn giản chỉ tên file và link

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

### CSV/Excel Format:
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
| download_link | Link để download (hỗ trợ cả public và private channel) |
| message_text | Nội dung tin nhắn |
| sender_id | ID người gửi |

### JSON Format (Chi tiết):
```json
{
  "scan_info": {
    "timestamp": "20241211_143022",
    "total_files": 150,
    "scan_date": "2024-12-11T14:30:22"
  },
  "files": [
    {
      "file_name": "document.pdf",
      "download_link": "https://t.me/c/1234567890/123",
      "file_info": {
        "type": "document",
        "size": 1048576,
        "size_formatted": "1.0 MB",
        "mime_type": "application/pdf",
        "upload_date": "2024-12-11T10:30:00"
      },
      "message_info": {
        "message_id": 123,
        "message_text": "Tài liệu quan trọng",
        "sender_id": 987654321
      }
    }
  ]
}
```

### JSON Format (Đơn giản):
```json
[
  {
    "file_name": "document.pdf",
    "download_link": "https://t.me/c/1234567890/123",
    "file_size": "1.0 MB",
    "file_type": "document"
  }
]
```

## Lưu ý

- Lần đầu chạy sẽ cần xác thực số điện thoại qua OTP
- **Đối với kênh private**:
  - Tài khoản phải là thành viên của kênh HOẶC
  - Có invite link hợp lệ để join tự động
  - Sử dụng `private_channel_scanner.py` để có trải nghiệm tốt hơn
- **Link download**:
  - Public channel: `https://t.me/channelname/messageid`
  - Private channel: `https://t.me/c/channelid/messageid`
- Quá trình quét có thể mất thời gian tùy thuộc vào số lượng tin nhắn
- Chương trình tự động xử lý rate limiting của Telegram API
- File JSON được tối ưu để dễ đọc tên file và link download

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
