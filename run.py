#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Run TeleDrive Application
Simple runner script for TeleDrive
"""

import sys
import os
import subprocess
import argparse
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / 'src'))

def run_detached():
    """
    Chạy TeleDrive trong một tiến trình riêng để tránh bị treo
    """
    print("🚀 Khởi động TeleDrive trong tiến trình riêng...")
    
    # Lấy đường dẫn tập lệnh hiện tại
    current_script = sys.argv[0]
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Tạo lệnh để chạy không có tùy chọn detached
    command = [sys.executable, current_script, "--no-detach"]
    
    # Tạo tiến trình con với cửa sổ riêng
    if os.name == 'nt':  # Windows
        CREATE_NEW_CONSOLE = 0x00000010
        process = subprocess.Popen(command, 
                                 creationflags=CREATE_NEW_CONSOLE,
                                 cwd=current_dir)
        print(f"✅ Đã khởi động TeleDrive với PID: {process.pid}")
    else:  # Linux/Mac
        command_str = " ".join(command)
        os.system(f"nohup {command_str} > teledrive_output.log 2>&1 &")
        print(f"✅ Đã khởi động TeleDrive trong nền")
    
    print("\n[INFO] Ứng dụng đang chạy trong tiến trình riêng")
    print("[INFO] Bạn có thể tiếp tục làm việc trong Cursor mà không bị treo")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="TeleDrive Application Runner")
    parser.add_argument("--detached", action="store_true", help="Run in detached mode (no hanging)")
    parser.add_argument("--no-detach", action="store_true", help="Force run in current process")
    args = parser.parse_args()
    
    if args.detached and not args.no_detach:
        run_detached()
        sys.exit(0)
    
    from teledrive.app import app

    print("🚀 Starting TeleDrive application...")

    app.run(
        debug=True,
        host='127.0.0.1',
        port=5000,
        threaded=True
    )