#!/usr/bin/env python3
"""
TeleDrive Web Entry Point

Entry point for the web interface.
"""

import sys
import os
from pathlib import Path

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from teledrive.config import config, validate_environment


def main():
    """Main entry point for web interface"""
    try:
        validate_environment()
    except ValueError as e:
        print(f"❌ Configuration error: {e}")
        sys.exit(1)
    
    print("🚀 Starting TeleDrive Web Interface...")
    print(f"📍 Server: http://{config.server.host}:{config.server.port}")
    print("🛑 Press Ctrl+C to stop")
    print("-" * 50)
    
    try:
        from teledrive.app import app
        app.run(
            host=config.server.host,
            port=config.server.port,
            debug=config.debug,
            threaded=True,
            use_reloader=False
        )
    except KeyboardInterrupt:
        print("\n✅ Server stopped.")
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
