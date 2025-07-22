# TeleDrive Database Fix

## ✅ Đã sửa các lỗi database

### 🔧 Vấn đề đã sửa:

#### 1. **Lỗi "unable to open database file"**
- **Nguyên nhân:** Đường dẫn database relative `sqlite:///instance/teledrive.db` không hoạt động
- **Giải pháp:** Sử dụng absolute path cho database

#### 2. **Thư mục instance không tồn tại**
- **Nguyên nhân:** SQLite không thể tạo file trong thư mục chưa tồn tại
- **Giải pháp:** Tự động tạo thư mục `instance` trước khi init database

#### 3. **Database tables chưa được tạo**
- **Nguyên nhân:** Database trống hoặc bị corrupt
- **Giải pháp:** Tự động tạo tables cơ bản nếu cần

### 📁 Files đã sửa:

#### **src/teledrive/auth/manager.py**
```python
# Sử dụng absolute path cho database
project_root = Path(__file__).parent.parent.parent.parent
instance_dir = project_root / 'instance'
instance_dir.mkdir(exist_ok=True)
db_path = instance_dir / 'teledrive.db'
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path.resolve()}'
```

#### **src/teledrive/database.py**
```python
# Đơn giản hóa database initialization
def init_database(app):
    try:
        if not hasattr(app, 'extensions') or 'sqlalchemy' not in app.extensions:
            db.init_app(app)
        with app.app_context():
            db.create_all()
    except Exception as e:
        print(f"[ERROR] Database initialization failed: {str(e)}")
        raise e
```

#### **main.py**
```python
# Kiểm tra và tạo database trước khi import app
instance_dir = Path('instance')
instance_dir.mkdir(exist_ok=True)
db_path = instance_dir / 'teledrive.db'

if not db_path.exists():
    # Tạo database với tables cơ bản
    conn = sqlite3.connect(str(db_path))
    # Tạo tables users và otp_codes
```

#### **run.bat**
```batch
# Thêm bước kiểm tra database
echo [BUOC 6/7] Kiem tra va sua database...
python fix_database.py >nul 2>&1
```

### 🚀 Cách sử dụng:

#### **Chạy ứng dụng:**
```bash
python main.py
```

#### **Hoặc sử dụng run.bat:**
```bash
run.bat
```

#### **Test database riêng:**
```bash
python test_import.py
```

### 🎯 Kết quả:

✅ **Database hoạt động bình thường**  
✅ **Tự động tạo thư mục instance**  
✅ **Tự động tạo database nếu chưa có**  
✅ **Sử dụng absolute path cho database**  
✅ **Error handling tốt hơn**  

### 📊 Database Structure:

#### **Table: users**
- id (PRIMARY KEY)
- username (UNIQUE)
- phone_number (UNIQUE)
- email
- created_at
- last_login
- is_active
- is_admin
- is_verified

#### **Table: otp_codes**
- id (PRIMARY KEY)
- phone_number
- code
- created_at
- expires_at
- is_used
- attempts

### 🔧 Dev Mode:

Với dev mode đã được tích hợp:
- Không cần đăng nhập
- Tự động có quyền admin
- Database được tạo tự động

### 💡 Troubleshooting:

**Nếu vẫn gặp lỗi database:**
1. Xóa thư mục `instance`
2. Chạy lại `python main.py`
3. Database sẽ được tạo lại tự động

**Nếu muốn reset database:**
```bash
rm -rf instance/
python main.py
```

### 🎉 Hoàn thành!

Database đã được sửa và ứng dụng có thể chạy bình thường với dev mode enabled!
