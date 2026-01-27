# Hướng dẫn Copy Session từ Telegram Desktop

## Tại sao cần copy session?

Khi bạn đã đăng nhập Telegram Desktop, bạn có thể sử dụng lại session đó cho TeleDrive mà không cần:
- ❌ Nhập số điện thoại lại
- ❌ Nhập mã xác thực
- ❌ Cấu hình API credentials

## Cách sử dụng

### Bước 1: Đảm bảo Telegram Desktop đã đăng nhập

1. Mở Telegram Desktop
2. Đăng nhập vào tài khoản của bạn
3. Đóng Telegram Desktop (không bắt buộc)

### Bước 2: Chạy script copy session

```bash
python copy_telegram_session.py
```

### Bước 3: Kiểm tra kết quả

Script sẽ:
1. ✅ Tìm Telegram Desktop
2. ✅ Kiểm tra trạng thái đăng nhập
3. ✅ Copy session files vào `data/`
4. ✅ Tạo marker file

### Bước 4: Chạy TeleDrive

```bash
# Desktop mode
python main.py

# Hoặc web mode
run.bat
```

Ứng dụng sẽ tự động sử dụng session đã copy!

## Output mẫu

```
============================================================
Copy Telegram Desktop Session to TeleDrive
============================================================

[1/4] Tìm Telegram Desktop...
✅ Tìm thấy: C:\Users\...\Telegram Desktop\tdata

[2/4] Kiểm tra trạng thái đăng nhập...
  - key_data: ❌
  - settings: ❌
  - usertag: ✅
  - session folder: ✅
✅ Telegram Desktop đã đăng nhập

[3/4] Copy session files...
✅ Copied session folder: A7FDF864FBC10B77
✅ Copied session folder: D877F783D5D3EF8C
✅ Copied session folder: F8806DD0C461824F

✅ Đã copy 3 session folders

[4/4] Tạo session marker...
✅ Created session marker

============================================================
✅ HOÀN THÀNH!
============================================================
```

## Files được copy

```
data/
├── telegram_key_data              # Key data (nếu có)
├── telegram_A7FDF864FBC10B77/     # Session folder 1
├── telegram_D877F783D5D3EF8C/     # Session folder 2
├── telegram_F8806DD0C461824F/     # Session folder 3
└── .telegram_desktop_session      # Marker file
```

## Troubleshooting

### Lỗi: Không tìm thấy Telegram Desktop

**Nguyên nhân**: Telegram Desktop chưa được cài đặt

**Giải pháp**:
1. Tải Telegram Desktop: https://desktop.telegram.org/
2. Cài đặt và đăng nhập
3. Chạy lại script

### Lỗi: Telegram Desktop chưa đăng nhập

**Nguyên nhân**: Chưa đăng nhập vào Telegram Desktop

**Giải pháp**:
1. Mở Telegram Desktop
2. Đăng nhập vào tài khoản
3. Chạy lại script

### Lỗi: Không thể copy session files

**Nguyên nhân**: Quyền truy cập file

**Giải pháp**:
1. Đóng Telegram Desktop
2. Chạy script với quyền Administrator
3. Hoặc copy thủ công:
   ```
   Từ: %APPDATA%\Telegram Desktop\tdata\
   Đến: data\
   ```

### Session không hoạt động trong TeleDrive

**Nguyên nhân**: Session đã hết hạn hoặc bị revoke

**Giải pháp**:
1. Mở Telegram Desktop và kiểm tra còn đăng nhập không
2. Nếu đã đăng xuất, đăng nhập lại
3. Chạy lại script copy session
4. Hoặc sử dụng manual login trong TeleDrive

## Lưu ý bảo mật

⚠️ **Quan trọng**:
- Session files chứa thông tin đăng nhập Telegram
- Không chia sẻ thư mục `data/` với người khác
- Không commit session files lên Git
- Backup session files nếu cần

## Khi nào cần copy lại?

Cần copy lại session khi:
- ✅ Đăng xuất Telegram Desktop
- ✅ Đổi tài khoản Telegram
- ✅ Xóa thư mục `data/`
- ✅ Session hết hạn (hiếm khi xảy ra)

## Alternative: Manual Login

Nếu không muốn copy session, bạn có thể:
1. Chạy TeleDrive
2. Chọn "Manual Login"
3. Nhập số điện thoại
4. Nhập mã xác thực từ Telegram

## So sánh các phương thức

| Phương thức | Ưu điểm | Nhược điểm |
|-------------|---------|------------|
| **Copy Session** | ✅ Không cần nhập gì<br>✅ Nhanh chóng<br>✅ Không cần API credentials | ⚠️ Cần Telegram Desktop<br>⚠️ Cần copy lại khi đăng xuất |
| **Manual Login** | ✅ Không cần Desktop<br>✅ Hoạt động mọi lúc | ❌ Cần nhập số điện thoại<br>❌ Cần nhập mã xác thực<br>❌ Cần API credentials (tùy chọn) |
| **opentele** | ✅ Tự động hoàn toàn | ❌ Không hoạt động Python 3.14<br>❌ Phức tạp |

## Khuyến nghị

- 🥇 **Copy Session** - Nhanh nhất, dễ nhất (Python 3.14)
- 🥈 **opentele** - Tự động (Python 3.11/3.12)
- 🥉 **Manual Login** - Backup option

---

**Happy Coding! 🚀**
