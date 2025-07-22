#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Production server runner
"""

import os
import sys

# Set UTF-8 encoding for Windows
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

def run_production():
    """Chạy production server"""
    try:
        print("[INFO] Starting production server...")
        print("[INFO] Server: http://localhost:3000")
        print("[INFO] Press Ctrl+C to stop")
        print("-" * 50)
        
        # Set environment variables
        os.environ['DEV_MODE'] = 'false'
        os.environ['FLASK_ENV'] = 'production'

        # Add current directory to Python path
        current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        sys.path.insert(0, current_dir)

        # Import and run app
        from src.teledrive.app import app
        
        # Set production config
        app.config['DEV_MODE'] = False
        app.config['DEBUG'] = False
        
        # Run production server
        app.run(
            host='0.0.0.0',
            port=3000,
            debug=False,
            threaded=True,
            use_reloader=False
        )
        
    except KeyboardInterrupt:
        print("\n[OK] Production server stopped.")
    except Exception as e:
        print(f"[ERROR] Production server error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    run_production()
