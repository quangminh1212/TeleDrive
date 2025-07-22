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
        return False
