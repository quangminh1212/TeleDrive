#!/usr/bin/env python3
"""
TeleDrive Desktop Application
Main entry point for the desktop version
"""

import os
import sys
import threading
import time
import logging
import webbrowser
from pathlib import Path

# Add app directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('teledrive.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class TeleDriveApp:
    """TeleDrive Desktop Application"""
    
    def __init__(self):
        self.flask_app = None
        self.flask_thread = None
        self.server_started = False
        self.port = 5000
        self.use_webview = False
        
        # Try to import pywebview
        try:
            import webview
            self.webview = webview
            self.use_webview = True
            logger.info("PyWebView available - will use native window")
        except ImportError:
            logger.info("PyWebView not available - will use browser")
            self.webview = None
        
    def start_flask(self):
        """Start Flask server in background thread"""
        try:
            from app.app import app as flask_app
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
            sys.exit(1)
    
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
    
    def create_window(self):
        """Create and configure the main window"""
        if not self.use_webview or not self.webview:
            return None
            
        window = self.webview.create_window(
            title='TeleDrive - Telegram File Manager',
            url=f'http://127.0.0.1:{self.port}',
            width=1280,
            height=800,
            resizable=True,
            fullscreen=False,
            min_size=(800, 600),
            background_color='#1a1a1a',
            text_select=True
        )
        return window
    
    def open_browser(self):
        """Open default browser"""
        url = f'http://127.0.0.1:{self.port}'
        logger.info(f"Opening browser at {url}")
        webbrowser.open(url)
    
    def run(self):
        """Run the desktop application"""
        logger.info("Starting TeleDrive Desktop Application...")
        
        # Start Flask in background thread
        self.flask_thread = threading.Thread(target=self.start_flask, daemon=True)
        self.flask_thread.start()
        
        # Wait for server to be ready
        if not self.wait_for_server():
            logger.error("Cannot start application - server not ready")
            return
        
        if self.use_webview:
            # Create and start the native window
            logger.info("Creating native application window...")
            window = self.create_window()
            
            # Start the GUI (blocking call)
            self.webview.start(debug=False)
        else:
            # Open in browser
            logger.info("PyWebView not available, opening in browser...")
            self.open_browser()
            
            # Keep the server running
            logger.info("Server running. Press Ctrl+C to stop.")
            try:
                while True:
                    time.sleep(1)
            except KeyboardInterrupt:
                logger.info("Shutting down...")
        
        logger.info("Application closed")

def main():
    """Main entry point"""
    try:
        # Ensure required directories exist
        os.makedirs('data', exist_ok=True)
        os.makedirs('data/uploads', exist_ok=True)
        os.makedirs('data/temp', exist_ok=True)
        os.makedirs('data/backups', exist_ok=True)
        os.makedirs('logs', exist_ok=True)
        
        # Create and run the application
        app = TeleDriveApp()
        app.run()
        
    except KeyboardInterrupt:
        logger.info("Application interrupted by user")
    except Exception as e:
        logger.error(f"Application error: {e}", exc_info=True)
        sys.exit(1)

if __name__ == '__main__':
    main()
