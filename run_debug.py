#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TeleDrive - Debug Mode Entry Point
Chạy với debug mode nhưng chỉ log những thông tin cần thiết
"""

import sys
import os
import logging

# Thêm thư mục src vào Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

# Import smart logger trước
from app.logger import setup_smart_logging, log_startup, log_error_important

# Setup smart logging ngay từ đầu
setup_smart_logging()

# Import và chạy web app
try:
    from app.app import app
    
    # Enable debug mode nhưng tắt reloader để tránh spam
    app.config['DEBUG'] = True
    app.config['TESTING'] = False
    
    if __name__ == '__main__':
        log_startup("TeleDrive Debug Mode")
        log_startup("Server: http://localhost:5000")
        log_startup("Debug: ON (smart logging)")
        log_startup("Press Ctrl+C to stop")
        print()

        try:
            app.run(
                host='localhost',
                port=5000,
                debug=True,
                use_reloader=False,  # Tắt reloader để tránh spam
                threaded=True
            )
        except KeyboardInterrupt:
            print("\n✅ Server stopped.")
        except Exception as e:
            log_error_important(f"Error starting server: {e}")
            sys.exit(1)

except ImportError as e:
    log_error_important(f"Import error: {e}")
    print("Please make sure all dependencies are installed.")
    sys.exit(1)
except Exception as e:
    log_error_important(f"Error: {e}")
    sys.exit(1)
