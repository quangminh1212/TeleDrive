# TeleDrive Authentication System

Hệ thống xác thực cho TeleDrive Web Interface với thiết kế bảo mật và dễ sử dụng.

## 🚀 Khởi động nhanh

### 1. Cài đặt dependencies
```bash
pip install flask-login flask-sqlalchemy
```

### 2. Khởi động server
```bash
python app.py
```

### 3. Thiết lập tài khoản admin đầu tiên
1. Truy cập: http://localhost:5000/setup
2. Tạo tài khoản admin
3. Đăng nhập tại: http://localhost:5000/login

## 📋 Tính năng

### ✅ Đã triển khai
- **Đăng nhập/Đăng xuất**: Form đăng nhập với validation
- **Quản lý session**: Sử dụng Flask-Login
- **Bảo vệ route**: Tất cả API endpoints yêu cầu xác thực
- **Mã hóa mật khẩu**: Sử dụng Werkzeug password hashing
- **Giao diện Telegram-style**: Thiết kế nhất quán với theme hiện tại
- **Responsive design**: Tương thích mobile
- **Setup tự động**: Tạo admin user đầu tiên
- **Database SQLite**: Lưu trữ user đơn giản và hiệu quả

### 🔐 Bảo mật
- Mật khẩu được hash với Werkzeug
- Session timeout tự động
- CSRF protection cơ bản
- Input validation
- Route protection cho tất cả endpoints

## 🎯 Cách sử dụng

### Lần đầu sử dụng

1. **Khởi động server**:
   ```bash
   python app.py
   ```

2. **Truy cập setup page**:
   - URL: http://localhost:5000/setup
   - Tạo tài khoản admin đầu tiên

3. **Đăng nhập**:
   - URL: http://localhost:5000/login
   - Sử dụng thông tin vừa tạo

### Sử dụng hàng ngày

1. **Truy cập**: http://localhost:5000
2. **Đăng nhập** nếu chưa đăng nhập
3. **Sử dụng** TeleDrive như bình thường
4. **Đăng xuất** khi hoàn thành

## 🛠️ Cấu trúc hệ thống

### Files chính
```
├── auth.py              # Authentication system
├── app.py               # Flask app với auth routes
├── templates/
│   ├── login.html       # Trang đăng nhập
│   ├── setup.html       # Trang thiết lập admin
│   └── index.html       # Dashboard (đã cập nhật)
├── static/
│   ├── css/style.css    # Styles cho auth UI
│   └── js/app.js        # JavaScript cho auth
└── teledrive.db         # SQLite database (tự tạo)
```

### Database Schema
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    username VARCHAR(80) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    is_active BOOLEAN DEFAULT TRUE,
    is_admin BOOLEAN DEFAULT FALSE
);
```

## 🔧 API Endpoints

### Authentication Routes
- `GET/POST /login` - Đăng nhập
- `POST /logout` - Đăng xuất  
- `GET/POST /setup` - Thiết lập admin (chỉ khi chưa có admin)

### Protected Routes
- `GET /` - Dashboard chính
- `GET /api/scans` - Danh sách scan sessions
- `GET /api/files/<session_id>` - Files trong session
- `GET /api/files/<session_id>/search` - Tìm kiếm files
- `GET /api/files/<session_id>/filter` - Lọc files
- `GET /api/stats/<session_id>` - Thống kê session
- `GET /api/user/info` - Thông tin user hiện tại

## 🔧 Manual Verification

### Login Verification
1. **Verify login functionality**:
   - Try login with correct/incorrect credentials
   - Check redirect after login
   - Verify "Remember me" functionality

2. **Test route protection**:
   - Truy cập `/` mà không đăng nhập → redirect to login
   - Truy cập API endpoints mà không đăng nhập → 401 error

3. **Test đăng xuất**:
   - Click logout button
   - Kiểm tra redirect về login page
   - Thử truy cập protected routes sau logout

## 🔒 User Management

### Tạo user mới (qua Python)
```python
from auth import auth_manager

# Tạo user thường
success, message = auth_manager.create_user(
    username="user1",
    email="user1@example.com", 
    password="password123",
    is_admin=False
)

# Tạo admin user
success, message = auth_manager.create_user(
    username="admin2",
    email="admin2@example.com",
    password="admin123", 
    is_admin=True
)
```

### Quản lý user qua database
```python
from auth import User, db

# Lấy tất cả users
users = User.query.all()

# Tìm user theo username
user = User.query.filter_by(username='admin').first()

# Vô hiệu hóa user
user.is_active = False
db.session.commit()

# Kích hoạt user
user.is_active = True
db.session.commit()
```

## 🚨 Troubleshooting

### Lỗi thường gặp

1. **"Import flask_login could not be resolved"**
   ```bash
   pip install flask-login flask-sqlalchemy
   ```

2. **"Database locked"**
   - Đóng tất cả connections đến database
   - Restart server

3. **"Setup page not accessible"**
   - Kiểm tra đã có admin user chưa
   - Xóa `teledrive.db` để reset

4. **"Session expired"**
   - Đăng nhập lại
   - Kiểm tra session timeout settings

### Debug mode
```python
# Trong app.py, thêm:
app.config['DEBUG'] = True
```

## 🔄 Backup & Recovery

### Backup database
```bash
copy teledrive.db teledrive_backup.db
```

### Reset hệ thống
```bash
del teledrive.db
# Restart server và truy cập /setup
```

## 📈 Future Enhancements

### Có thể thêm sau
- [ ] Password reset functionality
- [ ] Email verification
- [ ] Two-factor authentication
- [ ] User roles và permissions
- [ ] Activity logging
- [ ] Rate limiting
- [ ] OAuth integration
- [ ] User management UI

## 📞 Support

Nếu gặp vấn đề:
1. Kiểm tra console logs
2. Xem file `AUTHENTICATION.md` này
3. Reset database nếu cần thiết
