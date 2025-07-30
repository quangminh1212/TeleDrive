#!/usr/bin/env python3
"""
Simplified TeleDrive Web Interface - bypasses complex logging
"""

import os
import sys
import json
from pathlib import Path
from flask import Flask, render_template, request, jsonify, redirect, url_for, send_from_directory
from flask_socketio import SocketIO

# Disable detailed logging
os.environ['DISABLE_DETAILED_LOGGING'] = '1'

# Add source to path
sys.path.insert(0, 'source')

# Import Flask configuration
import flask_config

# Initialize Flask app
project_root = Path(__file__).parent
template_folder = project_root / 'templates'
static_folder = project_root / 'static'

app = Flask(__name__, 
           template_folder=str(template_folder),
           static_folder=str(static_folder))

# Load configuration
flask_app_config = flask_config.flask_config.get_flask_config()
app.config.update(flask_app_config)

# Initialize SocketIO
socketio = SocketIO(app, cors_allowed_origins="*")

# Create directories
flask_config.flask_config.create_directories()

print("✅ Flask app initialized successfully")

# Mock user for templates
class MockUser:
    def __init__(self):
        self.is_authenticated = False
        self.username = 'Guest'
        self.id = None

mock_user = MockUser()

@app.context_processor
def inject_user():
    """Inject current_user into all templates"""
    return dict(current_user=mock_user)

# Basic routes
@app.route('/')
def dashboard():
    """Main dashboard"""
    return render_template('index.html', files=[])

@app.route('/scan')
def scan_page():
    """Scan page"""
    return render_template('scan.html')

@app.route('/search')
def search_page():
    """Search page"""
    return render_template('search.html')

@app.route('/settings')
def settings():
    """Settings page"""
    return render_template('settings.html', config={})

@app.route('/login')
def login():
    """Login page"""
    return "Login page (not implemented in simple app)"

@app.route('/logout')
def logout():
    """Logout page"""
    return "Logout page (not implemented in simple app)"

@app.route('/register')
def register():
    """Register page"""
    return "Register page (not implemented in simple app)"

@app.route('/favicon.ico')
def favicon():
    """Handle favicon"""
    return '', 204

@app.route('/.well-known/appspecific/com.chrome.devtools.json')
def chrome_devtools():
    """Handle Chrome DevTools"""
    return '', 204

# Error handlers
@app.errorhandler(404)
def not_found_error(error):
    """Handle 404 errors"""
    return render_template('errors/404.html'), 404

@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    return render_template('errors/500.html'), 500

# SocketIO events
@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    print("Client connected")

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    print("Client disconnected")

if __name__ == '__main__':
    print("🌐 Starting TeleDrive Web Interface (Simplified)...")
    
    # Get server configuration
    server_config = flask_config.flask_config.get_server_config()
    
    print("=" * 60)
    print("✅ TeleDrive Ready!")
    print("=" * 60)
    print(f"📱 Access at: http://{server_config['host']}:{server_config['port']}")
    print(f"🎨 Enhanced Scan: http://{server_config['host']}:{server_config['port']}/scan")
    print(f"🔍 Search: http://{server_config['host']}:{server_config['port']}/search")
    print(f"⚙️  Settings: http://{server_config['host']}:{server_config['port']}/settings")
    print("=" * 60)
    print("⏹️  Press Ctrl+C to stop")
    print("=" * 60)
    
    # Start server
    socketio_config = {
        'host': server_config['host'],
        'port': server_config['port'],
        'debug': server_config['debug']
    }
    
    try:
        socketio.run(app, **socketio_config)
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
