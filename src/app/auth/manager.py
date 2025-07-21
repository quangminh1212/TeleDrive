#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TeleDrive Authentication System
Hệ thống xác thực người dùng cho TeleDrive Web Interface
"""

import secrets
from flask_login import LoginManager

# Import database chung và User model
from ..database import db
from .models import User

class AuthManager:
    """Quản lý xác thực và người dùng"""
    
    def __init__(self, app=None):
        self.login_manager = LoginManager()
        if app:
            self.init_app(app)
    
    def init_app(self, app):
        """Khởi tạo authentication với Flask app"""
        # Cấu hình Flask-Login
        self.login_manager.init_app(app)
        self.login_manager.login_view = 'login'
        self.login_manager.login_message = 'Vui lòng đăng nhập để truy cập trang này.'
        self.login_manager.login_message_category = 'info'
        
        # Cấu hình database
        if not app.config.get('SECRET_KEY'):
            app.config['SECRET_KEY'] = secrets.token_hex(32)

        if not app.config.get('SQLALCHEMY_DATABASE_URI'):
            app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///instance/teledrive.db'

        app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

        # Database đã được init từ init_database(), không cần init lại
        
        # User loader cho Flask-Login
        @self.login_manager.user_loader
        def load_user(user_id):
            return User.query.get(int(user_id))
        
        # Database tables đã được tạo từ init_database()
    
    def create_user(self, username, phone_number, email=None, is_admin=False):
        """Tạo người dùng mới"""
        try:
            # Kiểm tra username đã tồn tại
            if User.query.filter_by(username=username).first():
                return False, "Tên đăng nhập đã tồn tại"

            # Kiểm tra phone_number đã tồn tại
            if User.query.filter_by(phone_number=phone_number).first():
                return False, "Số điện thoại đã được sử dụng"

            # Kiểm tra email đã tồn tại (nếu có)
            if email and User.query.filter_by(email=email).first():
                return False, "Email đã được sử dụng"

            # Tạo user mới
            user = User(username=username, phone_number=phone_number, email=email, is_admin=is_admin)
            db.session.add(user)
            db.session.commit()

            return True, "Tạo người dùng thành công"

        except Exception as e:
            db.session.rollback()
            return False, f"Lỗi tạo người dùng: {str(e)}"
    
    def authenticate_user_by_phone(self, phone_number):
        """Xác thực người dùng bằng số điện thoại (sau khi verify OTP)"""
        try:
            # Tìm user theo phone_number
            user = User.query.filter_by(phone_number=phone_number).first()

            if user and user.is_active:
                user.update_last_login()
                return user

            return None

        except Exception as e:
            print(f"Lỗi xác thực: {e}")
            return None

    def find_user_by_phone(self, phone_number):
        """Tìm user theo số điện thoại"""
        try:
            return User.query.filter_by(phone_number=phone_number).first()
        except Exception as e:
            print(f"Lỗi tìm user: {e}")
            return None
    
    def get_user_count(self):
        """Lấy số lượng người dùng"""
        return User.query.count()
    
    def has_admin_user(self):
        """Kiểm tra có admin user nào chưa"""
        return User.query.filter_by(is_admin=True).first() is not None
    
    def get_all_users(self):
        """Lấy danh sách tất cả người dùng"""
        return User.query.all()
    
    def deactivate_user(self, user_id):
        """Vô hiệu hóa người dùng"""
        try:
            user = User.query.get(user_id)
            if user:
                user.is_active = False
                db.session.commit()
                return True, "Đã vô hiệu hóa người dùng"
            return False, "Không tìm thấy người dùng"
        except Exception as e:
            db.session.rollback()
            return False, f"Lỗi: {str(e)}"
    
    def activate_user(self, user_id):
        """Kích hoạt người dùng"""
        try:
            user = User.query.get(user_id)
            if user:
                user.is_active = True
                db.session.commit()
                return True, "Đã kích hoạt người dùng"
            return False, "Không tìm thấy người dùng"
        except Exception as e:
            db.session.rollback()
            return False, f"Lỗi: {str(e)}"

def validate_phone_number_auth(phone_number):
    """Kiểm tra tính hợp lệ của số điện thoại cho authentication"""
    from ..models.otp import validate_phone_number
    return validate_phone_number(phone_number)

def validate_username(username):
    """Kiểm tra tính hợp lệ của username"""
    if len(username) < 3:
        return False, "Tên đăng nhập phải có ít nhất 3 ký tự"
    
    if len(username) > 80:
        return False, "Tên đăng nhập không được quá 80 ký tự"
    
    if not username.replace('_', '').replace('-', '').isalnum():
        return False, "Tên đăng nhập chỉ được chứa chữ cái, số, dấu gạch dưới và gạch ngang"
    
    return True, "Tên đăng nhập hợp lệ"

def validate_email(email):
    """Kiểm tra tính hợp lệ của email"""
    import re
    
    if len(email) > 120:
        return False, "Email không được quá 120 ký tự"
    
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, email):
        return False, "Định dạng email không hợp lệ"
    
    return True, "Email hợp lệ"

# Admin required decorator
def admin_required(f):
    """Decorator để yêu cầu quyền admin"""
    from functools import wraps
    from flask import jsonify, abort, request
    from flask_login import current_user, login_required

    @wraps(f)
    @login_required
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_admin:
            # Nếu là AJAX request, trả về JSON
            if request.is_json or request.headers.get('Content-Type') == 'application/json':
                return jsonify({
                    'success': False,
                    'error': 'Bạn không có quyền truy cập chức năng này'
                }), 403
            else:
                abort(403)
        return f(*args, **kwargs)
    return decorated_function

# Khởi tạo auth manager
auth_manager = AuthManager()
