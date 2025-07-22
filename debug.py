#!/usr/bin/env python3
"""
Debug mode để xem lỗi chi tiết
"""

import os
import sys
import traceback

# Bật debug logging
import logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

# Tắt một số logger ồn ào
logging.getLogger('werkzeug').setLevel(logging.WARNING)
logging.getLogger('telethon').setLevel(logging.WARNING)

if __name__ == '__main__':
    try:
        print("🔍 Debug Mode - Checking for errors...")
        
        # Set environment variable for dev mode
        os.environ['DEV_MODE'] = 'true'

        from src.teledrive.app import app
        
        # Set Flask config với debug
        app.config['DEBUG'] = True
        app.config['DEV_MODE'] = True

        print("✅ App imported successfully")
        print("🌐 Starting debug server at: http://localhost:3000")
        print("📱 Press Ctrl+C to stop")
        print("-" * 50)

        # Chạy server với debug
        app.run(
            host='0.0.0.0',
            port=3000,
            debug=True,
            threaded=True,
            use_reloader=False
        )
        
    except KeyboardInterrupt:
        print("\n✅ Debug server stopped.")
    except Exception as e:
        print(f"❌ Error: {e}")
        print("\n🔍 Full traceback:")
        traceback.print_exc()
        sys.exit(1)
