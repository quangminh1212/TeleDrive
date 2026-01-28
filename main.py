#!/usr/bin/env python3
"""
TeleDrive Desktop Application with Embedded WebView
Desktop window with embedded web interface (login + drive)
"""

import os
import sys
import threading
import time
import logging
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

class TeleDriveEmbeddedApp:
    """Desktop app with embedded web interface"""
    
    def __init__(self):
        self.flask_app = None
        self.flask_thread = None
        self.server_started = False
        self.port = 5000
        self.window = None
        
    def start_flask(self):
        """Start Flask server in background thread"""
        try:
            from app import app as flask_app
            self.flask_app = flask_app
            
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
            if self.window:
                try:
                    self.window.destroy()
                except:
                    pass
    
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
    
    def create_webview_window(self):
        """Create window with pywebview (best option)"""
        try:
            import webview
            
            logger.info("Creating webview window...")
            
            self.window = webview.create_window(
                'TeleDrive',
                f'http://127.0.0.1:{self.port}',
                width=1280,
                height=800,
                resizable=True,
                fullscreen=False,
                min_size=(800, 600),
                background_color='#FFFFFF'
            )
            
            webview.start(debug=False)
            return True
            
        except ImportError:
            logger.warning("pywebview not available")
            return False
        except Exception as e:
            logger.error(f"Failed to create webview: {e}")
            return False
    
    def create_tkinterweb_window(self):
        """Create window with tkinterweb"""
        try:
            import tkinter as tk
            import tkinterweb
            
            logger.info("Creating tkinterweb window...")
            
            root = tk.Tk()
            root.title("TeleDrive")
            root.geometry("1280x800")
            
            # Center window
            x = (root.winfo_screenwidth() // 2) - 640
            y = (root.winfo_screenheight() // 2) - 400
            root.geometry(f'1280x800+{x}+{y}')
            
            # Icon
            icon_path = Path('icon.ico')
            if icon_path.exists():
                try:
                    root.iconbitmap(str(icon_path))
                except:
                    pass
            
            # Create browser
            frame = tkinterweb.HtmlFrame(root)
            frame.pack(fill=tk.BOTH, expand=True)
            frame.load_url(f'http://127.0.0.1:{self.port}')
            
            self.window = root
            root.mainloop()
            return True
            
        except ImportError:
            logger.warning("tkinterweb not available")
            return False
        except Exception as e:
            logger.error(f"Failed to create tkinterweb window: {e}")
            return False
    
    def open_browser_fallback(self):
        """Fallback: Open in external browser"""
        import webbrowser
        logger.info("Opening in external browser...")
        webbrowser.open(f'http://127.0.0.1:{self.port}')
        
        logger.info("Server running. Press Ctrl+C to stop.")
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            logger.info("Shutting down...")
    
    def run(self):
        """Run the application"""
        logger.info("Starting TeleDrive Desktop...")
        
        # Create directories
        os.makedirs('data', exist_ok=True)
        os.makedirs('data/uploads', exist_ok=True)
        os.makedirs('data/temp', exist_ok=True)
        os.makedirs('data/backups', exist_ok=True)
        os.makedirs('logs', exist_ok=True)
        
        # Start Flask
        self.flask_thread = threading.Thread(target=self.start_flask, daemon=True)
        self.flask_thread.start()
        
        # Wait for server
        if not self.wait_for_server():
            logger.error("Cannot start application - server not ready")
            return
        
        # Try webview options
        logger.info("Creating embedded window...")
        
        # 1. Try pywebview (best)
        if self.create_webview_window():
            logger.info("Application closed")
            return
        
        # 2. Try tkinterweb
        if self.create_tkinterweb_window():
            logger.info("Application closed")
            return
        
        # 3. Fallback to browser
        logger.warning("No embedded webview available, using browser")
        self.open_browser_fallback()

def main():
    """Main entry point"""
    try:
        app = TeleDriveEmbeddedApp()
        app.run()
    except KeyboardInterrupt:
        logger.info("Application interrupted")
    except Exception as e:
        logger.error(f"Application error: {e}", exc_info=True)
        sys.exit(1)

if __name__ == '__main__':
    main()
