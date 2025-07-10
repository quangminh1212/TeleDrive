#!/usr/bin/env python3
"""
Test script để kiểm tra hiển thị logo TeleDrive
"""

import customtkinter as ctk
import os
from PIL import Image

# Cấu hình giao diện
ctk.set_appearance_mode("light")
ctk.set_default_color_theme("blue")

# Màu sắc Telegram
COLORS = {
    "bg_primary": "#FFFFFF",
    "telegram_blue": "#2AABEE",
    "text_primary": "#000000",
}

class LogoTestApp:
    def __init__(self):
        self.root = ctk.CTk()
        self.root.title("Test Logo TeleDrive")
        self.root.geometry("400x300")
        self.root.configure(fg_color=COLORS["bg_primary"])
        
        self.create_ui()
    
    def create_ui(self):
        """Tạo giao diện test logo"""
        # Container chính
        main_frame = ctk.CTkFrame(self.root, fg_color="transparent")
        main_frame.pack(expand=True, fill="both", padx=20, pady=20)
        
        # Tiêu đề
        title = ctk.CTkLabel(main_frame, 
                           text="Test Logo TeleDrive",
                           font=ctk.CTkFont(size=20, weight="bold"),
                           text_color=COLORS["text_primary"])
        title.pack(pady=(0, 20))
        
        # Test logo nhỏ (24x24)
        self.test_small_logo(main_frame)
        
        # Test logo trung bình (48x48)  
        self.test_medium_logo(main_frame)
        
        # Test logo lớn (80x80)
        self.test_large_logo(main_frame)
    
    def test_small_logo(self, parent):
        """Test logo nhỏ 24x24"""
        frame = ctk.CTkFrame(parent, fg_color=COLORS["telegram_blue"], 
                           width=40, height=40, corner_radius=20)
        frame.pack(pady=5)
        frame.pack_propagate(False)
        
        try:
            logo_path = os.path.join(os.getcwd(), "teledrive.png")
            if os.path.exists(logo_path):
                logo_image = Image.open(logo_path)
                if logo_image.mode != 'RGBA':
                    logo_image = logo_image.convert('RGBA')
                logo_image = logo_image.resize((24, 24), Image.Resampling.LANCZOS)
                logo_photo = ctk.CTkImage(light_image=logo_image, dark_image=logo_image, size=(24, 24))
                logo_label = ctk.CTkLabel(frame, image=logo_photo, text="")
                logo_label.pack(expand=True)
                print("✓ Logo nhỏ (24x24) tải thành công!")
            else:
                raise FileNotFoundError("File không tồn tại")
        except Exception as e:
            print(f"✗ Lỗi logo nhỏ: {e}")
            logo_label = ctk.CTkLabel(frame, text="✈️", 
                                    font=ctk.CTkFont(size=16), 
                                    text_color="white")
            logo_label.pack(expand=True)
    
    def test_medium_logo(self, parent):
        """Test logo trung bình 48x48"""
        frame = ctk.CTkFrame(parent, fg_color=COLORS["telegram_blue"], 
                           width=60, height=60, corner_radius=30)
        frame.pack(pady=5)
        frame.pack_propagate(False)
        
        try:
            logo_path = os.path.join(os.getcwd(), "teledrive.png")
            if os.path.exists(logo_path):
                logo_image = Image.open(logo_path)
                if logo_image.mode != 'RGBA':
                    logo_image = logo_image.convert('RGBA')
                logo_image = logo_image.resize((48, 48), Image.Resampling.LANCZOS)
                logo_photo = ctk.CTkImage(light_image=logo_image, dark_image=logo_image, size=(48, 48))
                logo_label = ctk.CTkLabel(frame, image=logo_photo, text="")
                logo_label.pack(expand=True)
                print("✓ Logo trung bình (48x48) tải thành công!")
            else:
                raise FileNotFoundError("File không tồn tại")
        except Exception as e:
            print(f"✗ Lỗi logo trung bình: {e}")
            logo_label = ctk.CTkLabel(frame, text="✈️", 
                                    font=ctk.CTkFont(size=24), 
                                    text_color="white")
            logo_label.pack(expand=True)
    
    def test_large_logo(self, parent):
        """Test logo lớn 80x80"""
        frame = ctk.CTkFrame(parent, fg_color=COLORS["telegram_blue"], 
                           width=100, height=100, corner_radius=50)
        frame.pack(pady=5)
        frame.pack_propagate(False)
        
        try:
            logo_path = os.path.join(os.getcwd(), "teledrive.png")
            if os.path.exists(logo_path):
                logo_image = Image.open(logo_path)
                if logo_image.mode != 'RGBA':
                    logo_image = logo_image.convert('RGBA')
                logo_image = logo_image.resize((80, 80), Image.Resampling.LANCZOS)
                logo_photo = ctk.CTkImage(light_image=logo_image, dark_image=logo_image, size=(80, 80))
                logo_label = ctk.CTkLabel(frame, image=logo_photo, text="")
                logo_label.pack(expand=True)
                print("✓ Logo lớn (80x80) tải thành công!")
            else:
                raise FileNotFoundError("File không tồn tại")
        except Exception as e:
            print(f"✗ Lỗi logo lớn: {e}")
            logo_label = ctk.CTkLabel(frame, text="✈️", 
                                    font=ctk.CTkFont(size=40), 
                                    text_color="white")
            logo_label.pack(expand=True)
    
    def run(self):
        """Chạy ứng dụng test"""
        self.root.mainloop()

if __name__ == "__main__":
    print("Bắt đầu test logo TeleDrive...")
    app = LogoTestApp()
    app.run()
