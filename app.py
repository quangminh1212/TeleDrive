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
import signal
import sys
from pathlib import Path
from PIL import Image
from telethon import TelegramClient
from telethon.errors import SessionPasswordNeededError, PhoneCodeInvalidError
from dotenv import load_dotenv

# Load cấu hình
load_dotenv()

# Cấu hình giao diện
ctk.set_appearance_mode("light")
ctk.set_default_color_theme("blue")

# Màu sắc chính xác của Telegram
COLORS = {
    "bg_primary": "#FFFFFF",        # Trắng tinh khiết
    "bg_secondary": "#F4F4F5",      # Xám nhạt Telegram
    "bg_card": "#FFFFFF",           # Trắng card
    "telegram_blue": "#2AABEE",     # Xanh Telegram chính thức
    "telegram_dark": "#229ED9",     # Xanh đậm
    "telegram_light": "#64B5F6",    # Xanh nhạt
    "text_primary": "#000000",      # Đen chính
    "text_secondary": "#707579",    # Xám text Telegram
    "text_hint": "#A2ACB0",        # Xám gợi ý
    "border": "#E4E4E4",           # Viền
    "success": "#00C851",          # Xanh lá
    "error": "#FF3B30",            # Đỏ iOS
    "warning": "#FF9500"           # Cam cảnh báo
}

class LoginWindow:
    """Cửa sổ đăng nhập Telegram theo phong cách Telegram"""

    def __init__(self, parent, client):
        self.parent = parent
        self.client = client
        self.result = None



        # Tạo cửa sổ đăng nhập
        self.window = ctk.CTkToplevel(parent)
        self.window.title("Đăng nhập Telegram")
        self.window.geometry("420x580")
        self.window.resizable(False, False)
        self.window.transient(parent)
        self.window.grab_set()
        self.window.configure(fg_color=COLORS["bg_primary"])

        # Căn giữa cửa sổ
        self.center_window()

        self.step = "phone"
        self.phone = ""
        self.code_hash = ""
        self.selected_country = {"name": "Việt Nam", "code": "+84", "flag": "🇻🇳"}

        self.create_ui()

    def center_window(self):
        """Căn giữa cửa sổ"""
        self.window.update_idletasks()
        x = (self.window.winfo_screenwidth() // 2) - (420 // 2)
        y = (self.window.winfo_screenheight() // 2) - (580 // 2)
        self.window.geometry(f"420x580+{x}+{y}")

    def create_ui(self):
        """Tạo giao diện đăng nhập giống hệt Telegram"""
        # Header với logo Telegram chính thức
        header = ctk.CTkFrame(self.window, fg_color=COLORS["bg_primary"], height=140)
        header.pack(fill="x", padx=0, pady=(0, 0))
        header.pack_propagate(False)

        # Logo container
        logo_container = ctk.CTkFrame(header, fg_color="transparent")
        logo_container.pack(expand=True)

        # Logo Telegram chính thức
        logo_bg = ctk.CTkFrame(logo_container,
                              fg_color=COLORS["telegram_blue"],
                              width=80, height=80,
                              corner_radius=40)
        logo_bg.pack(pady=(25, 8))
        logo_bg.pack_propagate(False)

        # Logo TeleDrive - sử dụng text emoji cho login dialog để tránh lỗi
        logo = ctk.CTkLabel(logo_bg, text="✈️",
                          font=ctk.CTkFont(size=36, weight="bold"),
                          text_color="white")
        logo.pack(expand=True)

        # Tiêu đề Telegram
        title = ctk.CTkLabel(logo_container, text="Telegram",
                           font=ctk.CTkFont(size=28, weight="bold"),
                           text_color=COLORS["text_primary"])
        title.pack()

        # Content với nền trắng sữa
        self.content = ctk.CTkFrame(self.window, fg_color=COLORS["bg_primary"], corner_radius=0)
        self.content.pack(fill="both", expand=True, padx=0, pady=0)

        self.create_phone_step()
        self.create_code_step()
        self.create_password_step()

        self.show_step("phone")
    
    def create_phone_step(self):
        """Bước nhập số điện thoại với chọn quốc gia"""
        self.phone_frame = ctk.CTkFrame(self.content, fg_color="transparent")

        # Tiêu đề
        title = ctk.CTkLabel(self.phone_frame, text="Số điện thoại của bạn",
                           font=ctk.CTkFont(size=24, weight="bold"),
                           text_color=COLORS["text_primary"])
        title.pack(pady=(30, 5))

        subtitle = ctk.CTkLabel(self.phone_frame,
                              text="Vui lòng xác nhận mã quốc gia và\nnhập số điện thoại của bạn.",
                              font=ctk.CTkFont(size=14),
                              text_color=COLORS["text_secondary"])
        subtitle.pack(pady=(0, 30))

        # Chọn quốc gia với border
        country_frame = ctk.CTkFrame(self.phone_frame,
                                   fg_color=COLORS["bg_card"],
                                   border_width=1,
                                   border_color=COLORS["border"],
                                   corner_radius=8,
                                   height=52)
        country_frame.pack(fill="x", padx=40, pady=(0, 1))
        country_frame.pack_propagate(False)

        self.country_btn = ctk.CTkButton(country_frame,
                                       text=f"{self.selected_country['flag']} {self.selected_country['name']}",
                                       font=ctk.CTkFont(size=14),
                                       fg_color="transparent",
                                       text_color=COLORS["text_primary"],
                                       hover_color=COLORS["bg_secondary"],
                                       anchor="w",
                                       command=self.show_country_selector)
        self.country_btn.pack(fill="both", expand=True, padx=15, pady=10)

        # Khung nhập số điện thoại với border Telegram
        phone_input_frame = ctk.CTkFrame(self.phone_frame,
                                       fg_color=COLORS["bg_card"],
                                       border_width=1,
                                       border_color=COLORS["border"],
                                       corner_radius=8,
                                       height=52)
        phone_input_frame.pack(fill="x", padx=40, pady=(0, 20))
        phone_input_frame.pack_propagate(False)

        # Code và số điện thoại trong cùng một khung
        input_container = ctk.CTkFrame(phone_input_frame, fg_color="transparent")
        input_container.pack(fill="both", expand=True, padx=15, pady=10)

        # Mã quốc gia
        self.country_code_label = ctk.CTkLabel(input_container,
                                             text=self.selected_country['code'],
                                             font=ctk.CTkFont(size=16),
                                             text_color=COLORS["text_primary"])
        self.country_code_label.pack(side="left")

        # Số điện thoại
        self.phone_entry = ctk.CTkEntry(input_container,
                                      placeholder_text="123 456 789",
                                      font=ctk.CTkFont(size=16),
                                      fg_color="transparent",
                                      border_width=0,
                                      text_color=COLORS["text_primary"])
        self.phone_entry.pack(side="left", fill="x", expand=True, padx=(10, 0))
        self.phone_entry.bind("<Return>", lambda e: self.send_code())

        # Nút tiếp tục theo style Telegram
        self.send_btn = ctk.CTkButton(self.phone_frame,
                                    text="TIẾP TỤC",
                                    height=50,
                                    width=320,
                                    font=ctk.CTkFont(size=15, weight="bold"),
                                    fg_color=COLORS["telegram_blue"],
                                    hover_color=COLORS["telegram_dark"],
                                    corner_radius=12,
                                    command=self.send_code)
        self.send_btn.pack(pady=(30, 10))

        # Thông báo lỗi
        self.phone_status = ctk.CTkLabel(self.phone_frame, text="",
                                       text_color=COLORS["error"],
                                       font=ctk.CTkFont(size=12))
        self.phone_status.pack(pady=(10, 0))

    def show_country_selector(self):
        """Hiển thị danh sách quốc gia"""
        countries = [
            {"name": "Việt Nam", "code": "+84", "flag": "🇻🇳"},
            {"name": "United States", "code": "+1", "flag": "🇺🇸"},
            {"name": "China", "code": "+86", "flag": "🇨🇳"},
            {"name": "India", "code": "+91", "flag": "🇮🇳"},
            {"name": "United Kingdom", "code": "+44", "flag": "🇬🇧"},
            {"name": "Germany", "code": "+49", "flag": "🇩🇪"},
            {"name": "France", "code": "+33", "flag": "🇫🇷"},
            {"name": "Japan", "code": "+81", "flag": "🇯🇵"},
            {"name": "South Korea", "code": "+82", "flag": "🇰🇷"},
            {"name": "Thailand", "code": "+66", "flag": "🇹🇭"},
            {"name": "Singapore", "code": "+65", "flag": "🇸🇬"},
            {"name": "Malaysia", "code": "+60", "flag": "🇲🇾"}
        ]

        # Tạo cửa sổ chọn quốc gia
        country_window = ctk.CTkToplevel(self.window)
        country_window.title("Chọn quốc gia")
        country_window.geometry("350x400")
        country_window.transient(self.window)
        country_window.grab_set()
        country_window.configure(fg_color=COLORS["bg_primary"])

        # Căn giữa
        x = self.window.winfo_x() + 35
        y = self.window.winfo_y() + 90
        country_window.geometry(f"350x400+{x}+{y}")

        # Tiêu đề
        title = ctk.CTkLabel(country_window, text="Chọn quốc gia",
                           font=ctk.CTkFont(size=18, weight="bold"),
                           text_color=COLORS["text_primary"])
        title.pack(pady=20)

        # Danh sách quốc gia
        scrollable = ctk.CTkScrollableFrame(country_window, fg_color=COLORS["bg_primary"])
        scrollable.pack(fill="both", expand=True, padx=20, pady=(0, 20))

        for country in countries:
            btn = ctk.CTkButton(scrollable,
                              text=f"{country['flag']} {country['name']} {country['code']}",
                              font=ctk.CTkFont(size=14),
                              fg_color="transparent",
                              text_color=COLORS["text_primary"],
                              hover_color=COLORS["bg_secondary"],
                              anchor="w",
                              height=40,
                              command=lambda c=country: self.select_country(c, country_window))
            btn.pack(fill="x", pady=1)

    def select_country(self, country, window):
        """Chọn quốc gia"""
        self.selected_country = country
        self.country_btn.configure(text=f"{country['flag']} {country['name']}")
        self.country_code_label.configure(text=country['code'])
        window.destroy()

    def create_code_step(self):
        """Bước nhập mã xác nhận theo phong cách Telegram"""
        self.code_frame = ctk.CTkFrame(self.content, fg_color="transparent")

        # Tiêu đề
        title = ctk.CTkLabel(self.code_frame, text="Nhập mã xác nhận",
                           font=ctk.CTkFont(size=24, weight="bold"),
                           text_color=COLORS["text_primary"])
        title.pack(pady=(30, 5))

        # Mô tả
        self.phone_display = ctk.CTkLabel(self.code_frame, text="",
                                        font=ctk.CTkFont(size=14),
                                        text_color=COLORS["text_secondary"])
        self.phone_display.pack(pady=(0, 30))

        # Khung nhập mã với border
        code_frame = ctk.CTkFrame(self.code_frame,
                                fg_color=COLORS["bg_card"],
                                border_width=1,
                                border_color=COLORS["border"],
                                corner_radius=8,
                                height=52)
        code_frame.pack(fill="x", padx=40, pady=(0, 20))
        code_frame.pack_propagate(False)

        self.code_entry = ctk.CTkEntry(code_frame,
                                     placeholder_text="Mã xác nhận",
                                     font=ctk.CTkFont(size=16),
                                     fg_color="transparent",
                                     border_width=0,
                                     text_color=COLORS["text_primary"],
                                     justify="center")
        self.code_entry.pack(fill="both", expand=True, padx=15, pady=10)
        self.code_entry.bind("<Return>", lambda e: self.verify_code())

        # Nút xác nhận
        self.verify_btn = ctk.CTkButton(self.code_frame,
                                      text="TIẾP TỤC",
                                      height=50,
                                      width=320,
                                      font=ctk.CTkFont(size=15, weight="bold"),
                                      fg_color=COLORS["telegram_blue"],
                                      hover_color=COLORS["telegram_dark"],
                                      corner_radius=12,
                                      command=self.verify_code)
        self.verify_btn.pack(pady=(30, 10))

        # Nút quay lại
        back_btn = ctk.CTkButton(self.code_frame, text="← Quay lại",
                               height=35, width=120,
                               fg_color="transparent",
                               text_color=COLORS["telegram_blue"],
                               hover_color=COLORS["bg_secondary"],
                               command=lambda: self.show_step("phone"))
        back_btn.pack(pady=5)

        # Thông báo lỗi
        self.code_status = ctk.CTkLabel(self.code_frame, text="",
                                      text_color=COLORS["error"],
                                      font=ctk.CTkFont(size=12))
        self.code_status.pack(pady=(10, 0))
    
    def create_password_step(self):
        """Bước nhập mật khẩu 2FA theo phong cách Telegram"""
        self.password_frame = ctk.CTkFrame(self.content, fg_color="transparent")

        # Tiêu đề
        title = ctk.CTkLabel(self.password_frame, text="Mật khẩu hai bước",
                           font=ctk.CTkFont(size=24, weight="bold"),
                           text_color=COLORS["text_primary"])
        title.pack(pady=(30, 5))

        # Mô tả
        subtitle = ctk.CTkLabel(self.password_frame,
                              text="Tài khoản của bạn được bảo vệ bằng\nmật khẩu bổ sung.",
                              font=ctk.CTkFont(size=14),
                              text_color=COLORS["text_secondary"])
        subtitle.pack(pady=(0, 30))

        # Khung nhập mật khẩu với border
        password_frame = ctk.CTkFrame(self.password_frame,
                                    fg_color=COLORS["bg_card"],
                                    border_width=1,
                                    border_color=COLORS["border"],
                                    corner_radius=8,
                                    height=52)
        password_frame.pack(fill="x", padx=40, pady=(0, 20))
        password_frame.pack_propagate(False)

        self.password_entry = ctk.CTkEntry(password_frame,
                                         placeholder_text="Mật khẩu",
                                         font=ctk.CTkFont(size=16),
                                         fg_color="transparent",
                                         border_width=0,
                                         text_color=COLORS["text_primary"],
                                         show="*")
        self.password_entry.pack(fill="both", expand=True, padx=15, pady=10)
        self.password_entry.bind("<Return>", lambda e: self.verify_password())

        # Nút xác nhận
        self.password_btn = ctk.CTkButton(self.password_frame,
                                        text="TIẾP TỤC",
                                        height=50,
                                        width=320,
                                        font=ctk.CTkFont(size=15, weight="bold"),
                                        fg_color=COLORS["telegram_blue"],
                                        hover_color=COLORS["telegram_dark"],
                                        corner_radius=12,
                                        command=self.verify_password)
        self.password_btn.pack(pady=(30, 10))

        # Thông báo lỗi
        self.password_status = ctk.CTkLabel(self.password_frame, text="",
                                          text_color=COLORS["error"],
                                          font=ctk.CTkFont(size=12))
        self.password_status.pack(pady=(10, 0))
    
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
        phone_number = self.phone_entry.get().strip()
        if not phone_number:
            self.phone_status.configure(text="Vui lòng nhập số điện thoại")
            return

        # Kết hợp mã quốc gia và số điện thoại
        full_phone = self.selected_country['code'] + phone_number
        self.phone = full_phone

        self.send_btn.configure(state="disabled", text="ĐANG GỬI...")
        self.phone_status.configure(text="")

        async def send_code_async():
            try:
                result = await self.client.send_code_request(full_phone)
                self.code_hash = result.phone_code_hash
                self.window.after(0, self.on_code_sent)
            except Exception as e:
                self.window.after(0, lambda: self.on_code_error(str(e)))

        def run_async():
            try:
                asyncio.run(send_code_async())
            except Exception as e:
                self.window.after(0, lambda: self.on_code_error(str(e)))

        threading.Thread(target=run_async, daemon=True).start()
    
    def on_code_sent(self):
        """Xử lý khi gửi mã thành công"""
        self.send_btn.configure(state="normal", text="TIẾP TỤC")
        self.phone_display.configure(text=f"Chúng tôi đã gửi mã SMS đến {self.phone}")
        self.show_step("code")

    def on_code_error(self, error):
        """Xử lý lỗi gửi mã"""
        self.send_btn.configure(state="normal", text="TIẾP TỤC")
        if "PHONE_NUMBER_INVALID" in error:
            self.phone_status.configure(text="Số điện thoại không hợp lệ")
        elif "PHONE_NUMBER_BANNED" in error:
            self.phone_status.configure(text="Số điện thoại này đã bị cấm")
        else:
            self.phone_status.configure(text=f"Lỗi: {error}")
    
    def verify_code(self):
        """Xác nhận mã"""
        code = self.code_entry.get().strip()
        if not code:
            self.code_status.configure(text="Vui lòng nhập mã xác nhận")
            return
        
        self.verify_btn.configure(state="disabled", text="Đang xác nhận...")
        self.code_status.configure(text="Đang xác nhận...")
        
        async def verify_code_async():
            try:
                user = await self.client.sign_in(phone=self.phone, code=code, phone_code_hash=self.code_hash)
                self.window.after(0, lambda: self.on_login_success(user))
            except SessionPasswordNeededError:
                self.window.after(0, lambda: self.show_step("password"))
            except Exception as e:
                self.window.after(0, lambda: self.on_verify_error(str(e)))

        def run_async():
            try:
                asyncio.run(verify_code_async())
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
        
        async def verify_password_async():
            try:
                user = await self.client.sign_in(password=password)
                self.window.after(0, lambda: self.on_login_success(user))
            except Exception as e:
                self.window.after(0, lambda: self.on_password_error(str(e)))

        def run_async():
            try:
                asyncio.run(verify_password_async())
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
    """Ứng dụng chính TeleDrive với giao diện theo phong cách Telegram"""

    def __init__(self):
        # Tạo cửa sổ chính
        self.root = ctk.CTk()
        self.root.title("TeleDrive - Quản lý file Telegram")
        self.root.geometry("1200x800")
        self.root.configure(fg_color=COLORS["bg_primary"])

        # Ẩn cửa sổ chính ban đầu
        self.root.withdraw()

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
        """Tạo giao diện chính giống hệt Telegram"""
        # Header với thiết kế Telegram chính thức
        header = ctk.CTkFrame(self.root, height=64, corner_radius=0, fg_color=COLORS["telegram_blue"])
        header.pack(fill="x")
        header.pack_propagate(False)

        # Container cho header
        header_container = ctk.CTkFrame(header, fg_color="transparent")
        header_container.pack(fill="both", expand=True, padx=16, pady=12)

        # Logo và tiêu đề bên trái
        left_frame = ctk.CTkFrame(header_container, fg_color="transparent")
        left_frame.pack(side="left")

        # Logo container với background tròn nhỏ
        logo_bg = ctk.CTkFrame(left_frame,
                              fg_color="white",
                              width=32, height=32,
                              corner_radius=16)
        logo_bg.pack(side="left", padx=(0, 12))
        logo_bg.pack_propagate(False)

        # Logo TeleDrive từ file PNG (nhỏ hơn cho header)
        try:
            logo_path = os.path.join(os.getcwd(), "teledrive.png")
            logo_image = Image.open(logo_path)
            logo_image = logo_image.resize((32, 32), Image.Resampling.LANCZOS)
            self.header_logo_photo = ctk.CTkImage(light_image=logo_image, dark_image=logo_image, size=(32, 32))
            logo = ctk.CTkLabel(logo_bg, image=self.header_logo_photo, text="")
            logo.pack(expand=True)
        except Exception as e:
            print(f"Không thể load logo cho header: {e}")
            # Fallback nếu không load được hình
            logo = ctk.CTkLabel(logo_bg, text="☁✈",
                              font=ctk.CTkFont(size=16, weight="bold"),
                              text_color=COLORS["telegram_blue"])
            logo.pack(expand=True)

        # Tiêu đề
        title = ctk.CTkLabel(left_frame, text="TeleDrive",
                           font=ctk.CTkFont(size=20, weight="bold"),
                           text_color="white")
        title.pack(side="left")

        # Trạng thái kết nối bên phải
        right_frame = ctk.CTkFrame(header_container, fg_color="transparent")
        right_frame.pack(side="right")

        # Thông tin user (nếu đã đăng nhập)
        self.user_frame = ctk.CTkFrame(right_frame, fg_color="transparent")
        self.user_frame.pack(side="left", padx=(0, 15))

        self.user_label = ctk.CTkLabel(self.user_frame, text="",
                                     font=ctk.CTkFont(size=14),
                                     text_color="white")
        self.user_label.pack()

        # Nút kết nối/đăng nhập theo style Telegram
        self.connect_btn = ctk.CTkButton(right_frame,
                                       text="Đăng nhập",
                                       width=90,
                                       height=32,
                                       font=ctk.CTkFont(size=13, weight="bold"),
                                       fg_color="white",
                                       text_color=COLORS["telegram_blue"],
                                       hover_color="#F0F0F0",
                                       corner_radius=16,
                                       command=self.toggle_connection)
        self.connect_btn.pack(side="left")

        # Main content với nền trắng sữa
        self.main_frame = ctk.CTkFrame(self.root, fg_color=COLORS["bg_primary"], corner_radius=0)
        self.main_frame.pack(fill="both", expand=True)

        # Welcome screen giống Telegram
        self.welcome_frame = ctk.CTkFrame(self.main_frame, fg_color="transparent")
        self.welcome_frame.pack(expand=True)

        # Logo lớn giống Telegram
        logo_container = ctk.CTkFrame(self.welcome_frame, fg_color="transparent")
        logo_container.pack(pady=(80, 30))

        # Background tròn cho logo
        logo_bg = ctk.CTkFrame(logo_container,
                              fg_color=COLORS["telegram_blue"],
                              width=120, height=120,
                              corner_radius=60)
        logo_bg.pack()
        logo_bg.pack_propagate(False)

        # Logo TeleDrive từ file PNG (lớn cho welcome screen)
        try:
            logo_path = os.path.join(os.getcwd(), "teledrive.png")
            logo_image = Image.open(logo_path)
            logo_image = logo_image.resize((96, 96), Image.Resampling.LANCZOS)
            self.welcome_logo_photo = ctk.CTkImage(light_image=logo_image, dark_image=logo_image, size=(96, 96))
            welcome_icon = ctk.CTkLabel(logo_bg, image=self.welcome_logo_photo, text="")
            welcome_icon.pack(expand=True)
            print("Logo welcome screen đã được tải thành công!")
        except Exception as e:
            print(f"Không thể load logo cho welcome screen: {e}")
            # Fallback nếu không load được hình
            welcome_icon = ctk.CTkLabel(logo_bg, text="✈",
                                      font=ctk.CTkFont(size=56, weight="bold"),
                                      text_color="white")
            welcome_icon.pack(expand=True)

        # Tiêu đề chào mừng
        welcome_title = ctk.CTkLabel(self.welcome_frame,
                                   text="Chào mừng đến với TeleDrive",
                                   font=ctk.CTkFont(size=24, weight="bold"),
                                   text_color=COLORS["text_primary"])
        welcome_title.pack(pady=(0, 8))

        # Mô tả
        self.welcome_label = ctk.CTkLabel(self.welcome_frame,
                                        text="Quản lý file Telegram một cách dễ dàng\nVui lòng đăng nhập để bắt đầu",
                                        font=ctk.CTkFont(size=15),
                                        text_color=COLORS["text_secondary"])
        self.welcome_label.pack(pady=(0, 40))
    
    def check_login(self):
        """Kiểm tra trạng thái đăng nhập"""
        async def check_auth():
            try:
                await self.client.connect()

                if await self.client.is_user_authorized():
                    user = await self.client.get_me()
                    self.root.after(0, lambda: self.on_login_success(user))
                else:
                    self.root.after(0, self.on_not_logged_in)
            except Exception as e:
                self.root.after(0, lambda: self.on_connection_error(str(e)))

        def run_async():
            try:
                asyncio.run(check_auth())
            except Exception as e:
                self.root.after(0, lambda: self.on_connection_error(str(e)))

        threading.Thread(target=run_async, daemon=True).start()
    
    def on_login_success(self, user):
        """Xử lý đăng nhập thành công"""
        self.user = user
        self.connected = True

        # Hiển thị cửa sổ chính
        self.root.deiconify()

        # Cập nhật giao diện
        self.user_label.configure(text=f"👤 {user.first_name}")
        self.connect_btn.configure(text="Đăng xuất",
                                 fg_color=COLORS["error"],
                                 hover_color="#C53030")

        # Cập nhật welcome message
        self.welcome_label.configure(text=f"Xin chào {user.first_name}!\nBạn đã đăng nhập thành công với Telegram.")

        # Có thể thêm giao diện quản lý file ở đây
        self.show_main_interface()

    def on_not_logged_in(self):
        """Xử lý chưa đăng nhập - tự động hiển thị giao diện đăng nhập"""
        self.connected = False

        # Tự động hiển thị giao diện đăng nhập mà không hiển thị cửa sổ chính
        self.login()

    def on_connection_error(self, error):
        """Xử lý lỗi kết nối"""
        self.connected = False

        # Tạo cửa sổ tạm thời để hiển thị lỗi
        temp_root = ctk.CTk()
        temp_root.withdraw()
        messagebox.showerror("Lỗi kết nối", f"Không thể kết nối: {error}")
        temp_root.destroy()

        # Hiển thị giao diện đăng nhập
        self.login()

    def show_main_interface(self):
        """Hiển thị giao diện chính sau khi đăng nhập"""
        # Ẩn welcome screen
        self.welcome_frame.pack_forget()

        # Tạo giao diện quản lý file
        self.file_frame = ctk.CTkFrame(self.main_frame, fg_color="transparent")
        self.file_frame.pack(fill="both", expand=True, padx=20, pady=20)

        # Placeholder cho tính năng quản lý file
        placeholder = ctk.CTkLabel(self.file_frame,
                                 text="🗂️\n\nGiao diện quản lý file\nsẽ được phát triển tiếp",
                                 font=ctk.CTkFont(size=18),
                                 text_color=COLORS["text_secondary"])
        placeholder.pack(expand=True)
    
    def toggle_connection(self):
        """Chuyển đổi trạng thái kết nối"""
        if self.connected:
            self.disconnect()
        else:
            self.login()
    
    def login(self):
        """Đăng nhập Telegram"""
        # Tạo cửa sổ tạm thời để làm parent cho login window
        temp_root = ctk.CTk()
        temp_root.withdraw()

        login_window = LoginWindow(temp_root, self.client)
        temp_root.wait_window(login_window.window)

        if login_window.result:
            self.on_login_success(login_window.result)
        else:
            # Nếu không đăng nhập thành công, thoát ứng dụng
            self.root.quit()

        temp_root.destroy()
    
    def disconnect(self):
        """Ngắt kết nối"""
        async def disconnect_client():
            try:
                await self.client.disconnect()
                self.root.after(0, self.on_disconnected)
            except Exception as e:
                self.root.after(0, lambda: messagebox.showerror("Lỗi", f"Lỗi ngắt kết nối: {e}"))

        def run_async():
            try:
                asyncio.run(disconnect_client())
            except Exception as e:
                self.root.after(0, lambda: messagebox.showerror("Lỗi", f"Lỗi ngắt kết nối: {e}"))

        threading.Thread(target=run_async, daemon=True).start()

    def on_disconnected(self):
        """Xử lý ngắt kết nối"""
        self.connected = False
        self.user = None

        # Ẩn cửa sổ chính
        self.root.withdraw()

        # Hiển thị giao diện đăng nhập
        self.login()
    
    def cleanup(self):
        """Dọn dẹp tài nguyên khi đóng ứng dụng"""
        async def cleanup_client():
            try:
                if self.client and self.client.is_connected():
                    await self.client.disconnect()
            except Exception:
                pass  # Ignore cleanup errors

        def run_cleanup():
            try:
                asyncio.run(cleanup_client())
            except Exception:
                pass  # Ignore cleanup errors

        threading.Thread(target=run_cleanup, daemon=True).start()

    def run(self):
        """Chạy ứng dụng"""
        try:
            # Thêm cleanup khi đóng cửa sổ
            self.root.protocol("WM_DELETE_WINDOW", self.on_closing)
            self.root.mainloop()
        except KeyboardInterrupt:
            self.cleanup()

    def on_closing(self):
        """Xử lý khi đóng ứng dụng"""
        self.cleanup()
        self.root.quit()
        self.root.destroy()

def main():
    """Hàm chính"""
    app = None

    def signal_handler(signum, frame):
        """Xử lý tín hiệu để cleanup"""
        if app:
            app.cleanup()
        sys.exit(0)

    # Đăng ký signal handler
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    try:
        app = TeleDriveApp()
        app.run()
    except Exception as e:
        print(f"Lỗi khởi động ứng dụng: {e}")
    finally:
        if app:
            app.cleanup()

if __name__ == "__main__":
    main()
