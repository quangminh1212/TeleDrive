#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TeleDrive - Entry Point
Entry point cho TeleDrive Web Application
"""

import sys
import os
import logging

# Thêm thư mục src vào Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

# Tắt các log không cần thiết
logging.getLogger('werkzeug').setLevel(logging.ERROR)
logging.getLogger('urllib3').setLevel(logging.ERROR)
logging.getLogger('requests').setLevel(logging.ERROR)

# Import và chạy web app
from web.app import app
from src.config import config

if __name__ == '__main__':
    # Sử dụng Flask development server với log tối giản
    print("TeleDrive dang khoi dong...")
    print(f"Server: http://{config.server.host}:{config.server.port}")
    print("Nhan Ctrl+C de dung server")
    print("-" * 50)

    try:
        app.run(
            host=config.server.host,
            port=config.server.port,
            debug=False,  # Tắt debug để giảm log
            threaded=True,
            use_reloader=False  # Tắt reloader để tránh log duplicate
        )
    except KeyboardInterrupt:
        print("\nServer da dung.")
    except Exception as e:
        print(f"❌ Lỗi khởi động server: {e}")
        sys.exit(1)
