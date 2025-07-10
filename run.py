#!/usr/bin/env python3
"""
Script chạy TeleDrive
"""

import sys
import subprocess

def main():
    if len(sys.argv) > 1 and sys.argv[1] == "cmd":
        # Chạy giao diện dòng lệnh
        subprocess.run([sys.executable, "cmd.py"] + sys.argv[2:])
    else:
        # Chạy ứng dụng desktop
        subprocess.run([sys.executable, "app.py"])

if __name__ == "__main__":
    main()
