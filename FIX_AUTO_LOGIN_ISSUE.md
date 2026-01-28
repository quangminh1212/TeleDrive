# 🔧 Khắc Phục Lỗi Auto-Login

## ❌ Vấn Đề

Khi khởi động TeleDrive, bạn thấy log lặp đi lặp lại:
```
Auto-login failed: Telegram Desktop chưa có account nào được đăng nhập
```

## 🎯 Nguyên Nhân

Telegram Desktop chưa được đăng nhập hoặc session bị lỗi/hết hạn.

## ✅ Giải Pháp

### Bước 1: Kiểm Tra Telegram Desktop

1. **Mở Telegram Desktop**
   - Tìm và mở ứng dụng Telegram Desktop
   - Nếu chưa cài: [Tải về tại đây](https://desktop.telegram.org/)

2. **Kiểm tra trạng thái đăng nhập**
   - Bạn có thấy danh sách chat không?
   - Bạn có thể gửi/nhận tin nhắn không?
   - Nếu KHÔNG → Cần đăng nhập lại

### Bước 2: Đăng Nhập Telegram Desktop

Nếu Telegram Desktop chưa đăng nhập:

1. Click **"Start Messaging"** hoặc **"Đăng nhập"**
2. Nhập số điện thoại (có mã quốc gia, ví dụ: +84...)
3. Nhập mã xác thực từ SMS/Telegram
4. Nếu có 2FA: nhập mật khẩu 2FA
5. **Đợi sync hoàn tất** (thấy tin nhắn cũ hiện ra)

### Bước 3: Khởi Động Lại TeleDrive

1. **Đóng TeleDrive** (Ctrl+C trong terminal)
2. **Chạy lại**: `run.bat`
3. Auto-login sẽ hoạt động nếu Telegram Desktop đã đăng nhập

### Bước 4: Nếu Vẫn Lỗi

Nếu auto-login vẫn thất bại sau khi đăng nhập Telegram Desktop:

#### Option A: Đăng nhập thủ công
1. Vào trang login của TeleDrive
2. Nhập số điện thoại
3. Nhập mã xác thực
4. Hoàn tất đăng nhập

#### Option B: Thử lại auto-login
1. Vào trang login của TeleDrive
2. Click nút **"Try Auto-Login from Telegram Desktop"** (màu xanh lá)
3. Chờ xử lý

#### Option C: Xóa session cũ và thử lại
```bash
# Xóa session cũ
del data\session.session
del data\*.session

# Khởi động lại
run.bat
```

## 🔍 Kiểm Tra Chi Tiết

### Kiểm tra Telegram Desktop đã đăng nhập

**Windows:**
```cmd
dir "%APPDATA%\Telegram Desktop\tdata"
```

Bạn nên thấy:
- ✅ Folder có tên dạng `D877F783D5D3EF8C` (nhiều folder)
- ✅ File `key_data` hoặc `key_datas`
- ✅ File `settings` hoặc `settings0`

Nếu KHÔNG thấy → Telegram Desktop chưa đăng nhập

### Kiểm tra Python version

```cmd
python --version
```

Phải là **Python 3.11.x** (opentele chỉ hoạt động với 3.11)

Nếu không phải 3.11:
```cmd
setup_portable_python.bat
```

### Kiểm tra opentele

```cmd
python -c "import opentele; print('opentele OK')"
```

Nếu lỗi:
```cmd
pip install opentele
```

## 📝 Lưu Ý Quan Trọng

### ⚠️ Telegram Desktop PHẢI đang chạy hoặc đã từng chạy
- Auto-login đọc session từ folder `tdata`
- Session chỉ tồn tại khi Telegram Desktop đã đăng nhập
- Không cần Telegram Desktop đang chạy khi dùng TeleDrive

### ⚠️ Không xóa folder tdata
- Đừng xóa `%APPDATA%\Telegram Desktop\tdata`
- Đừng logout khỏi Telegram Desktop nếu muốn dùng auto-login

### ⚠️ Python 3.11 là bắt buộc
- opentele không hoạt động với Python 3.12+
- Dùng Python portable từ `setup_portable_python.bat`

## 🎯 Tóm Tắt Nhanh

```
1. Mở Telegram Desktop
2. Đăng nhập vào account
3. Đợi sync xong (thấy tin nhắn)
4. Đóng TeleDrive (Ctrl+C)
5. Chạy lại: run.bat
6. ✅ Auto-login sẽ hoạt động!
```

## 💡 Tips

### Tăng tỷ lệ thành công

1. **Luôn giữ Telegram Desktop đã đăng nhập**
   - Không logout
   - Không xóa tdata

2. **Sử dụng Python 3.11**
   - Chạy `setup_portable_python.bat`
   - Hoặc cài Python 3.11 system-wide

3. **Nếu auto-login không hoạt động**
   - Đăng nhập thủ công vẫn hoạt động bình thường
   - Chỉ cần nhập số điện thoại + mã xác thực

## 🆘 Vẫn Gặp Vấn Đề?

Nếu sau tất cả các bước trên vẫn không được:

1. **Kiểm tra log chi tiết**
   ```
   type teledrive.log
   ```

2. **Thử đăng nhập thủ công**
   - Vào trang login
   - Nhập số điện thoại
   - Nhập mã xác thực

3. **Báo lỗi**
   - Copy log từ `teledrive.log`
   - Mô tả chi tiết vấn đề
   - Gửi issue trên GitHub

---

**Chúc bạn khắc phục thành công! 🎉**
