#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TeleDrive - Entry Point
Entry point cho TeleDrive Web Application
"""

import sys
import os

# Thêm thư mục src vào Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

# Import và chạy web app
from web.app import app
from src.config import config

if __name__ == '__main__':
    # Sử dụng production server (Waitress) thay vì Flask dev server
    try:
        from waitress import serve
        print("🚀 Khởi động TeleDrive với Waitress Production Server...")
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
    except ImportError:
        print("⚠️  Waitress chưa được cài đặt. Đang cài đặt...")
        import subprocess
        import sys
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'waitress'])

        # Retry with Waitress
        from waitress import serve
        print("🚀 Khởi động TeleDrive với Waitress Production Server...")
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
        print("\n🛑 Đang dừng server...")
    except Exception as e:
        print(f"❌ Lỗi khởi động server: {e}")
        print("🔄 Fallback to Flask development server...")
        app.run(
            debug=config.debug,
            host=config.server.host,
            port=config.server.port,
            threaded=True
        )
