#!/usr/bin/env python3
"""
Simple server without Telegram initialization
"""

import sys
import os
sys.path.insert(0, 'source')

from flask import Flask, render_template, jsonify
from flask_socketio import SocketIO
import flask_config

print("🚀 Starting simple server...")

# Create simple Flask app
app = Flask(__name__, 
           template_folder='templates',
           static_folder='static')

# Load basic configuration
flask_app_config = flask_config.flask_config.get_flask_config()
app.config.update(flask_app_config)

# Initialize SocketIO
socketio_config = flask_config.flask_config.get_socketio_config()
socketio = SocketIO(app,
                   cors_allowed_origins=socketio_config['cors_allowed_origins'],
                   async_mode=socketio_config['async_mode'])

@app.route('/')
def index():
    """Simple index page"""
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>TeleDrive - Simple Test</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 50px; }
            .container { max-width: 600px; margin: 0 auto; text-align: center; }
            .status { padding: 20px; background: #e8f5e8; border-radius: 5px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🚀 TeleDrive Server Test</h1>
            <div class="status">
                <h2>✅ Server is running successfully!</h2>
                <p>Port: 3000</p>
                <p>Status: Active</p>
            </div>
            <p>This is a simple test to verify the server can start properly.</p>
        </div>
    </body>
    </html>
    """

@app.route('/api/status')
def api_status():
    """API status endpoint"""
    return jsonify({
        'status': 'running',
        'message': 'TeleDrive server is active',
        'port': 3000
    })

@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    print("Client connected")

if __name__ == '__main__':
    try:
        server_config = flask_config.flask_config.get_server_config()
        print(f"✅ Starting server on {server_config['host']}:{server_config['port']}")
        
        socketio.run(app, 
                    host=server_config['host'], 
                    port=server_config['port'], 
                    debug=False,
                    use_reloader=False)
                    
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
