#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TeleDrive - Production Server
Production server với Gunicorn cho TeleDrive Web Application
"""

import os
import sys
import subprocess
from pathlib import Path

# Thêm thư mục src vào Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

def check_waitress():
    """Kiểm tra xem Waitress có được cài đặt không"""
    try:
        import waitress
        return True
    except ImportError:
        return False

def install_waitress():
    """Cài đặt Waitress"""
    print("📦 Đang cài đặt Waitress...")
    try:
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'waitress'])
        print("✅ Đã cài đặt Waitress thành công")
        return True
    except subprocess.CalledProcessError:
        print("❌ Không thể cài đặt Waitress")
        return False

def run_production_server():
    """Chạy production server với Waitress"""
    from teledrive.config import config

    # Kiểm tra và cài đặt Waitress nếu cần
    if not check_waitress():
        if not install_waitress():
            print("❌ Không thể chạy production server mà không có Waitress")
            return False

    print("🚀 Đang khởi động TeleDrive Production Server...")
    print(f"   Host: {config.server.host}")
    print(f"   Port: {config.server.port}")
    print(f"   Environment: {config.environment}")
    print(f"   Debug: {config.debug}")

    try:
        # Tạo thư mục logs nếu chưa có
        Path('logs').mkdir(exist_ok=True)

        # Import app
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))
        from web.app import app

        # Chạy Waitress
        from waitress import serve
        print(f"🌐 Server đang chạy tại http://{config.server.host}:{config.server.port}")
        print("📝 Nhấn Ctrl+C để dừng server")

        serve(
            app,
            host=config.server.host,
            port=config.server.port,
            threads=config.server.workers * 2,
            connection_limit=1000,
            cleanup_interval=30,
            channel_timeout=120
        )

    except KeyboardInterrupt:
        print("\n🛑 Đang dừng production server...")
        return True
    except Exception as e:
        print(f"❌ Lỗi chạy production server: {e}")
        return False

if __name__ == '__main__':
    run_production_server()
