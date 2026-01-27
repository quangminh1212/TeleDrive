#!/usr/bin/env python3
"""
TeleDrive Desktop Application with Tkinter WebView
Simple desktop window using tkinter and webbrowser
"""

import os
import sys
import threading
import time
import logging
import webbrowser
import tkinter as tk
from tkinter import messagebox
from pathlib import Path

# Add app directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

# Configure logging with UTF-8 encoding for Windows
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('teledrive.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Set UTF-8 encoding for console output on Windows
if sys.platform == 'win32':
    import codecs
    if hasattr(sys.stdout, 'buffer'):
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'replace')
    if hasattr(sys.stderr, 'buffer'):
        sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'replace')

class TeleDriveDesktopWindow:
    """Simple desktop window for TeleDrive"""
    
    def __init__(self):
        self.flask_app = None
        self.flask_thread = None
        self.server_started = False
        self.port = 5000
        self.root = None
        
    def start_flask(self):
        """Start Flask server in background thread"""
        try:
            # Import the Flask app
            from app import app as flask_app
            self.flask_app = flask_app
            
            # Disable Flask's default logging to console
            log = logging.getLogger('werkzeug')
            log.setLevel(logging.ERROR)
            
            logger.info(f"Starting Flask server on port {self.port}...")
            self.flask_app.run(
                host='127.0.0.1',
                port=self.port,
                debug=False,
                use_reloader=False,
                threaded=True
            )
        except Exception as e:
            logger.error(f"Failed to start Flask server: {e}")
            if self.root:
                self.root.quit()
    
    def wait_for_server(self, timeout=30):
        """Wait for Flask server to start"""
        import requests
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            try:
                response = requests.get(f'http://127.0.0.1:{self.port}/', timeout=1)
                if response.status_code:
                    self.server_started = True
                    logger.info("Flask server is ready")
                    return True
            except:
                time.sleep(0.5)
        
        logger.error("Flask server failed to start within timeout")
        return False
    
    def open_browser(self):
        """Open the application in browser"""
        url = f'http://127.0.0.1:{self.port}'
        webbrowser.open(url)
        logger.info(f"Opened browser at {url}")
    
    def create_window(self):
        """Create a simple control window"""
        self.root = tk.Tk()
        self.root.title("TeleDrive Desktop")
        self.root.geometry("400x300")
        self.root.resizable(False, False)
        
        # Center window
        self.root.update_idletasks()
        width = self.root.winfo_width()
        height = self.root.winfo_height()
        x = (self.root.winfo_screenwidth() // 2) - (width // 2)
        y = (self.root.winfo_screenheight() // 2) - (height // 2)
        self.root.geometry(f'{width}x{height}+{x}+{y}')
        
        # Icon (if exists)
        icon_path = Path('icon.ico')
        if icon_path.exists():
            try:
                self.root.iconbitmap(str(icon_path))
            except:
                pass
        
        # Main frame
        main_frame = tk.Frame(self.root, padx=20, pady=20)
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Title
        title_label = tk.Label(
            main_frame,
            text="TeleDrive Desktop",
            font=("Arial", 18, "bold"),
            fg="#2c3e50"
        )
        title_label.pack(pady=(0, 10))
        
        # Status
        self.status_label = tk.Label(
            main_frame,
            text="Server is running...",
            font=("Arial", 10),
            fg="#27ae60"
        )
        self.status_label.pack(pady=(0, 20))
        
        # URL display
        url_frame = tk.Frame(main_frame)
        url_frame.pack(fill=tk.X, pady=(0, 20))
        
        tk.Label(url_frame, text="URL:", font=("Arial", 9)).pack(side=tk.LEFT)
        url_entry = tk.Entry(url_frame, font=("Arial", 9), state='readonly')
        url_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(5, 0))
        url_entry.config(state='normal')
        url_entry.insert(0, f'http://127.0.0.1:{self.port}')
        url_entry.config(state='readonly')
        
        # Buttons
        button_frame = tk.Frame(main_frame)
        button_frame.pack(fill=tk.X, pady=(0, 10))
        
        open_btn = tk.Button(
            button_frame,
            text="Open in Browser",
            command=self.open_browser,
            font=("Arial", 10),
            bg="#3498db",
            fg="white",
            padx=20,
            pady=10,
            cursor="hand2"
        )
        open_btn.pack(fill=tk.X, pady=(0, 10))
        
        quit_btn = tk.Button(
            button_frame,
            text="Stop Server & Exit",
            command=self.quit_application,
            font=("Arial", 10),
            bg="#e74c3c",
            fg="white",
            padx=20,
            pady=10,
            cursor="hand2"
        )
        quit_btn.pack(fill=tk.X)
        
        # Info
        info_label = tk.Label(
            main_frame,
            text="The application is running in your browser.\nKeep this window open.",
            font=("Arial", 8),
            fg="#7f8c8d",
            justify=tk.CENTER
        )
        info_label.pack(side=tk.BOTTOM, pady=(10, 0))
        
        # Handle window close
        self.root.protocol("WM_DELETE_WINDOW", self.on_closing)
        
    def on_closing(self):
        """Handle window close event"""
        if messagebox.askokcancel("Quit", "Do you want to stop the server and quit?"):
            self.quit_application()
    
    def quit_application(self):
        """Quit the application"""
        logger.info("Shutting down...")
        if self.root:
            self.root.quit()
        sys.exit(0)
    
    def run(self):
        """Run the desktop application"""
        logger.info("Starting TeleDrive Desktop Application...")
        
        # Ensure required directories exist
        os.makedirs('data', exist_ok=True)
        os.makedirs('data/uploads', exist_ok=True)
        os.makedirs('data/temp', exist_ok=True)
        os.makedirs('data/backups', exist_ok=True)
        os.makedirs('logs', exist_ok=True)
        
        # Start Flask in background thread
        self.flask_thread = threading.Thread(target=self.start_flask, daemon=True)
        self.flask_thread.start()
        
        # Wait for server to be ready
        if not self.wait_for_server():
            logger.error("Cannot start application - server not ready")
            messagebox.showerror("Error", "Failed to start server. Check teledrive.log for details.")
            return
        
        # Create control window
        self.create_window()
        
        # Open browser automatically
        self.open_browser()
        
        # Start GUI loop
        logger.info("Desktop window created. Application is running.")
        self.root.mainloop()
        
        logger.info("Application closed")

def main():
    """Main entry point"""
    try:
        app = TeleDriveDesktopWindow()
        app.run()
    except KeyboardInterrupt:
        logger.info("Application interrupted by user")
    except Exception as e:
        logger.error(f"Application error: {e}", exc_info=True)
        messagebox.showerror("Error", f"Application error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
