#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Run TeleDrive Application
Simple runner script for TeleDrive
"""

import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / 'src'))

if __name__ == '__main__':
    from teledrive.app import app

    print("🚀 Starting TeleDrive application...")

    app.run(
        debug=True,
        host='127.0.0.1',
        port=5000,
        threaded=True
    )