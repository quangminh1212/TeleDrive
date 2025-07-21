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
    # Sử dụng Flask development server để debug
    print("[START] Khoi dong TeleDrive voi Flask Development Server...")
    print(f"[INFO] Server dang chay tai http://{config.server.host}:{config.server.port}")
    print("[INFO] Nhan Ctrl+C de dung server")

    try:
        app.run(
            host=config.server.host,
            port=config.server.port,
            debug=True,
            threaded=True
        )
    except KeyboardInterrupt:
        print("\n[STOP] Dang dung server...")
    except Exception as e:
        print(f"[ERROR] Loi khoi dong server: {e}")
        sys.exit(1)
