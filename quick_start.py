#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TeleDrive Quick Starter - Khởi động không bị treo
Tác giả: TeleDrive Team
"""

import os
import sys
import subprocess
import platform

def print_header():
    """In header thông tin"""
    print("=" * 60)
    print("        TELEDRIVE - KHỞI ĐỘNG NHANH (KHÔNG BỊ TREO)")
    print("=" * 60)
    print()

def run_detached():
    """Chạy TeleDrive trong tiến trình tách biệt"""
    print_header()
    
    # Lấy đường dẫn thư mục hiện tại
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Xác định lệnh để chạy main.py
    main_script = os.path.join(current_dir, "main.py")
    python_exe = sys.executable
    
    print(f"[INFO] Hệ điều hành: {platform.system()}")
    print(f"[INFO] Đường dẫn Python: {python_exe}")
    print(f"[INFO] Script chính: {main_script}")
    print()
    
    try:
        # Khởi động TeleDrive tùy theo hệ điều hành
        if platform.system() == "Windows":
            # Windows - sử dụng start command
            print("[INFO] Khởi động trên Windows...")
            
            # Tạo tiến trình con với cửa sổ riêng
            CREATE_NEW_CONSOLE = 0x00000010
            process = subprocess.Popen(
                [python_exe, main_script],
                creationflags=CREATE_NEW_CONSOLE,
                cwd=current_dir
            )
            print(f"[OK] Đã khởi động với PID: {process.pid}")
            
        else:
            # Linux/Mac - sử dụng nohup
            print("[INFO] Khởi động trên Linux/Mac...")
            cmd = f"nohup {python_exe} {main_script} > teledrive.log 2>&1 &"
            os.system(cmd)
            print(f"[OK] Đã khởi động trong nền")
        
        print("\n[INFO] TeleDrive đang chạy trong tiến trình riêng")
        print("[INFO] Bạn có thể tiếp tục sử dụng Cursor mà không bị treo")
        print("[INFO] Truy cập web interface tại: http://localhost:3000")
    
    except Exception as e:
        print(f"[ERROR] Không thể khởi động TeleDrive: {e}")
        print("[INFO] Hãy thử chạy 'python main.py' trực tiếp")

if __name__ == "__main__":
    run_detached() 