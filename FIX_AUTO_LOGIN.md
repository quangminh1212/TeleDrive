# 🔧 Hướng Dẫn Sửa Lỗi Auto-Login

## Vấn Đề

Bạn đang gặp lỗi: **"Telegram Desktop chưa có account nào được đăng nhập"**

Mặc dù Telegram Desktop đã đăng nhập (bên trái màn hình), nhưng TeleDrive không thể đọc session.

## Nguyên Nhân

1. **Python version sai**: Bạn đang dùng Python 3.14, nhưng opentele chỉ hoạt động với Python 3.11
2. **Session bị lock**: Telegram Desktop đang chạy và lock file session
3. **Session format**: opentele không đọc được format session của Telegram Desktop version mới

## Giải Pháp

### Bước 1: Đảm Bảo Dùng Python 3.11

Dự án đã có Python 3.11 portable. Chạy:

```bash
run.bat
```

Script sẽ tự động dùng Python 3.11 từ thư mục `python311/`.

### Bước 2: Thử Auto-Login Lại

1. **Đóng hoàn toàn Telegram Desktop** (thoát khỏi system tray)
2. **Mở lại Telegram Desktop**
3. **Đảm bảo đã đăng nhập** (thấy tin nhắn)
4. **Đóng Telegram Desktop** (hoặc để chạy)
5. **Vào TeleDrive** và click nút **"Try Auto-Login from Telegram Desktop"**

### Bước 3: Nếu Vẫn Lỗi - Đăng Nhập Thủ Công

Auto-login có thể không hoạt động với một số version Telegram Desktop. Trong trường hợp này:

1. **Scroll xuống** trang login
2. **Chọn mã vùng**: +84 (Vietnam)
3. **Nhập số điện thoại**: Ví dụ `987654321` (không cần số 0 đầu)
4. **Click "Send Code"**
5. **Nhập mã xác thực** từ Telegram
6. **Click "Verify"**

## Kiểm Tra Python Version

Để kiểm tra Python version đang dùng:

```bash
python --version
```

Nếu thấy Python 3.14, chạy:

```bash
python311\python.exe --version
```

Phải thấy: `Python 3.11.9`

## Kiểm Tra opentele

Chạy script debug:

```bash
python311\python.exe debug_telegram_desktop.py
```

Script sẽ kiểm tra:
- ✅ Telegram Desktop có được cài không
- ✅ opentele có hoạt động không
- ✅ Session có đọc được không

## Tại Sao Auto-Login Không Hoạt Động?

Auto-login phụ thuộc vào:

1. **Python 3.11**: opentele không tương thích với Python 3.12+
2. **Telegram Desktop session**: Phải có session hợp lệ trong `%APPDATA%\Telegram Desktop\tdata`
3. **opentele library**: Phải đọc được format session của Telegram Desktop

Nếu một trong các điều kiện trên không thỏa mãn, auto-login sẽ thất bại.

## Khuyến Nghị

**Đăng nhập thủ công** là cách đáng tin cậy nhất:

1. Nhanh (chỉ 30 giây)
2. Không phụ thuộc vào Telegram Desktop
3. Hoạt động với mọi Python version
4. Không cần opentele

## Liên Hệ

Nếu vẫn gặp vấn đề, vui lòng:

1. Chạy `python311\python.exe debug_telegram_desktop.py`
2. Copy output
3. Báo lỗi kèm output

---

**Lưu ý**: Auto-login là tính năng tiện lợi nhưng không bắt buộc. Đăng nhập thủ công vẫn hoạt động tốt!
