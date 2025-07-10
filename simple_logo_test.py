#!/usr/bin/env python3
"""
Test đơn giản để hiển thị logo TeleDrive
"""

import customtkinter as ctk
import os
from PIL import Image

# Cấu hình
ctk.set_appearance_mode("light")
ctk.set_default_color_theme("blue")

class SimpleLogoTest:
    def __init__(self):
        self.root = ctk.CTk()
        self.root.title("TeleDrive Logo Test")
        self.root.geometry("400x300")
        self.root.configure(fg_color="#FFFFFF")
        
        self.create_ui()
    
    def create_ui(self):
        """Tạo giao diện test"""
        # Frame chính
        main_frame = ctk.CTkFrame(self.root, fg_color="transparent")
        main_frame.pack(expand=True, fill="both", padx=20, pady=20)
        
        # Tiêu đề
        title = ctk.CTkLabel(main_frame, 
                           text="TeleDrive Logo Test",
                           font=ctk.CTkFont(size=20, weight="bold"),
                           text_color="#000000")
        title.pack(pady=(0, 20))
        
        # Logo frame giống như trong app
        logo_bg = ctk.CTkFrame(main_frame,
                              fg_color="#2AABEE",
                              width=120, height=120,
                              corner_radius=60)
        logo_bg.pack(pady=10)
        logo_bg.pack_propagate(False)
        
        # Load logo
        self.load_logo(logo_bg)
        
        # Thông tin
        info_label = ctk.CTkLabel(main_frame,
                                text="Nếu bạn thấy logo TeleDrive thay vì emoji ✈️\nthì logo đã được load thành công!",
                                font=ctk.CTkFont(size=12),
                                text_color="#707579")
        info_label.pack(pady=20)
        
        # Nút đóng
        close_btn = ctk.CTkButton(main_frame, 
                                text="Đóng",
                                command=self.root.destroy,
                                fg_color="#2AABEE",
                                hover_color="#229ED9")
        close_btn.pack(pady=10)
    
    def load_logo(self, parent_frame):
        """Load logo giống như trong app"""
        logo_loaded = False
        logo_path = os.path.join(os.getcwd(), "teledrive.png")
        
        print(f"🔍 Đang load logo từ: {logo_path}")
        print(f"📁 File tồn tại: {os.path.exists(logo_path)}")
        
        if os.path.exists(logo_path):
            try:
                # Load ảnh
                logo_image = Image.open(logo_path)
                print(f"📷 Ảnh gốc: {logo_image.size}, mode: {logo_image.mode}")
                
                # Convert RGBA
                if logo_image.mode != 'RGBA':
                    logo_image = logo_image.convert('RGBA')
                    print("🔄 Đã convert sang RGBA")
                
                # Resize
                logo_image = logo_image.resize((80, 80), Image.Resampling.LANCZOS)
                print(f"📐 Đã resize thành: {logo_image.size}")
                
                # Tạo CTkImage
                ctk_image = ctk.CTkImage(light_image=logo_image, dark_image=logo_image, size=(80, 80))
                print("🖼️ CTkImage đã tạo")
                
                # Tạo label
                logo_label = ctk.CTkLabel(parent_frame, image=ctk_image, text="")
                logo_label.pack(expand=True)
                print("✅ Logo đã hiển thị thành công!")
                logo_loaded = True
                
            except Exception as e:
                print(f"❌ Lỗi: {e}")
                import traceback
                traceback.print_exc()
        
        # Fallback nếu không load được
        if not logo_loaded:
            print("🔄 Sử dụng fallback emoji...")
            logo_label = ctk.CTkLabel(parent_frame, 
                                    text="✈️",
                                    font=ctk.CTkFont(size=48, weight="bold"),
                                    text_color="white")
            logo_label.pack(expand=True)
    
    def run(self):
        """Chạy test"""
        self.root.mainloop()

if __name__ == "__main__":
    print("=== SIMPLE LOGO TEST ===")
    app = SimpleLogoTest()
    app.run()
