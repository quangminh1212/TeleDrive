#!/usr/bin/env python3
"""
TeleDrive Web Interface
Flask web application for Telegram file scanning with Google Drive-like UI
"""

import os
import json
import asyncio
import threading
from datetime import datetime
from flask import Flask, render_template, request, jsonify, redirect, url_for, send_from_directory
from flask_socketio import SocketIO, emit
import eventlet

# Import existing modules
from engine import TelegramFileScanner
from config_manager import ConfigManager
import config

# Import database modules
from database import configure_flask_app, initialize_database
from models import db, User, File, Folder, ScanSession, get_or_create_user

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = 'teledrive_secret_key_2025'

# Configure database
configure_flask_app(app)

# Initialize SocketIO
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

# Initialize database on first run
try:
    with app.app_context():
        db.create_all()
        # Ensure default user exists
        default_user = get_or_create_user()
        print("✅ Database initialized successfully")
except Exception as e:
    print(f"⚠️ Database initialization warning: {e}")

# Global variables
scanner = None
scanning_active = False
scan_progress = {'current': 0, 'total': 0, 'status': 'idle'}

class WebTelegramScanner(TelegramFileScanner):
    """Extended scanner with web interface support"""

    def __init__(self, socketio_instance, user_id=None):
        super().__init__()
        self.socketio = socketio_instance
        self.user_id = user_id or get_or_create_user().id
        self.scan_session = None
        
    async def scan_channel_with_progress(self, channel_input):
        """Scan channel with real-time progress updates"""
        global scan_progress, scanning_active
        
        try:
            scanning_active = True
            scan_progress = {'current': 0, 'total': 0, 'status': 'connecting'}
            self.socketio.emit('scan_progress', scan_progress)

            # Create scan session in database
            self.scan_session = ScanSession(
                channel_name=channel_input,
                user_id=self.user_id,
                status='running'
            )
            db.session.add(self.scan_session)
            db.session.commit()

            # Initialize scanner
            await self.initialize()

            # Get channel entity
            scan_progress['status'] = 'resolving_channel'
            self.socketio.emit('scan_progress', scan_progress)

            entity = await self.resolve_channel(channel_input)
            if not entity:
                scan_progress['status'] = 'error'
                scan_progress['error'] = 'Could not resolve channel'
                self.scan_session.status = 'failed'
                self.scan_session.error_message = 'Could not resolve channel'
                self.scan_session.completed_at = datetime.utcnow()
                db.session.commit()
                self.socketio.emit('scan_progress', scan_progress)
                return False

            # Update scan session with channel info
            if hasattr(entity, 'id'):
                self.scan_session.channel_id = str(entity.id)
            if hasattr(entity, 'title'):
                self.scan_session.channel_name = entity.title
            db.session.commit()
                
            # Get total messages
            scan_progress['status'] = 'counting_messages'
            self.socketio.emit('scan_progress', scan_progress)

            total_messages = await self.get_total_messages(entity)
            scan_progress['total'] = total_messages
            self.scan_session.total_messages = total_messages
            scan_progress['status'] = 'scanning'
            self.socketio.emit('scan_progress', scan_progress)
            db.session.commit()

            # Get or create folder for this scan
            folder_name = f"Scan_{self.scan_session.channel_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            scan_folder = Folder(
                name=folder_name,
                user_id=self.user_id,
                path=folder_name
            )
            db.session.add(scan_folder)
            db.session.commit()

            # Scan messages
            processed = 0
            files_saved = 0
            async for message in self.client.iter_messages(entity, limit=config.MAX_MESSAGES):
                if not scanning_active:  # Check if scan was cancelled
                    break

                file_info = self.extract_file_info(message)
                if file_info and self.should_include_file_type(file_info['file_type']):
                    # Save to database instead of just appending to list
                    try:
                        file_record = File(
                            filename=file_info.get('filename', ''),
                            original_filename=file_info.get('filename', ''),
                            file_size=file_info.get('file_size', 0),
                            mime_type=file_info.get('mime_type', ''),
                            folder_id=scan_folder.id,
                            user_id=self.user_id,
                            telegram_message_id=file_info.get('message_id'),
                            telegram_channel=self.scan_session.channel_name,
                            telegram_channel_id=self.scan_session.channel_id,
                            telegram_date=datetime.fromisoformat(
                                file_info['date'].replace('Z', '+00:00')
                            ) if file_info.get('date') else None
                        )

                        # Set metadata
                        metadata = {
                            'download_url': file_info.get('download_url', ''),
                            'file_type': file_info.get('file_type', ''),
                            'sender': file_info.get('sender', '')
                        }
                        file_record.set_metadata(metadata)

                        db.session.add(file_record)
                        files_saved += 1

                        # Commit every 50 files to avoid memory issues
                        if files_saved % 50 == 0:
                            db.session.commit()

                    except Exception as e:
                        print(f"Error saving file to database: {e}")
                        continue

                processed += 1
                scan_progress['current'] = processed
                scan_progress['files_found'] = files_saved

                # Update scan session
                self.scan_session.messages_scanned = processed
                self.scan_session.files_found = files_saved

                # Update progress every 10 messages
                if processed % 10 == 0:
                    self.socketio.emit('scan_progress', scan_progress)
                    db.session.commit()
            
            # Final commit and save results
            scan_progress['status'] = 'saving'
            self.socketio.emit('scan_progress', scan_progress)

            # Commit any remaining files
            db.session.commit()

            # Also save to traditional files for backward compatibility
            await self.save_results()

            # Update scan session as completed
            self.scan_session.status = 'completed'
            self.scan_session.completed_at = datetime.now()
            self.scan_session.files_found = files_saved
            self.scan_session.messages_scanned = processed
            db.session.commit()

            scan_progress['status'] = 'completed'
            scan_progress['files_found'] = files_saved
            self.socketio.emit('scan_progress', scan_progress)
            self.socketio.emit('scan_complete', {
                'success': True,
                'files_found': files_saved,
                'messages_scanned': processed,
                'scan_session_id': self.scan_session.id,
                'folder_id': scan_folder.id,
                'message': f'Scan completed! Found {files_saved} files'
            })

            return True

        except Exception as e:
            # Update scan session as failed
            if self.scan_session:
                self.scan_session.status = 'failed'
                self.scan_session.error_message = str(e)
                self.scan_session.completed_at = datetime.now()
                db.session.commit()

            scan_progress['status'] = 'error'
            scan_progress['error'] = str(e)
            self.socketio.emit('scan_progress', scan_progress)
            self.socketio.emit('scan_complete', {
                'success': False,
                'error': str(e)
            })
            return False
        finally:
            scanning_active = False

@app.route('/')
def dashboard():
    """Main dashboard page"""
    # Get recent files from database
    recent_files = File.query.filter_by(is_deleted=False).order_by(File.created_at.desc()).limit(10).all()

    # Convert to format expected by template
    files = []
    for file_record in recent_files:
        files.append({
            'id': file_record.id,
            'name': file_record.filename,
            'size': file_record.file_size or 0,
            'modified': file_record.created_at.strftime('%Y-%m-%d %H:%M:%S') if file_record.created_at else '',
            'folder_name': file_record.folder.name if file_record.folder else 'Root',
            'file_type': file_record.get_file_type(),
            'telegram_channel': file_record.telegram_channel
        })

    # Also get traditional output files for backward compatibility
    output_files = []
    if os.path.exists('output'):
        for file in os.listdir('output'):
            if file.endswith(('.json', '.csv', '.xlsx')):
                file_path = os.path.join('output', file)
                stat = os.stat(file_path)
                output_files.append({
                    'name': file,
                    'size': stat.st_size,
                    'modified': datetime.fromtimestamp(stat.st_mtime).strftime('%Y-%m-%d %H:%M:%S'),
                    'is_output_file': True
                })

    output_files.sort(key=lambda x: x['modified'], reverse=True)

    # Combine files for display (database files first, then output files)
    all_files = files + output_files[:5]  # Limit output files to 5

    return render_template('index.html', files=all_files)

@app.route('/settings')
def settings():
    """Settings page for API configuration"""
    cm = ConfigManager()
    current_config = cm.load_config()
    
    return render_template('settings.html', config=current_config)

@app.route('/scan')
def scan_page():
    """Channel scanning page"""
    return render_template('scan.html')

@app.route('/api/save_settings', methods=['POST'])
def save_settings():
    """Save API settings"""
    try:
        data = request.get_json()
        
        cm = ConfigManager()
        current_config = cm.load_config()
        
        # Update telegram settings
        current_config['telegram']['api_id'] = data.get('api_id', '')
        current_config['telegram']['api_hash'] = data.get('api_hash', '')
        current_config['telegram']['phone_number'] = data.get('phone_number', '')
        
        # Save config
        cm.save_config(current_config)
        
        # Also update .env file
        env_content = f"""# Telegram API Credentials
# Get from https://my.telegram.org/apps
TELEGRAM_API_ID={data.get('api_id', '')}
TELEGRAM_API_HASH={data.get('api_hash', '')}
TELEGRAM_PHONE={data.get('phone_number', '')}
"""
        with open('.env', 'w', encoding='utf-8') as f:
            f.write(env_content)
        
        return jsonify({'success': True, 'message': 'Settings saved successfully'})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/start_scan', methods=['POST'])
def start_scan():
    """Start channel scanning"""
    global scanner, scanning_active
    
    try:
        data = request.get_json()
        channel_input = data.get('channel', '').strip()
        
        if not channel_input:
            return jsonify({'success': False, 'error': 'Channel input is required'})
        
        if scanning_active:
            return jsonify({'success': False, 'error': 'Scan already in progress'})
        
        # Create new scanner instance
        scanner = WebTelegramScanner(socketio)
        
        # Start scanning in background thread
        def run_scan():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(scanner.scan_channel_with_progress(channel_input))
            loop.close()
        
        thread = threading.Thread(target=run_scan)
        thread.daemon = True
        thread.start()
        
        return jsonify({'success': True, 'message': 'Scan started'})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/stop_scan', methods=['POST'])
def stop_scan():
    """Stop current scan"""
    global scanning_active
    
    scanning_active = False
    return jsonify({'success': True, 'message': 'Scan stopped'})

@app.route('/api/get_files')
def get_files():
    """Get list of files from database and output directory"""
    # Get files from database
    db_files = File.query.filter_by(is_deleted=False).order_by(File.created_at.desc()).all()

    files = []
    for file_record in db_files:
        files.append({
            'id': file_record.id,
            'name': file_record.filename,
            'size': file_record.file_size or 0,
            'modified': file_record.created_at.strftime('%Y-%m-%d %H:%M:%S') if file_record.created_at else '',
            'folder_name': file_record.folder.name if file_record.folder else 'Root',
            'file_type': file_record.get_file_type(),
            'telegram_channel': file_record.telegram_channel,
            'source': 'database',
            'type': file_record.get_file_type().upper()
        })

    # Also include output files for backward compatibility
    if os.path.exists('output'):
        for file in os.listdir('output'):
            if file.endswith(('.json', '.csv', '.xlsx')):
                file_path = os.path.join('output', file)
                stat = os.stat(file_path)
                files.append({
                    'name': file,
                    'size': stat.st_size,
                    'modified': datetime.fromtimestamp(stat.st_mtime).strftime('%Y-%m-%d %H:%M:%S'),
                    'type': file.split('.')[-1].upper(),
                    'source': 'output'
                })

    files.sort(key=lambda x: x['modified'], reverse=True)
    return jsonify(files)

@app.route('/download/<filename>')
def download_file(filename):
    """Download output files"""
    try:
        # Security check - only allow files from output directory
        if not filename.endswith(('.json', '.csv', '.xlsx')):
            return jsonify({'error': 'Invalid file type'}), 400

        # Check if file exists
        file_path = os.path.join('output', filename)
        if not os.path.exists(file_path):
            return jsonify({'error': 'File not found'}), 404

        return send_from_directory('output', filename, as_attachment=True)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/delete_file', methods=['POST'])
def delete_file():
    """Delete a file from database or output directory"""
    try:
        data = request.get_json()
        filename = data.get('filename', '').strip()
        file_id = data.get('id')

        if not filename and not file_id:
            return jsonify({'success': False, 'error': 'Filename or file ID is required'})

        # Try to delete from database first
        if file_id:
            file_record = File.query.get(file_id)
            if file_record:
                # Mark as deleted instead of actually deleting
                file_record.is_deleted = True
                db.session.commit()
                return jsonify({'success': True, 'message': f'File {file_record.filename} deleted successfully'})

        # If not found in database, try output directory (backward compatibility)
        if filename:
            # Security check - only allow files from output directory
            if not filename.endswith(('.json', '.csv', '.xlsx')):
                return jsonify({'success': False, 'error': 'Invalid file type'})

            # Check if file exists
            file_path = os.path.join('output', filename)
            if os.path.exists(file_path):
                # Delete the file
                os.remove(file_path)
                return jsonify({'success': True, 'message': f'File {filename} deleted successfully'})

        return jsonify({'success': False, 'error': 'File not found'})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    emit('connected', {'status': 'Connected to TeleDrive'})

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    pass

if __name__ == '__main__':
    print("🌐 Starting TeleDrive Web Interface...")
    print("📱 Access at: http://localhost:3000")
    print("⏹️  Press Ctrl+C to stop")
    
    # Create necessary directories
    os.makedirs('templates', exist_ok=True)
    os.makedirs('static/css', exist_ok=True)
    os.makedirs('static/js', exist_ok=True)
    os.makedirs('output', exist_ok=True)
    os.makedirs('logs', exist_ok=True)
    
    socketio.run(app, host='0.0.0.0', port=3000, debug=False)
