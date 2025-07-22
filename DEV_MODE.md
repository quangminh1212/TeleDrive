# TeleDrive Dev Mode

## Tắt xác thực để dev nhanh hơn

### Cách bật Dev Mode:

**Cách 1: Sử dụng script (Khuyến nghị):**
```bash
python dev_mode.py on
```

**Cách 2: Thủ công:**
```bash
cp .env.dev .env
```

**Cách 3: Thêm vào .env hiện tại:**
```bash
echo "DEV_MODE=true" >> .env
```

**Khởi động lại ứng dụng:**
```bash
python -m src.teledrive.app
```

### Tính năng Dev Mode:

✅ **Bỏ qua đăng nhập** - Truy cập trực tiếp vào dashboard  
✅ **Bỏ qua xác thực OTP** - Không cần Telegram OTP  
✅ **Quyền admin tự động** - Tất cả chức năng admin có thể truy cập  
✅ **Bỏ qua rate limiting** - Không giới hạn request  
✅ **User giả** - Tự động tạo user "Developer" với quyền admin  

### User giả trong Dev Mode:
- **Username:** Developer
- **Phone:** +84123456789  
- **Email:** dev@teledrive.local
- **Admin:** Yes
- **ID:** dev_user

### Tắt Dev Mode:

**Cách 1: Sử dụng script (Khuyến nghị):**
```bash
python dev_mode.py off
```

**Cách 2: Thủ công - Sửa file .env:**
```bash
DEV_MODE=false
```

**Cách 3: Xóa dòng DEV_MODE:**
```bash
# Xóa hoặc comment dòng DEV_MODE trong .env
```

**Khởi động lại ứng dụng**

### Kiểm tra trạng thái Dev Mode:
```bash
python dev_mode.py status
```

### Lưu ý:

⚠️ **KHÔNG sử dụng Dev Mode trong production**  
⚠️ **Dev Mode tắt tất cả bảo mật**  
⚠️ **Chỉ dùng cho development và testing**  

### Kiểm tra trạng thái:

Khi Dev Mode được bật, bạn sẽ thấy:
- Không cần đăng nhập
- Truy cập trực tiếp vào dashboard
- Username hiển thị là "Developer"
- Tất cả menu admin có thể truy cập

### Troubleshooting:

**Nếu vẫn yêu cầu đăng nhập:**
1. Kiểm tra file .env có `DEV_MODE=true`
2. Khởi động lại ứng dụng
3. Xóa cache browser (Ctrl+F5)

**Nếu gặp lỗi:**
1. Kiểm tra logs trong terminal
2. Đảm bảo không có lỗi syntax trong .env
3. Thử tắt và bật lại Dev Mode
