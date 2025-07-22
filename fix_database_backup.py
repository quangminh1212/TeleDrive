#!/usr/bin/env python3
"""
Script để sửa lỗi database và đảm bảo database hoạt động đúng
"""

import os
import sqlite3
from pathlib import Path

def fix_database():
    """Sửa lỗi database"""
    print("🔧 Đang kiểm tra và sửa database...")
    
    # Tạo thư mục instance
    instance_dir = Path('instance')
    instance_dir.mkdir(exist_ok=True)
    print(f"✅ Đã tạo thư mục: {instance_dir.absolute()}")
    
    # Đường dẫn database
    db_path = instance_dir / 'teledrive.db'
    
    try:
        # Kiểm tra database hiện tại
        if db_path.exists():
            print(f"📁 Database tồn tại: {db_path.absolute()}")
            
            # Kiểm tra có thể kết nối không
            try:
                conn = sqlite3.connect(str(db_path))
                cursor = conn.cursor()
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
                tables = cursor.fetchall()
                conn.close()
                
                if tables:
                    print(f"✅ Database hoạt động bình thường, có {len(tables)} bảng")
                    for table in tables:
                        print(f"   - {table[0]}")
                    return True
                else:
                    print("⚠️ Database trống, cần tạo lại")
                    
            except Exception as e:
                print(f"❌ Database bị lỗi: {e}")
                print("🔄 Đang tạo lại database...")
                
                # Xóa database cũ
                db_path.unlink()
                
        # Tạo database mới
        print(f"🆕 Tạo database mới: {db_path.absolute()}")
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
        
        conn.commit()
        conn.close()
        
        print("✅ Database đã được tạo thành công!")
        return True
        
    except Exception as e:
        print(f"❌ Lỗi tạo database: {e}")
        
        # Thử tạo database trong thư mục hiện tại
        try:
            print("🔄 Thử tạo database trong thư mục hiện tại...")
            fallback_db = Path('teledrive.db')
            
            conn = sqlite3.connect(str(fallback_db))
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
            
            print(f"✅ Database fallback tạo thành công: {fallback_db.absolute()}")
            return True
            
        except Exception as fallback_error:
            print(f"❌ Lỗi tạo database fallback: {fallback_error}")
            return False

def check_permissions():
    """Kiểm tra quyền ghi"""
    try:
        test_file = Path('test_write.tmp')
        test_file.write_text('test')
        test_file.unlink()
        print("✅ Có quyền ghi trong thư mục hiện tại")
        return True
    except Exception as e:
        print(f"❌ Không có quyền ghi: {e}")
        return False

def main():
    """Main function"""
    print("🔧 TeleDrive Database Fix Tool")
    print("=" * 50)
    
    # Kiểm tra quyền
    if not check_permissions():
        print("❌ Không thể tiếp tục do không có quyền ghi")
        return False
    
    # Sửa database
    if fix_database():
        print("\n🎉 Database đã được sửa thành công!")
        print("💡 Bây giờ có thể chạy ứng dụng bình thường")
        return True
    else:
        print("\n❌ Không thể sửa database")
        print("💡 Vui lòng kiểm tra quyền truy cập và thử lại")
        return False

if __name__ == "__main__":
    main()
