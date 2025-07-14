#!/usr/bin/env python3
"""
TeleDrive UI Server
Flask server to serve the web UI and handle API requests
"""

import os
import json
import asyncio
import threading
from datetime import datetime
from flask import Flask, render_template, jsonify, request, send_file, send_from_directory
from flask_cors import CORS
import logging

# Import existing modules
try:
    from engine import TelegramFileScanner
    from config import CONFIG
    from logger import get_logger, log_step
    from telethon import TelegramClient
    from telethon.errors import PhoneCodeInvalidError, PhoneNumberInvalidError, SessionPasswordNeededError
    from telethon.errors import PhoneCodeExpiredError, PhoneCodeHashEmptyError, PasswordHashInvalidError
    MODULES_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Could not import modules: {e}")
    MODULES_AVAILABLE = False

app = Flask(__name__,
           static_folder='ui',
           static_url_path='')
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global variables
scanner = None
scan_task = None
scan_cancelled = False

class UITelegramScanner:
    """Wrapper for TelegramFileScanner with UI-specific methods"""

    def __init__(self):
        try:
            if MODULES_AVAILABLE:
                logger.info("Initializing TelegramFileScanner...")
                self.scanner = TelegramFileScanner()
                self.client = None
                self.phone_code_hash = None
                self.is_authenticated = False
                self.user_info = None
                logger.info("TelegramFileScanner initialized successfully")
            else:
                self.scanner = None
                self.client = None
                logger.warning("Running in demo mode - no scanner available")
            self.channels = []
            self.current_scan = None
        except Exception as e:
            logger.error(f"Failed to initialize UITelegramScanner: {e}")
            self.scanner = None
            self.client = None
            self.channels = []
            self.current_scan = None
        
    async def initialize(self):
        """Initialize the Telegram client"""
        if self.scanner:
            await self.scanner.initialize()
            return True
        return False
    
    async def get_auth_status(self):
        """Get authentication status"""
        if not MODULES_AVAILABLE:
            return {"authenticated": False, "user": None}

        try:
            if self.is_authenticated and self.user_info:
                return {
                    "authenticated": True,
                    "user": {
                        "first_name": getattr(self.user_info, 'first_name', ''),
                        "last_name": getattr(self.user_info, 'last_name', ''),
                        "phone": getattr(self.user_info, 'phone', ''),
                        "username": getattr(self.user_info, 'username', '')
                    }
                }

            # Try to initialize existing session
            if not self.client:
                from config import CONFIG
                self.client = TelegramClient(
                    CONFIG['telegram']['session_name'],
                    CONFIG['telegram']['api_id'],
                    CONFIG['telegram']['api_hash']
                )

            await self.client.connect()

            if await self.client.is_user_authorized():
                self.user_info = await self.client.get_me()
                self.is_authenticated = True
                return {
                    "authenticated": True,
                    "user": {
                        "first_name": getattr(self.user_info, 'first_name', ''),
                        "last_name": getattr(self.user_info, 'last_name', ''),
                        "phone": getattr(self.user_info, 'phone', ''),
                        "username": getattr(self.user_info, 'username', '')
                    }
                }

        except Exception as e:
            logger.error(f"Auth status check failed: {e}")

        return {"authenticated": False, "user": None}

    async def send_code(self, phone_number):
        """Send verification code to phone number"""
        try:
            if not MODULES_AVAILABLE:
                return {"success": False, "error": "Telegram modules not available"}

            if not self.client:
                from config import CONFIG
                self.client = TelegramClient(
                    CONFIG['telegram']['session_name'],
                    CONFIG['telegram']['api_id'],
                    CONFIG['telegram']['api_hash']
                )

            await self.client.connect()

            # Send code
            sent_code = await self.client.send_code_request(phone_number)
            self.phone_code_hash = sent_code.phone_code_hash

            return {
                "success": True,
                "phone_code_hash": self.phone_code_hash
            }

        except PhoneNumberInvalidError:
            return {"success": False, "error": "Số điện thoại không hợp lệ"}
        except Exception as e:
            logger.error(f"Send code failed: {e}")
            return {"success": False, "error": f"Lỗi gửi mã: {str(e)}"}

    async def verify_code(self, phone_number, code, phone_code_hash):
        """Verify the received code"""
        try:
            if not self.client:
                return {"success": False, "error": "Client not initialized"}

            # Sign in with code
            try:
                user = await self.client.sign_in(phone_number, code, phone_code_hash=phone_code_hash)
                self.user_info = user
                self.is_authenticated = True

                return {
                    "success": True,
                    "requires_2fa": False,
                    "user": {
                        "first_name": getattr(user, 'first_name', ''),
                        "last_name": getattr(user, 'last_name', ''),
                        "phone": getattr(user, 'phone', ''),
                        "username": getattr(user, 'username', '')
                    }
                }

            except SessionPasswordNeededError:
                return {
                    "success": True,
                    "requires_2fa": True,
                    "user": None
                }

        except PhoneCodeInvalidError:
            return {"success": False, "error": "Mã xác thực không đúng"}
        except PhoneCodeExpiredError:
            return {"success": False, "error": "Mã xác thực đã hết hạn"}
        except Exception as e:
            logger.error(f"Code verification failed: {e}")
            return {"success": False, "error": f"Lỗi xác thực: {str(e)}"}

    async def verify_2fa(self, password):
        """Verify 2FA password"""
        try:
            if not self.client:
                return {"success": False, "error": "Client not initialized"}

            user = await self.client.sign_in(password=password)
            self.user_info = user
            self.is_authenticated = True

            return {
                "success": True,
                "user": {
                    "first_name": getattr(user, 'first_name', ''),
                    "last_name": getattr(user, 'last_name', ''),
                    "phone": getattr(user, 'phone', ''),
                    "username": getattr(user, 'username', '')
                }
            }

        except PasswordHashInvalidError:
            return {"success": False, "error": "Mật khẩu không đúng"}
        except Exception as e:
            logger.error(f"2FA verification failed: {e}")
            return {"success": False, "error": f"Lỗi xác thực 2FA: {str(e)}"}

    async def logout(self):
        """Logout and disconnect"""
        try:
            if self.client:
                await self.client.log_out()
                await self.client.disconnect()

            self.client = None
            self.user_info = None
            self.is_authenticated = False
            self.phone_code_hash = None

            return {"success": True}

        except Exception as e:
            logger.error(f"Logout failed: {e}")
            return {"success": False, "error": str(e)}
    
    async def add_channel(self, channel_input, channel_type='existing', max_messages=1000):
        """Add a new channel"""
        try:
            if not self.scanner:
                return {"success": False, "error": "Scanner not available"}
                
            # Get channel entity
            entity = await self.scanner.get_channel_entity(channel_input)
            if not entity:
                return {"success": False, "error": "Channel not found"}
            
            # Create channel info
            channel_info = {
                "id": str(entity.id),
                "name": getattr(entity, 'title', channel_input),
                "username": getattr(entity, 'username', ''),
                "type": channel_type,
                "added_date": datetime.now().isoformat(),
                "fileCount": 0,
                "lastScan": None
            }
            
            # Check if channel already exists
            existing = next((c for c in self.channels if c['id'] == channel_info['id']), None)
            if existing:
                return {"success": False, "error": "Channel already added"}
            
            self.channels.append(channel_info)
            self.save_channels()
            
            return {"success": True, "channel": channel_info}
            
        except Exception as e:
            logger.error(f"Failed to add channel: {e}")
            return {"success": False, "error": str(e)}
    
    async def scan_channel(self, channel_input, file_types=None):
        """Scan a channel for files"""
        try:
            if not self.scanner:
                return {"success": False, "error": "Scanner not available"}
            
            global scan_cancelled
            scan_cancelled = False
            
            # Set file types filter
            if file_types:
                # Update scanner file type settings based on UI selection
                pass
            
            # Get channel entity
            entity = await self.scanner.get_channel_entity(channel_input)
            if not entity:
                return {"success": False, "error": "Channel not found"}
            
            # Scan the channel
            await self.scanner.scan_channel_by_entity(entity)
            
            if scan_cancelled:
                return {"success": False, "error": "Scan cancelled"}
            
            # Update channel info
            channel_id = str(entity.id)
            channel = next((c for c in self.channels if c['id'] == channel_id), None)
            
            if not channel:
                # Add new channel
                channel = {
                    "id": channel_id,
                    "name": getattr(entity, 'title', channel_input),
                    "username": getattr(entity, 'username', ''),
                    "type": "scanned",
                    "added_date": datetime.now().isoformat(),
                    "fileCount": len(self.scanner.files_data),
                    "lastScan": datetime.now().isoformat()
                }
                self.channels.append(channel)
            else:
                channel['fileCount'] = len(self.scanner.files_data)
                channel['lastScan'] = datetime.now().isoformat()
            
            self.save_channels()
            
            # Save scan results
            if self.scanner.files_data:
                await self.scanner.save_results()
            
            return {
                "success": True, 
                "filesFound": len(self.scanner.files_data),
                "channel": channel
            }
            
        except Exception as e:
            logger.error(f"Scan failed: {e}")
            return {"success": False, "error": str(e)}
    
    def get_channels(self):
        """Get list of channels"""
        return {"channels": self.channels}
    
    def get_channel_files(self, channel_id):
        """Get files for a specific channel"""
        # This would typically load from saved results
        # For now, return empty list
        return {"files": []}
    
    def save_channels(self):
        """Save channels to file"""
        try:
            channels_file = os.path.join('output', 'channels.json')
            os.makedirs('output', exist_ok=True)
            
            with open(channels_file, 'w', encoding='utf-8') as f:
                json.dump(self.channels, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Failed to save channels: {e}")
    
    def load_channels(self):
        """Load channels from file"""
        try:
            channels_file = os.path.join('output', 'channels.json')
            if os.path.exists(channels_file):
                with open(channels_file, 'r', encoding='utf-8') as f:
                    self.channels = json.load(f)
        except Exception as e:
            logger.error(f"Failed to load channels: {e}")
            self.channels = []

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
    """Get authentication status"""
    try:
        if not MODULES_AVAILABLE:
            return jsonify({"authenticated": False, "user": None, "error": "Modules not available"})

        if ui_scanner is None:
            return jsonify({"authenticated": False, "user": None, "error": "Scanner not initialized"})

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        status = loop.run_until_complete(ui_scanner.get_auth_status())
        loop.close()
        return jsonify(status)
    except Exception as e:
        logger.error(f"Auth status check failed: {e}")
        return jsonify({"authenticated": False, "user": None, "error": str(e)})

@app.route('/api/auth/send-code', methods=['POST'])
def send_verification_code():
    """Send verification code to phone number"""
    try:
        if not MODULES_AVAILABLE:
            return jsonify({"success": False, "error": "Telegram modules not available"})

        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No data provided"})

        phone_number = data.get('phone_number')
        if not phone_number:
            return jsonify({"success": False, "error": "Phone number is required"})

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(ui_scanner.send_code(phone_number))
        loop.close()

        return jsonify(result)

    except Exception as e:
        logger.error(f"Send code failed: {e}")
        return jsonify({"success": False, "error": str(e)})

@app.route('/api/auth/verify-code', methods=['POST'])
def verify_code():
    """Verify the received code"""
    try:
        if not MODULES_AVAILABLE:
            return jsonify({"success": False, "error": "Telegram modules not available"})

        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No data provided"})

        phone_number = data.get('phone_number')
        code = data.get('code')
        phone_code_hash = data.get('phone_code_hash')

        if not all([phone_number, code, phone_code_hash]):
            return jsonify({"success": False, "error": "Missing required parameters"})

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(
            ui_scanner.verify_code(phone_number, code, phone_code_hash)
        )
        loop.close()

        return jsonify(result)

    except Exception as e:
        logger.error(f"Code verification failed: {e}")
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

if __name__ == '__main__':
    print("🚀 Starting TeleDrive UI Server...")
    print("=" * 50)
    
    # Create necessary directories
    os.makedirs('ui/assets', exist_ok=True)
    os.makedirs('output', exist_ok=True)
    
    # Copy logo to assets directory
    logo_src = 'logo.png'
    logo_dst = 'ui/assets/logo.png'
    if os.path.exists(logo_src) and not os.path.exists(logo_dst):
        import shutil
        shutil.copy2(logo_src, logo_dst)
        print("✅ Logo copied to UI assets")
    
    # Initialize the app
    initialize_app()
    
    print("🌐 Starting web server...")
    print("📱 Open your browser and go to: http://localhost:5003")
    print("⏹️  Press Ctrl+C to stop the server")
    print("=" * 50)
    
    # Run the Flask app with debug mode to see request logs
    app.run(host='0.0.0.0', port=5003, debug=True, use_reloader=False)
