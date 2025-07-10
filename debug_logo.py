#!/usr/bin/env python3
"""
Debug script để kiểm tra logo TeleDrive
"""

import customtkinter as ctk
import os
from PIL import Image
import sys

def test_logo_loading():
    """Test việc load logo"""
    print("=== DEBUG LOGO TELEDRIVE ===")
    
    # Kiểm tra đường dẫn hiện tại
    current_dir = os.getcwd()
    print(f"Thư mục hiện tại: {current_dir}")
    
    # Kiểm tra file logo
    logo_path = os.path.join(current_dir, "teledrive.png")
    print(f"Đường dẫn logo: {logo_path}")
    print(f"File tồn tại: {os.path.exists(logo_path)}")
    
    if not os.path.exists(logo_path):
        print("❌ File logo không tồn tại!")
        return False
    
    # Kiểm tra thông tin file
    file_size = os.path.getsize(logo_path)
    print(f"Kích thước file: {file_size} bytes")
    
    try:
        # Test mở ảnh với PIL
        print("\n--- Test PIL ---")
        with Image.open(logo_path) as img:
            print(f"✓ PIL load thành công")
            print(f"  Kích thước: {img.size}")
            print(f"  Format: {img.format}")
            print(f"  Mode: {img.mode}")
            
            # Test resize
            resized = img.resize((48, 48), Image.Resampling.LANCZOS)
            print(f"✓ Resize thành công: {resized.size}")
            
            # Test convert RGBA
            if img.mode != 'RGBA':
                rgba_img = img.convert('RGBA')
                print(f"✓ Convert RGBA thành công: {rgba_img.mode}")
            else:
                print(f"✓ Ảnh đã ở mode RGBA")
                
    except Exception as e:
        print(f"❌ Lỗi PIL: {e}")
        return False
    
    # Test với CustomTkinter
    print("\n--- Test CustomTkinter ---")
    try:
        # Tạo cửa sổ test
        root = ctk.CTk()
        root.title("Test Logo")
        root.geometry("200x200")
        root.withdraw()  # Ẩn cửa sổ
        
        # Test load ảnh với CTkImage
        with Image.open(logo_path) as img:
            if img.mode != 'RGBA':
                img = img.convert('RGBA')
            img_resized = img.resize((48, 48), Image.Resampling.LANCZOS)
            
            # Tạo CTkImage
            ctk_image = ctk.CTkImage(light_image=img_resized, dark_image=img_resized, size=(48, 48))
            print("✓ CTkImage tạo thành công")
            
            # Test tạo label với ảnh
            frame = ctk.CTkFrame(root, width=60, height=60)
            frame.pack()
            
            label = ctk.CTkLabel(frame, image=ctk_image, text="")
            label.pack()
            print("✓ CTkLabel với ảnh tạo thành công")
            
        root.destroy()
        print("✓ CustomTkinter test hoàn tất")
        return True
        
    except Exception as e:
        print(f"❌ Lỗi CustomTkinter: {e}")
        import traceback
        traceback.print_exc()
        return False

def create_visual_test():
    """Tạo test visual để xem logo"""
    print("\n=== VISUAL TEST ===")
    
    try:
        root = ctk.CTk()
        root.title("TeleDrive Logo Test")
        root.geometry("300x200")
        
        # Frame chính
        main_frame = ctk.CTkFrame(root)
        main_frame.pack(expand=True, fill="both", padx=20, pady=20)
        
        # Tiêu đề
        title = ctk.CTkLabel(main_frame, text="Logo Test", font=ctk.CTkFont(size=16, weight="bold"))
        title.pack(pady=10)
        
        # Logo frame
        logo_frame = ctk.CTkFrame(main_frame, fg_color="#2AABEE", width=80, height=80, corner_radius=40)
        logo_frame.pack(pady=10)
        logo_frame.pack_propagate(False)
        
        # Load logo
        logo_path = os.path.join(os.getcwd(), "teledrive.png")
        
        try:
            with Image.open(logo_path) as img:
                if img.mode != 'RGBA':
                    img = img.convert('RGBA')
                img_resized = img.resize((60, 60), Image.Resampling.LANCZOS)
                
                ctk_image = ctk.CTkImage(light_image=img_resized, dark_image=img_resized, size=(60, 60))
                logo_label = ctk.CTkLabel(logo_frame, image=ctk_image, text="")
                logo_label.pack(expand=True)
                
                status_label = ctk.CTkLabel(main_frame, text="✓ Logo loaded successfully!", 
                                          text_color="green")
                status_label.pack(pady=5)
                
        except Exception as e:
            # Fallback
            logo_label = ctk.CTkLabel(logo_frame, text="✈️", font=ctk.CTkFont(size=32), text_color="white")
            logo_label.pack(expand=True)
            
            status_label = ctk.CTkLabel(main_frame, text=f"❌ Error: {str(e)}", 
                                      text_color="red")
            status_label.pack(pady=5)
        
        # Nút đóng
        close_btn = ctk.CTkButton(main_frame, text="Close", command=root.destroy)
        close_btn.pack(pady=10)
        
        root.mainloop()
        
    except Exception as e:
        print(f"❌ Lỗi visual test: {e}")

if __name__ == "__main__":
    # Test loading
    success = test_logo_loading()
    
    if success:
        print("\n🎉 Tất cả test đều PASS!")
        
        # Hỏi có muốn chạy visual test không
        try:
            response = input("\nBạn có muốn chạy visual test? (y/n): ").lower().strip()
            if response in ['y', 'yes']:
                create_visual_test()
        except KeyboardInterrupt:
            print("\nThoát.")
    else:
        print("\n❌ Có lỗi trong quá trình test!")
        sys.exit(1)
