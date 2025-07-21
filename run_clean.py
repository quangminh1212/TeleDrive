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

# Tắt tất cả các log không cần thiết
logging.getLogger('werkzeug').setLevel(logging.CRITICAL)
logging.getLogger('urllib3').setLevel(logging.CRITICAL)
logging.getLogger('requests').setLevel(logging.CRITICAL)
logging.getLogger('telethon').setLevel(logging.CRITICAL)
logging.getLogger('asyncio').setLevel(logging.CRITICAL)
logging.getLogger('flask').setLevel(logging.CRITICAL)

# Setup logging tối giản
logging.basicConfig(
    level=logging.ERROR,
    format='%(message)s',
    handlers=[logging.StreamHandler()]
)

# Import và chạy web app
from web.app import app
from src.config import config

if __name__ == '__main__':
    # Khởi động với giao diện sạch sẽ
    print("🚀 TeleDrive")
    print(f"🌐 http://{config.server.host}:{config.server.port}")
    print("⏹️  Ctrl+C để dừng")
    print()

    try:
        app.run(
            host=config.server.host,
            port=config.server.port,
            debug=False,
            threaded=True,
            use_reloader=False
        )
    except KeyboardInterrupt:
        print("\n⏹️  Đã dừng.")
    except Exception as e:
        print(f"❌ Lỗi: {e}")
        sys.exit(1)
