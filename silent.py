#!/usr/bin/env python3
"""
TeleDrive Silent Mode - Chạy không có log
"""

import os
import sys

# Tắt tất cả logging
import logging
logging.disable(logging.CRITICAL)

# Tắt warnings
import warnings
warnings.filterwarnings("ignore")

# Tắt stdout để chạy silent
class SilentOutput:
    def write(self, txt): pass
    def flush(self): pass

# Redirect stdout và stderr
sys.stdout = SilentOutput()
sys.stderr = SilentOutput()

if __name__ == '__main__':
    try:
        # Set environment variable for dev mode
        os.environ['DEV_MODE'] = 'true'

        from src.teledrive.app import app
        
        # Set Flask config
        app.config['DEV_MODE'] = True

        # Chạy server silent
        app.run(
            host='0.0.0.0',
            port=3000,
            debug=False,
            threaded=True,
            use_reloader=False
        )
        
    except KeyboardInterrupt:
        pass
    except Exception:
        pass
