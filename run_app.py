#!/usr/bin/env python3
"""
TeleDrive - Run App
Chạy ứng dụng TeleDrive với database đã được sửa
"""

import sys
import os
from pathlib import Path

# Thêm thư mục src vào Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

# Tắt logging
import logging
logging.disable(logging.CRITICAL)

# Tắt warnings
import warnings
warnings.filterwarnings("ignore")

def main():
    try:
        print("🚀 TeleDrive Starting...")
        
        # Import Flask và tạo app
        from flask import Flask
        
        # Tạo Flask app
        template_dir = Path(__file__).parent / 'templates'
        static_dir = Path(__file__).parent / 'static'
        app = Flask(__name__, template_folder=str(template_dir), static_folder=str(static_dir))
        
        # Cấu hình database
        project_root = Path(__file__).parent
        instance_dir = project_root / 'instance'
        instance_dir.mkdir(exist_ok=True)
        db_path = instance_dir / 'teledrive.db'
        
        app.config.update({
            'SQLALCHEMY_DATABASE_URI': f'sqlite:///{db_path.resolve()}',
            'SQLALCHEMY_TRACK_MODIFICATIONS': False,
            'SECRET_KEY': 'dev_secret_key_for_teledrive',
            'DEV_MODE': True  # Bật dev mode
        })
        
        print(f"📁 Database: {db_path}")
        
        # Import và init database
        from src.teledrive.database import init_database
        init_database(app)
        
        # Import và init auth
        from src.teledrive.auth import auth_manager
        auth_manager.init_app(app)
        
        # Import routes từ app.py
        with app.app_context():
            # Import tất cả routes
            from src.teledrive.app import *
            
        print("✅ App initialized successfully")
        print("🌐 Server: http://localhost:5000")
        print("🔧 Dev Mode: Enabled (no login required)")
        print("📱 Press Ctrl+C to stop")
        print("-" * 50)
        
        # Chạy server
        app.run(
            host='0.0.0.0',
            port=5000,
            debug=False,
            threaded=True,
            use_reloader=False
        )
        
    except KeyboardInterrupt:
        print("\n✅ Server stopped.")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

if __name__ == '__main__':
    main()
