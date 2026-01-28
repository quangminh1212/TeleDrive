# 🚀 TeleDrive - Bắt đầu ngay!

## Chỉ cần 1 lệnh:

```bat
run.bat
```

## ✨ Tự động 100%

Script `run.bat` sẽ **TỰ ĐỘNG**:

1. ✅ Tìm Python 3.11/3.12
2. ✅ **Tự động cài Python 3.11** nếu không tìm thấy (KHÔNG CẦN TƯƠNG TÁC!)
3. ✅ Tạo virtual environment
4. ✅ Cài đặt tất cả dependencies
5. ✅ Cài webview libraries
6. ✅ Chạy ứng dụng với auto-login

## 🎯 Các phương thức cài Python 3.11 tự động:

Script thử 3 cách (theo thứ tự):

1. **Winget** (Windows Package Manager) - Silent install
2. **Chocolatey** (nếu đã cài) - Silent install  
3. **Download trực tiếp** từ python.org - Silent install

## 📋 Yêu cầu

- Windows 10/11
- Kết nối internet (lần đầu)
- **KHÔNG CẦN** cài Python trước!

## 🚀 Cách dùng

### Lần đầu (chưa có gì):

```bat
run.bat
```

Chờ 2-5 phút, mọi thứ tự động!

### Nếu đã có Python 3.11/3.12:

```bat
run.bat
```

Chạy ngay, không cần cài gì!

### Nếu đang dùng Python 3.14:

```bat
run.bat
```

Script sẽ:
- Tự động cài Python 3.11
- Yêu cầu đóng CMD và mở lại
- Chạy lại `run.bat`

## 🔧 Test auto install riêng:

```bat
test_auto_install.bat
```

Hoặc:

```bat
auto_install_python311.bat
```

## ⚡ Sau khi cài Python 3.11:

**QUAN TRỌNG:**
1. Đóng cửa sổ CMD hiện tại
2. Mở CMD mới
3. Chạy: `run.bat`

(Windows cần reload PATH để nhận Python mới)

## 📱 Kết quả

- Cửa sổ desktop với giao diện Google Drive
- Auto-login từ Telegram Desktop
- Quản lý files như Google Drive
- Upload/Download qua Telegram

## 🆘 Nếu có lỗi

### "Python 3.11 installation failed"

Cài thủ công:
```bat
install_python311.bat
```

Hoặc download: https://www.python.org/downloads/release/python-31110/

### "Please close and reopen CMD"

Đóng CMD này, mở CMD mới, chạy lại `run.bat`

### Các lỗi khác

Check file: `teledrive.log`

## 💡 Tips

- **Lần đầu** mất 2-5 phút (download & install)
- **Lần sau** chỉ vài giây
- **Không cần tương tác** - để script tự chạy
- **Giữ Telegram Desktop mở** để auto-login

## 📂 Files quan trọng

- `run.bat` - **CHẠY FILE NÀY**
- `auto_install_python311.bat` - Auto install Python 3.11
- `test_auto_install.bat` - Test auto install
- `check_python.bat` - Kiểm tra Python versions

## 🎉 Xong!

```bat
run.bat
```

Ngồi chờ, uống cà phê ☕, mọi thứ tự động! 🚀
