#!/usr/bin/env python3
"""
TeleDrive Web Application - Google Drive-like interface for Telegram file management
"""

import os
import json
import asyncio
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

from flask import Flask, render_template, request, jsonify, send_file, redirect, url_for, flash
from flask_cors import CORS
from werkzeug.utils import secure_filename

# Import existing modules
from engine import TelegramFileScanner
from main import PrivateChannelScanner
import config

# Initialize Flask app
app = Flask(__name__)
app.secret_key = 'teledrive_secret_key_2024'
CORS(app)

# Configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'mp4', 'mp3', 'doc', 'docx', 'zip', 'rar'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500MB max file size

# Ensure directories exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs('output', exist_ok=True)
os.makedirs('templates', exist_ok=True)
os.makedirs('static/css', exist_ok=True)
os.makedirs('static/js', exist_ok=True)
os.makedirs('static/images', exist_ok=True)

# Global scanner instance
scanner = None

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_file_icon(file_type, mime_type=None):
    """Get appropriate icon for file type"""
    icons = {
        'document': 'fas fa-file-alt',
        'photo': 'fas fa-image',
        'video': 'fas fa-video',
        'audio': 'fas fa-music',
        'voice': 'fas fa-microphone',
        'sticker': 'fas fa-smile',
        'animation': 'fas fa-film',
        'folder': 'fas fa-folder',
        'default': 'fas fa-file'
    }
    return icons.get(file_type, icons['default'])

def format_file_size(size_bytes):
    """Format file size in human readable format"""
    if not size_bytes:
        return "0 B"
    
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if size_bytes < 1024.0:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.1f} PB"

def load_scanned_files():
    """Load previously scanned files from output directory"""
    files = []
    output_dir = Path('output')
    
    if not output_dir.exists():
        return files
    
    # Look for JSON files
    for json_file in output_dir.glob('*_telegram_files.json'):
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if 'files' in data:
                    for file_info in data['files']:
                        file_data = file_info.get('file_info', {})
                        files.append({
                            'id': file_data.get('message_id', ''),
                            'name': file_data.get('file_name', 'Unknown'),
                            'size': file_data.get('file_size', 0),
                            'type': file_data.get('file_type', 'unknown'),
                            'mime_type': file_data.get('mime_type', ''),
                            'date': file_data.get('date', ''),
                            'icon': get_file_icon(file_data.get('file_type', 'unknown')),
                            'formatted_size': format_file_size(file_data.get('file_size', 0)),
                            'source': 'telegram'
                        })
        except Exception as e:
            print(f"Error loading {json_file}: {e}")
    
    return files

@app.route('/')
def index():
    """Main dashboard page"""
    files = load_scanned_files()
    return render_template('index.html', files=files, total_files=len(files))

@app.route('/api/files')
def api_files():
    """API endpoint to get files list"""
    files = load_scanned_files()
    return jsonify({
        'success': True,
        'files': files,
        'total': len(files)
    })

@app.route('/api/scan', methods=['POST'])
def api_scan():
    """API endpoint to start Telegram channel scan"""
    try:
        data = request.get_json()
        channel_input = data.get('channel', '').strip()

        if not channel_input:
            return jsonify({'success': False, 'error': 'Channel input is required'})

        # Import web scanner
        from web_scanner import start_channel_scan

        # Prepare scan options
        scan_options = {
            'scan_documents': data.get('scan_documents', True),
            'scan_photos': data.get('scan_photos', True),
            'scan_videos': data.get('scan_videos', True),
            'scan_audio': data.get('scan_audio', True),
            'scan_voice': data.get('scan_voice', False),
            'scan_stickers': data.get('scan_stickers', False),
            'max_messages': data.get('max_messages')
        }

        # Start the scan
        scan_id = start_channel_scan(channel_input, scan_options)

        if scan_id:
            return jsonify({
                'success': True,
                'message': f'Scanning started for channel: {channel_input}',
                'scan_id': scan_id
            })
        else:
            return jsonify({'success': False, 'error': 'Failed to start scan'})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/upload', methods=['POST'])
def api_upload():
    """API endpoint for file upload"""
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No file provided'})
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'error': 'No file selected'})
        
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{timestamp}_{filename}"
            
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)
            
            return jsonify({
                'success': True,
                'message': 'File uploaded successfully',
                'filename': filename,
                'size': os.path.getsize(file_path)
            })
        else:
            return jsonify({'success': False, 'error': 'File type not allowed'})
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/scan')
def scan_page():
    """Telegram channel scanning page"""
    return render_template('scan.html')

@app.route('/settings')
def settings_page():
    """Settings and configuration page"""
    return render_template('settings.html')

@app.route('/api/config')
def api_config():
    """Get current configuration"""
    try:
        config_data = {
            'telegram': {
                'api_id': getattr(config, 'API_ID', ''),
                'api_hash': '••••••••••••••••' if getattr(config, 'API_HASH', '') else '',
                'phone_number': getattr(config, 'PHONE_NUMBER', ''),
                'configured': bool(getattr(config, 'API_ID', '') and getattr(config, 'PHONE_NUMBER', ''))
            },
            'scanning': {
                'max_messages': getattr(config, 'MAX_MESSAGES', None),
                'scan_documents': getattr(config, 'SCAN_DOCUMENTS', True),
                'scan_photos': getattr(config, 'SCAN_PHOTOS', True),
                'scan_videos': getattr(config, 'SCAN_VIDEOS', True),
                'scan_audio': getattr(config, 'SCAN_AUDIO', True),
                'scan_voice': getattr(config, 'SCAN_VOICE', False),
                'scan_stickers': getattr(config, 'SCAN_STICKERS', False)
            }
        }
        return jsonify({'success': True, 'config': config_data})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/config/<section>', methods=['POST'])
def api_config_update(section):
    """Update configuration section"""
    try:
        data = request.get_json()

        if section == 'telegram':
            # Update Telegram configuration
            from config_manager import ConfigManager
            cm = ConfigManager()

            # Update config.json
            current_config = cm.load_config()
            if 'telegram' not in current_config:
                current_config['telegram'] = {}

            if 'api_id' in data:
                current_config['telegram']['api_id'] = data['api_id']
            if 'api_hash' in data:
                current_config['telegram']['api_hash'] = data['api_hash']
            if 'phone_number' in data:
                current_config['telegram']['phone_number'] = data['phone_number']

            cm.save_config(current_config)

            # Also update .env file for compatibility
            cm.sync_config_to_env()

            return jsonify({'success': True, 'message': 'Telegram configuration updated'})

        elif section == 'scanning':
            # Update scanning preferences
            from config_manager import ConfigManager
            cm = ConfigManager()

            current_config = cm.load_config()
            if 'scanning' not in current_config:
                current_config['scanning'] = {}

            current_config['scanning'].update(data)
            cm.save_config(current_config)

            return jsonify({'success': True, 'message': 'Scanning preferences updated'})

        else:
            return jsonify({'success': False, 'error': 'Unknown configuration section'})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/telegram/test', methods=['POST'])
def api_telegram_test():
    """Test Telegram connection"""
    try:
        import asyncio
        from web_scanner import test_telegram_connection

        # Run async test in sync context
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        try:
            result = loop.run_until_complete(test_telegram_connection())
            if result:
                return jsonify({'success': True, 'message': 'Connection test successful'})
            else:
                return jsonify({'success': False, 'error': 'Connection test failed'})
        finally:
            loop.close()

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/scan/status/<scan_id>')
def api_scan_status(scan_id):
    """Get scan status"""
    try:
        from web_scanner import get_scan_progress

        status = get_scan_progress(scan_id)
        if status:
            return jsonify({
                'success': True,
                'scan_id': scan_id,
                **status
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Scan not found'
            })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/scan/cancel/<scan_id>', methods=['POST'])
def api_scan_cancel(scan_id):
    """Cancel a scan"""
    try:
        from web_scanner import cancel_scan

        if cancel_scan(scan_id):
            return jsonify({'success': True, 'message': 'Scan cancelled'})
        else:
            return jsonify({'success': False, 'error': 'Could not cancel scan'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/files/<file_id>/download')
def api_file_download(file_id):
    """Download a specific file"""
    try:
        # In a real implementation, you'd download from Telegram
        return jsonify({'success': False, 'error': 'Download functionality not implemented yet'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/cleanup', methods=['POST'])
def api_cleanup():
    """Cleanup old files"""
    try:
        import os
        import time

        output_dir = Path('output')
        if not output_dir.exists():
            return jsonify({'success': True, 'files_removed': 0})

        # Remove files older than 30 days
        cutoff_time = time.time() - (30 * 24 * 60 * 60)
        files_removed = 0

        for file_path in output_dir.glob('*'):
            if file_path.is_file() and file_path.stat().st_mtime < cutoff_time:
                file_path.unlink()
                files_removed += 1

        return jsonify({'success': True, 'files_removed': files_removed})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/admin/<action>', methods=['POST'])
def api_admin_action(action):
    """Perform administrative actions"""
    try:
        if action == 'clear-data':
            # Clear all scan data
            output_dir = Path('output')
            if output_dir.exists():
                import shutil
                shutil.rmtree(output_dir)
                output_dir.mkdir()

            return jsonify({'success': True, 'message': 'All scan data cleared'})

        elif action == 'reset-config':
            # Reset configuration to defaults
            from config_manager import ConfigManager
            cm = ConfigManager()
            cm.reset_to_defaults()

            return jsonify({'success': True, 'message': 'Configuration reset to defaults'})

        elif action == 'delete-session':
            # Delete Telegram session files
            session_files = ['telegram_scanner_session.session', 'data/telegram_scanner_session.session']
            for session_file in session_files:
                session_path = Path(session_file)
                if session_path.exists():
                    session_path.unlink()

            return jsonify({'success': True, 'message': 'Telegram session deleted'})

        else:
            return jsonify({'success': False, 'error': 'Unknown action'})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

if __name__ == '__main__':
    print("🚀 Starting TeleDrive Web Application...")
    print("📱 Access the interface at: http://localhost:5000")
    print("🔧 Make sure to configure your Telegram API credentials in settings")

    app.run(debug=True, host='0.0.0.0', port=5000)
