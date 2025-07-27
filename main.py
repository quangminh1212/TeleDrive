#!/usr/bin/env python3
"""
TeleDrive - Simple file sharing application
"""

import sys
from pathlib import Path

# Add the src directory to the Python path
src_path = Path(__file__).parent / 'src'
sys.path.insert(0, str(src_path))

def main():
    """Main application entry point."""
    print("TeleDrive - Simple file sharing application")
    print("Version: 1.0.0")
    print("Ready to start development!")

if __name__ == '__main__':
    main()
