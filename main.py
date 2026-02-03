#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TeleDrive Desktop Application Entry Point
Launches the Flask API server for Tauri frontend
"""

import os
import sys
import signal
import subprocess
import threading
import time
import webbrowser
import atexit

# Get project root directory
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))

# Add app directory to Python path
app_dir = os.path.join(PROJECT_ROOT, 'app')
sys.path.insert(0, app_dir)

# Change to app directory for correct relative paths
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

def run_flask_server():
    """Run Flask API server"""
    from app import app, socketio
    
    # Run API server on port 5000
    print("🚀 Starting Flask API server on port 5000...")
    socketio.run(
        app,
        host='127.0.0.1',
        port=5000,
        debug=False,
        use_reloader=False
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

def main():
    """Main entry point"""
    global _server_thread
    
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
    
    # Start Flask API server in background thread
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
    
    # Open frontend in browser
    frontend_url = "http://localhost:1420"
    print(f"🌐 Opening frontend: {frontend_url}")
    webbrowser.open(frontend_url)
    
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

