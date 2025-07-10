#!/usr/bin/env python3
"""
TeleDrive Web App - Modern Web Interface for Telegram Channel File Management
"""

import asyncio
import os
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, Any

from flask import Flask, render_template, request, jsonify, send_file, redirect, url_for, flash
from flask_socketio import SocketIO, emit
from werkzeug.utils import secure_filename

from teledrive_core import get_teledrive_instance

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'teledrive-secret-key-change-in-production')
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500MB max file size

# Initialize SocketIO for real-time updates
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

# Upload configuration
UPLOAD_FOLDER = Path('./uploads')
UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Global variables
current_channel = None
connection_status = {"connected": False, "user": None}

@app.route('/')
def index():
    """Main dashboard"""
    return render_template('index.html', 
                         connection_status=connection_status,
                         current_channel=current_channel)

@app.route('/files')
def files():
    """Files listing page"""
    channel = request.args.get('channel', current_channel)
    return render_template('files.html', 
                         connection_status=connection_status,
                         channel=channel)

@app.route('/upload')
def upload_page():
    """Upload page"""
    channel = request.args.get('channel', current_channel)
    return render_template('upload.html', 
                         connection_status=connection_status,
                         channel=channel)

# API Routes
@app.route('/api/connect', methods=['POST'])
def api_connect():
    """Connect to Telegram"""
    async def connect_async():
        teledrive = get_teledrive_instance()
        result = await teledrive.connect()
        return result
    
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(connect_async())
        loop.close()
        
        if result["success"]:
            connection_status["connected"] = True
            connection_status["user"] = result.get("user")
            socketio.emit('connection_status', connection_status)
        
        return jsonify(result)
    except Exception as e:
        return jsonify({"success": False, "message": f"Connection error: {str(e)}"})

@app.route('/api/disconnect', methods=['POST'])
def api_disconnect():
    """Disconnect from Telegram"""
    async def disconnect_async():
        teledrive = get_teledrive_instance()
        await teledrive.disconnect()
        return {"success": True, "message": "Disconnected"}
    
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(disconnect_async())
        loop.close()
        
        connection_status["connected"] = False
        connection_status["user"] = None
        socketio.emit('connection_status', connection_status)
        
        return jsonify(result)
    except Exception as e:
        return jsonify({"success": False, "message": f"Disconnect error: {str(e)}"})

@app.route('/api/files/<channel>')
def api_list_files(channel):
    """List files from channel"""
    limit = request.args.get('limit', 50, type=int)
    
    async def list_files_async():
        teledrive = get_teledrive_instance()
        result = await teledrive.list_files(channel, limit)
        return result
    
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(list_files_async())
        loop.close()
        
        global current_channel
        if result["success"]:
            current_channel = channel
        
        return jsonify(result)
    except Exception as e:
        return jsonify({"success": False, "message": f"List files error: {str(e)}", "files": []})

@app.route('/api/search/<channel>')
def api_search_files(channel):
    """Search files in channel"""
    query = request.args.get('q', '')
    limit = request.args.get('limit', 20, type=int)
    
    if not query:
        return jsonify({"success": False, "message": "Search query is required", "files": []})
    
    async def search_files_async():
        teledrive = get_teledrive_instance()
        result = await teledrive.search_files(channel, query, limit)
        return result
    
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(search_files_async())
        loop.close()
        
        return jsonify(result)
    except Exception as e:
        return jsonify({"success": False, "message": f"Search error: {str(e)}", "files": []})

@app.route('/api/download/<channel>/<int:file_id>')
def api_download_file(channel, file_id):
    """Download file from channel"""
    async def download_file_async():
        teledrive = get_teledrive_instance()
        result = await teledrive.download_file(channel, file_id)
        return result
    
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(download_file_async())
        loop.close()
        
        if result["success"]:
            file_path = result["file_path"]
            filename = result["filename"]
            return send_file(file_path, as_attachment=True, download_name=filename)
        else:
            return jsonify(result), 400
    except Exception as e:
        return jsonify({"success": False, "message": f"Download error: {str(e)}"}), 500

@app.route('/api/upload/<channel>', methods=['POST'])
def api_upload_file(channel):
    """Upload file to channel"""
    if 'file' not in request.files:
        return jsonify({"success": False, "message": "No file provided"})
    
    file = request.files['file']
    caption = request.form.get('caption', '')
    
    if file.filename == '':
        return jsonify({"success": False, "message": "No file selected"})
    
    if file:
        filename = secure_filename(file.filename)
        file_path = UPLOAD_FOLDER / filename
        file.save(str(file_path))
        
        async def upload_file_async():
            teledrive = get_teledrive_instance()
            result = await teledrive.upload_file(channel, file_path, caption)
            # Clean up uploaded file
            if file_path.exists():
                file_path.unlink()
            return result
        
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(upload_file_async())
            loop.close()
            
            return jsonify(result)
        except Exception as e:
            # Clean up file on error
            if file_path.exists():
                file_path.unlink()
            return jsonify({"success": False, "message": f"Upload error: {str(e)}"})

@app.route('/api/status')
def api_status():
    """Get connection status"""
    return jsonify(connection_status)

# SocketIO Events
@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    emit('connection_status', connection_status)

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    pass

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return render_template('error.html', 
                         error_code=404, 
                         error_message="Page not found"), 404

@app.errorhandler(500)
def internal_error(error):
    return render_template('error.html', 
                         error_code=500, 
                         error_message="Internal server error"), 500

if __name__ == '__main__':
    print("🚀 Starting TeleDrive Web Interface...")
    print("📱 Access the app at: http://localhost:5000")
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)
