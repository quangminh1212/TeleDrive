#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Create a simple favicon.ico for TeleDrive
"""

import os
from pathlib import Path

def create_simple_favicon():
    """Create a simple favicon.ico file"""
    try:
        # Check if logo.png exists
        logo_path = Path("logo.png")
        favicon_path = Path("static/favicon.ico")
        
        if logo_path.exists():
            # Try to copy logo.png to favicon.ico
            import shutil
            shutil.copy2(logo_path, favicon_path)
            print(f"✅ Created favicon.ico from logo.png")
            return True
        else:
            # Create a simple 16x16 ICO file manually
            # This is a minimal ICO file structure
            ico_data = bytes([
                # ICO header
                0x00, 0x00,  # Reserved
                0x01, 0x00,  # Type (1 = ICO)
                0x01, 0x00,  # Number of images
                
                # Image directory entry
                0x10,        # Width (16)
                0x10,        # Height (16)
                0x00,        # Color count (0 = >256 colors)
                0x00,        # Reserved
                0x01, 0x00,  # Color planes
                0x20, 0x00,  # Bits per pixel (32)
                0x00, 0x04, 0x00, 0x00,  # Size of image data (1024 bytes)
                0x16, 0x00, 0x00, 0x00,  # Offset to image data
                
                # Image data (16x16 32-bit RGBA)
                # Simple blue square
            ] + [0x00, 0x80, 0xFF, 0xFF] * 256)  # Blue pixels
            
            with open(favicon_path, 'wb') as f:
                f.write(ico_data)
            
            print(f"✅ Created simple favicon.ico")
            return True
            
    except Exception as e:
        print(f"❌ Error creating favicon: {e}")
        return False

if __name__ == "__main__":
    create_simple_favicon()
