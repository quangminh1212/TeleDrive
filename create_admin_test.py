#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script để tạo tài khoản admin test
"""

import sys
import os

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from src.database import init_database, db
from src.auth.models import User
from werkzeug.security import generate_password_hash

def create_admin_user():
    """Tạo tài khoản admin test"""
    try:
        # Khởi tạo database
        from flask import Flask
        app = Flask(__name__)
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///teledrive.db'
        app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
        
        with app.app_context():
            init_database(app)
            
            # Kiểm tra xem admin đã tồn tại chưa
            existing_admin = User.query.filter_by(username='admin').first()
            if existing_admin:
                print("✅ Tài khoản admin đã tồn tại")
                print(f"   Username: {existing_admin.username}")
                print(f"   Phone: {existing_admin.phone_number}")
                print(f"   Is Admin: {existing_admin.is_admin}")
                return
            
            # Tạo admin user
            admin_user = User(
                username='admin',
                phone_number='+84123456789',
                email='admin@teledrive.com',
                password_hash=generate_password_hash('admin123'),
                is_admin=True,
                is_verified=True
            )
            
            db.session.add(admin_user)
            db.session.commit()
            
            print("✅ Đã tạo tài khoản admin test thành công!")
            print("   Username: admin")
            print("   Phone: +84123456789")
            print("   Password: admin123")
            print("   Is Admin: True")
            
    except Exception as e:
        print(f"❌ Lỗi khi tạo admin user: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    create_admin_user()
