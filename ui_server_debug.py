#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import os
import json
import asyncio
import logging
from datetime import datetime
from flask import Flask, jsonify, request, send_file, send_from_directory
from flask_cors import CORS

print("Starting imports...")

# Import existing modules
try:
    from engine import TelegramFileScanner
    from config import CONFIG
    from logger import get_logger, log_step
    from telethon import TelegramClient
    from telethon.errors import PhoneCodeInvalidError, PhoneNumberInvalidError, SessionPasswordNeededError
    from telethon.errors import PhoneCodeExpiredError, PhoneCodeHashEmptyError, PasswordHashInvalidError
    MODULES_AVAILABLE = True
    print("✅ All modules imported successfully")
except ImportError as e:
    print(f"❌ Warning: Could not import modules: {e}")
    MODULES_AVAILABLE = False

print("Creating Flask app...")
app = Flask(__name__, 
           static_folder='ui', 
           static_url_path='/static')
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

print("Defining routes...")

@app.route('/')
def index():
    """Serve the main UI"""
    return send_from_directory('ui', 'index.html')

@app.route('/api/test')
def test_api():
    """Test API endpoint"""
    return jsonify({"status": "ok", "message": "API is working"})

@app.route('/api/auth/status')
def get_auth_status():
    """Get authentication status"""
    try:
        if not MODULES_AVAILABLE:
            return jsonify({"authenticated": False, "user": None, "error": "Modules not available"})
        
        return jsonify({"authenticated": False, "user": None, "message": "Debug mode"})
    except Exception as e:
        logger.error(f"Auth status check failed: {e}")
        return jsonify({"authenticated": False, "user": None, "error": str(e)})

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

print("Routes defined successfully")

if __name__ == '__main__':
    print("🚀 Starting TeleDrive UI Server (Debug)...")
    print("=" * 50)
    
    print("🌐 Starting web server...")
    print("📱 Open your browser and go to: http://localhost:5002")
    print("⏹️  Press Ctrl+C to stop the server")
    print("=" * 50)
    
    # Run the Flask app
    app.run(host='0.0.0.0', port=5002, debug=True, use_reloader=False)
