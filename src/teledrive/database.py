#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Database configuration for TeleDrive
Cấu hình database chung cho toàn bộ ứng dụng
"""

from flask_sqlalchemy import SQLAlchemy
import os

# Tạo database instance chung
db = SQLAlchemy()

def init_database(app):
    """Khởi tạo database với Flask app"""
    try:
        # Đảm bảo thư mục instance tồn tại
        from pathlib import Path

        # Thử tạo thư mục instance với quyền đầy đủ
        instance_dir = Path('instance')
        try:
            # Tạo thư mục instance nếu chưa tồn tại
            instance_dir.mkdir(exist_ok=True, mode=0o777)
            
            # Đảm bảo quyền ghi cho thư mục
            os.chmod(instance_dir, 0o777)
            
            # Test quyền ghi
            test_file = instance_dir / 'test_write.tmp'
            test_file.write_text('test')
            test_file.unlink()
            
            print(f"[OK] Thư mục instance đã sẵn sàng: {instance_dir.resolve()}")
        except Exception as e:
            print(f"[WARNING] Không thể ghi vào thư mục instance: {e}")
            # Nếu không thể ghi vào instance, dùng thư mục hiện tại
            instance_dir = Path('.')
            print(f"[INFO] Sử dụng thư mục hiện tại cho database: {instance_dir.resolve()}")

        # Chỉ init nếu chưa được init
        if not hasattr(app, 'extensions') or 'sqlalchemy' not in app.extensions:
            # Đảm bảo SQLALCHEMY_DATABASE_URI được cấu hình đúng
            if 'SQLALCHEMY_DATABASE_URI' not in app.config:
                db_path = instance_dir / 'teledrive.db'
                app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path.resolve()}'
                print(f"[INFO] Cấu hình database URI: {app.config['SQLALCHEMY_DATABASE_URI']}")
            
            db.init_app(app)

        with app.app_context():
            # Tạo tables
            db.create_all()
            print("[OK] Database initialized successfully")

    except Exception as e:
        print(f"[ERROR] Database initialization failed: {str(e)}")
        # Thử tạo database đơn giản trong thư mục hiện tại
        try:
            import sqlite3
            from pathlib import Path

            # Thử instance trước, nếu không được thì dùng thư mục hiện tại
            for db_dir in [Path('instance'), Path('.')]:
                try:
                    if db_dir.name == 'instance':
                        db_dir.mkdir(exist_ok=True, mode=0o777)
                        # Đảm bảo quyền ghi cho thư mục
                        os.chmod(db_dir, 0o777)

                    db_path = db_dir / 'teledrive.db'

                    # Tạo database đơn giản
                    conn = sqlite3.connect(str(db_path))
                    cursor = conn.cursor()
                    cursor.execute('''
                        CREATE TABLE IF NOT EXISTS users (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            username VARCHAR(80) UNIQUE NOT NULL,
                            phone_number VARCHAR(20) UNIQUE NOT NULL,
                            email VARCHAR(120) UNIQUE,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            last_login DATETIME,
                            is_active BOOLEAN DEFAULT 1,
                            is_admin BOOLEAN DEFAULT 0,
                            is_verified BOOLEAN DEFAULT 1
                        )
                    ''')
                    conn.commit()
                    conn.close()
                    print(f"[OK] Fallback database created successfully at: {db_path}")
                    break

                except Exception as dir_error:
                    if db_dir.name == '.':  # Thư mục cuối cùng
                        print(f"[ERROR] Cannot create database anywhere: {dir_error}")
                    continue

        except Exception as fallback_error:
            print(f"[ERROR] Fallback database creation failed: {fallback_error}")
            # Không raise để app vẫn có thể chạy
            pass

    return db
