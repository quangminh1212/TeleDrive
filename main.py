#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TeleDrive - Entry Point
Điểm khởi đầu cho ứng dụng TeleDrive
"""

import sys
import os
import logging
import argparse
import subprocess
from pathlib import Path

# Thêm thư mục src vào Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Hàm chạy TeleDrive trong tiến trình riêng biệt
def run_detached():
    """
    Khởi động TeleDrive trong một tiến trình riêng để tránh bị treo trong Cursor
    """
    print("\n" + "=" * 60)
    print("    TELEDRIVE - CHẾ ĐỘ CHẠY KHÔNG BỊ TREO")
    print("=" * 60)
    
    print("\n[INFO] Đang khởi động TeleDrive trong tiến trình riêng...")
    
    # Lấy đường dẫn script hiện tại
    current_script = os.path.abspath(__file__)
    current_dir = os.path.dirname(current_script)
    
    # Tạo lệnh để chạy trong tiến trình riêng
    command = [sys.executable, current_script, "--no-detach"]
    
    # Tạo tiến trình với cửa sổ riêng
    if os.name == 'nt':  # Windows
        CREATE_NEW_CONSOLE = 0x00000010
        process = subprocess.Popen(
            command,
            creationflags=CREATE_NEW_CONSOLE,
            cwd=current_dir
        )
        print(f"[OK] Đã khởi động TeleDrive với PID: {process.pid}")
    else:  # Linux/Mac
        command_str = " ".join(command)
        os.system(f"nohup {command_str} > teledrive_output.log 2>&1 &")
        print("[OK] Đã khởi động TeleDrive trong tiến trình nền")
    
    print("\n[INFO] TeleDrive đang chạy trong tiến trình riêng")
    print("[INFO] Bạn có thể tiếp tục làm việc trong Cursor mà không bị treo")
    print("[INFO] Truy cập web interface tại: http://localhost:3000")
    
    # Tạo file đánh dấu để biết rằng TeleDrive đang chạy
    try:
        with open(".teledrive_running", "w") as f:
            f.write(f"TeleDrive running in separate process\n")
        print("[INFO] Đã tạo file .teledrive_running")
    except:
        pass
    
    print("\n" + "=" * 60)

# Tắt TẤT CẢ các log hoàn toàn
logging.disable(logging.CRITICAL)

# Tắt tất cả các logger có thể
for logger_name in ['werkzeug', 'urllib3', 'requests', 'telethon', 'asyncio', 'flask', 'teledrive', 'root']:
    logging.getLogger(logger_name).setLevel(logging.CRITICAL)
    logging.getLogger(logger_name).disabled = True

# Tắt warnings
import warnings
warnings.filterwarnings("ignore")

# Xử lý tham số dòng lệnh
parser = argparse.ArgumentParser(description="TeleDrive Application Runner")
parser.add_argument("--detached", action="store_true", help="Chạy trong tiến trình riêng (tránh bị treo)")
parser.add_argument("--no-detach", action="store_true", help="Buộc chạy trong tiến trình hiện tại")
args = parser.parse_args()

# Nếu được chỉ định chạy detached và không có cờ no-detach
if args.detached and not args.no_detach:
    run_detached()
    sys.exit(0)

# Sửa database trước khi import app
print("[INFO] Checking database...")

# Tạo thư mục instance và đảm bảo database tồn tại
instance_dir = Path('instance')
instance_dir.mkdir(exist_ok=True)
db_path = instance_dir / 'teledrive.db'

# Nếu database không tồn tại, tạo một database đơn giản
if not db_path.exists():
    import sqlite3
    print(f"[INFO] Creating database: {db_path}")
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
            is_verified BOOLEAN DEFAULT 1,
            password_hash VARCHAR(255)
        )
    ''')
    conn.commit()
    conn.close()
    print("[OK] Database created successfully")

print("[INFO] Starting TeleDrive...")
print("=" * 50)

if __name__ == '__main__':
    try:
        # Set environment variable for dev mode BEFORE importing
        os.environ['DEV_MODE'] = 'true'

        # Import app từ teledrive module
        print("[INFO] Creating Flask app...")
        
        # Import app từ cấu trúc thư mục mới
        from src.teledrive.app import app
        print("[OK] Flask app created with routes")

        # Set Flask config
        app.config['DEV_MODE'] = True

        print("[INFO] Server starting at: http://localhost:3000")
        print("[INFO] Dev Mode: Enabled (no login required)")
        print("[INFO] User: Developer (admin)")
        print("[INFO] Press Ctrl+C to stop")
        print("=" * 50)

        # Chạy server
        app.run(
            host='0.0.0.0',
            port=3000,
            debug=False,
            threaded=True,
            use_reloader=False
        )

    except KeyboardInterrupt:
        print("\n[OK] Server stopped by user")
        
        # Xóa file đánh dấu khi dừng server
        if os.path.exists(".teledrive_running"):
            try:
                os.remove(".teledrive_running")
            except:
                pass
                
    except Exception as e:
        print(f"[ERROR] Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
