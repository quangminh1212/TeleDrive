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
    # Sử dụng cấu hình từ config thay vì hardcode
    app.run(
        debug=config.debug,
        host=config.server.host,
        port=config.server.port,
        threaded=True
    )
