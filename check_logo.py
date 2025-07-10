#!/usr/bin/env python3
"""
Simple script to check if teledrive.png exists
"""

import os
import sys

def main():
    print("Current directory:", os.getcwd())
    logo_path = os.path.join(os.getcwd(), "teledrive.png")
    print("Looking for logo at:", logo_path)
    
    if os.path.exists(logo_path):
        print("teledrive.png exists!")
        print("File size:", os.path.getsize(logo_path), "bytes")
        return True
    else:
        print("teledrive.png does not exist!")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
