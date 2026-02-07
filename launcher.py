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
import logging
from datetime import datetime

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


def setup_launcher_logging():
    """Setup logging for launcher to trace startup process"""
    app_data = get_app_data_dir()
    log_dir = os.path.join(app_data, 'logs')
    os.makedirs(log_dir, exist_ok=True)

    log_file = os.path.join(log_dir, 'launcher.log')

    # Configure launcher logger
    logger = logging.getLogger('launcher')
    logger.setLevel(logging.DEBUG)

    # File handler with rotation-like behavior (truncate if too large)
    try:
        if os.path.exists(log_file) and os.path.getsize(log_file) > 5 * 1024 * 1024:
            # Keep last 1MB of old log
            with open(log_file, 'rb') as f:
                f.seek(-1024 * 1024, 2)
                old_content = f.read()
            with open(log_file, 'wb') as f:
                f.write(b'[...truncated...]\n')
                f.write(old_content)
    except:
        pass

    file_handler = logging.FileHandler(log_file, encoding='utf-8')
    file_handler.setLevel(logging.DEBUG)
    formatter = logging.Formatter('[%(asctime)s] [%(levelname)s] %(message)s',
                                  datefmt='%Y-%m-%d %H:%M:%S')
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    return logger


# Initialize launcher logger early
launcher_logger = setup_launcher_logging()


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
        launcher_logger.info("=" * 50)
        launcher_logger.info("Starting TeleDrive backend...")
        launcher_logger.info(f"Python version: {sys.version}")
        launcher_logger.info(f"Platform: {sys.platform}")

        # Add bundle root to path for proper imports
        # IMPORTANT: Only add parent path, NOT app_path, to avoid import conflicts
        bundle_root = get_resource_path('.')
        if bundle_root not in sys.path:
            sys.path.insert(0, bundle_root)
        launcher_logger.info(f"Bundle root: {bundle_root}")

        # Set working directory
        app_data = get_app_data_dir()
        os.chdir(app_data)
        launcher_logger.info(f"App data directory: {app_data}")
        launcher_logger.info(f"Working directory set to: {os.getcwd()}")

        # Create necessary directories
        os.makedirs(os.path.join(app_data, 'data'), exist_ok=True)
        os.makedirs(os.path.join(app_data, 'logs'), exist_ok=True)
        os.makedirs(os.path.join(app_data, 'output'), exist_ok=True)
        launcher_logger.info("Created necessary directories: data, logs, output")

        # Copy config if needed
        config_src = get_resource_path('config.json')
        config_dst = os.path.join(app_data, 'config.json')
        if os.path.exists(config_src) and not os.path.exists(config_dst):
            import shutil
            shutil.copy2(config_src, config_dst)
            launcher_logger.info(f"Copied config.json from {config_src} to {config_dst}")
        else:
            launcher_logger.info(f"Config exists at: {config_dst}")

        # Import and run Flask app
        launcher_logger.info("Importing Flask app...")
        from app.app import app, socketio
        launcher_logger.info("Flask app imported successfully")

        launcher_logger.info("Starting Flask-SocketIO server on 127.0.0.1:5000")
        socketio.run(
            app,
            host='127.0.0.1',
            port=5000,
            debug=False,
            use_reloader=False,
            allow_unsafe_werkzeug=True
        )
    except Exception as e:
        launcher_logger.error(f"Backend error: {e}")
        import traceback
        launcher_logger.error(traceback.format_exc())
        print(f'Backend error: {e}')
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

    launcher_logger.info("=" * 60)
    launcher_logger.info("TeleDrive Portable starting...")
    launcher_logger.info(f"Startup time: {datetime.now().isoformat()}")
    launcher_logger.info(f"Executable: {sys.executable}")
    launcher_logger.info(f"Arguments: {sys.argv}")
    if hasattr(sys, '_MEIPASS'):
        launcher_logger.info(f"PyInstaller bundle: {sys._MEIPASS}")
    launcher_logger.info("=" * 60)

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
    launcher_logger.info("Starting backend thread...")
    _backend_thread = threading.Thread(target=run_backend, daemon=True)
    _backend_thread.start()

    # Wait for backend
    print("Waiting for backend to be ready...")
    launcher_logger.info("Waiting for backend to be ready (timeout: 30s)...")
    if not wait_for_backend():
        launcher_logger.error("Backend failed to start within timeout!")
        print("ERROR: Backend failed to start!")
        input("Press Enter to exit...")
        return 1

    launcher_logger.info("Backend is ready and accepting connections")
    print("Backend is ready!")

    # Find Tauri UI executable
    ui_exe = get_resource_path('TeleDrive-UI.exe')
    launcher_logger.info(f"UI executable path: {ui_exe}")

    if not os.path.exists(ui_exe):
        launcher_logger.error(f"UI executable not found: {ui_exe}")
        print(f"ERROR: UI executable not found: {ui_exe}")
        input("Press Enter to exit...")
        return 1

    print("Launching TeleDrive UI...")
    launcher_logger.info("Launching Tauri UI...")
    print()

    # Launch Tauri UI
    try:
        _ui_process = subprocess.Popen(
            [ui_exe],
            cwd=get_app_data_dir()
        )
        launcher_logger.info(f"UI process started with PID: {_ui_process.pid}")

        # Wait for UI to close
        _ui_process.wait()
        launcher_logger.info(f"UI process exited with code: {_ui_process.returncode}")

    except Exception as e:
        launcher_logger.error(f"Error launching UI: {e}")
        import traceback
        launcher_logger.error(traceback.format_exc())
        print(f"ERROR launching UI: {e}")
        input("Press Enter to exit...")
        return 1

    launcher_logger.info("TeleDrive closed normally")
    print("TeleDrive closed.")
    return 0


if __name__ == '__main__':
    sys.exit(main())
