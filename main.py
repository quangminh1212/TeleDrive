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
        self.root = tk.Tk()
        self.root.title("TeleDrive - Telegram Channel File Manager")
        self.root.geometry("1000x700")
        self.root.configure(bg='#ffffff')
        
        # Telegram client
        self.client = TelegramClient(SESSION_NAME, API_ID, API_HASH)
        self.loop = asyncio.new_event_loop()
        self.channels = []
        self.current_channel = None
        self.files = []
        
        # Load logo
        self.load_logo()
        
        # Start async loop in separate thread
        self.thread = threading.Thread(target=self.run_async_loop, daemon=True)
        self.thread.start()
        
        # Check if already logged in
        self.root.after(100, self.check_login_status)
        
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
    
    def run_async_loop(self):
        asyncio.set_event_loop(self.loop)
        self.loop.run_forever()
    
    def run_async(self, coro):
        future = asyncio.run_coroutine_threadsafe(coro, self.loop)
        return future.result()
    
    def check_login_status(self):
        try:
            is_connected = self.run_async(self.client.connect())
            if self.run_async(self.client.is_user_authorized()):
                self.show_main_interface()
            else:
                self.show_login_interface()
        except Exception as e:
            self.show_login_interface()
    
    def show_login_interface(self):
        # Clear window
        for widget in self.root.winfo_children():
            widget.destroy()
        
        # Login frame
        login_frame = tk.Frame(self.root, bg='#ffffff')
        login_frame.pack(expand=True, fill='both')
        
        # Logo and title
        if self.logo:
            logo_label = tk.Label(login_frame, image=self.logo, bg='#ffffff')
            logo_label.pack(pady=20)
        
        title_label = tk.Label(login_frame, text="TeleDrive", font=('Arial', 24, 'bold'), 
                              bg='#ffffff', fg='#0088cc')
        title_label.pack(pady=10)
        
        subtitle_label = tk.Label(login_frame, text="Telegram Channel File Manager", 
                                 font=('Arial', 12), bg='#ffffff', fg='#666666')
        subtitle_label.pack(pady=5)
        
        # Phone number input
        phone_label = tk.Label(login_frame, text="Phone Number:", font=('Arial', 12), 
                              bg='#ffffff', fg='#333333')
        phone_label.pack(pady=(40, 5))
        
        self.phone_entry = tk.Entry(login_frame, font=('Arial', 12), width=20, justify='center')
        self.phone_entry.pack(pady=5)
        self.phone_entry.insert(0, "+")
        
        login_btn = tk.Button(login_frame, text="Send Code", font=('Arial', 12), 
                             bg='#0088cc', fg='white', padx=20, pady=5,
                             command=self.send_code)
        login_btn.pack(pady=20)
        
        # Status label
        self.status_label = tk.Label(login_frame, text="", font=('Arial', 10), 
                                    bg='#ffffff', fg='#666666')
        self.status_label.pack(pady=10)
    
    def send_code(self):
        phone = self.phone_entry.get().strip()
        if not phone or phone == "+":
            messagebox.showerror("Error", "Please enter a valid phone number")
            return
        
        self.status_label.config(text="Sending verification code...")
        self.root.update()
        
        try:
            self.run_async(self.client.connect())
            self.run_async(self.client.send_code_request(phone))
            self.phone_number = phone
            self.show_code_interface()
        except Exception as e:
            messagebox.showerror("Error", f"Failed to send code: {str(e)}")
            self.status_label.config(text="")
    
    def show_code_interface(self):
        # Clear window
        for widget in self.root.winfo_children():
            widget.destroy()
        
        # Code frame
        code_frame = tk.Frame(self.root, bg='#ffffff')
        code_frame.pack(expand=True, fill='both')
        
        # Logo and title
        if self.logo:
            logo_label = tk.Label(code_frame, image=self.logo, bg='#ffffff')
            logo_label.pack(pady=20)
        
        title_label = tk.Label(code_frame, text="Verification Code", font=('Arial', 20, 'bold'), 
                              bg='#ffffff', fg='#0088cc')
        title_label.pack(pady=10)
        
        info_label = tk.Label(code_frame, text=f"Enter the code sent to {self.phone_number}", 
                             font=('Arial', 12), bg='#ffffff', fg='#666666')
        info_label.pack(pady=5)
        
        # Code input
        self.code_entry = tk.Entry(code_frame, font=('Arial', 14), width=15, justify='center')
        self.code_entry.pack(pady=20)
        self.code_entry.focus()
        
        verify_btn = tk.Button(code_frame, text="Verify", font=('Arial', 12), 
                              bg='#0088cc', fg='white', padx=20, pady=5,
                              command=self.verify_code)
        verify_btn.pack(pady=10)
        
        back_btn = tk.Button(code_frame, text="Back", font=('Arial', 10), 
                            bg='#f0f0f0', fg='#333333', padx=15, pady=3,
                            command=self.show_login_interface)
        back_btn.pack(pady=5)
        
        # Status label
        self.status_label = tk.Label(code_frame, text="", font=('Arial', 10), 
                                    bg='#ffffff', fg='#666666')
        self.status_label.pack(pady=10)
    
    def verify_code(self):
        code = self.code_entry.get().strip()
        if not code:
            messagebox.showerror("Error", "Please enter the verification code")
            return
        
        self.status_label.config(text="Verifying code...")
        self.root.update()
        
        try:
            self.run_async(self.client.sign_in(self.phone_number, code))
            self.show_main_interface()
        except SessionPasswordNeededError:
            self.show_password_interface()
        except Exception as e:
            messagebox.showerror("Error", f"Invalid code: {str(e)}")
            self.status_label.config(text="")
    
    def show_password_interface(self):
        # Clear window
        for widget in self.root.winfo_children():
            widget.destroy()
        
        # Password frame
        pass_frame = tk.Frame(self.root, bg='#ffffff')
        pass_frame.pack(expand=True, fill='both')
        
        title_label = tk.Label(pass_frame, text="Two-Factor Authentication", font=('Arial', 20, 'bold'), 
                              bg='#ffffff', fg='#0088cc')
        title_label.pack(pady=20)
        
        info_label = tk.Label(pass_frame, text="Enter your cloud password", 
                             font=('Arial', 12), bg='#ffffff', fg='#666666')
        info_label.pack(pady=5)
        
        # Password input
        self.password_entry = tk.Entry(pass_frame, font=('Arial', 14), width=20, 
                                      justify='center', show='*')
        self.password_entry.pack(pady=20)
        self.password_entry.focus()
        
        verify_btn = tk.Button(pass_frame, text="Sign In", font=('Arial', 12), 
                              bg='#0088cc', fg='white', padx=20, pady=5,
                              command=self.verify_password)
        verify_btn.pack(pady=10)
        
        # Status label
        self.status_label = tk.Label(pass_frame, text="", font=('Arial', 10), 
                                    bg='#ffffff', fg='#666666')
        self.status_label.pack(pady=10)
    
    def verify_password(self):
        password = self.password_entry.get()
        if not password:
            messagebox.showerror("Error", "Please enter your password")
            return
        
        self.status_label.config(text="Signing in...")
        self.root.update()
        
        try:
            self.run_async(self.client.sign_in(password=password))
            self.show_main_interface()
        except Exception as e:
            messagebox.showerror("Error", f"Invalid password: {str(e)}")
            self.status_label.config(text="")
    
    def show_main_interface(self):
        # Clear window
        for widget in self.root.winfo_children():
            widget.destroy()
        
        # Main frame
        main_frame = tk.Frame(self.root, bg='#ffffff')
        main_frame.pack(fill='both', expand=True, padx=10, pady=10)
        
        # Top frame with logo and title
        top_frame = tk.Frame(main_frame, bg='#ffffff')
        top_frame.pack(fill='x', pady=(0, 10))
        
        if self.logo:
            logo_label = tk.Label(top_frame, image=self.logo, bg='#ffffff')
            logo_label.pack(side='left')
        
        title_label = tk.Label(top_frame, text="TeleDrive", font=('Arial', 18, 'bold'), 
                              bg='#ffffff', fg='#0088cc')
        title_label.pack(side='left', padx=(10, 0))
        
        logout_btn = tk.Button(top_frame, text="Logout", font=('Arial', 10), 
                              bg='#f0f0f0', fg='#333333', padx=15, pady=3,
                              command=self.logout)
        logout_btn.pack(side='right')
        
        # Content frame
        content_frame = tk.Frame(main_frame, bg='#ffffff')
        content_frame.pack(fill='both', expand=True)
        
        # Left panel - Channels
        left_frame = tk.Frame(content_frame, bg='#f8f8f8', width=300)
        left_frame.pack(side='left', fill='y', padx=(0, 5))
        left_frame.pack_propagate(False)
        
        channels_label = tk.Label(left_frame, text="Channels", font=('Arial', 14, 'bold'), 
                                 bg='#f8f8f8', fg='#333333')
        channels_label.pack(pady=10)
        
        # Channels listbox
        self.channels_listbox = tk.Listbox(left_frame, font=('Arial', 10), bg='white', 
                                          selectmode='single')
        self.channels_listbox.pack(fill='both', expand=True, padx=10, pady=(0, 10))
        self.channels_listbox.bind('<<ListboxSelect>>', self.on_channel_select)
        
        refresh_btn = tk.Button(left_frame, text="Refresh Channels", font=('Arial', 10), 
                               bg='#0088cc', fg='white', padx=10, pady=3,
                               command=self.load_channels)
        refresh_btn.pack(pady=(0, 10))
        
        # Right panel - Files
        right_frame = tk.Frame(content_frame, bg='#f8f8f8')
        right_frame.pack(side='right', fill='both', expand=True, padx=(5, 0))
        
        files_label = tk.Label(right_frame, text="Files", font=('Arial', 14, 'bold'), 
                              bg='#f8f8f8', fg='#333333')
        files_label.pack(pady=10)
        
        # Files treeview
        columns = ('Name', 'Size', 'Date')
        self.files_tree = ttk.Treeview(right_frame, columns=columns, show='headings', height=15)
        
        for col in columns:
            self.files_tree.heading(col, text=col)
            self.files_tree.column(col, width=150)
        
        self.files_tree.pack(fill='both', expand=True, padx=10, pady=(0, 10))
        
        # Buttons frame
        buttons_frame = tk.Frame(right_frame, bg='#f8f8f8')
        buttons_frame.pack(fill='x', padx=10, pady=(0, 10))
        
        download_btn = tk.Button(buttons_frame, text="Download Selected", font=('Arial', 10), 
                                bg='#28a745', fg='white', padx=15, pady=5,
                                command=self.download_file)
        download_btn.pack(side='left', padx=(0, 10))
        
        upload_btn = tk.Button(buttons_frame, text="Upload File", font=('Arial', 10), 
                              bg='#007bff', fg='white', padx=15, pady=5,
                              command=self.upload_file)
        upload_btn.pack(side='left')
        
        # Load channels
        self.load_channels()
    
    def load_channels(self):
        try:
            self.channels = self.run_async(self.get_channels())
            self.channels_listbox.delete(0, tk.END)
            for channel in self.channels:
                self.channels_listbox.insert(tk.END, channel.title)
        except Exception as e:
            messagebox.showerror("Error", f"Failed to load channels: {str(e)}")
    
    async def get_channels(self):
        channels = []
        async for dialog in self.client.iter_dialogs():
            if dialog.is_channel:
                channels.append(dialog.entity)
        return channels
    
    def on_channel_select(self, event):
        selection = self.channels_listbox.curselection()
        if selection:
            index = selection[0]
            self.current_channel = self.channels[index]
            self.load_files()
    
    def load_files(self):
        if not self.current_channel:
            return
        
        try:
            self.files = self.run_async(self.get_files())
            
            # Clear treeview
            for item in self.files_tree.get_children():
                self.files_tree.delete(item)
            
            # Add files to treeview
            for file_info in self.files:
                self.files_tree.insert('', 'end', values=file_info)
                
        except Exception as e:
            messagebox.showerror("Error", f"Failed to load files: {str(e)}")
    
    async def get_files(self):
        files = []
        async for message in self.client.iter_messages(self.current_channel, limit=100):
            if message.document:
                file_name = getattr(message.document, 'file_name', None) or f"file_{message.id}"
                file_size = self.format_size(message.document.size)
                file_date = message.date.strftime("%Y-%m-%d %H:%M")
                files.append((file_name, file_size, file_date, message))
        return files
    
    def format_size(self, size):
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024:
                return f"{size:.1f} {unit}"
            size /= 1024
        return f"{size:.1f} TB"
    
    def download_file(self):
        selection = self.files_tree.selection()
        if not selection:
            messagebox.showwarning("Warning", "Please select a file to download")
            return
        
        item = self.files_tree.item(selection[0])
        file_info = None
        
        # Find the corresponding file info
        for info in self.files:
            if info[0] == item['values'][0]:  # Match by filename
                file_info = info
                break
        
        if not file_info:
            messagebox.showerror("Error", "File information not found")
            return
        
        # Ask for download location
        download_path = filedialog.askdirectory(title="Select Download Location")
        if not download_path:
            return
        
        try:
            message = file_info[3]  # The message object
            file_path = os.path.join(download_path, file_info[0])
            
            # Show progress
            progress_window = tk.Toplevel(self.root)
            progress_window.title("Downloading...")
            progress_window.geometry("300x100")
            progress_window.configure(bg='#ffffff')
            
            progress_label = tk.Label(progress_window, text=f"Downloading {file_info[0]}", 
                                     bg='#ffffff', font=('Arial', 10))
            progress_label.pack(pady=10)
            
            progress_bar = ttk.Progressbar(progress_window, mode='indeterminate')
            progress_bar.pack(pady=10, padx=20, fill='x')
            progress_bar.start()
            
            # Download in separate thread
            def download_thread():
                try:
                    self.run_async(self.client.download_media(message, file_path))
                    progress_window.destroy()
                    messagebox.showinfo("Success", f"File downloaded to {file_path}")
                except Exception as e:
                    progress_window.destroy()
                    messagebox.showerror("Error", f"Download failed: {str(e)}")
            
            threading.Thread(target=download_thread, daemon=True).start()
            
        except Exception as e:
            messagebox.showerror("Error", f"Download failed: {str(e)}")
    
    def upload_file(self):
        if not self.current_channel:
            messagebox.showwarning("Warning", "Please select a channel first")
            return
        
        file_path = filedialog.askopenfilename(title="Select File to Upload")
        if not file_path:
            return
        
        try:
            # Show progress
            progress_window = tk.Toplevel(self.root)
            progress_window.title("Uploading...")
            progress_window.geometry("300x100")
            progress_window.configure(bg='#ffffff')
            
            progress_label = tk.Label(progress_window, text=f"Uploading {os.path.basename(file_path)}", 
                                     bg='#ffffff', font=('Arial', 10))
            progress_label.pack(pady=10)
            
            progress_bar = ttk.Progressbar(progress_window, mode='indeterminate')
            progress_bar.pack(pady=10, padx=20, fill='x')
            progress_bar.start()
            
            # Upload in separate thread
            def upload_thread():
                try:
                    self.run_async(self.client.send_file(self.current_channel, file_path))
                    progress_window.destroy()
                    messagebox.showinfo("Success", "File uploaded successfully")
                    self.load_files()  # Refresh file list
                except Exception as e:
                    progress_window.destroy()
                    messagebox.showerror("Error", f"Upload failed: {str(e)}")
            
            threading.Thread(target=upload_thread, daemon=True).start()
            
        except Exception as e:
            messagebox.showerror("Error", f"Upload failed: {str(e)}")
    
    def logout(self):
        try:
            self.run_async(self.client.log_out())
            # Remove session file
            if os.path.exists(f"{SESSION_NAME}.session"):
                os.remove(f"{SESSION_NAME}.session")
            self.show_login_interface()
        except Exception as e:
            messagebox.showerror("Error", f"Logout failed: {str(e)}")
    
    def run(self):
        try:
            self.root.mainloop()
        finally:
            self.loop.call_soon_threadsafe(self.loop.stop)

if __name__ == "__main__":
    app = TeleDriveApp()
    app.run()
