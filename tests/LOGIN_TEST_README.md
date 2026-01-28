# 🧪 Hướng Dẫn Test Đăng Nhập Telegram

## 📋 Tổng Quan

Các test scripts này giúp kiểm tra đăng nhập Telegram **độc lập**, không phụ thuộc vào Telegram Desktop trên máy.

---

## 🎯 Các Test Scripts

### 1. Quick Login Test (Nhanh nhất)

**File:** `quick_login_test.py`

**Mục đích:** Kiểm tra nhanh đăng nhập và gửi tin nhắn

**Cách chạy:**
```bash
python tests/quick_login_test.py
```

**Tính năng:**
- ✅ Kiểm tra API credentials
- ✅ Kết nối Telegram
- ✅ Đăng nhập (nếu chưa có session)
- ✅ Gửi tin nhắn test đến Saved Messages

**Thời gian:** ~2-3 phút

---

### 2. Standalone Login Test (Chi tiết)

**File:** `test_telegram_login_standalone.py`

**Mục đích:** Test đầy đủ các chức năng đăng nhập

**Cách chạy:**
```bash
python tests/test_telegram_login_standalone.py
```

**Tính năng:**
- ✅ Test 1: Kiểm tra session hiện có
- ✅ Test 2: Đăng nhập mới với số điện thoại
- ✅ Test 3: Kiểm tra API credentials
- ✅ Test 4: Gửi tin nhắn test

**Thời gian:** ~5-10 phút

---

### 3. App Integration Test (Tích hợp)

**File:** `test_app_login_integration.py`

**Mục đích:** Test tích hợp với app.py và database

**Cách chạy:**
```bash
python tests/test_app_login_integration.py
```

**Tính năng:**
- ✅ Test TelegramAuthenticator class
- ✅ Test check_existing_session()
- ✅ Test try_auto_login_from_desktop()
- ✅ Test manual login flow
- ✅ Test database integration

**Thời gian:** ~5-10 phút

---

## 🚀 Hướng Dẫn Sử Dụng

### Bước 1: Chuẩn Bị

1. **Cài đặt dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Cấu hình API credentials:**
   
   Mở file `config.py` và cập nhật:
   ```python
   API_ID = "YOUR_API_ID"
   API_HASH = "YOUR_API_HASH"
   ```
   
   **Cách lấy API credentials:**
   - Truy cập: https://my.telegram.org/apps
   - Đăng nhập Telegram
   - Tạo ứng dụng mới
   - Copy API_ID và API_HASH

### Bước 2: Chạy Test

**Option A: Quick Test (Khuyến nghị cho lần đầu)**
```bash
python tests/quick_login_test.py
```

**Option B: Full Test**
```bash
python tests/test_telegram_login_standalone.py
```

**Option C: Integration Test**
```bash
python tests/test_app_login_integration.py
```

### Bước 3: Nhập Thông Tin

Khi được yêu cầu:

1. **Số điện thoại:** Nhập với mã quốc gia
   ```
   Ví dụ: +84987654321
   ```

2. **Mã xác thực:** Kiểm tra Telegram và nhập mã 5-6 số
   ```
   Ví dụ: 12345
   ```

3. **Mật khẩu 2FA (nếu có):** Nhập mật khẩu 2FA của bạn

---

## ✅ Kết Quả Mong Đợi

### Test Thành Công

```
✅ API_ID: 12345678
✅ API_HASH: abcd1234...
✅ Kết nối thành công!
✅ Đã đăng nhập!

👤 Thông tin:
   Tên: John Doe
   Username: @johndoe
   Phone: +84987654321
   ID: 123456789

✅ Đã gửi tin nhắn (ID: 12345)

🎉 TEST THÀNH CÔNG!
```

### Test Thất Bại

```
❌ API_ID không được cấu hình

📝 Cách lấy API credentials:
   1. Truy cập: https://my.telegram.org/apps
   2. Đăng nhập Telegram
   3. Tạo ứng dụng mới
   4. Copy API_ID và API_HASH
   5. Cập nhật vào config.py
```

---

## 🔍 Troubleshooting

### Lỗi: "API_ID không được cấu hình"

**Nguyên nhân:** Chưa cấu hình API credentials

**Giải pháp:**
1. Truy cập https://my.telegram.org/apps
2. Tạo ứng dụng mới
3. Copy API_ID và API_HASH
4. Cập nhật vào `config.py`

---

### Lỗi: "Mã xác thực không đúng"

**Nguyên nhân:** Nhập sai mã hoặc mã đã hết hạn

**Giải pháp:**
1. Kiểm tra lại mã trong Telegram
2. Nhập đúng 5-6 chữ số
3. Nếu hết hạn, chạy lại test để nhận mã mới

---

### Lỗi: "Số điện thoại không hợp lệ"

**Nguyên nhân:** Định dạng số điện thoại sai

**Giải pháp:**
- Phải có mã quốc gia: `+84987654321`
- Không có khoảng trắng
- Không có dấu gạch ngang

---

### Lỗi: "Không thể kết nối Telegram API"

**Nguyên nhân:** 
- API credentials sai
- Không có internet
- Telegram bị chặn

**Giải pháp:**
1. Kiểm tra API_ID và API_HASH
2. Kiểm tra kết nối internet
3. Thử dùng VPN nếu Telegram bị chặn

---

## 📝 Session Files

Các test sẽ tạo session files:

- `tests/test_session.session` - Standalone test
- `tests/quick_test_session.session` - Quick test
- `data/session.session` - App session

**Lưu ý:**
- Session files chứa thông tin đăng nhập
- Không chia sẻ session files
- Có thể xóa để đăng nhập lại

---

## 🔐 Bảo Mật

### Session Files
- ✅ Được mã hóa
- ✅ Chỉ hoạt động trên máy tạo ra
- ✅ Không chứa password
- ⚠️ Không chia sẻ với người khác

### API Credentials
- ✅ Lưu trong config.py (local)
- ✅ Không commit vào git
- ⚠️ Không chia sẻ với người khác

---

## 💡 Tips

### Tăng Tốc Độ Test

1. **Sử dụng session hiện có:**
   - Chỉ cần đăng nhập 1 lần
   - Các lần sau dùng session

2. **Chạy quick test:**
   - Nhanh nhất
   - Đủ để kiểm tra cơ bản

3. **Không xóa session files:**
   - Giữ session để test nhanh hơn

### Debug

1. **Bật debug log:**
   ```python
   import logging
   logging.basicConfig(level=logging.DEBUG)
   ```

2. **Kiểm tra session file:**
   ```bash
   dir tests\*.session
   ```

3. **Xóa session để test lại:**
   ```bash
   del tests\*.session
   ```

---

## 📊 So Sánh Test Scripts

| Feature | Quick Test | Standalone Test | Integration Test |
|---------|-----------|----------------|-----------------|
| Tốc độ | ⚡⚡⚡ | ⚡⚡ | ⚡ |
| Chi tiết | ⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| Kiểm tra API | ✅ | ✅ | ✅ |
| Kiểm tra session | ✅ | ✅ | ✅ |
| Đăng nhập mới | ✅ | ✅ | ✅ |
| Gửi tin nhắn | ✅ | ✅ | ❌ |
| Test database | ❌ | ❌ | ✅ |
| Test app.py | ❌ | ❌ | ✅ |

**Khuyến nghị:**
- Lần đầu: **Quick Test**
- Debug: **Standalone Test**
- CI/CD: **Integration Test**

---

## 🎯 Khi Nào Dùng Test Nào?

### Quick Test
- ✅ Lần đầu test
- ✅ Kiểm tra nhanh
- ✅ Xác nhận đăng nhập hoạt động

### Standalone Test
- ✅ Debug chi tiết
- ✅ Test từng bước
- ✅ Kiểm tra API credentials

### Integration Test
- ✅ Test trước khi deploy
- ✅ Kiểm tra tích hợp
- ✅ Test database

---

## 🆘 Cần Trợ Giúp?

1. **Kiểm tra log:**
   ```bash
   type teledrive.log
   ```

2. **Xem hướng dẫn:**
   - `AUTO_LOGIN_GUIDE.md`
   - `FIX_AUTO_LOGIN_ISSUE.md`
   - `SIMPLE_LOGIN_GUIDE.md`

3. **Báo lỗi:**
   - Copy output của test
   - Mô tả vấn đề
   - Gửi issue trên GitHub

---

**Chúc bạn test thành công! 🎉**
