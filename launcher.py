#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TeleDrive Portable Launcher
Combines Flask backend and Tauri frontend into single executable
"""

import os
import sys
import subprocess
import threading
import time
import signal

# Force UTF-8 encoding
if sys.platform == 'win32':
    os.environ['PYTHONIOENCODING'] = 'utf-8'
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')


def get_resource_path(relative_path):
    """Get path to resource, works for dev and for PyInstaller"""
    if hasattr(sys, '_MEIPASS'):
        # Running as bundled exe
        return os.path.join(sys._MEIPASS, relative_path)
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), relative_path)


def get_app_data_dir():
    """Get application data directory"""
    if sys.platform == 'win32':
        base = os.environ.get('LOCALAPPDATA', os.path.expanduser('~'))
    else:
        base = os.path.expanduser('~/.local/share')
    
    app_dir = os.path.join(base, 'TeleDrive')
    os.makedirs(app_dir, exist_ok=True)
    return app_dir


# Global flag
_shutdown = False
_backend_thread = None
_ui_process = None


def signal_handler(signum, frame):
    global _shutdown
    _shutdown = True
    if _ui_process:
        _ui_process.terminate()
    os._exit(0)


def run_backend():
    """Run Flask backend server"""
    global _shutdown
    
    try:
        # Add app module to path
        app_path = get_resource_path('app')
        if app_path not in sys.path:
            sys.path.insert(0, app_path)
        
        # Also add parent for imports
        parent_path = os.path.dirname(app_path)
        if parent_path not in sys.path:
            sys.path.insert(0, parent_path)
        
        # Set working directory
        app_data = get_app_data_dir()
        os.chdir(app_data)
        
        # Create necessary directories
        os.makedirs(os.path.join(app_data, 'data'), exist_ok=True)
        os.makedirs(os.path.join(app_data, 'logs'), exist_ok=True)
        os.makedirs(os.path.join(app_data, 'output'), exist_ok=True)
        
        # Copy config if needed
        config_src = get_resource_path('config.json')
        config_dst = os.path.join(app_data, 'config.json')
        if os.path.exists(config_src) and not os.path.exists(config_dst):
            import shutil
            shutil.copy2(config_src, config_dst)
        
        # Import and run Flask app
        from app.app import app, socketio
        socketio.run(
            app,
            host='127.0.0.1',
            port=5000,
            debug=False,
            use_reloader=False
        )
    except Exception as e:
        print(f'Backend error: {e}')
        import traceback
        traceback.print_exc()


def wait_for_backend(timeout=30):
    """Wait for backend to be ready"""
    import socket
    start = time.time()
    while time.time() - start < timeout:
        if _shutdown:
            return False
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(1)
            result = sock.connect_ex(('127.0.0.1', 5000))
            sock.close()
            if result == 0:
                return True
        except:
            pass
        time.sleep(0.5)
    return False


def main():
    global _backend_thread, _ui_process, _shutdown
    
    # Setup signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    if sys.platform == 'win32':
        signal.signal(signal.SIGBREAK, signal_handler)
    
    print("=" * 50)
    print("     TeleDrive Portable")
    print("=" * 50)
    print()
    
    # Start backend in thread
    print("Starting backend server...")
    _backend_thread = threading.Thread(target=run_backend, daemon=True)
    _backend_thread.start()
    
    # Wait for backend
    print("Waiting for backend to be ready...")
    if not wait_for_backend():
        print("ERROR: Backend failed to start!")
        input("Press Enter to exit...")
        return 1
    
    print("Backend is ready!")
    
    # Find Tauri UI executable
    ui_exe = get_resource_path('TeleDrive-UI.exe')
    
    if not os.path.exists(ui_exe):
        print(f"ERROR: UI executable not found: {ui_exe}")
        input("Press Enter to exit...")
        return 1
    
    print("Launching TeleDrive UI...")
    print()
    
    # Launch Tauri UI
    try:
        _ui_process = subprocess.Popen(
            [ui_exe],
            cwd=get_app_data_dir()
        )
        
        # Wait for UI to close
        _ui_process.wait()
        
    except Exception as e:
        print(f"ERROR launching UI: {e}")
        input("Press Enter to exit...")
        return 1
    
    print("TeleDrive closed.")
    return 0


if __name__ == '__main__':
    sys.exit(main())
