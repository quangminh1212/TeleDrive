#!/usr/bin/env python3
"""
TeleDrive UI Server - Fixed Version
Flask server to serve the web UI and handle API requests
Fixed asyncio event loop issues with detailed logging
"""

import os
import json
import asyncio
import threading
import sys
import traceback
from datetime import datetime
from concurrent.futures import Future
from flask import Flask, render_template, jsonify, request, send_file, send_from_directory
from flask_cors import CORS
import logging

# Import existing modules
try:
    from ui_telegram_scanner import UITelegramScanner
    from config import CONFIG
    from logger import get_logger, log_step
    MODULES_AVAILABLE = True
    print("✅ All Telegram modules imported successfully")
except ImportError as e:
    print(f"❌ Warning: Could not import modules: {e}")
    MODULES_AVAILABLE = False

app = Flask(__name__,
           static_folder='ui',
           static_url_path='')
CORS(app)

# Configure detailed logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('logs/ui_server.log', encoding='utf-8')
    ]
)
logger = logging.getLogger(__name__)

# Global variables for asyncio management
main_loop = None
loop_thread = None
scanner = None
scan_task = None
scan_cancelled = False

def log_detailed(step, message, level="INFO"):
    """Detailed logging function"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_msg = f"[{timestamp}] {step}: {message}"

    if level == "ERROR":
        logger.error(log_msg)
        print(f"❌ {log_msg}")
    elif level == "WARNING":
        logger.warning(log_msg)
        print(f"⚠️ {log_msg}")
    else:
        logger.info(log_msg)
        print(f"ℹ️ {log_msg}")

def run_async_safe(coro):
    """Safely run coroutine in the main event loop from another thread"""
    try:
        log_detailed("ASYNC_CALL", f"Running coroutine: {coro.__name__ if hasattr(coro, '__name__') else str(coro)}")

        if main_loop is None:
            log_detailed("ASYNC_ERROR", "Main event loop not available", "ERROR")
            return {"success": False, "error": "Event loop not available"}

        if main_loop.is_closed():
            log_detailed("ASYNC_ERROR", "Main event loop is closed", "ERROR")
            return {"success": False, "error": "Event loop is closed"}

        # Use run_coroutine_threadsafe to run coroutine in main loop
        future = asyncio.run_coroutine_threadsafe(coro, main_loop)
        result = future.result(timeout=30)  # 30 second timeout

        log_detailed("ASYNC_SUCCESS", f"Coroutine completed successfully")
        return result

    except asyncio.TimeoutError:
        log_detailed("ASYNC_ERROR", "Coroutine timed out after 30 seconds", "ERROR")
        return {"success": False, "error": "Operation timed out"}
    except Exception as e:
        log_detailed("ASYNC_ERROR", f"Coroutine failed: {str(e)}", "ERROR")
        log_detailed("ASYNC_ERROR", f"Traceback: {traceback.format_exc()}", "ERROR")
        return {"success": False, "error": str(e)}

# Use the standalone UITelegramScanner - no need to redefine it here

# Initialize scanner
try:
    ui_scanner = UITelegramScanner()
    logger.info("UITelegramScanner initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize UITelegramScanner: {e}")
    ui_scanner = None

print("🔧 Registering Flask routes...")

@app.route('/')
def index():
    """Serve the main UI"""
    print("📄 Serving index.html")
    return send_from_directory('ui', 'index.html')

@app.route('/css/<path:filename>')
def serve_css(filename):
    """Serve CSS files"""
    print(f"🎨 CSS request: {filename}")
    return send_from_directory('ui/css', filename)

@app.route('/js/<path:filename>')
def serve_js(filename):
    """Serve JavaScript files"""
    print(f"📜 JS request: {filename}")
    return send_from_directory('ui/js', filename)

@app.route('/assets/<path:filename>')
def serve_assets(filename):
    """Serve asset files"""
    print(f"🖼️ Assets request: {filename}")
    return send_from_directory('ui/assets', filename)

print("✅ Static file routes registered")

@app.route('/api/test')
def test_api():
    """Test API endpoint"""
    return jsonify({"status": "ok", "message": "API is working"})

@app.route('/debug/routes')
def debug_routes():
    """Debug route để xem tất cả routes"""
    routes = []
    for rule in app.url_map.iter_rules():
        routes.append({
            'endpoint': rule.endpoint,
            'methods': list(rule.methods),
            'rule': rule.rule
        })
    return jsonify({"routes": routes})

@app.route('/api/auth/status')
def get_auth_status():
    """Get authentication status - Fixed Version"""
    log_detailed("API_AUTH_STATUS", "Received auth status request")

    try:
        if not MODULES_AVAILABLE:
            log_detailed("API_AUTH_STATUS", "Modules not available", "ERROR")
            return jsonify({"authenticated": False, "user": None, "error": "Modules not available"})

        if ui_scanner is None:
            log_detailed("API_AUTH_STATUS", "Scanner not initialized", "ERROR")
            return jsonify({"authenticated": False, "user": None, "error": "Scanner not initialized"})

        log_detailed("API_AUTH_STATUS", "Running auth status check...")
        status = run_async_safe(ui_scanner.get_auth_status())

        log_detailed("API_AUTH_STATUS", f"Auth status result: {status.get('authenticated', False)}")
        return jsonify(status)

    except Exception as e:
        log_detailed("API_AUTH_STATUS", f"Auth status check failed: {e}", "ERROR")
        log_detailed("API_AUTH_STATUS", f"Traceback: {traceback.format_exc()}", "ERROR")
        return jsonify({"authenticated": False, "user": None, "error": str(e)})

@app.route('/api/auth/send-code', methods=['POST'])
def send_verification_code():
    """Send verification code to phone number - Fixed Version"""
    log_detailed("API_SEND_CODE", "Received send code request")

    try:
        if not MODULES_AVAILABLE:
            log_detailed("API_SEND_CODE", "Telegram modules not available", "ERROR")
            return jsonify({"success": False, "error": "Telegram modules not available"})

        data = request.get_json()
        if not data:
            log_detailed("API_SEND_CODE", "No data provided", "ERROR")
            return jsonify({"success": False, "error": "No data provided"})

        phone_number = data.get('phone_number')
        if not phone_number:
            log_detailed("API_SEND_CODE", "Phone number is required", "ERROR")
            return jsonify({"success": False, "error": "Phone number is required"})

        log_detailed("API_SEND_CODE", f"Sending code to: {phone_number}")
        result = run_async_safe(ui_scanner.send_code(phone_number))

        log_detailed("API_SEND_CODE", f"Send code result: {result.get('success', False)}")
        return jsonify(result)

    except Exception as e:
        log_detailed("API_SEND_CODE", f"Send code failed: {e}", "ERROR")
        log_detailed("API_SEND_CODE", f"Traceback: {traceback.format_exc()}", "ERROR")
        return jsonify({"success": False, "error": str(e)})

@app.route('/api/auth/verify-code', methods=['POST'])
def verify_code():
    """Verify the received code - Fixed Version"""
    log_detailed("API_VERIFY_CODE", "Received verify code request")

    try:
        if not MODULES_AVAILABLE:
            log_detailed("API_VERIFY_CODE", "Telegram modules not available", "ERROR")
            return jsonify({"success": False, "error": "Telegram modules not available"})

        data = request.get_json()
        if not data:
            log_detailed("API_VERIFY_CODE", "No data provided", "ERROR")
            return jsonify({"success": False, "error": "No data provided"})

        phone_number = data.get('phone_number')
        code = data.get('code')
        phone_code_hash = data.get('phone_code_hash')

        if not all([phone_number, code, phone_code_hash]):
            log_detailed("API_VERIFY_CODE", "Missing required parameters", "ERROR")
            return jsonify({"success": False, "error": "Missing required parameters"})

        log_detailed("API_VERIFY_CODE", f"Verifying code for: {phone_number}")
        result = run_async_safe(
            ui_scanner.verify_code(phone_number, code, phone_code_hash)
        )

        log_detailed("API_VERIFY_CODE", f"Verify code result: {result.get('success', False)}")
        return jsonify(result)

    except Exception as e:
        log_detailed("API_VERIFY_CODE", f"Code verification failed: {e}", "ERROR")
        log_detailed("API_VERIFY_CODE", f"Traceback: {traceback.format_exc()}", "ERROR")
        return jsonify({"success": False, "error": str(e)})

@app.route('/api/auth/verify-2fa', methods=['POST'])
def verify_2fa():
    """Verify 2FA password"""
    try:
        if not MODULES_AVAILABLE:
            return jsonify({"success": False, "error": "Telegram modules not available"})

        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No data provided"})

        password = data.get('password')
        if not password:
            return jsonify({"success": False, "error": "Password is required"})

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(ui_scanner.verify_2fa(password))
        loop.close()

        return jsonify(result)

    except Exception as e:
        logger.error(f"2FA verification failed: {e}")
        return jsonify({"success": False, "error": str(e)})

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    """Logout and disconnect"""
    try:
        if not MODULES_AVAILABLE:
            return jsonify({"success": False, "error": "Telegram modules not available"})

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(ui_scanner.logout())
        loop.close()

        return jsonify(result)

    except Exception as e:
        logger.error(f"Logout failed: {e}")
        return jsonify({"success": False, "error": str(e)})

@app.route('/api/config/phone')
def get_config_phone():
    """Get phone number from config"""
    try:
        if not MODULES_AVAILABLE:
            return jsonify({"phone": "", "error": "Modules not available"})

        from config import CONFIG
        phone = CONFIG.get('telegram', {}).get('phone_number', '')
        return jsonify({"phone": phone})
    except Exception as e:
        logger.error(f"Get config phone failed: {e}")
        return jsonify({"phone": "", "error": str(e)})

@app.route('/api/channels', methods=['GET'])
def get_channels():
    """Get list of channels"""
    return jsonify(ui_scanner.get_channels())

@app.route('/api/channels', methods=['POST'])
def add_channel():
    """Add a new channel"""
    try:
        data = request.get_json()
        channel = data.get('channel')
        channel_type = data.get('type', 'existing')
        max_messages = data.get('maxMessages', 1000)
        
        if not channel:
            return jsonify({"success": False, "error": "Channel is required"})
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(
            ui_scanner.add_channel(channel, channel_type, max_messages)
        )
        loop.close()
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Add channel failed: {e}")
        return jsonify({"success": False, "error": str(e)})

@app.route('/api/channels/<channel_id>/files')
def get_channel_files(channel_id):
    """Get files for a specific channel"""
    return jsonify(ui_scanner.get_channel_files(channel_id))

@app.route('/api/scan', methods=['POST'])
def start_scan():
    """Start scanning a channel"""
    try:
        data = request.get_json()
        channel = data.get('channel')
        file_types = data.get('fileTypes', {})
        
        if not channel:
            return jsonify({"success": False, "error": "Channel is required"})
        
        # Run scan in background thread
        def run_scan():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(
                ui_scanner.scan_channel(channel, file_types)
            )
            loop.close()
            return result
        
        # For now, run synchronously (in production, use background tasks)
        result = run_scan()
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Scan failed: {e}")
        return jsonify({"success": False, "error": str(e)})

@app.route('/api/scan/cancel', methods=['POST'])
def cancel_scan():
    """Cancel current scan"""
    global scan_cancelled
    scan_cancelled = True
    return jsonify({"success": True})

@app.route('/api/files/<file_id>/download')
def download_file(file_id):
    """Get download URL for a file"""
    # This would typically generate a download URL or stream the file
    return jsonify({"success": False, "error": "Download not implemented yet"})

@app.route('/api/export/<format>', methods=['POST'])
def export_files(format):
    """Export files in specified format"""
    try:
        data = request.get_json()
        files = data.get('files', [])
        channel_name = data.get('channel', 'Unknown')
        
        if not files:
            return jsonify({"success": False, "error": "No files to export"})
        
        # Generate export file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"telegram_files_{timestamp}.{format}"
        
        if format == 'json':
            export_data = {
                "channel": channel_name,
                "exported_at": datetime.now().isoformat(),
                "files": files
            }
            
            filepath = os.path.join('output', filename)
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(export_data, f, indent=2, ensure_ascii=False)
            
            return send_file(filepath, as_attachment=True, download_name=filename)
        
        return jsonify({"success": False, "error": f"Format {format} not supported yet"})
        
    except Exception as e:
        logger.error(f"Export failed: {e}")
        return jsonify({"success": False, "error": str(e)})

def initialize_app():
    """Initialize the application"""
    try:
        # Load existing channels
        ui_scanner.load_channels()

        # Check if already authenticated
        if MODULES_AVAILABLE:
            logger.info("TeleDrive UI Server initialized successfully")
        else:
            logger.warning("Running in demo mode - Telegram modules not available")

    except Exception as e:
        logger.error(f"Failed to initialize app: {e}")

def start_event_loop():
    """Start the main asyncio event loop in a separate thread"""
    global main_loop
    log_detailed("EVENT_LOOP", "Starting main event loop...")

    try:
        # Set Windows event loop policy if on Windows
        # Use SelectorEventLoopPolicy instead of ProactorEventLoopPolicy for Telethon compatibility
        if sys.platform == "win32":
            asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
            log_detailed("EVENT_LOOP", "Set Windows SelectorEventLoopPolicy for Telethon compatibility")

        # Create and set the event loop
        main_loop = asyncio.new_event_loop()
        asyncio.set_event_loop(main_loop)

        log_detailed("EVENT_LOOP", "Event loop created and set")

        # Run the event loop forever
        main_loop.run_forever()

    except Exception as e:
        log_detailed("EVENT_LOOP", f"Event loop error: {e}", "ERROR")
    finally:
        log_detailed("EVENT_LOOP", "Event loop stopped")

def stop_event_loop():
    """Stop the main event loop"""
    global main_loop
    if main_loop and not main_loop.is_closed():
        log_detailed("EVENT_LOOP", "Stopping event loop...")
        main_loop.call_soon_threadsafe(main_loop.stop)

if __name__ == '__main__':
    print("🚀 Starting TeleDrive UI Server - Fixed Version...")
    print("=" * 60)

    # Create necessary directories
    os.makedirs('ui/assets', exist_ok=True)
    os.makedirs('output', exist_ok=True)
    os.makedirs('logs', exist_ok=True)

    log_detailed("STARTUP", "Created necessary directories")

    # Copy logo to assets directory
    logo_src = 'logo.png'
    logo_dst = 'ui/assets/logo.png'
    if os.path.exists(logo_src) and not os.path.exists(logo_dst):
        import shutil
        shutil.copy2(logo_src, logo_dst)
        log_detailed("STARTUP", "Logo copied to UI assets")

    # Start the event loop in a separate thread
    log_detailed("STARTUP", "Starting event loop thread...")
    import threading
    loop_thread = threading.Thread(target=start_event_loop, daemon=True)
    loop_thread.start()

    # Wait a bit for the event loop to start
    import time
    time.sleep(1)

    # Initialize the app
    log_detailed("STARTUP", "Initializing application...")
    initialize_app()

    log_detailed("STARTUP", "Starting Flask web server...")
    print("🌐 Starting web server...")
    print("📱 Open your browser and go to: http://localhost:5003")
    print("⏹️  Press Ctrl+C to stop the server")
    print("=" * 60)

    try:
        # Run the Flask app
        app.run(host='0.0.0.0', port=5003, debug=False, use_reloader=False)
    except KeyboardInterrupt:
        log_detailed("SHUTDOWN", "Received shutdown signal")
    finally:
        log_detailed("SHUTDOWN", "Stopping event loop...")
        stop_event_loop()
        log_detailed("SHUTDOWN", "Server shutdown complete")
