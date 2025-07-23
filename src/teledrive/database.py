#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Database configuration for TeleDrive
Cau hinh database chung cho toan bo ung dung
"""

from flask_sqlalchemy import SQLAlchemy
import os

# Tạo database instance chung
db = SQLAlchemy()

def init_database(app):
    """Khoi tao database voi Flask app"""
    try:
        # Dam bao thu muc instance ton tai
        from pathlib import Path

        # Thu tao thu muc instance voi quyen day du
        instance_dir = Path('instance')
        try:
            # Tao thu muc instance neu chua ton tai
            instance_dir.mkdir(exist_ok=True, mode=0o777)
            
            # Dam bao quyen ghi cho thu muc
            os.chmod(instance_dir, 0o777)
            
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
                db_path = instance_dir / 'teledrive.db'
                app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path.resolve()}'
                print(f"[INFO] Cau hinh database URI: {app.config['SQLALCHEMY_DATABASE_URI']}")
            
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
                        os.chmod(db_dir, 0o777)

                    db_path = db_dir / 'teledrive.db'

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
