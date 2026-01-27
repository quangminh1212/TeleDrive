# Hướng Dẫn Đăng Nhập Telegram Tự Động

## Phương Thức Tự Động (Khuyến Nghị)

### Yêu Cầu
- Windows 10/11
- Telegram Desktop đã đăng nhập
- Python 3.8+

### Các Bước

#### 1. Thiết lập tự động
```bash
setup_telegram_auto_login.bat
```

#### 2. Chạy ứng dụng
```bash
run.bat
```

### Ưu điểm
- ✅ Không cần API_ID, API_HASH
- ✅ Không cần nhập mã xác thực
- ✅ Đăng nhập tức thì

### Xử Lý Lỗi

**"Không tìm thấy Telegram Desktop"**
- Cài đặt từ: https://desktop.telegram.org/

**"Session không hợp lệ"**
```bash
python scripts/reset_telegram_session.py
setup_telegram_auto_login.bat
```

## Phương Thức Truyền Thống (Với API)

1. Lấy API credentials từ https://my.telegram.org
2. Cấu hình `.env`:
```env
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash
TELEGRAM_PHONE=+84xxxxxxxxx
```
3. Chạy: `python app/telegram_auth.py`

## Scripts Hỗ Trợ

```bash
# Kiểm tra session
python scripts/check_telegram_session.py

# Reset session
python scripts/reset_telegram_session.py
```

## FAQ

**Q: Có cần API_ID không?**  
A: Không, nếu dùng phương thức tự động.

**Q: Session có hết hạn không?**  
A: Không, trừ khi đăng xuất hoặc đổi mật khẩu.

**Q: Có an toàn không?**  
A: Có, sử dụng session chính thức của Telegram.
