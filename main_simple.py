import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import asyncio
import threading
import os
from telethon import TelegramClient
from telethon.errors import SessionPasswordNeededError
from PIL import Image, ImageTk

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
        
        # Telegram client
        self.client = TelegramClient(SESSION_NAME, API_ID, API_HASH)
        self.loop = None
        self.thread = None
        self.channels = []
        self.current_channel = None
        self.files = []
        
        # Load logo
        self.load_logo()
        
        # Show initial interface
        self.show_login_interface()
        print("TeleDrive initialized successfully")
        
    def load_logo(self):
        try:
            if os.path.exists('teledrive.png'):
                image = Image.open('teledrive.png')
                image = image.resize((64, 64), Image.Resampling.LANCZOS)
                self.logo = ImageTk.PhotoImage(image)
            else:
                self.logo = None
        except Exception:
            self.logo = None
    
    def show_login_interface(self):
        print("Showing login interface...")
        # Clear window
        for widget in self.root.winfo_children():
            widget.destroy()

        # Main container
        main_container = tk.Frame(self.root, bg='#ffffff')
        main_container.pack(expand=True, fill='both')

        # Center content frame
        content_frame = tk.Frame(main_container, bg='#ffffff')
        content_frame.place(relx=0.5, rely=0.5, anchor='center')

        # Logo
        if self.logo:
            logo_label = tk.Label(content_frame, image=self.logo, bg='#ffffff')
            logo_label.pack(pady=(0, 20))
        else:
            logo_label = tk.Label(content_frame, text="📱", font=('Arial', 48),
                                 bg='#ffffff', fg='#0088cc')
            logo_label.pack(pady=(0, 20))

        # App name
        app_name = tk.Label(content_frame, text="TeleDrive",
                           font=('Arial', 24, 'bold'), bg='#ffffff', fg='#0088cc')
        app_name.pack(pady=(0, 10))

        # Subtitle
        subtitle_label = tk.Label(content_frame,
                                 text="Telegram Channel File Manager",
                                 font=('Arial', 12), bg='#ffffff', fg='#666666')
        subtitle_label.pack(pady=(0, 30))

        # Phone input
        phone_frame = tk.Frame(content_frame, bg='#ffffff')
        phone_frame.pack(pady=20)
        
        tk.Label(phone_frame, text="Phone Number:", font=('Arial', 12), 
                bg='#ffffff').pack(anchor='w', pady=(0, 5))
        
        self.phone_entry = tk.Entry(phone_frame, font=('Arial', 12), width=25)
        self.phone_entry.pack(pady=(0, 10))
        self.phone_entry.insert(0, "+84")

        # Send code button
        self.start_btn = tk.Button(content_frame, text="Send Code",
                                  font=('Arial', 12, 'bold'),
                                  bg='#0088cc', fg='white',
                                  padx=30, pady=10,
                                  command=self.send_code)
        self.start_btn.pack(pady=20)

        # Status label
        self.status_label = tk.Label(content_frame, text="", font=('Arial', 10),
                                    bg='#ffffff', fg='#ff0000')
        self.status_label.pack(pady=10)

        # Focus on phone entry
        self.phone_entry.focus()
        self.phone_entry.bind('<Return>', lambda e: self.send_code())
        
        print("Login interface created")
    
    def send_code(self):
        phone = self.phone_entry.get().strip()
        if not phone:
            self.status_label.config(text="Please enter your phone number")
            return

        self.status_label.config(text="Sending verification code...")
        self.start_btn.config(state='disabled', text="Sending...")
        self.root.update()

        # Start async operations in a separate thread
        def async_send_code():
            try:
                # Create new event loop for this thread
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                
                # Connect and send code
                loop.run_until_complete(self.client.connect())
                loop.run_until_complete(self.client.send_code_request(phone))
                
                self.phone_number = phone
                # Schedule UI update on main thread
                self.root.after(0, self.show_code_interface)
                
            except Exception as e:
                # Schedule error display on main thread
                self.root.after(0, lambda: self.show_error(f"Error: {str(e)}"))
            finally:
                loop.close()

        thread = threading.Thread(target=async_send_code, daemon=True)
        thread.start()
    
    def show_error(self, message):
        self.status_label.config(text=message)
        self.start_btn.config(state='normal', text="Send Code")
    
    def show_code_interface(self):
        print("Showing code interface...")
        # Clear window
        for widget in self.root.winfo_children():
            widget.destroy()

        # Main container
        main_container = tk.Frame(self.root, bg='#ffffff')
        main_container.pack(expand=True, fill='both')

        # Center content frame
        content_frame = tk.Frame(main_container, bg='#ffffff')
        content_frame.place(relx=0.5, rely=0.5, anchor='center')

        # Title
        title_label = tk.Label(content_frame, text="Enter Verification Code",
                              font=('Arial', 18, 'bold'), bg='#ffffff', fg='#0088cc')
        title_label.pack(pady=(0, 20))

        # Code input
        code_frame = tk.Frame(content_frame, bg='#ffffff')
        code_frame.pack(pady=20)
        
        tk.Label(code_frame, text="Verification Code:", font=('Arial', 12), 
                bg='#ffffff').pack(anchor='w', pady=(0, 5))
        
        self.code_entry = tk.Entry(code_frame, font=('Arial', 12), width=25)
        self.code_entry.pack(pady=(0, 10))

        # Verify button
        self.verify_btn = tk.Button(content_frame, text="Verify",
                                   font=('Arial', 12, 'bold'),
                                   bg='#0088cc', fg='white',
                                   padx=30, pady=10,
                                   command=self.verify_code)
        self.verify_btn.pack(pady=20)

        # Status label
        self.status_label = tk.Label(content_frame, text="", font=('Arial', 10),
                                    bg='#ffffff', fg='#ff0000')
        self.status_label.pack(pady=10)

        # Focus on code entry
        self.code_entry.focus()
        self.code_entry.bind('<Return>', lambda e: self.verify_code())
        
        print("Code interface created")
    
    def verify_code(self):
        code = self.code_entry.get().strip()
        if not code:
            self.status_label.config(text="Please enter the verification code")
            return

        self.status_label.config(text="Verifying code...")
        self.verify_btn.config(state='disabled', text="Verifying...")
        self.root.update()

        # Start async operations in a separate thread
        def async_verify_code():
            try:
                # Create new event loop for this thread
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                
                # Sign in with code
                loop.run_until_complete(self.client.sign_in(self.phone_number, code))
                
                # Schedule UI update on main thread
                self.root.after(0, self.show_main_interface)
                
            except SessionPasswordNeededError:
                # Schedule password interface on main thread
                self.root.after(0, self.show_password_interface)
            except Exception as e:
                # Schedule error display on main thread
                self.root.after(0, lambda: self.show_verify_error(f"Invalid code: {str(e)}"))
            finally:
                loop.close()

        thread = threading.Thread(target=async_verify_code, daemon=True)
        thread.start()
    
    def show_verify_error(self, message):
        self.status_label.config(text=message)
        self.verify_btn.config(state='normal', text="Verify")
        self.code_entry.delete(0, tk.END)
        self.code_entry.focus()
    
    def show_password_interface(self):
        print("Showing password interface...")
        messagebox.showinfo("Two-Factor Authentication", 
                           "Two-factor authentication is enabled. This simplified version doesn't support 2FA yet.")
        self.show_login_interface()
    
    def show_main_interface(self):
        print("Showing main interface...")
        # Clear window
        for widget in self.root.winfo_children():
            widget.destroy()
        
        # Main frame
        main_frame = tk.Frame(self.root, bg='#ffffff')
        main_frame.pack(fill='both', expand=True, padx=20, pady=20)
        
        # Title
        title_label = tk.Label(main_frame, text="TeleDrive - Main Interface", 
                              font=('Arial', 20, 'bold'), bg='#ffffff', fg='#0088cc')
        title_label.pack(pady=20)
        
        # Status
        status_label = tk.Label(main_frame, text="Successfully logged in to Telegram!", 
                               font=('Arial', 12), bg='#ffffff', fg='#666666')
        status_label.pack(pady=10)
        
        # Placeholder for future features
        placeholder_label = tk.Label(main_frame, 
                                    text="Channel management and file operations will be added here.", 
                                    font=('Arial', 11), bg='#ffffff', fg='#999999')
        placeholder_label.pack(pady=20)
        
        # Logout button
        logout_btn = tk.Button(main_frame, text="Logout", font=('Arial', 12), 
                              bg='#dc3545', fg='white', padx=20, pady=10,
                              command=self.logout)
        logout_btn.pack(pady=20)
        
        print("Main interface created")
    
    def logout(self):
        print("Logging out...")
        def async_logout():
            try:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                loop.run_until_complete(self.client.log_out())
                # Remove session file
                if os.path.exists(f"{SESSION_NAME}.session"):
                    os.remove(f"{SESSION_NAME}.session")
                self.root.after(0, self.show_login_interface)
            except Exception as e:
                self.root.after(0, lambda: messagebox.showerror("Error", f"Logout failed: {str(e)}"))
            finally:
                loop.close()

        thread = threading.Thread(target=async_logout, daemon=True)
        thread.start()
    
    def run(self):
        print("Starting main loop...")
        self.root.mainloop()
        print("Application closed")

if __name__ == "__main__":
    print("Starting TeleDrive...")
    app = TeleDriveApp()
    app.run()
