#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Database configuration for TeleDrive
Cấu hình database chung cho toàn bộ ứng dụng
"""

from flask_sqlalchemy import SQLAlchemy

# Tạo database instance chung
db = SQLAlchemy()

def init_database(app):
    """Khởi tạo database với Flask app"""
    try:
        # Đảm bảo thư mục instance tồn tại
        from pathlib import Path
        instance_dir = Path('instance')
        instance_dir.mkdir(exist_ok=True)

        # Chỉ init nếu chưa được init
        if not hasattr(app, 'extensions') or 'sqlalchemy' not in app.extensions:
            db.init_app(app)

        with app.app_context():
            # Tạo tables
            db.create_all()

    except Exception as e:
        print(f"[ERROR] Database initialization failed: {str(e)}")
        # Thử tạo database đơn giản
        try:
            import sqlite3
            from pathlib import Path

            instance_dir = Path('instance')
            instance_dir.mkdir(exist_ok=True)
            db_path = instance_dir / 'teledrive.db'

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
            print("[OK] Fallback database created successfully")

        except Exception as fallback_error:
            print(f"[ERROR] Fallback database creation failed: {fallback_error}")
            # Không raise để app vẫn có thể chạy
            pass

    return db
