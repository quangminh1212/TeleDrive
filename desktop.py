#!/usr/bin/env python3
"""
TeleDrive - Desktop App for Telegram Channel File Management
"""

import customtkinter as ctk
import tkinter as tk
from tkinter import filedialog, messagebox
import threading
import asyncio
import os
import sys
from pathlib import Path

# Import our core functionality
from core import get_teledrive_instance

# Configure CustomTkinter
ctk.set_appearance_mode("light")
ctk.set_default_color_theme("blue")

class TeleDriveApp:
    """Main TeleDrive Desktop Application"""
    
    def __init__(self):
        # Initialize main window
        self.root = ctk.CTk()
        self.root.title("TeleDrive - Telegram File Manager")
        self.root.geometry("1200x800")
        self.root.minsize(1000, 600)
        
        # Initialize variables
        self.teledrive = get_teledrive_instance()
        self.connection_status = {"connected": False, "user": None}
        self.current_channel = ""
        self.current_files = []
        self.selected_files = []
        
        # Create UI
        self.create_ui()
        self.check_connection_status()
    
    def create_ui(self):
        """Create the main UI layout"""
        # Configure grid
        self.root.grid_columnconfigure(1, weight=1)
        self.root.grid_rowconfigure(1, weight=1)
        
        # Create header
        self.create_header()
        
        # Create sidebar
        self.create_sidebar()
        
        # Create main content area
        self.create_main_content()
        
        # Create status bar
        self.create_status_bar()
    
    def create_header(self):
        """Create the header bar"""
        self.header_frame = ctk.CTkFrame(self.root, height=60, corner_radius=0)
        self.header_frame.grid(row=0, column=0, columnspan=2, sticky="ew")
        self.header_frame.grid_columnconfigure(1, weight=1)
        
        # Logo
        logo_label = ctk.CTkLabel(
            self.header_frame, 
            text="📁 TeleDrive", 
            font=ctk.CTkFont(size=20, weight="bold")
        )
        logo_label.grid(row=0, column=0, sticky="w", padx=20, pady=15)
        
        # Connection controls
        controls = ctk.CTkFrame(self.header_frame, fg_color="transparent")
        controls.grid(row=0, column=1, sticky="e", padx=20, pady=15)
        
        self.status_label = ctk.CTkLabel(
            controls, 
            text="● Disconnected", 
            text_color="red",
            font=ctk.CTkFont(size=12)
        )
        self.status_label.pack(side="left", padx=(0, 10))
        
        self.connect_btn = ctk.CTkButton(
            controls,
            text="Connect",
            width=100,
            command=self.toggle_connection
        )
        self.connect_btn.pack(side="left")
    
    def create_sidebar(self):
        """Create the navigation sidebar"""
        self.sidebar_frame = ctk.CTkFrame(self.root, width=200, corner_radius=0)
        self.sidebar_frame.grid(row=1, column=0, sticky="nsw")
        
        # Navigation buttons
        nav_items = [
            ("🏠 Dashboard", self.show_dashboard),
            ("📁 Files", self.show_files),
            ("⬆️ Upload", self.show_upload),
            ("⚙️ Settings", self.show_settings)
        ]
        
        self.nav_buttons = []
        for i, (text, command) in enumerate(nav_items):
            btn = ctk.CTkButton(
                self.sidebar_frame,
                text=text,
                width=180,
                height=40,
                corner_radius=8,
                command=command,
                anchor="w"
            )
            btn.grid(row=i, column=0, padx=10, pady=5, sticky="ew")
            self.nav_buttons.append(btn)
        
        # Set dashboard as active initially
        self.set_active_nav(0)
    
    def create_main_content(self):
        """Create the main content area"""
        self.main_frame = ctk.CTkFrame(self.root, corner_radius=0)
        self.main_frame.grid(row=1, column=1, sticky="nsew")
        self.main_frame.grid_columnconfigure(0, weight=1)
        self.main_frame.grid_rowconfigure(0, weight=1)
        
        # Create pages
        self.pages = {}
        self.create_dashboard_page()
        self.create_files_page()
        self.create_upload_page()
        self.create_settings_page()
        
        # Show dashboard initially
        self.show_dashboard()
    
    def create_status_bar(self):
        """Create the status bar"""
        self.status_frame = ctk.CTkFrame(self.root, height=30, corner_radius=0)
        self.status_frame.grid(row=2, column=0, columnspan=2, sticky="ew")
        
        self.status_text = ctk.CTkLabel(
            self.status_frame, 
            text="Ready", 
            font=ctk.CTkFont(size=11)
        )
        self.status_text.pack(side="left", padx=10, pady=5)
    
    def create_dashboard_page(self):
        """Create the dashboard page"""
        page = ctk.CTkScrollableFrame(self.main_frame)
        self.pages["dashboard"] = page
        
        # Welcome section
        welcome_frame = ctk.CTkFrame(page)
        welcome_frame.pack(fill="x", padx=20, pady=20)
        
        title = ctk.CTkLabel(
            welcome_frame,
            text="Welcome to TeleDrive",
            font=ctk.CTkFont(size=28, weight="bold")
        )
        title.pack(pady=20)
        
        subtitle = ctk.CTkLabel(
            welcome_frame,
            text="Modern Telegram Channel File Management",
            font=ctk.CTkFont(size=14),
            text_color="gray"
        )
        subtitle.pack(pady=(0, 20))
        
        # User info
        self.user_info_frame = ctk.CTkFrame(welcome_frame)
        self.user_info_frame.pack(pady=(0, 20))
        
        self.user_info_label = ctk.CTkLabel(
            self.user_info_frame,
            text="Connect to Telegram to get started",
            font=ctk.CTkFont(size=14)
        )
        self.user_info_label.pack(pady=20)
        
        # Quick actions
        actions_frame = ctk.CTkFrame(page)
        actions_frame.pack(fill="x", padx=20, pady=(0, 20))
        
        actions_title = ctk.CTkLabel(
            actions_frame,
            text="Quick Actions",
            font=ctk.CTkFont(size=20, weight="bold")
        )
        actions_title.pack(pady=(20, 10))
        
        # Action buttons
        buttons_frame = ctk.CTkFrame(actions_frame, fg_color="transparent")
        buttons_frame.pack(fill="x", padx=20, pady=(0, 20))
        
        for i in range(3):
            buttons_frame.grid_columnconfigure(i, weight=1)
        
        # Action cards
        cards = [
            ("📁 Browse Files", "View files in channels", self.show_files),
            ("⬆️ Upload Files", "Upload files to channels", self.show_upload),
            ("🔍 Search Files", "Find specific files", self.show_files)
        ]
        
        for i, (title, desc, command) in enumerate(cards):
            card = ctk.CTkFrame(buttons_frame)
            card.grid(row=0, column=i, padx=10, pady=10, sticky="ew")
            
            card_title = ctk.CTkLabel(card, text=title, font=ctk.CTkFont(size=16, weight="bold"))
            card_title.pack(pady=(20, 5))
            
            card_desc = ctk.CTkLabel(card, text=desc, font=ctk.CTkFont(size=12), text_color="gray")
            card_desc.pack(pady=(0, 10))
            
            card_btn = ctk.CTkButton(card, text="Open", command=command)
            card_btn.pack(pady=(0, 20))
    
    def create_files_page(self):
        """Create the files page"""
        page = ctk.CTkFrame(self.main_frame)
        self.pages["files"] = page
        page.grid_columnconfigure(0, weight=1)
        page.grid_rowconfigure(2, weight=1)
        
        # Header
        header = ctk.CTkFrame(page)
        header.grid(row=0, column=0, sticky="ew", padx=20, pady=20)
        header.grid_columnconfigure(1, weight=1)
        
        title = ctk.CTkLabel(header, text="Channel Files", font=ctk.CTkFont(size=24, weight="bold"))
        title.grid(row=0, column=0, sticky="w", padx=20, pady=20)
        
        # Channel controls
        controls = ctk.CTkFrame(header, fg_color="transparent")
        controls.grid(row=0, column=1, sticky="e", padx=20, pady=20)
        
        self.channel_entry = ctk.CTkEntry(controls, placeholder_text="@channel", width=200)
        self.channel_entry.pack(side="left", padx=(0, 10))
        
        load_btn = ctk.CTkButton(controls, text="Load Files", command=self.load_files)
        load_btn.pack(side="left")
        
        # Search
        search_frame = ctk.CTkFrame(page)
        search_frame.grid(row=1, column=0, sticky="ew", padx=20, pady=(0, 10))
        
        self.search_entry = ctk.CTkEntry(search_frame, placeholder_text="Search files...", width=300)
        self.search_entry.pack(side="left", padx=20, pady=10)
        self.search_entry.bind("<KeyRelease>", self.on_search_change)
        
        refresh_btn = ctk.CTkButton(search_frame, text="🔄 Refresh", command=self.refresh_files)
        refresh_btn.pack(side="right", padx=20, pady=10)
        
        # Files list
        self.files_frame = ctk.CTkScrollableFrame(page)
        self.files_frame.grid(row=2, column=0, sticky="nsew", padx=20, pady=(0, 20))
        
        self.show_empty_files_state()

    def create_upload_page(self):
        """Create the upload page"""
        page = ctk.CTkScrollableFrame(self.main_frame)
        self.pages["upload"] = page

        # Title
        title = ctk.CTkLabel(page, text="Upload Files", font=ctk.CTkFont(size=24, weight="bold"))
        title.pack(pady=20)

        # Channel input
        channel_frame = ctk.CTkFrame(page)
        channel_frame.pack(fill="x", padx=20, pady=10)

        channel_label = ctk.CTkLabel(channel_frame, text="Target Channel:", font=ctk.CTkFont(size=14, weight="bold"))
        channel_label.pack(anchor="w", padx=20, pady=(15, 5))

        self.upload_channel_entry = ctk.CTkEntry(channel_frame, placeholder_text="@channel", width=300)
        self.upload_channel_entry.pack(anchor="w", padx=20, pady=(0, 15))

        # File selection
        files_frame = ctk.CTkFrame(page)
        files_frame.pack(fill="x", padx=20, pady=10)

        files_label = ctk.CTkLabel(files_frame, text="Select Files:", font=ctk.CTkFont(size=14, weight="bold"))
        files_label.pack(anchor="w", padx=20, pady=(15, 5))

        select_btn = ctk.CTkButton(files_frame, text="📁 Select Files", command=self.select_files)
        select_btn.pack(anchor="w", padx=20, pady=(0, 10))

        # Selected files list
        self.selected_files_frame = ctk.CTkScrollableFrame(files_frame, height=150)
        self.selected_files_frame.pack(fill="x", padx=20, pady=(0, 15))

        self.update_selected_files_display()

        # Caption
        caption_frame = ctk.CTkFrame(page)
        caption_frame.pack(fill="x", padx=20, pady=10)

        caption_label = ctk.CTkLabel(caption_frame, text="Caption (Optional):", font=ctk.CTkFont(size=14, weight="bold"))
        caption_label.pack(anchor="w", padx=20, pady=(15, 5))

        self.caption_text = ctk.CTkTextbox(caption_frame, height=80)
        self.caption_text.pack(fill="x", padx=20, pady=(0, 15))

        # Upload button
        upload_btn = ctk.CTkButton(page, text="⬆️ Upload Files", height=40, command=self.upload_files)
        upload_btn.pack(pady=20)

        # Progress
        self.upload_progress = ctk.CTkProgressBar(page)
        self.upload_progress.pack(fill="x", padx=20, pady=10)
        self.upload_progress.set(0)

        self.upload_status = ctk.CTkLabel(page, text="", font=ctk.CTkFont(size=12))
        self.upload_status.pack(pady=(0, 20))

    def create_settings_page(self):
        """Create the settings page"""
        page = ctk.CTkScrollableFrame(self.main_frame)
        self.pages["settings"] = page

        # Title
        title = ctk.CTkLabel(page, text="Settings", font=ctk.CTkFont(size=24, weight="bold"))
        title.pack(pady=20)

        # API Configuration
        api_frame = ctk.CTkFrame(page)
        api_frame.pack(fill="x", padx=20, pady=10)

        api_title = ctk.CTkLabel(api_frame, text="Telegram API Configuration", font=ctk.CTkFont(size=16, weight="bold"))
        api_title.pack(anchor="w", padx=20, pady=(15, 10))

        # API ID
        api_id_label = ctk.CTkLabel(api_frame, text="API ID:")
        api_id_label.pack(anchor="w", padx=20, pady=(5, 0))

        self.api_id_entry = ctk.CTkEntry(api_frame, width=300)
        self.api_id_entry.pack(anchor="w", padx=20, pady=(0, 10))

        # API Hash
        api_hash_label = ctk.CTkLabel(api_frame, text="API Hash:")
        api_hash_label.pack(anchor="w", padx=20, pady=(5, 0))

        self.api_hash_entry = ctk.CTkEntry(api_frame, width=300)
        self.api_hash_entry.pack(anchor="w", padx=20, pady=(0, 10))

        # Phone Number
        phone_label = ctk.CTkLabel(api_frame, text="Phone Number:")
        phone_label.pack(anchor="w", padx=20, pady=(5, 0))

        self.phone_entry = ctk.CTkEntry(api_frame, width=300, placeholder_text="+1234567890")
        self.phone_entry.pack(anchor="w", padx=20, pady=(0, 15))

        # Save button
        save_btn = ctk.CTkButton(api_frame, text="💾 Save Configuration", command=self.save_settings)
        save_btn.pack(anchor="w", padx=20, pady=(0, 15))

        # Theme
        theme_frame = ctk.CTkFrame(page)
        theme_frame.pack(fill="x", padx=20, pady=10)

        theme_title = ctk.CTkLabel(theme_frame, text="Appearance", font=ctk.CTkFont(size=16, weight="bold"))
        theme_title.pack(anchor="w", padx=20, pady=(15, 10))

        theme_label = ctk.CTkLabel(theme_frame, text="Theme:")
        theme_label.pack(anchor="w", padx=20, pady=(5, 0))

        self.theme_var = ctk.StringVar(value="light")
        theme_menu = ctk.CTkOptionMenu(theme_frame, values=["light", "dark"], variable=self.theme_var, command=self.change_theme)
        theme_menu.pack(anchor="w", padx=20, pady=(0, 15))

        # Load current settings
        self.load_settings()

    # Event handlers and utility methods
    def set_active_nav(self, index):
        """Set active navigation button"""
        for i, btn in enumerate(self.nav_buttons):
            if i == index:
                btn.configure(fg_color=("gray75", "gray25"))
            else:
                btn.configure(fg_color=("gray90", "gray20"))

    def show_page(self, page_name, nav_index):
        """Show a specific page"""
        # Hide all pages
        for page in self.pages.values():
            page.grid_remove()

        # Show selected page
        if page_name in self.pages:
            self.pages[page_name].grid(row=0, column=0, sticky="nsew")

        # Update navigation
        self.set_active_nav(nav_index)

    def show_dashboard(self):
        self.show_page('dashboard', 0)
        self.update_status("Dashboard")

    def show_files(self):
        self.show_page('files', 1)
        self.update_status("Files")

    def show_upload(self):
        self.show_page('upload', 2)
        self.update_status("Upload")

    def show_settings(self):
        self.show_page('settings', 3)
        self.update_status("Settings")

    def update_status(self, message):
        """Update status bar message"""
        if hasattr(self, 'status_text'):
            self.status_text.configure(text=message)
            self.root.update_idletasks()

    def run_async(self, coro):
        """Run async function in thread"""
        def run():
            try:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                result = loop.run_until_complete(coro)
                loop.close()
                return result
            except Exception as e:
                self.root.after(0, lambda: messagebox.showerror("Error", str(e)))
                return None

        thread = threading.Thread(target=run, daemon=True)
        thread.start()
        return thread

    def check_connection_status(self):
        """Check initial connection status"""
        def check():
            try:
                session_file = Path("teledrive_session.session")
                if session_file.exists():
                    self.root.after(0, lambda: self.update_connection_status(True, {"first_name": "User"}))
                else:
                    self.root.after(0, lambda: self.update_connection_status(False, None))
            except Exception as e:
                print(f"Error checking connection: {e}")

        threading.Thread(target=check, daemon=True).start()

    def update_connection_status(self, connected, user_info):
        """Update connection status UI"""
        self.connection_status = {"connected": connected, "user": user_info}

        if connected:
            self.status_label.configure(text="● Connected", text_color="green")
            self.connect_btn.configure(text="Disconnect")

            if user_info:
                user_text = f"Connected as: {user_info.get('first_name', 'User')}"
                self.user_info_label.configure(text=user_text)
        else:
            self.status_label.configure(text="● Disconnected", text_color="red")
            self.connect_btn.configure(text="Connect")
            self.user_info_label.configure(text="Connect to Telegram to get started")

    def toggle_connection(self):
        """Toggle Telegram connection"""
        if self.connection_status["connected"]:
            self.disconnect_telegram()
        else:
            self.connect_telegram()

    def connect_telegram(self):
        """Connect to Telegram"""
        self.update_status("Connecting to Telegram...")
        self.connect_btn.configure(state="disabled")

        async def connect():
            try:
                result = await self.teledrive.connect()
                self.root.after(0, lambda: self.on_connect_result(result))
            except Exception as e:
                self.root.after(0, lambda: self.on_connect_error(str(e)))

        self.run_async(connect())

    def disconnect_telegram(self):
        """Disconnect from Telegram"""
        self.update_status("Disconnecting...")
        self.connect_btn.configure(state="disabled")

        async def disconnect():
            try:
                await self.teledrive.disconnect()
                self.root.after(0, lambda: self.on_disconnect_result())
            except Exception as e:
                self.root.after(0, lambda: self.on_disconnect_error(str(e)))

        self.run_async(disconnect())

    def on_connect_result(self, result):
        """Handle connection result"""
        self.connect_btn.configure(state="normal")

        if result["success"]:
            self.update_connection_status(True, result.get("user"))
            self.update_status("Connected to Telegram")
            messagebox.showinfo("Success", "Connected successfully!")
        else:
            self.update_connection_status(False, None)
            self.update_status("Connection failed")
            messagebox.showerror("Error", result["message"])

    def on_connect_error(self, error):
        """Handle connection error"""
        self.connect_btn.configure(state="normal")
        self.update_connection_status(False, None)
        self.update_status("Connection failed")
        messagebox.showerror("Error", f"Connection error: {error}")

    def on_disconnect_result(self):
        """Handle disconnect result"""
        self.connect_btn.configure(state="normal")
        self.update_connection_status(False, None)
        self.update_status("Disconnected")
        messagebox.showinfo("Info", "Disconnected successfully")

    def on_disconnect_error(self, error):
        """Handle disconnect error"""
        self.connect_btn.configure(state="normal")
        self.update_status("Disconnect failed")
        messagebox.showerror("Error", f"Disconnect error: {error}")

    def load_files(self):
        """Load files from channel"""
        channel = self.channel_entry.get().strip()
        if not channel:
            messagebox.showerror("Error", "Please enter a channel username or ID")
            return

        if not self.connection_status["connected"]:
            messagebox.showerror("Error", "Please connect to Telegram first")
            return

        self.current_channel = channel
        self.update_status(f"Loading files from {channel}...")

        # Clear current files display
        for widget in self.files_frame.winfo_children():
            widget.destroy()

        # Show loading
        loading_label = ctk.CTkLabel(self.files_frame, text="Loading files...", font=ctk.CTkFont(size=16))
        loading_label.pack(pady=50)

        async def load():
            try:
                result = await self.teledrive.list_files(channel, 50)
                self.root.after(0, lambda: self.on_files_loaded(result))
            except Exception as e:
                self.root.after(0, lambda: self.on_files_error(str(e)))

        self.run_async(load())

    def on_files_loaded(self, result):
        """Handle files loaded result"""
        # Clear loading display
        for widget in self.files_frame.winfo_children():
            widget.destroy()

        if result["success"]:
            self.current_files = result["files"]
            self.display_files(result["files"])
            self.update_status(f"Loaded {len(result['files'])} files")
        else:
            self.show_empty_files_state()
            self.update_status("Failed to load files")
            messagebox.showerror("Error", result["message"])

    def on_files_error(self, error):
        """Handle files loading error"""
        for widget in self.files_frame.winfo_children():
            widget.destroy()

        self.show_empty_files_state()
        self.update_status("Failed to load files")
        messagebox.showerror("Error", f"Error loading files: {error}")

    def display_files(self, files):
        """Display files in the files frame"""
        if not files:
            self.show_empty_files_state()
            return

        for file in files:
            file_frame = ctk.CTkFrame(self.files_frame)
            file_frame.pack(fill="x", padx=5, pady=2)
            file_frame.grid_columnconfigure(1, weight=1)

            # File icon
            icon = self.get_file_icon(file.get("mime_type", ""))
            icon_label = ctk.CTkLabel(file_frame, text=icon, font=ctk.CTkFont(size=20))
            icon_label.grid(row=0, column=0, padx=10, pady=10)

            # File info
            info_frame = ctk.CTkFrame(file_frame, fg_color="transparent")
            info_frame.grid(row=0, column=1, sticky="ew", padx=10, pady=5)

            name_label = ctk.CTkLabel(info_frame, text=file["name"], font=ctk.CTkFont(size=14, weight="bold"), anchor="w")
            name_label.pack(anchor="w")

            details = f"{file['size_formatted']} • {file['date_formatted']}"
            details_label = ctk.CTkLabel(info_frame, text=details, font=ctk.CTkFont(size=11), text_color="gray", anchor="w")
            details_label.pack(anchor="w")

            # Download button
            download_btn = ctk.CTkButton(file_frame, text="⬇️ Download", width=100, command=lambda f=file: self.download_file(f))
            download_btn.grid(row=0, column=2, padx=10, pady=10)

    def show_empty_files_state(self):
        """Show empty state for files"""
        empty_frame = ctk.CTkFrame(self.files_frame, fg_color="transparent")
        empty_frame.pack(expand=True, fill="both")

        empty_label = ctk.CTkLabel(empty_frame, text="📁\n\nNo files found\nEnter a channel and click 'Load Files' to get started", font=ctk.CTkFont(size=16), text_color="gray")
        empty_label.pack(expand=True)

    def get_file_icon(self, mime_type):
        """Get emoji icon for file type"""
        if "image" in mime_type:
            return "🖼️"
        elif "video" in mime_type:
            return "🎥"
        elif "audio" in mime_type:
            return "🎵"
        elif "pdf" in mime_type:
            return "📄"
        elif "zip" in mime_type or "rar" in mime_type:
            return "📦"
        elif "document" in mime_type or "word" in mime_type:
            return "📝"
        else:
            return "📄"

    def download_file(self, file_info):
        """Download a file"""
        if not self.connection_status["connected"]:
            messagebox.showerror("Error", "Please connect to Telegram first")
            return

        # Ask user where to save
        filename = file_info["name"]
        file_path = filedialog.asksaveasfilename(defaultextension="", initialvalue=filename, title=f"Save {filename}")

        if not file_path:
            return

        self.update_status(f"Downloading {filename}...")

        async def download():
            try:
                result = await self.teledrive.download_file(self.current_channel, file_info["id"], Path(file_path))
                self.root.after(0, lambda: self.on_download_result(result, filename))
            except Exception as e:
                self.root.after(0, lambda: self.on_download_error(str(e), filename))

        self.run_async(download())

    def on_download_result(self, result, filename):
        """Handle download result"""
        if result["success"]:
            self.update_status(f"Downloaded {filename}")
            messagebox.showinfo("Success", f"Downloaded {filename} successfully!")
        else:
            self.update_status("Download failed")
            messagebox.showerror("Error", result["message"])

    def on_download_error(self, error, filename):
        """Handle download error"""
        self.update_status("Download failed")
        messagebox.showerror("Error", f"Download error: {error}")

    def refresh_files(self):
        """Refresh files list"""
        if self.current_channel:
            self.load_files()
        else:
            messagebox.showerror("Error", "No channel selected")

    def on_search_change(self, event):
        """Handle search input change"""
        search_term = self.search_entry.get().strip().lower()

        if not search_term:
            self.display_files(self.current_files)
        else:
            filtered_files = [f for f in self.current_files if search_term in f["name"].lower()]
            self.display_files(filtered_files)

    def select_files(self):
        """Select files for upload"""
        files = filedialog.askopenfilenames(title="Select files to upload")

        if files:
            self.selected_files.extend(files)
            self.update_selected_files_display()

    def update_selected_files_display(self):
        """Update the display of selected files"""
        # Clear current display
        for widget in self.selected_files_frame.winfo_children():
            widget.destroy()

        if not self.selected_files:
            empty_label = ctk.CTkLabel(self.selected_files_frame, text="No files selected\nClick 'Select Files' to choose files", text_color="gray")
            empty_label.pack(pady=20)
            return

        for file_path in self.selected_files:
            file_frame = ctk.CTkFrame(self.selected_files_frame)
            file_frame.pack(fill="x", padx=5, pady=2)
            file_frame.grid_columnconfigure(1, weight=1)

            # File name
            filename = Path(file_path).name
            name_label = ctk.CTkLabel(file_frame, text=filename, font=ctk.CTkFont(size=12), anchor="w")
            name_label.grid(row=0, column=0, sticky="ew", padx=10, pady=5)

            # Remove button
            remove_btn = ctk.CTkButton(file_frame, text="❌", width=30, command=lambda fp=file_path: self.remove_selected_file(fp))
            remove_btn.grid(row=0, column=1, padx=5, pady=5)

    def remove_selected_file(self, file_path):
        """Remove a file from selected files"""
        if file_path in self.selected_files:
            self.selected_files.remove(file_path)
            self.update_selected_files_display()

    def upload_files(self):
        """Upload selected files"""
        if not self.connection_status["connected"]:
            messagebox.showerror("Error", "Please connect to Telegram first")
            return

        channel = self.upload_channel_entry.get().strip()
        if not channel:
            messagebox.showerror("Error", "Please enter a channel username or ID")
            return

        if not self.selected_files:
            messagebox.showerror("Error", "Please select files to upload")
            return

        caption = self.caption_text.get("1.0", "end-1c").strip()

        self.upload_progress.set(0)
        self.upload_status.configure(text="Starting upload...")

        async def upload():
            try:
                total_files = len(self.selected_files)
                for i, file_path in enumerate(self.selected_files):
                    filename = Path(file_path).name

                    # Update progress
                    progress = i / total_files
                    self.root.after(0, lambda p=progress, f=filename: self.update_upload_progress(p, f"Uploading {f}..."))

                    result = await self.teledrive.upload_file(channel, Path(file_path), caption)

                    if not result["success"]:
                        self.root.after(0, lambda r=result: self.on_upload_error(r["message"]))
                        return

                # Complete
                self.root.after(0, lambda: self.on_upload_complete(total_files))

            except Exception as e:
                self.root.after(0, lambda: self.on_upload_error(str(e)))

        self.run_async(upload())

    def update_upload_progress(self, progress, status):
        """Update upload progress"""
        self.upload_progress.set(progress)
        self.upload_status.configure(text=status)

    def on_upload_complete(self, file_count):
        """Handle upload completion"""
        self.upload_progress.set(1.0)
        self.upload_status.configure(text=f"Upload complete! {file_count} files uploaded.")
        self.update_status("Upload completed")
        messagebox.showinfo("Success", f"Successfully uploaded {file_count} files!")

        # Clear selected files
        self.selected_files.clear()
        self.update_selected_files_display()
        self.caption_text.delete("1.0", "end")

    def on_upload_error(self, error):
        """Handle upload error"""
        self.upload_status.configure(text=f"Upload failed: {error}")
        self.update_status("Upload failed")
        messagebox.showerror("Error", f"Upload error: {error}")

    def load_settings(self):
        """Load settings from .env file"""
        try:
            from dotenv import load_dotenv
            load_dotenv()

            self.api_id_entry.insert(0, os.getenv('API_ID', ''))
            self.api_hash_entry.insert(0, os.getenv('API_HASH', ''))
            self.phone_entry.insert(0, os.getenv('PHONE_NUMBER', ''))

        except Exception as e:
            print(f"Error loading settings: {e}")

    def save_settings(self):
        """Save settings to .env file"""
        try:
            api_id = self.api_id_entry.get().strip()
            api_hash = self.api_hash_entry.get().strip()
            phone = self.phone_entry.get().strip()

            if not all([api_id, api_hash, phone]):
                messagebox.showerror("Error", "Please fill in all required fields")
                return

            # Write to .env file
            env_path = Path('.env')
            with open(env_path, 'w') as f:
                f.write(f"API_ID={api_id}\n")
                f.write(f"API_HASH={api_hash}\n")
                f.write(f"PHONE_NUMBER={phone}\n")
                f.write(f"SESSION_NAME=teledrive_session\n")
                f.write(f"DOWNLOAD_DIR=./downloads\n")

            messagebox.showinfo("Success", "Settings saved successfully!")
            self.update_status("Settings saved")

        except Exception as e:
            messagebox.showerror("Error", f"Error saving settings: {str(e)}")

    def change_theme(self, theme):
        """Change application theme"""
        ctk.set_appearance_mode(theme)
        self.update_status(f"Theme changed to {theme}")

    def run(self):
        """Run the application"""
        self.root.mainloop()

def main():
    """Main function"""
    try:
        app = TeleDriveApp()
        app.run()
    except ImportError as e:
        print("Error: Required packages not installed.")
        print("Please run: pip install -r requirements.txt")
        print(f"Missing: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Error starting application: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
