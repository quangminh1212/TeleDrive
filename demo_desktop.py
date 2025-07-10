#!/usr/bin/env python3
"""
TeleDrive Desktop Demo - Simple demo without dependencies
"""

import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import os
from pathlib import Path

class TeleDriveDemo:
    """Demo TeleDrive Desktop Application"""
    
    def __init__(self):
        # Initialize main window
        self.root = tk.Tk()
        self.root.title("TeleDrive - Desktop Demo")
        self.root.geometry("1200x800")
        self.root.minsize(1000, 600)
        
        # Configure style
        self.style = ttk.Style()
        self.style.theme_use('clam')
        
        # Configure colors
        self.colors = {
            'primary': '#2563eb',
            'secondary': '#64748b',
            'success': '#10b981',
            'error': '#ef4444',
            'bg': '#ffffff',
            'bg_secondary': '#f8fafc'
        }
        
        # Initialize variables
        self.connection_status = False
        self.current_channel = ""
        self.selected_files = []
        
        # Create UI
        self.create_ui()
    
    def create_ui(self):
        """Create the main UI layout"""
        # Configure main grid
        self.root.grid_columnconfigure(1, weight=1)
        self.root.grid_rowconfigure(1, weight=1)
        
        # Create header
        self.create_header()
        
        # Create sidebar
        self.create_sidebar()
        
        # Create main content
        self.create_main_content()
        
        # Create status bar
        self.create_status_bar()
    
    def create_header(self):
        """Create header bar"""
        header = tk.Frame(self.root, bg=self.colors['primary'], height=60)
        header.grid(row=0, column=0, columnspan=2, sticky="ew")
        header.grid_propagate(False)
        header.grid_columnconfigure(1, weight=1)
        
        # Logo
        logo = tk.Label(
            header, 
            text="📁 TeleDrive", 
            bg=self.colors['primary'], 
            fg='white',
            font=('Arial', 16, 'bold')
        )
        logo.grid(row=0, column=0, padx=20, pady=15, sticky="w")
        
        # Connection controls
        controls = tk.Frame(header, bg=self.colors['primary'])
        controls.grid(row=0, column=1, padx=20, pady=15, sticky="e")
        
        self.status_label = tk.Label(
            controls, 
            text="● Disconnected", 
            bg=self.colors['primary'], 
            fg='#ff6b6b',
            font=('Arial', 10)
        )
        self.status_label.pack(side="left", padx=(0, 10))
        
        self.connect_btn = tk.Button(
            controls,
            text="Connect",
            command=self.toggle_connection,
            bg='white',
            fg=self.colors['primary'],
            font=('Arial', 10, 'bold'),
            padx=15,
            pady=5,
            relief='flat',
            cursor='hand2'
        )
        self.connect_btn.pack(side="left")
    
    def create_sidebar(self):
        """Create navigation sidebar"""
        sidebar = tk.Frame(self.root, bg=self.colors['bg_secondary'], width=200)
        sidebar.grid(row=1, column=0, sticky="nsw")
        sidebar.grid_propagate(False)
        
        # Navigation buttons
        nav_items = [
            ("🏠 Dashboard", self.show_dashboard),
            ("📁 Files", self.show_files),
            ("⬆️ Upload", self.show_upload),
            ("⚙️ Settings", self.show_settings)
        ]
        
        self.nav_buttons = []
        for i, (text, command) in enumerate(nav_items):
            btn = tk.Button(
                sidebar,
                text=text,
                command=command,
                bg=self.colors['bg_secondary'],
                fg=self.colors['secondary'],
                font=('Arial', 11),
                anchor='w',
                padx=20,
                pady=10,
                relief='flat',
                cursor='hand2',
                width=20
            )
            btn.pack(fill="x", padx=10, pady=2)
            self.nav_buttons.append(btn)
        
        # Set first button as active
        self.set_active_nav(0)
    
    def create_main_content(self):
        """Create main content area"""
        self.main_frame = tk.Frame(self.root, bg=self.colors['bg'])
        self.main_frame.grid(row=1, column=1, sticky="nsew", padx=20, pady=20)
        self.main_frame.grid_columnconfigure(0, weight=1)
        self.main_frame.grid_rowconfigure(0, weight=1)
        
        # Create pages
        self.pages = {}
        self.create_dashboard_page()
        self.create_files_page()
        self.create_upload_page()
        self.create_settings_page()
        
        # Show dashboard initially (after status bar is created)
        self.root.after(100, self.show_dashboard)
    
    def create_status_bar(self):
        """Create status bar"""
        status_bar = tk.Frame(self.root, bg=self.colors['bg_secondary'], height=25)
        status_bar.grid(row=2, column=0, columnspan=2, sticky="ew")
        status_bar.grid_propagate(False)
        
        self.status_text = tk.Label(
            status_bar, 
            text="Ready", 
            bg=self.colors['bg_secondary'],
            fg=self.colors['secondary'],
            font=('Arial', 9)
        )
        self.status_text.pack(side="left", padx=10, pady=3)
    
    def create_dashboard_page(self):
        """Create dashboard page"""
        page = tk.Frame(self.main_frame, bg=self.colors['bg'])
        self.pages['dashboard'] = page
        
        # Welcome section
        welcome = tk.Frame(page, bg='white', relief='solid', bd=1)
        welcome.pack(fill="x", pady=(0, 20))
        
        title = tk.Label(
            welcome, 
            text="Welcome to TeleDrive", 
            bg='white',
            font=('Arial', 24, 'bold')
        )
        title.pack(pady=20)
        
        subtitle = tk.Label(
            welcome, 
            text="Modern Telegram Channel File Management", 
            bg='white',
            fg=self.colors['secondary'],
            font=('Arial', 12)
        )
        subtitle.pack(pady=(0, 20))
        
        # Quick actions
        actions = tk.Frame(page, bg='white', relief='solid', bd=1)
        actions.pack(fill="x")
        
        actions_title = tk.Label(
            actions, 
            text="Quick Actions", 
            bg='white',
            font=('Arial', 18, 'bold')
        )
        actions_title.pack(pady=(20, 10))
        
        # Action buttons
        buttons_frame = tk.Frame(actions, bg='white')
        buttons_frame.pack(pady=(0, 20))
        
        action_buttons = [
            ("📁 Browse Files", self.show_files),
            ("⬆️ Upload Files", self.show_upload),
            ("🔍 Search Files", self.demo_search)
        ]
        
        for text, command in action_buttons:
            btn = tk.Button(
                buttons_frame,
                text=text,
                command=command,
                bg=self.colors['primary'],
                fg='white',
                font=('Arial', 12, 'bold'),
                padx=20,
                pady=10,
                relief='flat',
                cursor='hand2'
            )
            btn.pack(side="left", padx=10)
    
    def create_files_page(self):
        """Create files page"""
        page = tk.Frame(self.main_frame, bg=self.colors['bg'])
        self.pages['files'] = page
        page.grid_columnconfigure(0, weight=1)
        page.grid_rowconfigure(2, weight=1)
        
        # Header
        header = tk.Frame(page, bg='white', relief='solid', bd=1)
        header.grid(row=0, column=0, sticky="ew", pady=(0, 10))
        header.grid_columnconfigure(1, weight=1)
        
        title = tk.Label(header, text="Channel Files", bg='white', font=('Arial', 20, 'bold'))
        title.grid(row=0, column=0, padx=20, pady=15, sticky="w")
        
        # Channel input
        controls = tk.Frame(header, bg='white')
        controls.grid(row=0, column=1, padx=20, pady=15, sticky="e")
        
        self.channel_entry = tk.Entry(controls, font=('Arial', 10), width=25)
        self.channel_entry.pack(side="left", padx=(0, 10))
        self.channel_entry.insert(0, "@mychannel")
        
        load_btn = tk.Button(
            controls,
            text="Load Files",
            command=self.demo_load_files,
            bg=self.colors['primary'],
            fg='white',
            font=('Arial', 10, 'bold'),
            padx=15,
            pady=5,
            relief='flat',
            cursor='hand2'
        )
        load_btn.pack(side="left")
        
        # Search
        search_frame = tk.Frame(page, bg='white', relief='solid', bd=1)
        search_frame.grid(row=1, column=0, sticky="ew", pady=(0, 10))
        
        search_entry = tk.Entry(search_frame, font=('Arial', 10), width=30)
        search_entry.pack(side="left", padx=20, pady=10)
        search_entry.insert(0, "Search files...")
        
        # Files list
        files_frame = tk.Frame(page, bg='white', relief='solid', bd=1)
        files_frame.grid(row=2, column=0, sticky="nsew")
        
        # Demo files
        demo_files = [
            ("📄", "document.pdf", "2.5 MB", "2 hours ago"),
            ("🖼️", "photo.jpg", "1.2 MB", "1 day ago"),
            ("🎥", "video.mp4", "15.8 MB", "3 days ago"),
            ("📝", "notes.txt", "45 KB", "1 week ago"),
            ("📦", "archive.zip", "8.3 MB", "2 weeks ago")
        ]
        
        for i, (icon, name, size, date) in enumerate(demo_files):
            file_frame = tk.Frame(files_frame, bg='white')
            file_frame.pack(fill="x", padx=10, pady=2)
            
            icon_label = tk.Label(file_frame, text=icon, bg='white', font=('Arial', 16))
            icon_label.pack(side="left", padx=(0, 10))
            
            info_frame = tk.Frame(file_frame, bg='white')
            info_frame.pack(side="left", fill="x", expand=True)
            
            name_label = tk.Label(info_frame, text=name, bg='white', font=('Arial', 11, 'bold'), anchor='w')
            name_label.pack(anchor='w')
            
            details_label = tk.Label(info_frame, text=f"{size} • {date}", bg='white', fg=self.colors['secondary'], font=('Arial', 9), anchor='w')
            details_label.pack(anchor='w')
            
            download_btn = tk.Button(
                file_frame,
                text="⬇️ Download",
                command=lambda n=name: self.demo_download(n),
                bg=self.colors['success'],
                fg='white',
                font=('Arial', 9, 'bold'),
                padx=10,
                pady=5,
                relief='flat',
                cursor='hand2'
            )
            download_btn.pack(side="right", padx=(10, 0))
    
    def create_upload_page(self):
        """Create upload page"""
        page = tk.Frame(self.main_frame, bg=self.colors['bg'])
        self.pages['upload'] = page
        
        # Title
        title = tk.Label(page, text="Upload Files", bg=self.colors['bg'], font=('Arial', 20, 'bold'))
        title.pack(pady=20)
        
        # Channel input
        channel_frame = tk.Frame(page, bg='white', relief='solid', bd=1)
        channel_frame.pack(fill="x", pady=10)
        
        channel_label = tk.Label(channel_frame, text="Target Channel:", bg='white', font=('Arial', 12, 'bold'))
        channel_label.pack(anchor="w", padx=20, pady=(15, 5))
        
        self.upload_channel_entry = tk.Entry(channel_frame, font=('Arial', 10), width=30)
        self.upload_channel_entry.pack(anchor="w", padx=20, pady=(0, 15))
        self.upload_channel_entry.insert(0, "@mychannel")
        
        # File selection
        files_frame = tk.Frame(page, bg='white', relief='solid', bd=1)
        files_frame.pack(fill="x", pady=10)
        
        files_label = tk.Label(files_frame, text="Select Files:", bg='white', font=('Arial', 12, 'bold'))
        files_label.pack(anchor="w", padx=20, pady=(15, 5))
        
        select_btn = tk.Button(
            files_frame,
            text="📁 Select Files",
            command=self.demo_select_files,
            bg=self.colors['primary'],
            fg='white',
            font=('Arial', 10, 'bold'),
            padx=15,
            pady=8,
            relief='flat',
            cursor='hand2'
        )
        select_btn.pack(anchor="w", padx=20, pady=(0, 15))
        
        # Upload button
        upload_btn = tk.Button(
            page,
            text="⬆️ Upload Files",
            command=self.demo_upload,
            bg=self.colors['success'],
            fg='white',
            font=('Arial', 14, 'bold'),
            padx=30,
            pady=15,
            relief='flat',
            cursor='hand2'
        )
        upload_btn.pack(pady=20)
    
    def create_settings_page(self):
        """Create settings page"""
        page = tk.Frame(self.main_frame, bg=self.colors['bg'])
        self.pages['settings'] = page
        
        # Title
        title = tk.Label(page, text="Settings", bg=self.colors['bg'], font=('Arial', 20, 'bold'))
        title.pack(pady=20)
        
        # API settings
        api_frame = tk.Frame(page, bg='white', relief='solid', bd=1)
        api_frame.pack(fill="x", pady=10)
        
        api_title = tk.Label(api_frame, text="Telegram API Configuration", bg='white', font=('Arial', 14, 'bold'))
        api_title.pack(anchor="w", padx=20, pady=(15, 10))
        
        # API ID
        tk.Label(api_frame, text="API ID:", bg='white', font=('Arial', 10)).pack(anchor="w", padx=20, pady=(5, 0))
        api_id_entry = tk.Entry(api_frame, font=('Arial', 10), width=30)
        api_id_entry.pack(anchor="w", padx=20, pady=(0, 10))
        api_id_entry.insert(0, "21272067")
        
        # API Hash
        tk.Label(api_frame, text="API Hash:", bg='white', font=('Arial', 10)).pack(anchor="w", padx=20, pady=(5, 0))
        api_hash_entry = tk.Entry(api_frame, font=('Arial', 10), width=30)
        api_hash_entry.pack(anchor="w", padx=20, pady=(0, 10))
        api_hash_entry.insert(0, "b7690dc86952dbc9b16717b101164af3")
        
        # Phone
        tk.Label(api_frame, text="Phone Number:", bg='white', font=('Arial', 10)).pack(anchor="w", padx=20, pady=(5, 0))
        phone_entry = tk.Entry(api_frame, font=('Arial', 10), width=30)
        phone_entry.pack(anchor="w", padx=20, pady=(0, 15))
        phone_entry.insert(0, "+1234567890")
        
        save_btn = tk.Button(
            api_frame,
            text="💾 Save Configuration",
            command=self.demo_save_settings,
            bg=self.colors['primary'],
            fg='white',
            font=('Arial', 10, 'bold'),
            padx=15,
            pady=8,
            relief='flat',
            cursor='hand2'
        )
        save_btn.pack(anchor="w", padx=20, pady=(0, 15))
    
    # Event handlers
    def set_active_nav(self, index):
        """Set active navigation button"""
        for i, btn in enumerate(self.nav_buttons):
            if i == index:
                btn.configure(bg=self.colors['primary'], fg='white')
            else:
                btn.configure(bg=self.colors['bg_secondary'], fg=self.colors['secondary'])
    
    def show_page(self, page_name, nav_index):
        """Show a specific page"""
        # Hide all pages
        for page in self.pages.values():
            page.pack_forget()
        
        # Show selected page
        if page_name in self.pages:
            self.pages[page_name].pack(fill="both", expand=True)
        
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
        """Update status bar"""
        self.status_text.configure(text=message)
    
    def toggle_connection(self):
        """Toggle connection status"""
        self.connection_status = not self.connection_status
        
        if self.connection_status:
            self.status_label.configure(text="● Connected", fg='#51cf66')
            self.connect_btn.configure(text="Disconnect")
            self.update_status("Connected to Telegram")
            messagebox.showinfo("Success", "Connected to Telegram successfully!")
        else:
            self.status_label.configure(text="● Disconnected", fg='#ff6b6b')
            self.connect_btn.configure(text="Connect")
            self.update_status("Disconnected from Telegram")
            messagebox.showinfo("Info", "Disconnected from Telegram")
    
    # Demo functions
    def demo_load_files(self):
        channel = self.channel_entry.get()
        messagebox.showinfo("Demo", f"Loading files from {channel}...")
        self.update_status(f"Loaded files from {channel}")
    
    def demo_download(self, filename):
        messagebox.showinfo("Demo", f"Downloading {filename}...")
        self.update_status(f"Downloaded {filename}")
    
    def demo_select_files(self):
        files = filedialog.askopenfilenames(title="Select files to upload")
        if files:
            messagebox.showinfo("Demo", f"Selected {len(files)} files for upload")
            self.update_status(f"Selected {len(files)} files")
    
    def demo_upload(self):
        channel = self.upload_channel_entry.get()
        messagebox.showinfo("Demo", f"Uploading files to {channel}...")
        self.update_status("Upload completed")
    
    def demo_search(self):
        messagebox.showinfo("Demo", "Search functionality demo")
        self.show_files()
    
    def demo_save_settings(self):
        messagebox.showinfo("Demo", "Settings saved successfully!")
        self.update_status("Settings saved")
    
    def run(self):
        """Run the application"""
        self.root.mainloop()

def main():
    """Main function"""
    app = TeleDriveDemo()
    app.run()

if __name__ == "__main__":
    main()
