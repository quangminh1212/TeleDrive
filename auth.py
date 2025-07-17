#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TeleDrive Authentication System
Hệ thống xác thực người dùng cho TeleDrive Web Interface
"""

import os
import secrets
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin, LoginManager
from werkzeug.security import generate_password_hash, check_password_hash

# Khởi tạo database
db = SQLAlchemy()

class User(UserMixin, db.Model):
    """User model cho hệ thống xác thực"""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    is_active = db.Column(db.Boolean, default=True)
    is_admin = db.Column(db.Boolean, default=False)
    
    def __init__(self, username, email, password, is_admin=False):
        self.username = username
        self.email = email
        self.set_password(password)
        self.is_admin = is_admin
    
    def set_password(self, password):
        """Mã hóa và lưu mật khẩu"""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Kiểm tra mật khẩu"""
        return check_password_hash(self.password_hash, password)
    
    def update_last_login(self):
        """Cập nhật thời gian đăng nhập cuối"""
        self.last_login = datetime.utcnow()
        db.session.commit()
    
    def to_dict(self):
        """Chuyển đổi user thành dictionary"""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'is_active': self.is_active,
            'is_admin': self.is_admin
        }
    
    def __repr__(self):
        return f'<User {self.username}>'

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
            app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///teledrive.db'
        
        app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
        
        # Khởi tạo database
        db.init_app(app)
        
        # User loader cho Flask-Login
        @self.login_manager.user_loader
        def load_user(user_id):
            return User.query.get(int(user_id))
        
        # Tạo bảng database nếu chưa có
        with app.app_context():
            db.create_all()
    
    def create_user(self, username, email, password, is_admin=False):
        """Tạo người dùng mới"""
        try:
            # Kiểm tra username đã tồn tại
            if User.query.filter_by(username=username).first():
                return False, "Tên đăng nhập đã tồn tại"
            
            # Kiểm tra email đã tồn tại
            if User.query.filter_by(email=email).first():
                return False, "Email đã được sử dụng"
            
            # Tạo user mới
            user = User(username=username, email=email, password=password, is_admin=is_admin)
            db.session.add(user)
            db.session.commit()
            
            return True, "Tạo người dùng thành công"
            
        except Exception as e:
            db.session.rollback()
            return False, f"Lỗi tạo người dùng: {str(e)}"
    
    def authenticate_user(self, username_or_email, password):
        """Xác thực người dùng"""
        try:
            # Tìm user theo username hoặc email
            user = User.query.filter(
                (User.username == username_or_email) | 
                (User.email == username_or_email)
            ).first()
            
            if user and user.is_active and user.check_password(password):
                user.update_last_login()
                return user
            
            return None
            
        except Exception as e:
            print(f"Lỗi xác thực: {e}")
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

def validate_password(password):
    """Kiểm tra độ mạnh của mật khẩu"""
    if len(password) < 6:
        return False, "Mật khẩu phải có ít nhất 6 ký tự"
    
    if len(password) > 128:
        return False, "Mật khẩu không được quá 128 ký tự"
    
    return True, "Mật khẩu hợp lệ"

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

# Khởi tạo auth manager
auth_manager = AuthManager()
