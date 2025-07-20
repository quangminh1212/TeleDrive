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
    # Sử dụng production server (Waitress)
    try:
        from waitress import serve
        print("[START] Khoi dong TeleDrive voi Waitress Production Server...")
        print(f"[INFO] Server dang chay tai http://{config.server.host}:{config.server.port}")
        print("[INFO] Nhan Ctrl+C de dung server")

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
        print("[WARNING] Waitress chua duoc cai dat. Dang cai dat...")
        import subprocess
        import sys
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'waitress'])

        # Retry with Waitress
        from waitress import serve
        print("[START] Khoi dong TeleDrive voi Waitress Production Server...")
        print(f"[INFO] Server dang chay tai http://{config.server.host}:{config.server.port}")
        print("[INFO] Nhan Ctrl+C de dung server")

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
        print("\n[STOP] Dang dung server...")
    except Exception as e:
        print(f"[ERROR] Loi khoi dong server: {e}")
        sys.exit(1)
