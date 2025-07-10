#!/usr/bin/env python3
"""
Script đơn giản để kiểm tra logo
"""

import os
from PIL import Image

def check_logo():
    """Kiểm tra file logo"""
    logo_path = os.path.join(os.getcwd(), "teledrive.png")
    
    print(f"Đường dẫn logo: {logo_path}")
    print(f"File tồn tại: {os.path.exists(logo_path)}")
    
    if os.path.exists(logo_path):
        try:
            # Mở và kiểm tra thông tin ảnh
            with Image.open(logo_path) as img:
                print(f"Kích thước: {img.size}")
                print(f"Định dạng: {img.format}")
                print(f"Mode: {img.mode}")
                
                # Test resize
                resized = img.resize((48, 48), Image.Resampling.LANCZOS)
                print(f"Resize thành công: {resized.size}")
                
                # Test convert RGBA
                if img.mode != 'RGBA':
                    rgba_img = img.convert('RGBA')
                    print(f"Convert RGBA thành công: {rgba_img.mode}")
                else:
                    print("Ảnh đã ở định dạng RGBA")
                    
                print("✓ Logo hoạt động bình thường!")
                return True
                
        except Exception as e:
            print(f"✗ Lỗi khi xử lý logo: {e}")
            return False
    else:
        print("✗ File logo không tồn tại!")
        return False

if __name__ == "__main__":
    check_logo()
