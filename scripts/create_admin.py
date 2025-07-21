#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script tạo admin user cho TeleDrive
"""

import sys
import os

# Thêm thư mục src vào Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from flask import Flask
from app.database import init_database
from app.auth import auth_manager
from app.models.otp import validate_phone_number

def create_admin_user():
    """Tạo admin user mới"""
    
    # Tạo Flask app
    app = Flask(__name__)
    
    # Cấu hình database
    basedir = os.path.abspath(os.path.dirname(__file__))
    basedir = os.path.dirname(basedir)  # Lên thư mục cha (TeleDrive)
    instance_dir = os.path.join(basedir, 'instance')
    os.makedirs(instance_dir, exist_ok=True)
    db_path = os.path.join(instance_dir, 'teledrive.db')
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = 'teledrive-secret-key-change-in-production'
    
    # Khởi tạo database và auth
    init_database(app)
    auth_manager.init_app(app)
    
    with app.app_context():
        print("🚀 TeleDrive Admin User Creator")
        print("=" * 50)
        
        # Kiểm tra có admin user nào chưa
        if auth_manager.has_admin_user():
            print("✅ Đã có admin user trong hệ thống")
            
            # Hiển thị danh sách users
            users = auth_manager.get_all_users()
            print(f"\n📊 Tổng số users: {len(users)}")
            for user in users:
                status = "👑 Admin" if user.is_admin else "👤 User"
                active = "✅ Active" if user.is_active else "❌ Inactive"
                print(f"   {status} - {user.username} ({user.phone_number}) - {active}")
            
            return True
        
        print("⚠️  Chưa có admin user nào trong hệ thống")
        print("📝 Tạo admin user đầu tiên...")
        print()
        
        # Nhập thông tin admin
        while True:
            username = input("👤 Nhập username admin: ").strip()
            if len(username) >= 3:
                break
            print("❌ Username phải có ít nhất 3 ký tự")
        
        while True:
            phone_number = input("📱 Nhập số điện thoại admin (VD: 0936374950): ").strip()
            is_valid, result = validate_phone_number(phone_number)
            if is_valid:
                phone_number = result
                break
            print(f"❌ {result}")
        
        email = input("📧 Nhập email admin (tùy chọn, Enter để bỏ qua): ").strip() or None
        
        print()
        print("📋 Thông tin admin:")
        print(f"   Username: {username}")
        print(f"   Phone: {phone_number}")
        print(f"   Email: {email or 'Không có'}")
        print()
        
        confirm = input("✅ Xác nhận tạo admin user? (y/n): ").lower().strip()
        if confirm != 'y':
            print("❌ Đã hủy tạo admin user")
            return False
        
        # Tạo admin user
        success, message = auth_manager.create_user(
            username=username,
            phone_number=phone_number,
            email=email,
            is_admin=True
        )
        
        if success:
            print(f"✅ {message}")
            print()
            print("🎉 Tạo admin user thành công!")
            print("📝 Bạn có thể đăng nhập tại: http://localhost:5000/login")
            print(f"📱 Sử dụng số điện thoại: {phone_number}")
            return True
        else:
            print(f"❌ {message}")
            return False

if __name__ == "__main__":
    try:
        create_admin_user()
    except KeyboardInterrupt:
        print("\n❌ Đã hủy bởi người dùng")
    except Exception as e:
        print(f"\n❌ Lỗi: {str(e)}")
