#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TeleDrive - Clean Entry Point
Entry point với logging tối giản
"""

import sys
import os
import logging

# Thêm thư mục src vào Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

# Tắt TẤT CẢ các log hoàn toàn
logging.disable(logging.CRITICAL)

# Tắt tất cả các logger có thể
for logger_name in ['werkzeug', 'urllib3', 'requests', 'telethon', 'asyncio', 'flask', 'teledrive', 'root']:
    logging.getLogger(logger_name).setLevel(logging.CRITICAL)
    logging.getLogger(logger_name).disabled = True

# Tắt warnings
import warnings
warnings.filterwarnings("ignore")

# Import và chạy web app
from src.teledrive.app import app

if __name__ == '__main__':
    # Khởi động với giao diện sạch sẽ
    print("TeleDrive")
    print("http://localhost:5000")
    print("Ctrl+C de dung")
    print()

    try:
        print("Dang khoi dong...")
        app.run(
            host='localhost',
            port=5000,
            debug=False,
            threaded=True,
            use_reloader=False
        )
    except KeyboardInterrupt:
        print("\nDa dung.")
    except Exception as e:
        print(f"❌ Lỗi: {e}")
        sys.exit(1)
