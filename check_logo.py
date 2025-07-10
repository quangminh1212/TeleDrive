#!/usr/bin/env python3
"""
Kiểm tra logo đơn giản
"""

import os
from PIL import Image

def main():
    logo_path = "teledrive.png"
    print(f"Kiểm tra logo: {logo_path}")
    print(f"File tồn tại: {os.path.exists(logo_path)}")
    
    if os.path.exists(logo_path):
        try:
            img = Image.open(logo_path)
            print(f"Kích thước: {img.size}")
            print(f"Định dạng: {img.format}")
            print("✅ Logo OK!")
        except Exception as e:
            print(f"❌ Lỗi: {e}")
    else:
        print("❌ File không tồn tại!")

if __name__ == "__main__":
    main()
