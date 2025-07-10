#!/usr/bin/env python3
"""
Test script để kiểm tra logo TeleDrive
"""

import os
import customtkinter as ctk
from PIL import Image

def test_logo():
    """Test hiển thị logo"""
    print("🧪 Test Logo TeleDrive")
    print("=" * 40)
    
    # Kiểm tra file logo
    logo_path = os.path.join(os.getcwd(), "teledrive.png")
    print(f"📁 Đường dẫn logo: {logo_path}")
    print(f"✅ File tồn tại: {os.path.exists(logo_path)}")
    
    if not os.path.exists(logo_path):
        print("❌ File logo không tồn tại!")
        return
    
    try:
        # Test load hình ảnh
        logo_image = Image.open(logo_path)
        print(f"📐 Kích thước gốc: {logo_image.size}")
        print(f"🎨 Định dạng: {logo_image.format}")
        print(f"🔧 Mode: {logo_image.mode}")
        
        # Test resize
        logo_64 = logo_image.resize((64, 64), Image.Resampling.LANCZOS)
        print(f"📐 Kích thước 64x64: {logo_64.size}")
        
        # Test CustomTkinter
        ctk.set_appearance_mode("light")
        root = ctk.CTk()
        root.title("Test Logo")
        root.geometry("300x200")
        
        # Tạo CTkImage
        logo_photo = ctk.CTkImage(light_image=logo_image, dark_image=logo_image, size=(64, 64))
        
        # Hiển thị logo
        logo_label = ctk.CTkLabel(root, image=logo_photo, text="")
        logo_label.pack(pady=20)
        
        # Text thông tin
        info_label = ctk.CTkLabel(root, text="Logo TeleDrive đã được tải thành công!")
        info_label.pack(pady=10)
        
        print("✅ Logo test thành công!")
        print("🖥️ Cửa sổ test đang mở...")
        
        root.mainloop()
        
    except Exception as e:
        print(f"❌ Lỗi khi test logo: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_logo()
