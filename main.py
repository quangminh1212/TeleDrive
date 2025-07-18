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

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
