#!/usr/bin/env python3
"""
TeleDrive Launcher - Cross-platform launcher script
"""

import sys
import subprocess

def show_banner():
    """Show TeleDrive banner"""
    print()
    print("=" * 50)
    print("          TeleDrive v1.0")
    print("     Telegram File Manager")
    print("=" * 50)
    print()

def main():
    show_banner()

    if len(sys.argv) > 1 and sys.argv[1] == "cmd":
        print("Starting command line interface...")
        subprocess.run([sys.executable, "cmd.py"] + sys.argv[2:])
    else:
        print("Starting desktop application...")
        subprocess.run([sys.executable, "app.py"])

if __name__ == "__main__":
    main()
