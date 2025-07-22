# TeleDrive run.bat với Dev Mode

## Tích hợp Dev Mode vào run.bat

### Các tính năng mới:

#### 1. **Tự động tắt Dev Mode trong Production**
```bash
run.bat production  # Tự động tắt dev mode trước khi chạy production
run.bat clean       # Tự động tắt dev mode trước khi chạy clean mode
```

#### 2. **Menu Dev Mode trong Config**
```bash
run.bat config      # Chọn tùy chọn 7 để quản lý dev mode
```

#### 3. **Hiển thị trạng thái Dev Mode**
- Khi chạy `run.bat`, sẽ hiển thị trạng thái dev mode hiện tại
- Trong menu config, có thể xem và thay đổi trạng thái

### Cách sử dụng:

#### **Bật Dev Mode:**
1. Chạy `run.bat config`
2. Chọn `7` (Dev Mode)
3. Chọn `1` (Bật Dev Mode)
4. Khởi động lại ứng dụng

#### **Tắt Dev Mode:**
1. Chạy `run.bat config`
2. Chọn `7` (Dev Mode)
3. Chọn `2` (Tắt Dev Mode)
4. Khởi động lại ứng dụng

#### **Hoặc sử dụng script trực tiếp:**
```bash
python dev_mode.py on    # Bật dev mode
python dev_mode.py off   # Tắt dev mode
python dev_mode.py status # Kiểm tra trạng thái
```

### Menu Config mới:

```
1. Xem cau hinh hien tai
2. Thay doi channel
3. Thay doi so tin nhan toi da
4. Thay doi loai file
5. Thay doi dinh dang dau ra
6. Reset ve mac dinh
7. Dev Mode (bat/tat dev mode)        ← MỚI
8. Chay scanner CLI
9. Khoi dong web interface (mac dinh)
0. Thoat
```

### Lưu ý quan trọng:

⚠️ **Production Mode tự động tắt Dev Mode**
- `run.bat production` sẽ tự động tắt dev mode để đảm bảo bảo mật
- `run.bat clean` cũng tắt dev mode

✅ **Development Mode**
- `run.bat` (mặc định) - giữ nguyên trạng thái dev mode
- `run.bat silent` - giữ nguyên trạng thái dev mode

🔧 **Quản lý dễ dàng**
- Tất cả thao tác dev mode có thể thực hiện qua menu config
- Không cần nhớ lệnh phức tạp

### Workflow khuyến nghị:

#### **Khi phát triển:**
```bash
run.bat config → 7 → 1  # Bật dev mode
run.bat                 # Chạy với dev mode
```

#### **Khi deploy production:**
```bash
run.bat production      # Tự động tắt dev mode và chạy production
```

#### **Khi test clean:**
```bash
run.bat clean          # Tự động tắt dev mode và chạy clean mode
```
