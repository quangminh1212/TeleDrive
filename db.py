#!/usr/bin/env python3
"""
Script để sửa lỗi database và đảm bảo database hoạt động đúng
"""

import os
import sqlite3
from pathlib import Path

def fix_database():
    """Sửa lỗi database"""
    try:
        # Tạo thư mục instance
        instance_dir = Path('instance')
        instance_dir.mkdir(exist_ok=True)
        
        # Đường dẫn database
        db_path = instance_dir / 'teledrive.db'
        
        # Kiểm tra database hiện tại
        if db_path.exists():
            # Kiểm tra có thể kết nối không
            try:
                conn = sqlite3.connect(str(db_path))
                cursor = conn.cursor()
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
                tables = cursor.fetchall()
                conn.close()
                
                if tables:
                    return True
                    
            except Exception:
                # Database bị lỗi, xóa và tạo lại
                db_path.unlink()
                
        # Tạo database mới
        conn = sqlite3.connect(str(db_path))
        
        # Tạo bảng users cơ bản
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
        
        # Tạo bảng sessions
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                session_token VARCHAR(255) UNIQUE NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME,
                is_active BOOLEAN DEFAULT 1,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        
        conn.commit()
        conn.close()
        
        return True
        
    except Exception:
        return False

def main():
    """Main function"""
    if fix_database():
        exit(0)
    else:
        exit(1)

if __name__ == "__main__":
    main()
