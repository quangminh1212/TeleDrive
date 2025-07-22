#!/usr/bin/env python3
"""
TeleDrive - Simple Entry Point
Entry point đơn giản cho TeleDrive Web Application
"""

import sys
import os

# Thêm thư mục src vào Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

# Tắt tất cả logging
import logging
logging.disable(logging.CRITICAL)

# Tắt warnings
import warnings
warnings.filterwarnings("ignore")

if __name__ == '__main__':
    try:
        print("🚀 Khởi động TeleDrive...")
        
        # Import app
        from src.teledrive.app import app
        
        print("✅ App imported successfully")
        print("🌐 Starting server at http://localhost:5000")
        print("🔧 Dev Mode: Enabled (no login required)")
        print("📱 Press Ctrl+C to stop")
        print("-" * 50)
        
        # Chạy app
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
        sys.exit(1)
