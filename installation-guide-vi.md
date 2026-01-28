# Hướng dẫn cài đặt TeleDrive

## ⚠️ Vấn đề với Python 3.14

Python 3.14 chưa tương thích với một số thư viện:
- `opentele` - Không hỗ trợ Python 3.14
- `pywebview` - Dependency `pythonnet` không build được
- Một số package khác có thể gặp lỗi

## ✅ Giải pháp: Dùng Python 3.11 hoặc 3.12

### Cách 1: Cài đặt tự động (Khuyến nghị)

```bat
install_python311.bat
```

Script này sẽ:
1. Tự động cài Python 3.11 qua winget
2. Hoặc mở trang download nếu winget không có

### Cách 2: Cài đặt thủ công

1. **Download Python 3.11.10:**
   - Truy cập: https://www.python.org/downloads/release/python-31110/
   - Tải: "Windows installer (64-bit)"

2. **Cài đặt:**
   - ✅ **QUAN TRỌNG:** Tick "Add Python 3.11 to PATH"
   - Chọn "Install Now"

3. **Kiểm tra:**
   ```bat
   py -3.11 --version
   ```
   Hoặc:
   ```bat
   python3.11 --version
   ```

## 🚀 Setup dự án với Python 3.11

Sau khi cài Python 3.11:

```bat
setup_python311.bat
```

Script này sẽ:
1. Tìm Python 3.11 trên máy
2. Xóa virtual environment cũ (nếu có)
3. Tạo virtual environment mới với Python 3.11
4. Cài đặt tất cả dependencies
5. Cài đặt pywebview/tkinterweb cho embedded webview

## ▶️ Chạy ứng dụng

```bat
run.bat
```

## 📦 Các phiên bản Python được hỗ trợ

| Python Version | Tương thích | Ghi chú |
|---------------|-------------|---------|
| 3.11.x | ✅ Tốt nhất | Khuyến nghị |
| 3.12.x | ✅ Tốt | Hoạt động tốt |
| 3.13.x | ⚠️ Một số lỗi | Một số package chưa hỗ trợ |
| 3.14.x | ❌ Không tương thích | Nhiều package chưa hỗ trợ |

## 🔧 Troubleshooting

### Lỗi: "Python 3.11 not found"

**Giải pháp:**
1. Cài Python 3.11 bằng `install_python311.bat`
2. Hoặc cài thủ công từ python.org
3. Đảm bảo đã tick "Add to PATH" khi cài

### Lỗi: "pywebview not available"

**Không sao!** Ứng dụng sẽ tự động:
1. Thử dùng tkinterweb
2. Nếu không có → Mở browser

### Lỗi: "opentele không tương thích"

**Bình thường!** Với Python 3.14:
- Auto-login từ Telegram Desktop sẽ không hoạt động
- Bạn vẫn có thể đăng nhập thủ công qua web interface

Với Python 3.11:
- Auto-login sẽ hoạt động bình thường

## 📝 Các file quan trọng

- `install_python311.bat` - Cài Python 3.11
- `setup_python311.bat` - Setup dự án với Python 3.11
- `setup.bat` - Setup với Python hiện tại
- `run.bat` - Chạy ứng dụng
- `requirements.txt` - Danh sách dependencies

## 💡 Tips

1. **Dùng Python 3.11** cho trải nghiệm tốt nhất
2. **Embedded webview** cần pywebview hoặc tkinterweb
3. **Nếu không có webview**, ứng dụng vẫn chạy được với browser
4. **Auto-login** chỉ hoạt động với Python 3.11/3.12

## 🆘 Cần trợ giúp?

Nếu gặp vấn đề:
1. Kiểm tra file `teledrive.log`
2. Đảm bảo đã dùng Python 3.11
3. Chạy lại `setup_python311.bat`
