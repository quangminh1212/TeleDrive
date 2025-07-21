#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TeleDrive Application Runner
Run the TeleDrive Flask application
"""

import sys
import os
from pathlib import Path

# Add src to Python path
src_path = Path(__file__).parent / "src"
sys.path.insert(0, str(src_path))

# Import and run the app
if __name__ == "__main__":
    from app.app import app
    
    print("🚀 Starting TeleDrive...")
    print("=" * 50)
    
    try:
        app.run(
            host='0.0.0.0',
            port=5000,
            debug=True,
            use_reloader=False  # Disable reloader to avoid import issues
        )
    except KeyboardInterrupt:
        print("\n✅ TeleDrive stopped.")
    except Exception as e:
        print(f"❌ Error starting TeleDrive: {e}")
        sys.exit(1)
