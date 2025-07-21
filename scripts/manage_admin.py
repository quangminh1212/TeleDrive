#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script quản lý admin users trong TeleDrive
"""

import os
import sys
from flask import Flask

# Thêm thư mục src vào Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from app.database import init_database
from app.auth import auth_manager
from app.auth.models import User

def setup_app():
    """Khởi tạo Flask app và database"""
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
    
    return app

def list_all_users():
    """Hiển thị danh sách tất cả users"""
    users = auth_manager.get_all_users()
    
    print("\n" + "="*60)
    print("📊 DANH SÁCH TẤT CẢ USERS")
    print("="*60)
    
    if not users:
        print("❌ Không có user nào trong hệ thống")
        return []
    
    admin_users = []
    regular_users = []
    
    for user in users:
        if user.is_admin:
            admin_users.append(user)
        else:
            regular_users.append(user)
    
    # Hiển thị admin users
    print(f"\n👑 ADMIN USERS ({len(admin_users)}):")
    if admin_users:
        for i, user in enumerate(admin_users, 1):
            status = "✅ Active" if user.is_active else "❌ Inactive"
            print(f"   {i}. ID: {user.id} | {user.username} | {user.phone_number} | {status}")
            if user.email:
                print(f"      Email: {user.email}")
            print(f"      Tạo lúc: {user.created_at}")
    else:
        print("   Không có admin user nào")
    
    # Hiển thị regular users
    print(f"\n👤 REGULAR USERS ({len(regular_users)}):")
    if regular_users:
        for i, user in enumerate(regular_users, 1):
            status = "✅ Active" if user.is_active else "❌ Inactive"
            print(f"   {i}. ID: {user.id} | {user.username} | {user.phone_number} | {status}")
    else:
        print("   Không có regular user nào")
    
    return admin_users

def remove_admin_privilege(user_id):
    """Gỡ quyền admin của user"""
    try:
        from app.database import db
        
        user = User.query.get(user_id)
        if not user:
            print(f"❌ Không tìm thấy user với ID: {user_id}")
            return False
        
        if not user.is_admin:
            print(f"❌ User {user.username} không phải là admin")
            return False
        
        # Gỡ quyền admin
        user.is_admin = False
        db.session.commit()
        
        print(f"✅ Đã gỡ quyền admin của user: {user.username}")
        return True
        
    except Exception as e:
        print(f"❌ Lỗi khi gỡ quyền admin: {str(e)}")
        return False

def delete_user(user_id):
    """Xóa user khỏi hệ thống"""
    try:
        from app.database import db
        
        user = User.query.get(user_id)
        if not user:
            print(f"❌ Không tìm thấy user với ID: {user_id}")
            return False
        
        username = user.username
        
        # Xóa user
        db.session.delete(user)
        db.session.commit()
        
        print(f"✅ Đã xóa user: {username}")
        return True
        
    except Exception as e:
        print(f"❌ Lỗi khi xóa user: {str(e)}")
        return False

def main():
    """Hàm chính"""
    print("🚀 TeleDrive Admin Management Tool")
    print("="*50)
    
    app = setup_app()
    
    with app.app_context():
        while True:
            admin_users = list_all_users()
            
            print("\n" + "="*60)
            print("🛠️  CHỌN HÀNH ĐỘNG:")
            print("1. Làm mới danh sách")
            print("2. Gỡ quyền admin của user")
            print("3. Xóa user khỏi hệ thống")
            print("0. Thoát")
            print("="*60)
            
            choice = input("\nNhập lựa chọn (0-3): ").strip()
            
            if choice == "0":
                print("👋 Tạm biệt!")
                break
            elif choice == "1":
                continue
            elif choice == "2":
                if not admin_users:
                    print("❌ Không có admin user nào để gỡ quyền")
                    continue
                
                try:
                    user_id = int(input("Nhập ID của user cần gỡ quyền admin: ").strip())
                    
                    # Kiểm tra không được gỡ quyền admin cuối cùng
                    if len(admin_users) == 1:
                        print("❌ Không thể gỡ quyền admin cuối cùng trong hệ thống!")
                        continue
                    
                    confirm = input(f"Bạn có chắc chắn muốn gỡ quyền admin của user ID {user_id}? (y/N): ").strip().lower()
                    if confirm == 'y':
                        remove_admin_privilege(user_id)
                    else:
                        print("❌ Đã hủy thao tác")
                        
                except ValueError:
                    print("❌ ID không hợp lệ")
                    
            elif choice == "3":
                try:
                    user_id = int(input("Nhập ID của user cần xóa: ").strip())
                    
                    # Tìm user để kiểm tra
                    user = User.query.get(user_id)
                    if user and user.is_admin and len(admin_users) == 1:
                        print("❌ Không thể xóa admin user cuối cùng trong hệ thống!")
                        continue
                    
                    confirm = input(f"Bạn có chắc chắn muốn XÓA user ID {user_id}? (y/N): ").strip().lower()
                    if confirm == 'y':
                        delete_user(user_id)
                    else:
                        print("❌ Đã hủy thao tác")
                        
                except ValueError:
                    print("❌ ID không hợp lệ")
            else:
                print("❌ Lựa chọn không hợp lệ")
            
            input("\nNhấn Enter để tiếp tục...")

if __name__ == "__main__":
    main()
