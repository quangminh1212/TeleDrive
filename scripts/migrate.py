#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TeleDrive - Database Migration
Chạy migration database
"""

import sys
import os

# Thêm thư mục src vào Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

# Import và chạy migration
from app.utils.setup import main

if __name__ == '__main__':
    main()
