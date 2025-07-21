#!/usr/bin/env python3
"""
TeleDrive Scanner Entry Point

Entry point for the Telegram scanner.
"""

import sys
import os
import asyncio
from pathlib import Path

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from teledrive.config import config, validate_environment


def main():
    """Main entry point for scanner"""
    try:
        validate_environment()
    except ValueError as e:
        print(f"❌ Configuration error: {e}")
        sys.exit(1)
    
    print("🔍 Starting Telegram Scanner...")
    print("-" * 50)
    
    try:
        from teledrive.core.main import main as scanner_main
        asyncio.run(scanner_main())
    except KeyboardInterrupt:
        print("\n✅ Scanner stopped.")
    except Exception as e:
        print(f"❌ Error starting scanner: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
