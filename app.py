#!/usr/bin/env python3
"""
TeleDrive - Ứng dụng quản lý file Telegram đơn giản
"""

import customtkinter as ctk
import tkinter as tk
from tkinter import filedialog, messagebox
import threading
import asyncio
import os
from pathlib import Path
from telethon import TelegramClient
from telethon.errors import SessionPasswordNeededError, PhoneCodeInvalidError
from dotenv import load_dotenv

# Load cấu hình
load_dotenv()

# Cấu hình giao diện
ctk.set_appearance_mode("light")
ctk.set_default_color_theme("blue")

class LoginWindow:
    """Cửa sổ đăng nhập Telegram"""
    
    def __init__(self, parent, client):
        self.parent = parent
        self.client = client
        self.result = None
        
        # Tạo cửa sổ đăng nhập
        self.window = ctk.CTkToplevel(parent)
        self.window.title("Đăng nhập Telegram")
        self.window.geometry("400x500")
        self.window.resizable(False, False)
        self.window.transient(parent)
        self.window.grab_set()
        
        # Căn giữa cửa sổ
        self.center_window()
        
        self.step = "phone"
        self.phone = ""
        self.code_hash = ""
        
        self.create_ui()
    
    def center_window(self):
        """Căn giữa cửa sổ"""
        self.window.update_idletasks()
        x = (self.window.winfo_screenwidth() // 2) - (400 // 2)
        y = (self.window.winfo_screenheight() // 2) - (500 // 2)
        self.window.geometry(f"400x500+{x}+{y}")
    
    def create_ui(self):
        """Tạo giao diện đăng nhập"""
        # Header
        header = ctk.CTkFrame(self.window, fg_color="#4A90E2", height=100)
        header.pack(fill="x", padx=0, pady=(0, 20))
        header.pack_propagate(False)
        
        title = ctk.CTkLabel(header, text="🚀 TeleDrive", font=ctk.CTkFont(size=24, weight="bold"), text_color="white")
        title.pack(pady=30)
        
        # Content
        self.content = ctk.CTkFrame(self.window)
        self.content.pack(fill="both", expand=True, padx=20, pady=(0, 20))
        
        self.create_phone_step()
        self.create_code_step()
        self.create_password_step()
        
        self.show_step("phone")
    
    def create_phone_step(self):
        """Bước nhập số điện thoại"""
        self.phone_frame = ctk.CTkFrame(self.content, fg_color="transparent")
        
        ctk.CTkLabel(self.phone_frame, text="Nhập số điện thoại", font=ctk.CTkFont(size=18, weight="bold")).pack(pady=(20, 10))
        
        self.phone_entry = ctk.CTkEntry(self.phone_frame, placeholder_text="+84123456789", font=ctk.CTkFont(size=14), height=40, width=300)
        self.phone_entry.pack(pady=10)
        self.phone_entry.bind("<Return>", lambda e: self.send_code())
        
        self.send_btn = ctk.CTkButton(self.phone_frame, text="Gửi mã xác nhận", height=40, width=300, command=self.send_code)
        self.send_btn.pack(pady=20)
        
        self.phone_status = ctk.CTkLabel(self.phone_frame, text="", text_color="red")
        self.phone_status.pack()
    
    def create_code_step(self):
        """Bước nhập mã xác nhận"""
        self.code_frame = ctk.CTkFrame(self.content, fg_color="transparent")
        
        ctk.CTkLabel(self.code_frame, text="Nhập mã xác nhận", font=ctk.CTkFont(size=18, weight="bold")).pack(pady=(20, 10))
        
        self.phone_display = ctk.CTkLabel(self.code_frame, text="", font=ctk.CTkFont(size=12), text_color="gray")
        self.phone_display.pack(pady=5)
        
        self.code_entry = ctk.CTkEntry(self.code_frame, placeholder_text="12345", font=ctk.CTkFont(size=14), height=40, width=300)
        self.code_entry.pack(pady=10)
        self.code_entry.bind("<Return>", lambda e: self.verify_code())
        
        self.verify_btn = ctk.CTkButton(self.code_frame, text="Xác nhận", height=40, width=300, command=self.verify_code)
        self.verify_btn.pack(pady=20)
        
        back_btn = ctk.CTkButton(self.code_frame, text="← Quay lại", height=30, width=100, fg_color="transparent", text_color="gray", command=lambda: self.show_step("phone"))
        back_btn.pack(pady=5)
        
        self.code_status = ctk.CTkLabel(self.code_frame, text="", text_color="red")
        self.code_status.pack()
    
    def create_password_step(self):
        """Bước nhập mật khẩu 2FA"""
        self.password_frame = ctk.CTkFrame(self.content, fg_color="transparent")
        
        ctk.CTkLabel(self.password_frame, text="Nhập mật khẩu 2FA", font=ctk.CTkFont(size=18, weight="bold")).pack(pady=(20, 10))
        
        self.password_entry = ctk.CTkEntry(self.password_frame, placeholder_text="Mật khẩu", font=ctk.CTkFont(size=14), height=40, width=300, show="*")
        self.password_entry.pack(pady=10)
        self.password_entry.bind("<Return>", lambda e: self.verify_password())
        
        self.password_btn = ctk.CTkButton(self.password_frame, text="Xác nhận", height=40, width=300, command=self.verify_password)
        self.password_btn.pack(pady=20)
        
        self.password_status = ctk.CTkLabel(self.password_frame, text="", text_color="red")
        self.password_status.pack()
    
    def show_step(self, step):
        """Hiển thị bước"""
        self.phone_frame.pack_forget()
        self.code_frame.pack_forget()
        self.password_frame.pack_forget()
        
        if step == "phone":
            self.phone_frame.pack(fill="both", expand=True)
            self.phone_entry.focus()
        elif step == "code":
            self.code_frame.pack(fill="both", expand=True)
            self.code_entry.focus()
        elif step == "password":
            self.password_frame.pack(fill="both", expand=True)
            self.password_entry.focus()
        
        self.step = step
    
    def send_code(self):
        """Gửi mã xác nhận"""
        phone = self.phone_entry.get().strip()
        if not phone:
            self.phone_status.configure(text="Vui lòng nhập số điện thoại")
            return
        
        self.phone = phone
        self.send_btn.configure(state="disabled", text="Đang gửi...")
        self.phone_status.configure(text="Đang gửi mã xác nhận...")
        
        def run_async():
            try:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                result = loop.run_until_complete(self.client.send_code_request(phone))
                self.code_hash = result.phone_code_hash
                self.window.after(0, self.on_code_sent)
            except Exception as e:
                self.window.after(0, lambda: self.on_code_error(str(e)))
        
        threading.Thread(target=run_async, daemon=True).start()
    
    def on_code_sent(self):
        """Xử lý khi gửi mã thành công"""
        self.send_btn.configure(state="normal", text="Gửi mã xác nhận")
        self.phone_display.configure(text=f"Mã đã được gửi đến {self.phone}")
        self.show_step("code")
    
    def on_code_error(self, error):
        """Xử lý lỗi gửi mã"""
        self.send_btn.configure(state="normal", text="Gửi mã xác nhận")
        self.phone_status.configure(text=f"Lỗi: {error}")
    
    def verify_code(self):
        """Xác nhận mã"""
        code = self.code_entry.get().strip()
        if not code:
            self.code_status.configure(text="Vui lòng nhập mã xác nhận")
            return
        
        self.verify_btn.configure(state="disabled", text="Đang xác nhận...")
        self.code_status.configure(text="Đang xác nhận...")
        
        def run_async():
            try:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                user = loop.run_until_complete(self.client.sign_in(phone=self.phone, code=code, phone_code_hash=self.code_hash))
                self.window.after(0, lambda: self.on_login_success(user))
            except SessionPasswordNeededError:
                self.window.after(0, lambda: self.show_step("password"))
            except Exception as e:
                self.window.after(0, lambda: self.on_verify_error(str(e)))
        
        threading.Thread(target=run_async, daemon=True).start()
    
    def on_verify_error(self, error):
        """Xử lý lỗi xác nhận"""
        self.verify_btn.configure(state="normal", text="Xác nhận")
        self.code_status.configure(text=f"Lỗi: {error}")
    
    def verify_password(self):
        """Xác nhận mật khẩu 2FA"""
        password = self.password_entry.get().strip()
        if not password:
            self.password_status.configure(text="Vui lòng nhập mật khẩu")
            return
        
        self.password_btn.configure(state="disabled", text="Đang xác nhận...")
        self.password_status.configure(text="Đang xác nhận...")
        
        def run_async():
            try:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                user = loop.run_until_complete(self.client.sign_in(password=password))
                self.window.after(0, lambda: self.on_login_success(user))
            except Exception as e:
                self.window.after(0, lambda: self.on_password_error(str(e)))
        
        threading.Thread(target=run_async, daemon=True).start()
    
    def on_password_error(self, error):
        """Xử lý lỗi mật khẩu"""
        self.password_btn.configure(state="normal", text="Xác nhận")
        self.password_status.configure(text=f"Lỗi: {error}")
    
    def on_login_success(self, user):
        """Xử lý đăng nhập thành công"""
        self.result = user
        self.window.destroy()

class TeleDriveApp:
    """Ứng dụng chính TeleDrive"""
    
    def __init__(self):
        # Tạo cửa sổ chính
        self.root = ctk.CTk()
        self.root.title("TeleDrive - Quản lý file Telegram")
        self.root.geometry("1000x700")
        
        # Khởi tạo Telegram client
        api_id = os.getenv('API_ID')
        api_hash = os.getenv('API_HASH')
        session_name = os.getenv('SESSION_NAME', 'session')
        
        if not api_id or not api_hash:
            messagebox.showerror("Lỗi", "Thiếu API_ID hoặc API_HASH trong file .env")
            return
        
        self.client = TelegramClient(session_name, api_id, api_hash)
        self.user = None
        self.connected = False
        
        self.create_ui()
        self.check_login()
    
    def create_ui(self):
        """Tạo giao diện chính"""
        # Header
        header = ctk.CTkFrame(self.root, height=80, corner_radius=0, fg_color="#4A90E2")
        header.pack(fill="x")
        header.pack_propagate(False)
        
        # Logo và tiêu đề
        title_frame = ctk.CTkFrame(header, fg_color="transparent")
        title_frame.pack(side="left", padx=20, pady=20)
        
        ctk.CTkLabel(title_frame, text="🚀 TeleDrive", font=ctk.CTkFont(size=24, weight="bold"), text_color="white").pack()
        
        # Trạng thái kết nối
        self.status_frame = ctk.CTkFrame(header, fg_color="transparent")
        self.status_frame.pack(side="right", padx=20, pady=20)
        
        self.status_label = ctk.CTkLabel(self.status_frame, text="● Chưa kết nối", text_color="red", font=ctk.CTkFont(size=14, weight="bold"))
        self.status_label.pack(side="left", padx=(0, 10))
        
        self.connect_btn = ctk.CTkButton(self.status_frame, text="Kết nối", width=100, height=35, command=self.toggle_connection)
        self.connect_btn.pack(side="left")
        
        # Main content
        self.main_frame = ctk.CTkFrame(self.root)
        self.main_frame.pack(fill="both", expand=True, padx=20, pady=20)
        
        # Welcome message
        self.welcome_label = ctk.CTkLabel(self.main_frame, text="Chào mừng đến với TeleDrive!\nVui lòng kết nối Telegram để bắt đầu.", font=ctk.CTkFont(size=16))
        self.welcome_label.pack(expand=True)
    
    def check_login(self):
        """Kiểm tra trạng thái đăng nhập"""
        def run_async():
            try:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                loop.run_until_complete(self.client.connect())
                
                if loop.run_until_complete(self.client.is_user_authorized()):
                    user = loop.run_until_complete(self.client.get_me())
                    self.root.after(0, lambda: self.on_login_success(user))
                else:
                    self.root.after(0, self.on_not_logged_in)
            except Exception as e:
                self.root.after(0, lambda: self.on_connection_error(str(e)))
        
        threading.Thread(target=run_async, daemon=True).start()
    
    def on_login_success(self, user):
        """Xử lý đăng nhập thành công"""
        self.user = user
        self.connected = True
        self.status_label.configure(text="● Đã kết nối", text_color="green")
        self.connect_btn.configure(text="Ngắt kết nối")
        self.welcome_label.configure(text=f"Xin chào {user.first_name}!\nBạn đã kết nối thành công với Telegram.")
    
    def on_not_logged_in(self):
        """Xử lý chưa đăng nhập"""
        self.connected = False
        self.status_label.configure(text="● Chưa đăng nhập", text_color="orange")
        self.connect_btn.configure(text="Đăng nhập")
    
    def on_connection_error(self, error):
        """Xử lý lỗi kết nối"""
        self.connected = False
        self.status_label.configure(text="● Lỗi kết nối", text_color="red")
        self.connect_btn.configure(text="Kết nối")
        messagebox.showerror("Lỗi kết nối", f"Không thể kết nối: {error}")
    
    def toggle_connection(self):
        """Chuyển đổi trạng thái kết nối"""
        if self.connected:
            self.disconnect()
        else:
            self.login()
    
    def login(self):
        """Đăng nhập Telegram"""
        login_window = LoginWindow(self.root, self.client)
        self.root.wait_window(login_window.window)
        
        if login_window.result:
            self.on_login_success(login_window.result)
    
    def disconnect(self):
        """Ngắt kết nối"""
        def run_async():
            try:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                loop.run_until_complete(self.client.disconnect())
                self.root.after(0, self.on_disconnected)
            except Exception as e:
                self.root.after(0, lambda: messagebox.showerror("Lỗi", f"Lỗi ngắt kết nối: {e}"))
        
        threading.Thread(target=run_async, daemon=True).start()
    
    def on_disconnected(self):
        """Xử lý ngắt kết nối"""
        self.connected = False
        self.user = None
        self.status_label.configure(text="● Đã ngắt kết nối", text_color="gray")
        self.connect_btn.configure(text="Kết nối")
        self.welcome_label.configure(text="Đã ngắt kết nối khỏi Telegram.")
    
    def run(self):
        """Chạy ứng dụng"""
        self.root.mainloop()

def main():
    """Hàm chính"""
    try:
        app = TeleDriveApp()
        app.run()
    except Exception as e:
        print(f"Lỗi khởi động ứng dụng: {e}")

if __name__ == "__main__":
    main()
