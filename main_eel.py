#!/usr/bin/env python3
"""
TeleDrive Desktop Application with Eel
Main entry point for the desktop version using Eel for native window
"""

import os
import sys
import threading
import time
import logging
import eel
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

class TeleDriveEelApp:
    """TeleDrive Desktop Application using Eel"""
    
    def __init__(self):
        self.flask_app = None
        self.flask_thread = None
        self.server_started = False
        self.port = 5000
        
    def start_flask(self):
        """Start Flask server in background thread"""
        try:
            # Import the Flask app - since app dir is in sys.path, import directly
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
    
    def run(self):
        """Run the desktop application with Eel"""
        logger.info("Starting TeleDrive Desktop Application with Eel...")
        
        # Start Flask in background thread
        self.flask_thread = threading.Thread(target=self.start_flask, daemon=True)
        self.flask_thread.start()
        
        # Wait for server to be ready
        if not self.wait_for_server():
            logger.error("Cannot start application - server not ready")
            return
        
        # Initialize Eel with a dummy web folder (we'll use Flask's URL)
        # Create a minimal web folder for Eel
        web_folder = Path('eel_web')
        web_folder.mkdir(exist_ok=True)
        
        # Create a simple redirect HTML
        redirect_html = web_folder / 'index.html'
        redirect_html.write_text(f'''
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>TeleDrive</title>
    <script>
        window.location.href = 'http://127.0.0.1:{self.port}';
    </script>
</head>
<body>
    <p>Loading TeleDrive...</p>
</body>
</html>
''', encoding='utf-8')
        
        # Initialize Eel
        eel.init(str(web_folder))
        
        # Start Eel with Chrome app mode
        logger.info("Creating desktop window...")
        try:
            eel.start(
                'index.html',  # Start with the redirect HTML
                mode='chrome-app',  # Use Chrome in app mode
                size=(1280, 800),
                position=(100, 100),
                disable_cache=True,
                block=True
            )
        except Exception as e:
            logger.warning(f"Failed to start in Chrome app mode: {e}")
            logger.info("Trying default browser mode...")
            try:
                eel.start(
                    'index.html',
                    mode='default',
                    size=(1280, 800),
                    block=True
                )
            except Exception as e2:
                logger.error(f"Failed to start Eel: {e2}")
                logger.info("Opening in regular browser...")
                import webbrowser
                webbrowser.open(f'http://127.0.0.1:{self.port}')
                
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
        app = TeleDriveEelApp()
        app.run()
        
    except KeyboardInterrupt:
        logger.info("Application interrupted by user")
    except Exception as e:
        logger.error(f"Application error: {e}", exc_info=True)
        sys.exit(1)

if __name__ == '__main__':
    main()
