#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script để bypass OTP và tạo session login
"""

import sys
import os

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from src.database import init_database, db
from src.auth.models import User
from flask import Flask
from flask_login import LoginManager

def create_login_session():
    """Tạo session login cho admin"""
    try:
        # Khởi tạo Flask app
        app = Flask(__name__)
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///teledrive.db'
        app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
        app.config['SECRET_KEY'] = 'test-secret-key'
        
        # Khởi tạo database
        with app.app_context():
            init_database(app)
            
            # Tìm admin user
            admin_user = User.query.filter_by(username='admin').first()
            if not admin_user:
                print("❌ Không tìm thấy admin user")
                return
            
            print("✅ Tìm thấy admin user:")
            print(f"   Username: {admin_user.username}")
            print(f"   Phone: {admin_user.phone_number}")
            print(f"   Is Admin: {admin_user.is_admin}")
            
            # Tạo session cookie info
            print("\n📝 Để test ứng dụng thật:")
            print("1. Mở Developer Tools trong browser (F12)")
            print("2. Vào tab Application/Storage → Cookies")
            print("3. Thêm cookie với:")
            print(f"   Name: session")
            print(f"   Value: admin_session_test")
            print(f"   Domain: localhost")
            print("4. Refresh trang để vào dashboard")
            
            print("\n🔧 Hoặc sử dụng cách khác:")
            print("1. Đăng nhập bằng số điện thoại admin")
            print(f"2. Số điện thoại: {admin_user.phone_number}")
            print("3. Khi được yêu cầu OTP, check terminal để lấy OTP")
            
    except Exception as e:
        print(f"❌ Lỗi: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    create_login_session()
