#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Database configuration for TeleDrive
Cau hinh database chung cho toan bo ung dung
"""

from flask_sqlalchemy import SQLAlchemy
import os
import time
from pathlib import Path

# Tạo database instance chung
db = SQLAlchemy()

def init_database(app):
    """Khoi tao database voi Flask app"""
    try:
        # Dam bao thu muc instance ton tai
        instance_dir = Path('instance')
        try:
            # Tao thu muc instance neu chua ton tai
            instance_dir.mkdir(exist_ok=True, mode=0o777)
            
            # Dam bao quyen ghi cho thu muc
            try:
                os.chmod(instance_dir, 0o777)
            except Exception as chmod_error:
                print(f"[WARNING] Khong the thay doi quyen thu muc: {chmod_error}")
            
            # Test quyen ghi
            test_file = instance_dir / 'test_write.tmp'
            test_file.write_text('test')
            test_file.unlink()
            
            print(f"[OK] Thu muc instance da san sang: {instance_dir.resolve()}")
        except Exception as e:
            print(f"[WARNING] Khong the ghi vao thu muc instance: {e}")
            # Neu khong the ghi vao instance, dung thu muc hien tai
            instance_dir = Path('.')
            print(f"[INFO] Su dung thu muc hien tai cho database: {instance_dir.resolve()}")

        # Chi init neu chua duoc init
        if not hasattr(app, 'extensions') or 'sqlalchemy' not in app.extensions:
            # Dam bao SQLALCHEMY_DATABASE_URI duoc cau hinh dung
            if 'SQLALCHEMY_DATABASE_URI' not in app.config:
                db_path = instance_dir / 'app.db'
                
                # Kiểm tra quyền truy cập file
                if db_path.exists():
                    try:
                        # Thử mở file để kiểm tra quyền
                        with open(db_path, 'a'):
                            pass
                        print(f"[OK] Da kiem tra quyen truy cap database: {db_path}")
                    except Exception as access_error:
                        print(f"[WARNING] Khong the truy cap database hien tai: {access_error}")
                        # Thử đổi tên file cũ và tạo mới
                        try:
                            backup_path = instance_dir / f'teledrive_backup_{int(time.time())}.db'
                            db_path.rename(backup_path)
                            print(f"[INFO] Da sao luu database cu sang: {backup_path}")
                        except Exception as rename_error:
                            print(f"[WARNING] Khong the sao luu database cu: {rename_error}")
                
                app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path.resolve()}'
                print(f"[INFO] Cau hinh database URI: {app.config['SQLALCHEMY_DATABASE_URI']}")
            
            # Tắt cảnh báo tracking modifications
            app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
            
            db.init_app(app)

        with app.app_context():
            # Tao tables
            db.create_all()
            print("[OK] Database initialized successfully")

    except Exception as e:
        print(f"[ERROR] Database initialization failed: {str(e)}")
        # Thu tao database don gian trong thu muc hien tai
        try:
            import sqlite3
            from pathlib import Path

            # Thu instance truoc, neu khong duoc thi dung thu muc hien tai
            for db_dir in [Path('instance'), Path('.')]:
                try:
                    if db_dir.name == 'instance':
                        db_dir.mkdir(exist_ok=True, mode=0o777)
                        # Dam bao quyen ghi cho thu muc
                        try:
                            os.chmod(db_dir, 0o777)
                        except Exception as chmod_error:
                            print(f"[WARNING] Khong the thay doi quyen thu muc: {chmod_error}")

                    db_path = db_dir / 'app.db'
                    
                    # Kiểm tra nếu file đã tồn tại và không thể ghi
                    if db_path.exists():
                        try:
                            # Thử mở file để kiểm tra quyền
                            with open(db_path, 'a'):
                                pass
                        except Exception:
                            # Nếu không mở được, thử đổi tên
                            backup_path = db_dir / f'app_backup_{int(time.time())}.db'
                            try:
                                db_path.rename(backup_path)
                                print(f"[INFO] Da sao luu database cu sang: {backup_path}")
                            except Exception:
                                # Nếu không đổi tên được, thử tạo tên file mới
                                db_path = db_dir / f'app_new_{int(time.time())}.db'
                                print(f"[INFO] Se tao database moi tai: {db_path}")

                    # Tao database don gian
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
                    if db_dir.name == '.':  # Thu muc cuoi cung
                        print(f"[ERROR] Cannot create database anywhere: {dir_error}")
                    continue

        except Exception as fallback_error:
            print(f"[ERROR] Fallback database creation failed: {fallback_error}")
            # Khong raise de app van co the chay
            pass

    return db
