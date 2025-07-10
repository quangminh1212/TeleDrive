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
        self.root.minsize(800, 600)
        
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

        # Main container with gradient-like background
        main_container = tk.Frame(self.root, bg='#f5f5f5')
        main_container.pack(expand=True, fill='both')

        # Center card frame
        card_frame = tk.Frame(main_container, bg='#ffffff', relief='flat', bd=0)
        card_frame.place(relx=0.5, rely=0.5, anchor='center')

        # Add subtle shadow effect with multiple frames
        shadow_frame3 = tk.Frame(main_container, bg='#e8e8e8', relief='flat', bd=0)
        shadow_frame3.place(relx=0.5, rely=0.5, anchor='center',
                           width=420, height=520)

        shadow_frame2 = tk.Frame(main_container, bg='#f0f0f0', relief='flat', bd=0)
        shadow_frame2.place(relx=0.5, rely=0.5, anchor='center',
                           width=415, height=515)

        shadow_frame1 = tk.Frame(main_container, bg='#f8f8f8', relief='flat', bd=0)
        shadow_frame1.place(relx=0.5, rely=0.5, anchor='center',
                           width=410, height=510)

        # Main card
        card_frame.configure(width=400, height=500)
        card_frame.pack_propagate(False)

        # Content frame with padding
        content_frame = tk.Frame(card_frame, bg='#ffffff')
        content_frame.pack(expand=True, fill='both', padx=40, pady=50)

        # Logo with better sizing
        if self.logo:
            # Create larger logo
            try:
                image = Image.open('teledrive.png')
                image = image.resize((120, 120), Image.Resampling.LANCZOS)
                self.large_logo = ImageTk.PhotoImage(image)
                logo_label = tk.Label(content_frame, image=self.large_logo, bg='#ffffff')
                logo_label.pack(pady=(0, 25))
            except:
                logo_label = tk.Label(content_frame, text="📱", font=('Segoe UI', 48),
                                     bg='#ffffff', fg='#40a7e3')
                logo_label.pack(pady=(0, 25))

        # App name
        app_name = tk.Label(content_frame, text="TeleDrive",
                           font=('Segoe UI', 28, 'normal'), bg='#ffffff', fg='#2c2c2c')
        app_name.pack(pady=(0, 5))

        # Subtitle with better typography
        subtitle_label = tk.Label(content_frame,
                                 text="Telegram Channel File Manager\nFast and secure.",
                                 font=('Segoe UI', 11), bg='#ffffff', fg='#8e8e93',
                                 justify='center', height=3)
        subtitle_label.pack(pady=(0, 35))

        # Phone input container
        input_container = tk.Frame(content_frame, bg='#ffffff')
        input_container.pack(fill='x', pady=(0, 25))

        # Phone input with modern styling
        phone_bg_frame = tk.Frame(input_container, bg='#f7f7f7', relief='flat', bd=0)
        phone_bg_frame.pack(fill='x', ipady=2)

        input_frame = tk.Frame(phone_bg_frame, bg='#f7f7f7')
        input_frame.pack(expand=True, fill='x', padx=15, pady=12)

        # Country code with better styling
        self.country_entry = tk.Entry(input_frame, font=('Segoe UI', 14), width=5,
                                     justify='center', relief='flat', bd=0, bg='#f7f7f7',
                                     fg='#2c2c2c', insertbackground='#40a7e3')
        self.country_entry.pack(side='left', padx=(0, 8))
        self.country_entry.insert(0, "+84")

        # Separator
        separator = tk.Frame(input_frame, width=1, height=20, bg='#d1d1d6')
        separator.pack(side='left', padx=(0, 8))

        # Phone number entry with placeholder effect
        self.phone_entry = tk.Entry(input_frame, font=('Segoe UI', 14),
                                   relief='flat', bd=0, bg='#f7f7f7',
                                   fg='#2c2c2c', insertbackground='#40a7e3')
        self.phone_entry.pack(side='left', fill='x', expand=True)
        self.phone_entry.insert(0, "Phone number")
        self.phone_entry.config(fg='#8e8e93')

        # Bind focus events for placeholder
        def on_phone_focus_in(event):
            if self.phone_entry.get() == "Phone number":
                self.phone_entry.delete(0, tk.END)
                self.phone_entry.config(fg='#2c2c2c')

        def on_phone_focus_out(event):
            if not self.phone_entry.get():
                self.phone_entry.insert(0, "Phone number")
                self.phone_entry.config(fg='#8e8e93')

        self.phone_entry.bind('<FocusIn>', on_phone_focus_in)
        self.phone_entry.bind('<FocusOut>', on_phone_focus_out)

        # Start Messaging button with modern design
        self.start_btn = tk.Button(content_frame, text="Start Messaging",
                                  font=('Segoe UI', 12, 'normal'),
                                  bg='#40a7e3', fg='white', relief='flat', bd=0,
                                  padx=30, pady=15, cursor='hand2',
                                  command=self.send_code)
        self.start_btn.pack(fill='x', pady=(0, 15))

        # Add hover effect
        def on_enter(e):
            self.start_btn.config(bg='#3d9cdb')
        def on_leave(e):
            self.start_btn.config(bg='#40a7e3')

        self.start_btn.bind("<Enter>", on_enter)
        self.start_btn.bind("<Leave>", on_leave)

        # Status label with better styling
        self.status_label = tk.Label(content_frame, text="", font=('Segoe UI', 10),
                                    bg='#ffffff', fg='#ff3b30', justify='center')
        self.status_label.pack(pady=(5, 0))

        # Bind Enter key
        self.phone_entry.bind('<Return>', lambda e: self.send_code())
        self.country_entry.bind('<Return>', lambda e: self.phone_entry.focus())

        # Focus on phone entry initially
        self.root.after(100, lambda: self.phone_entry.focus())
    
    def send_code(self):
        country_code = self.country_entry.get().strip()
        phone = self.phone_entry.get().strip()

        # Check placeholder text
        if phone == "Phone number":
            phone = ""

        if not country_code or not phone:
            self.status_label.config(text="Please enter your phone number")
            return

        full_phone = country_code + phone
        self.status_label.config(text="Sending verification code...")
        self.start_btn.config(state='disabled', text="Sending...", bg='#a0a0a0')
        self.root.update()

        try:
            self.run_async(self.client.connect())
            self.run_async(self.client.send_code_request(full_phone))
            self.phone_number = full_phone
            self.show_code_interface()
        except Exception as e:
            self.status_label.config(text=f"Error: {str(e)}")
            self.start_btn.config(state='normal', text="Start Messaging", bg='#40a7e3')
    
    def show_code_interface(self):
        # Clear window
        for widget in self.root.winfo_children():
            widget.destroy()

        # Main container with gradient-like background
        main_container = tk.Frame(self.root, bg='#f5f5f5')
        main_container.pack(expand=True, fill='both')

        # Center card frame with shadow
        shadow_frame3 = tk.Frame(main_container, bg='#e8e8e8', relief='flat', bd=0)
        shadow_frame3.place(relx=0.5, rely=0.5, anchor='center',
                           width=420, height=520)

        shadow_frame2 = tk.Frame(main_container, bg='#f0f0f0', relief='flat', bd=0)
        shadow_frame2.place(relx=0.5, rely=0.5, anchor='center',
                           width=415, height=515)

        shadow_frame1 = tk.Frame(main_container, bg='#f8f8f8', relief='flat', bd=0)
        shadow_frame1.place(relx=0.5, rely=0.5, anchor='center',
                           width=410, height=510)

        card_frame = tk.Frame(main_container, bg='#ffffff', relief='flat', bd=0)
        card_frame.place(relx=0.5, rely=0.5, anchor='center')
        card_frame.configure(width=400, height=500)
        card_frame.pack_propagate(False)

        # Content frame with padding
        content_frame = tk.Frame(card_frame, bg='#ffffff')
        content_frame.pack(expand=True, fill='both', padx=40, pady=50)

        # Logo
        if hasattr(self, 'large_logo'):
            logo_label = tk.Label(content_frame, image=self.large_logo, bg='#ffffff')
            logo_label.pack(pady=(0, 25))
        else:
            logo_label = tk.Label(content_frame, text="📱", font=('Segoe UI', 48),
                                 bg='#ffffff', fg='#40a7e3')
            logo_label.pack(pady=(0, 25))

        # Phone number display
        phone_label = tk.Label(content_frame, text=f"{self.phone_number}",
                              font=('Segoe UI', 18, 'normal'), bg='#ffffff', fg='#2c2c2c')
        phone_label.pack(pady=(0, 10))

        # Subtitle
        subtitle_label = tk.Label(content_frame,
                                 text="We have sent you a code via SMS.\nPlease enter it below.",
                                 font=('Segoe UI', 11), bg='#ffffff', fg='#8e8e93',
                                 justify='center', height=3)
        subtitle_label.pack(pady=(0, 35))

        # Code input container
        code_container = tk.Frame(content_frame, bg='#ffffff')
        code_container.pack(fill='x', pady=(0, 25))

        # Code input with modern styling
        code_bg_frame = tk.Frame(code_container, bg='#f7f7f7', relief='flat', bd=0)
        code_bg_frame.pack(fill='x', ipady=2)

        code_input_frame = tk.Frame(code_bg_frame, bg='#f7f7f7')
        code_input_frame.pack(expand=True, fill='x', padx=15, pady=12)

        # Code entry
        self.code_entry = tk.Entry(code_input_frame, font=('Segoe UI', 16),
                                  justify='center', relief='flat', bd=0, bg='#f7f7f7',
                                  fg='#2c2c2c', insertbackground='#40a7e3')
        self.code_entry.pack(fill='x', expand=True)
        self.code_entry.insert(0, "Verification code")
        self.code_entry.config(fg='#8e8e93')

        # Bind focus events for placeholder
        def on_code_focus_in(event):
            if self.code_entry.get() == "Verification code":
                self.code_entry.delete(0, tk.END)
                self.code_entry.config(fg='#2c2c2c')

        def on_code_focus_out(event):
            if not self.code_entry.get():
                self.code_entry.insert(0, "Verification code")
                self.code_entry.config(fg='#8e8e93')

        self.code_entry.bind('<FocusIn>', on_code_focus_in)
        self.code_entry.bind('<FocusOut>', on_code_focus_out)

        # Verify button
        self.verify_btn = tk.Button(content_frame, text="Continue",
                                   font=('Segoe UI', 12, 'normal'),
                                   bg='#40a7e3', fg='white', relief='flat', bd=0,
                                   padx=30, pady=15, cursor='hand2',
                                   command=self.verify_code)
        self.verify_btn.pack(fill='x', pady=(0, 15))

        # Add hover effect
        def on_enter(e):
            self.verify_btn.config(bg='#3d9cdb')
        def on_leave(e):
            self.verify_btn.config(bg='#40a7e3')

        self.verify_btn.bind("<Enter>", on_enter)
        self.verify_btn.bind("<Leave>", on_leave)

        # Back button
        back_btn = tk.Button(content_frame, text="← Edit Phone Number",
                            font=('Segoe UI', 10), bg='#ffffff', fg='#40a7e3',
                            relief='flat', bd=0, cursor='hand2',
                            command=self.show_login_interface)
        back_btn.pack(pady=(0, 10))

        # Status label
        self.status_label = tk.Label(content_frame, text="", font=('Segoe UI', 10),
                                    bg='#ffffff', fg='#ff3b30', justify='center')
        self.status_label.pack(pady=(5, 0))

        # Bind Enter key
        self.code_entry.bind('<Return>', lambda e: self.verify_code())

        # Focus on code entry initially
        self.root.after(100, lambda: self.code_entry.focus())
    
    def verify_code(self):
        code = self.code_entry.get().strip()

        # Check placeholder text
        if code == "Verification code":
            code = ""

        if not code:
            self.status_label.config(text="Please enter the verification code")
            return

        self.status_label.config(text="Verifying code...")
        self.verify_btn.config(state='disabled', text="Verifying...", bg='#a0a0a0')
        self.root.update()

        try:
            self.run_async(self.client.sign_in(self.phone_number, code))
            self.show_main_interface()
        except SessionPasswordNeededError:
            self.show_password_interface()
        except Exception as e:
            self.status_label.config(text="Invalid code. Please try again.")
            self.verify_btn.config(state='normal', text="Continue", bg='#40a7e3')
            self.code_entry.delete(0, tk.END)
            self.code_entry.insert(0, "Verification code")
            self.code_entry.config(fg='#8e8e93')
            self.code_entry.focus()
    
    def show_password_interface(self):
        # Clear window
        for widget in self.root.winfo_children():
            widget.destroy()

        # Main container
        main_container = tk.Frame(self.root, bg='#ffffff')
        main_container.pack(expand=True, fill='both')

        # Center frame
        center_frame = tk.Frame(main_container, bg='#ffffff')
        center_frame.place(relx=0.5, rely=0.5, anchor='center')

        # Logo
        if self.logo:
            logo_label = tk.Label(center_frame, image=self.logo, bg='#ffffff')
            logo_label.pack(pady=(0, 30))

        # Title
        title_label = tk.Label(center_frame, text="Two-Step Verification",
                              font=('Segoe UI', 20), bg='#ffffff', fg='#000000')
        title_label.pack(pady=(0, 8))

        # Subtitle
        subtitle_label = tk.Label(center_frame,
                                 text="Your account is protected with\nan additional password.",
                                 font=('Segoe UI', 11), bg='#ffffff', fg='#707579',
                                 justify='center')
        subtitle_label.pack(pady=(0, 30))

        # Password input frame
        password_frame = tk.Frame(center_frame, bg='#ffffff')
        password_frame.pack(pady=(0, 20))

        # Password entry
        self.password_entry = tk.Entry(password_frame, font=('Segoe UI', 14), width=20,
                                      justify='center', show='•', relief='flat', bd=0,
                                      highlightthickness=1, highlightcolor='#40a7e3',
                                      highlightbackground='#dadce0')
        self.password_entry.pack(ipady=10)
        self.password_entry.focus()

        # Underline effect
        underline_frame = tk.Frame(password_frame, height=1, bg='#dadce0')
        underline_frame.pack(fill='x', pady=(2, 0))

        # Next button
        self.password_btn = tk.Button(center_frame, text="NEXT", font=('Segoe UI', 10, 'bold'),
                                     bg='#40a7e3', fg='white', relief='flat', bd=0,
                                     padx=40, pady=12, cursor='hand2',
                                     command=self.verify_password)
        self.password_btn.pack(pady=(20, 0))

        # Status label
        self.status_label = tk.Label(center_frame, text="", font=('Segoe UI', 9),
                                    bg='#ffffff', fg='#e53935')
        self.status_label.pack(pady=(15, 0))

        # Bind Enter key
        self.password_entry.bind('<Return>', lambda e: self.verify_password())
    
    def verify_password(self):
        password = self.password_entry.get()
        if not password:
            self.status_label.config(text="Please enter your password")
            return

        self.status_label.config(text="Signing in...")
        self.password_btn.config(state='disabled', text="SIGNING IN...")
        self.root.update()

        try:
            self.run_async(self.client.sign_in(password=password))
            self.show_main_interface()
        except Exception as e:
            self.status_label.config(text="Invalid password. Please try again.")
            self.password_btn.config(state='normal', text="NEXT")
            self.password_entry.delete(0, tk.END)
            self.password_entry.focus()
    
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
