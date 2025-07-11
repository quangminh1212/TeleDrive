import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import asyncio
import threading
import os
from telethon import TelegramClient
from telethon.errors import SessionPasswordNeededError
from PIL import Image, ImageTk
import sys

# Telegram API credentials
API_ID = 21272067
API_HASH = 'b7690dc86952dbc9b16717b101164af3'
SESSION_NAME = 'teledrive_session'

class TeleDriveApp:
    def __init__(self):
        print("Initializing TeleDrive...")
        self.root = tk.Tk()
        self.root.title("TeleDrive - Telegram Channel File Manager")
        self.root.geometry("1000x700")
        self.root.configure(bg='#ffffff')
        self.root.minsize(800, 600)
        
        print("Creating Telegram client...")
        # Telegram client
        self.client = TelegramClient(SESSION_NAME, API_ID, API_HASH)
        self.loop = asyncio.new_event_loop()
        self.channels = []
        self.current_channel = None
        self.files = []
        
        print("Loading logo...")
        # Load logo
        self.load_logo()
        
        print("Starting async loop...")
        # Start async loop in separate thread
        self.thread = threading.Thread(target=self.run_async_loop, daemon=True)
        self.thread.start()
        
        print("Checking login status...")
        # Check if already logged in
        self.root.after(100, self.check_login_status)
        
    def load_logo(self):
        try:
            if os.path.exists('teledrive.png'):
                print("Logo file found, loading...")
                image = Image.open('teledrive.png')
                image = image.resize((64, 64), Image.Resampling.LANCZOS)
                self.logo = ImageTk.PhotoImage(image)
                print("Logo loaded successfully")
            else:
                print("Logo file not found")
                self.logo = None
        except Exception as e:
            print(f"Error loading logo: {e}")
            self.logo = None
    
    def run_async_loop(self):
        print("Setting up async event loop...")
        asyncio.set_event_loop(self.loop)
        print("Running async event loop...")
        self.loop.run_forever()
    
    def run_async(self, coro):
        print(f"Running async coroutine: {coro}")
        future = asyncio.run_coroutine_threadsafe(coro, self.loop)
        return future.result()
    
    def check_login_status(self):
        print("Checking login status...")
        try:
            print("Connecting to Telegram...")
            is_connected = self.run_async(self.client.connect())
            print(f"Connected: {is_connected}")
            
            print("Checking if user is authorized...")
            is_authorized = self.run_async(self.client.is_user_authorized())
            print(f"Authorized: {is_authorized}")
            
            if is_authorized:
                print("User is authorized, showing main interface...")
                self.show_main_interface()
            else:
                print("User not authorized, showing login interface...")
                self.show_login_interface()
        except Exception as e:
            print(f"Error checking login status: {e}")
            print("Showing login interface due to error...")
            self.show_login_interface()
    
    def show_login_interface(self):
        print("Showing login interface...")
        # Clear window
        for widget in self.root.winfo_children():
            widget.destroy()

        # Simple login interface for debugging
        main_frame = tk.Frame(self.root, bg='#ffffff')
        main_frame.pack(expand=True, fill='both')
        
        # Title
        title_label = tk.Label(main_frame, text="TeleDrive", 
                              font=('Arial', 24, 'bold'), bg='#ffffff', fg='#0088cc')
        title_label.pack(pady=50)
        
        # Status
        status_label = tk.Label(main_frame, text="Login interface loaded successfully!", 
                               font=('Arial', 12), bg='#ffffff', fg='#666666')
        status_label.pack(pady=20)
        
        # Phone entry
        phone_frame = tk.Frame(main_frame, bg='#ffffff')
        phone_frame.pack(pady=20)
        
        tk.Label(phone_frame, text="Phone Number:", font=('Arial', 12), 
                bg='#ffffff').pack(side='left', padx=(0, 10))
        
        self.phone_entry = tk.Entry(phone_frame, font=('Arial', 12), width=20)
        self.phone_entry.pack(side='left')
        
        # Login button
        login_btn = tk.Button(main_frame, text="Send Code", font=('Arial', 12), 
                             bg='#0088cc', fg='white', padx=20, pady=10,
                             command=self.send_code)
        login_btn.pack(pady=20)
        
        print("Login interface created successfully")
    
    def send_code(self):
        phone = self.phone_entry.get().strip()
        if not phone:
            messagebox.showwarning("Warning", "Please enter your phone number")
            return
        
        print(f"Sending code to: {phone}")
        try:
            self.phone_number = phone
            self.run_async(self.client.send_code_request(phone))
            messagebox.showinfo("Success", "Verification code sent!")
        except Exception as e:
            print(f"Error sending code: {e}")
            messagebox.showerror("Error", f"Failed to send code: {str(e)}")
    
    def show_main_interface(self):
        print("Showing main interface...")
        # Clear window
        for widget in self.root.winfo_children():
            widget.destroy()
        
        # Simple main interface for debugging
        main_frame = tk.Frame(self.root, bg='#ffffff')
        main_frame.pack(expand=True, fill='both', padx=20, pady=20)
        
        # Title
        title_label = tk.Label(main_frame, text="TeleDrive - Main Interface", 
                              font=('Arial', 20, 'bold'), bg='#ffffff', fg='#0088cc')
        title_label.pack(pady=20)
        
        # Status
        status_label = tk.Label(main_frame, text="Successfully logged in!", 
                               font=('Arial', 12), bg='#ffffff', fg='#666666')
        status_label.pack(pady=10)
        
        # Logout button
        logout_btn = tk.Button(main_frame, text="Logout", font=('Arial', 12), 
                              bg='#dc3545', fg='white', padx=20, pady=10,
                              command=self.logout)
        logout_btn.pack(pady=20)
        
        print("Main interface created successfully")
    
    def logout(self):
        print("Logging out...")
        try:
            self.run_async(self.client.log_out())
            # Remove session file
            if os.path.exists(f"{SESSION_NAME}.session"):
                os.remove(f"{SESSION_NAME}.session")
            self.show_login_interface()
        except Exception as e:
            print(f"Logout error: {e}")
            messagebox.showerror("Error", f"Logout failed: {str(e)}")
    
    def run(self):
        print("Starting main loop...")
        try:
            self.root.mainloop()
        finally:
            print("Stopping async loop...")
            self.loop.call_soon_threadsafe(self.loop.stop)

if __name__ == "__main__":
    print("Starting TeleDrive debug version...")
    app = TeleDriveApp()
    app.run()
    print("TeleDrive closed.")
