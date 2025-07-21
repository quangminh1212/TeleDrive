#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TeleDrive - Silent Entry Point
Entry point với giao diện hoàn toàn sạch sẽ, không có log
"""

import sys
import os
import logging

# Thêm thư mục src vào Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

# Tắt TẤT CẢ các log ngay từ đầu
logging.disable(logging.CRITICAL)

# Tắt tất cả các logger có thể
for logger_name in ['werkzeug', 'urllib3', 'requests', 'telethon', 'asyncio', 'flask', 'teledrive', 'root']:
    logging.getLogger(logger_name).setLevel(logging.CRITICAL)
    logging.getLogger(logger_name).disabled = True

# Tắt warnings
import warnings
warnings.filterwarnings("ignore")

# Import và chạy web app
try:
    from app.app import app
    
    # Tắt Flask logging hoàn toàn
    app.logger.disabled = True
    logging.getLogger('werkzeug').disabled = True
    
    if __name__ == '__main__':
        # Khởi động với giao diện hoàn toàn sạch sẽ
        print("TeleDrive")
        print("http://localhost:5000")
        print("Ctrl+C to stop")
        print()

        try:
            app.run(
                host='localhost',
                port=5000,
                debug=False,
                threaded=True,
                use_reloader=False
            )
        except KeyboardInterrupt:
            print("\nStopped.")
        except Exception as e:
            print(f"Error: {e}")
            sys.exit(1)

except ImportError as e:
    print(f"Import error: {e}")
    print("Please make sure all dependencies are installed.")
    sys.exit(1)
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
