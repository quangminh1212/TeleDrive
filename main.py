<<<<<<< HEAD
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
from app.config import config

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
=======
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

# Tắt TẤT CẢ các log hoàn toàn
logging.disable(logging.CRITICAL)

# Tắt tất cả các logger có thể
for logger_name in ['werkzeug', 'urllib3', 'requests', 'telethon', 'asyncio', 'flask', 'teledrive', 'root']:
    logging.getLogger(logger_name).setLevel(logging.CRITICAL)
    logging.getLogger(logger_name).disabled = True

# Tắt warnings
import warnings
warnings.filterwarnings("ignore")

# Sửa database trước khi import app
print("🔧 Checking database...")
from pathlib import Path

# Tạo thư mục instance và đảm bảo database tồn tại
instance_dir = Path('instance')
instance_dir.mkdir(exist_ok=True)
db_path = instance_dir / 'teledrive.db'

# Nếu database không tồn tại, tạo một database đơn giản
if not db_path.exists():
    import sqlite3
    print(f"📁 Creating database: {db_path}")
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username VARCHAR(80) UNIQUE NOT NULL,
            phone_number VARCHAR(20) UNIQUE NOT NULL,
            email VARCHAR(120) UNIQUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_login DATETIME,
            is_active BOOLEAN DEFAULT 1,
            is_admin BOOLEAN DEFAULT 0,
            password_hash VARCHAR(255)
        )
    ''')
    conn.commit()
    conn.close()
    print("✅ Database created successfully")

print("🎯 Starting TeleDrive...")
print("=" * 50)

if __name__ == '__main__':
    try:
        # Import app từ teledrive module
        print("🚀 Creating Flask app...")

        # Set environment variable for dev mode
        os.environ['DEV_MODE'] = 'true'

        from src.teledrive.app import app
        print("✅ Flask app created with routes")

        # Set Flask config
        app.config['DEV_MODE'] = True

        print("🌐 Server starting at: http://localhost:3000")
        print("🔧 Port: 3000 (updated from 5000)")
        print("🔧 Dev Mode: Enabled (no login required)")
        print("👤 User: Developer (admin)")
        print("📱 Press Ctrl+C to stop")
        print("=" * 50)

        # Chạy server
        app.run(
            host='0.0.0.0',
            port=3000,
            debug=False,
            threaded=True,
            use_reloader=False
        )

    except KeyboardInterrupt:
        print("\n✅ Server stopped by user")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
>>>>>>> f346ae8f5e5d60fe3835ba099966a151645fe771
