# TeleDrive Optimization Guide

Hướng dẫn tối ưu hóa và bảo trì dự án TeleDrive.

## 🧹 Scripts Tối Ưu Hóa

### 1. cleanup.py
Script tự động dọn dẹp các file dư thừa trong dự án.

```bash
python cleanup.py
```

**Chức năng:**
- Xóa tất cả thư mục `__pycache__`
- Làm trống các file log
- Xóa file output cũ hơn 7 ngày
- Xóa file tạm thời (*.tmp, *.bak, *.old, etc.)
- Giữ lại chỉ 2 backup database mới nhất

### 2. optimize.py
Script phân tích và kiểm tra chất lượng code.

```bash
python optimize.py
```

**Chức năng:**
- Kiểm tra imports không sử dụng
- Phân tích kích thước file
- Kiểm tra chất lượng code (dòng quá dài, trailing whitespace)
- Liệt kê dependencies

## 📊 Kết Quả Tối Ưu Hóa

### Trước khi tối ưu:
- Nhiều import không sử dụng
- File dư thừa (__pycache__, logs cũ)
- Tên file phức tạp
- Code chưa được tối ưu

### Sau khi tối ưu:
- ✅ Đã đổi tên file đơn giản hơn
- ✅ Xóa các import không sử dụng
- ✅ Dọn dẹp file dư thừa
- ✅ Tối ưu cấu trúc code
- ✅ Tất cả test vẫn pass
- ✅ Giảm kích thước dự án

## 🔧 Bảo Trì Định Kỳ

### Hàng tuần:
```bash
python cleanup.py
```

### Hàng tháng:
```bash
python optimize.py
python cleanup.py
```

### Trước khi commit:
```bash
python src/utils/test.py  # Chạy test
python optimize.py        # Kiểm tra code quality
python cleanup.py         # Dọn dẹp
```

## 📁 Cấu Trúc Dự Án Sau Tối Ưu

```
TeleDrive/
├── src/
│   ├── auth/
│   │   ├── manager.py      # (đã đổi từ auth_manager.py)
│   │   └── models.py
│   ├── services/
│   │   ├── otp.py          # (đã đổi từ telegram_otp.py)
│   │   └── scanner.py      # (đã đổi từ telegram_scanner.py)
│   ├── utils/
│   │   ├── manager.py      # (đã đổi từ config_manager.py)
│   │   ├── migrate.py      # (đã đổi từ migrate_db.py)
│   │   └── test.py         # (đã đổi từ test_structure.py)
│   └── web/
│       └── app.py          # (đã tối ưu imports)
├── main.py                 # (đã đổi từ run_app.py)
├── cleanup.py              # Script dọn dẹp
├── optimize.py             # Script tối ưu hóa
└── OPTIMIZATION.md         # File này
```

## 🎯 Lợi Ích Đạt Được

1. **Tên file đơn giản hơn**: Dễ đọc, dễ nhớ, dễ maintain
2. **Code sạch hơn**: Xóa imports không sử dụng, tối ưu structure
3. **Kích thước nhỏ hơn**: Xóa file dư thừa, cache files
4. **Bảo trì dễ dàng**: Scripts tự động hóa việc dọn dẹp
5. **Chất lượng cao hơn**: Kiểm tra code quality tự động

## 🚀 Khuyến Nghị

1. **Chạy cleanup.py** trước mỗi lần commit
2. **Chạy optimize.py** định kỳ để kiểm tra code quality
3. **Giữ tên file đơn giản** khi thêm file mới
4. **Xóa imports không sử dụng** ngay khi phát hiện
5. **Sử dụng .gitignore** để tránh commit file dư thừa

## 📞 Hỗ Trợ

Nếu gặp vấn đề với scripts tối ưu hóa:
1. Kiểm tra Python version (>= 3.8)
2. Đảm bảo có quyền ghi file
3. Chạy từ thư mục gốc của dự án
4. Kiểm tra log errors nếu có
