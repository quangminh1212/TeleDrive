<<<<<<< HEAD
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
from app.app import app

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
=======
#!/usr/bin/env python3
"""
TeleDrive Clean Mode - Chạy với log tối giản
"""

import os
import sys

# Tắt một số logging
import logging
logging.getLogger('werkzeug').setLevel(logging.ERROR)
logging.getLogger('urllib3').setLevel(logging.ERROR)
logging.getLogger('requests').setLevel(logging.ERROR)

# Tắt warnings
import warnings
warnings.filterwarnings("ignore")

if __name__ == '__main__':
    try:
        print("🚀 TeleDrive Clean Mode")
        print("🌐 Server: http://localhost:3000")
        print("📱 Press Ctrl+C to stop")
        print("-" * 30)

        # Set environment variable for dev mode off
        os.environ['DEV_MODE'] = 'false'

        from src.teledrive.app import app
        
        # Set Flask config
        app.config['DEV_MODE'] = False

        # Chạy server
        app.run(
            host='0.0.0.0',
            port=3000,
            debug=False,
            threaded=True,
            use_reloader=False
        )
        
    except KeyboardInterrupt:
        print("\n✅ Server stopped.")
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)
>>>>>>> f346ae8f5e5d60fe3835ba099966a151645fe771
