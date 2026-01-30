#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TeleDrive Desktop Application Entry Point
Launches the Flask API server for Tauri frontend
"""

import os
import sys
import threading
import time
import webbrowser

# Add app directory to Python path
app_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'app')
sys.path.insert(0, app_dir)

# Change to app directory for correct relative paths
os.chdir(app_dir)

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
    print("=" * 50)
    print("     TeleDrive Desktop - API Server")
    print("=" * 50)
    print()
    
    # Start Flask API server in background thread
    server_thread = threading.Thread(target=run_flask_server, daemon=True)
    server_thread.start()
    
    # Wait for server to start
    print("⏳ Waiting for API server to be ready...")
    if not wait_for_server('127.0.0.1', 5000, timeout=30):
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
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 Shutting down...")
    
    print("👋 TeleDrive stopped")

if __name__ == '__main__':
    main()
