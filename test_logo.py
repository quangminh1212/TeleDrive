#!/usr/bin/env python3
"""
Script to test loading teledrive.png logo
"""

import os
import customtkinter as ctk
from PIL import Image

def main():
    # Create root window
    root = ctk.CTk()
    root.title("TeleDrive Logo Test")
    root.geometry("300x300")

    # Create frame
    frame = ctk.CTkFrame(root)
    frame.pack(expand=True, fill="both", padx=20, pady=20)

    # Try to load logo
    try:
        print("Current directory:", os.getcwd())
        logo_path = os.path.join(os.getcwd(), "teledrive.png")
        print("Looking for logo at:", logo_path)
        
        if os.path.exists(logo_path):
            print("Logo file exists!")
            logo_image = Image.open(logo_path)
            logo_image = logo_image.resize((100, 100), Image.LANCZOS)
            logo_photo = ctk.CTkImage(light_image=logo_image, dark_image=logo_image, size=(100, 100))
            
            # Display logo
            logo_label = ctk.CTkLabel(frame, image=logo_photo, text="")
            logo_label.pack(pady=20)
            
            # Add text label
            text_label = ctk.CTkLabel(frame, text="TeleDrive Logo Loaded Successfully")
            text_label.pack(pady=10)
            
            print("Logo loaded successfully!")
        else:
            print("Logo file not found!")
            # Show error text
            error_label = ctk.CTkLabel(frame, text="Logo file not found!")
            error_label.pack(pady=20)
            
    except Exception as e:
        print(f"Error loading logo: {e}")
        # Show error text
        error_label = ctk.CTkLabel(frame, text=f"Error: {str(e)}")
        error_label.pack(pady=20)
    
    root.mainloop()

if __name__ == "__main__":
    main()
