#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TeleDrive Desktop Application Entry Point
Launches the Flask API server for Tauri frontend
"""

# Force UTF-8 encoding before any imports (avoid cp1252 issues on Windows)
import os
import sys

# Set UTF-8 encoding via environment (must be before other imports)
if sys.platform == 'win32':
    os.environ['PYTHONIOENCODING'] = 'utf-8'
    # Reconfigure stdout/stderr if Python 3.7+
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')

import signal
import subprocess
import threading
import time
import atexit

# Get project root directory
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))

# Add app directory to Python path
app_dir = os.path.join(PROJECT_ROOT, 'app')
sys.path.insert(0, app_dir)

# Check for development mode early (before chdir)
DEV_MODE = os.environ.get('DEV_MODE', '').lower() in ('1', 'true', 'yes')

# Only change directory if NOT in dev mode (reloader needs original cwd)
if not DEV_MODE:
    os.chdir(app_dir)

# Global flag for shutdown
_shutdown_requested = False
_server_thread = None

def cleanup():
    """Run cleanup tasks on exit"""
    global _shutdown_requested
    _shutdown_requested = True

    # Run stop.bat to clean up processes
    stop_bat = os.path.join(PROJECT_ROOT, 'stop.bat')
    if os.path.exists(stop_bat):
        try:
            # Run stop.bat silently
            subprocess.run(
                ['cmd', '/c', stop_bat],
                cwd=PROJECT_ROOT,
                capture_output=True,
                timeout=10
            )
        except Exception as e:
            pass  # Ignore errors during cleanup

def signal_handler(signum, frame):
    """Handle shutdown signals gracefully"""
    global _shutdown_requested
    if not _shutdown_requested:
        _shutdown_requested = True
        print("\n🛑 Shutting down gracefully...")
        cleanup()
        # Force exit to avoid eventlet threading issues
        os._exit(0)

def run_flask_server(dev_mode=False):
    """Run Flask API server"""
    from app import app, socketio

    # Run API server on port 5000
    # Note: In dev mode with reloader, this must run in main thread
    if dev_mode:
        # Exclude non-Python directories from watchdog reloader
        # This prevents Flask from restarting when files are uploaded to data/uploads/
        exclude_patterns = [
            os.path.join(PROJECT_ROOT, 'data', '*'),
            os.path.join(PROJECT_ROOT, 'logs', '*'),
            os.path.join(PROJECT_ROOT, 'output', '*'),
            os.path.join(PROJECT_ROOT, 'frontend', '*'),
            os.path.join(PROJECT_ROOT, 'node_modules', '*'),
            os.path.join(PROJECT_ROOT, '.git', '*'),
            os.path.join(PROJECT_ROOT, 'python311', '*'),
            os.path.join(PROJECT_ROOT, 'static', '*'),
            os.path.join(PROJECT_ROOT, 'templates', '*'),
        ]
        socketio.run(
            app,
            host='127.0.0.1',
            port=5000,
            debug=True,
            use_reloader=True,
            reloader_options={'exclude_patterns': exclude_patterns},
            allow_unsafe_werkzeug=True,
        )
    else:
        socketio.run(
            app,
            host='127.0.0.1',
            port=5000,
            debug=False,
            use_reloader=False,
            allow_unsafe_werkzeug=True,
        )

def wait_for_server(host, port, timeout=30):
    """Wait for server to be ready"""
    import socket
    start_time = time.time()
    while time.time() - start_time < timeout:
        if _shutdown_requested:
            return False
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(1)
            result = sock.connect_ex((host, port))
            sock.close()
            if result == 0:
                return True
        except:
            pass
        time.sleep(0.5)
    return False

# Browser opening removed - Tauri webview handles UI

def main():
    """Main entry point"""
    global _server_thread

    # Use global DEV_MODE (set early before chdir)
    dev_mode = DEV_MODE

    # Register signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    if sys.platform == 'win32':
        signal.signal(signal.SIGBREAK, signal_handler)

    # Register cleanup on exit
    atexit.register(cleanup)

    print("=" * 50)
    print("     TeleDrive Desktop - API Server")
    print("=" * 50)
    print()

    if dev_mode:
        # DEV MODE: Run Flask in main thread with reloader
        # Reloader requires main thread for signal handling
        print("🔧 DEVELOPMENT MODE - Auto-reload enabled")
        print("   Changes to Python files will restart the server")
        print()
        print("=" * 50)
        print("  Frontend: http://localhost:1420")
        print("  API:      http://127.0.0.1:5000")
        print("=" * 50)
        print()

        # Tauri webview handles UI - no browser needed

        # Run Flask directly in main thread (required for reloader)
        run_flask_server(dev_mode=True)
    else:
        # PRODUCTION MODE: Run Flask in background thread
        _server_thread = threading.Thread(target=run_flask_server, daemon=True)
        _server_thread.start()

        # Wait for server to start
        print("⏳ Waiting for API server to be ready...")
        if not wait_for_server('127.0.0.1', 5000, timeout=30):
            if not _shutdown_requested:
                print("❌ API Server failed to start!")
            return

        print("✅ API Server is running at http://127.0.0.1:5000")
        print()
        print("=" * 50)
        print("  Frontend: http://localhost:1420")
        print("  API:      http://127.0.0.1:5000")
        print("=" * 50)
        print()

        # Tauri webview handles UI - no browser needed
        print("🖥️  Tauri webview will connect to API")

        # Keep server running
        print()
        print("Press Ctrl+C to stop the server...")
        try:
            while not _shutdown_requested:
                time.sleep(0.5)
        except KeyboardInterrupt:
            pass

        # Graceful shutdown
        print("\n🛑 Shutting down...")
        cleanup()
        print("👋 TeleDrive stopped")

        # Force exit to avoid eventlet threading cleanup issues
        os._exit(0)

if __name__ == '__main__':
    main()
