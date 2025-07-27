#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Database Migration Script
Migrate từ password-based authentication sang phone-based authentication
"""

import sqlite3
import os
from datetime import datetime

def migrate_database():
    """Migrate database schema"""
    db_path = 'instance/teledrive.db'

    # Backup database trước khi migrate
    if os.path.exists(db_path):
        backup_path = f'instance/teledrive_backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}.db'
        import shutil
        shutil.copy2(db_path, backup_path)
        print(f"✅ Đã backup database tại: {backup_path}")

    # Kết nối database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Kiểm tra xem bảng users có tồn tại không
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        if not cursor.fetchone():
            print("❌ Bảng users không tồn tại")
            return False

        # Kiểm tra cấu trúc hiện tại
        cursor.execute("PRAGMA table_info(users)")
        columns = [column[1] for column in cursor.fetchall()]
        print(f"📋 Cấu trúc hiện tại: {columns}")

        # Thêm cột phone_number nếu chưa có
        if 'phone_number' not in columns:
            print("➕ Thêm cột phone_number...")
            cursor.execute("ALTER TABLE users ADD COLUMN phone_number VARCHAR(20)")

        # Tạo bảng mới với cấu trúc mới
        print("🔄 Tạo bảng users_new...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users_new (
                id INTEGER PRIMARY KEY,
                username VARCHAR(80) UNIQUE NOT NULL,
                phone_number VARCHAR(20) UNIQUE NOT NULL,
                email VARCHAR(120) UNIQUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login DATETIME,
                is_active BOOLEAN DEFAULT 1,
                is_admin BOOLEAN DEFAULT 0
            )
        """)

        # Copy dữ liệu từ bảng cũ (nếu có dữ liệu)
        cursor.execute("SELECT COUNT(*) FROM users")
        user_count = cursor.fetchone()[0]

        if user_count > 0:
            print(f"📊 Tìm thấy {user_count} users, cần cập nhật phone_number...")

            # Lấy tất cả users hiện tại
            cursor.execute("SELECT id, username, email, created_at, last_login, is_active, is_admin FROM users")
            users = cursor.fetchall()

            for user in users:
                user_id, username, email, created_at, last_login, is_active, is_admin = user

                # Tạo phone_number tạm thời (cần admin cập nhật sau)
                temp_phone = f"+84{user_id:09d}"  # Tạo số điện thoại tạm

                print(f"   👤 Migrate user: {username} -> phone: {temp_phone}")

                cursor.execute("""
                    INSERT INTO users_new (id, username, phone_number, email, created_at, last_login, is_active, is_admin)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (user_id, username, temp_phone, email, created_at, last_login, is_active, is_admin))

        # Xóa bảng cũ và đổi tên bảng mới
        print("🔄 Thay thế bảng cũ...")
        cursor.execute("DROP TABLE users")
        cursor.execute("ALTER TABLE users_new RENAME TO users")

        # Tạo bảng OTP
        print("➕ Tạo bảng otp_codes...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS otp_codes (
                id INTEGER PRIMARY KEY,
                phone_number VARCHAR(20) NOT NULL,
                code VARCHAR(6) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME NOT NULL,
                is_used BOOLEAN DEFAULT 0,
                attempts INTEGER DEFAULT 0
            )
        """)

        # Tạo index
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_codes(phone_number)")

        conn.commit()
        print("✅ Migration hoàn thành!")

        # Hiển thị thông tin sau migration
        cursor.execute("SELECT COUNT(*) FROM users")
        user_count = cursor.fetchone()[0]
        print(f"📊 Tổng số users sau migration: {user_count}")

        if user_count > 0:
            print("\n⚠️  LƯU Ý QUAN TRỌNG:")
            print("   - Tất cả users đã được tạo phone_number tạm thời")
            print("   - Admin cần cập nhật phone_number thật cho từng user")
            print("   - Sử dụng script update_user_phone.py để cập nhật")

        return True

    except Exception as e:
        print(f"❌ Lỗi migration: {e}")
        conn.rollback()
        return False

    finally:
        conn.close()

def create_admin_user():
    """Tạo admin user mới với phone number"""
    from auth import auth_manager, db
    from flask import Flask

    app = Flask(__name__)
    auth_manager.init_app(app)

    with app.app_context():
        # Kiểm tra có admin user nào chưa
        if auth_manager.has_admin_user():
            print("✅ Đã có admin user")
            return True

        # Tạo admin user mới
        admin_phone = input("Nhập số điện thoại admin (VD: +84936374950): ").strip()
        admin_username = input("Nhập username admin: ").strip()
        admin_email = input("Nhập email admin (tùy chọn): ").strip() or None

        success, message = auth_manager.create_user(
            username=admin_username,
            phone_number=admin_phone,
            email=admin_email,
            is_admin=True
        )

        if success:
            print(f"✅ {message}")
            return True
        else:
            print(f"❌ {message}")
            return False

if __name__ == "__main__":
    print("🚀 Bắt đầu migration database...")
    print("=" * 50)

    # Tạo thư mục instance nếu chưa có
    os.makedirs('instance', exist_ok=True)

    # Chạy migration
    if migrate_database():
        print("\n" + "=" * 50)
        print("✅ Migration thành công!")

        # Hỏi có muốn tạo admin user không
        create_admin = input("\nBạn có muốn tạo admin user mới? (y/n): ").lower().strip()
        if create_admin == 'y':
            create_admin_user()
    else:
        print("\n❌ Migration thất bại!")
