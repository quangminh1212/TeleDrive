#!/usr/bin/env python3
"""
TeleDrive Web Interface
Flask web application for Telegram file scanning with Google Drive-like UI
"""

import os
import json
import asyncio
import threading
import re
import secrets
from datetime import datetime, timedelta
from pathlib import Path
from werkzeug.utils import secure_filename
from flask import Flask, render_template, request, jsonify, redirect, url_for, send_from_directory, flash
from flask_socketio import SocketIO, emit
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from flask_wtf.csrf import CSRFProtect
import eventlet

# Import existing modules
from engine import TelegramFileScanner
from config_manager import ConfigManager
import config

# Import database modules
from database import configure_flask_app, initialize_database
from models import db, User, File, Folder, ScanSession, ShareLink, get_or_create_user

# Import forms
from forms import LoginForm, RegistrationForm, ChangePasswordForm

# Import Flask configuration loader
from flask_config import flask_config

# Initialize Flask app
app = Flask(__name__)

# Load configuration from config.json
flask_app_config = flask_config.get_flask_config()
app.config.update(flask_app_config)

# Create necessary directories
flask_config.create_directories()

# Configure database
configure_flask_app(app)

# Initialize CSRF Protection
csrf = CSRFProtect(app)

# Initialize Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)

# Configure Flask-Login from config file
login_config = flask_config.get_login_config()
login_manager.login_view = login_config['login_view']
login_manager.login_message = login_config['login_message']
login_manager.login_message_category = login_config['login_message_category']

@login_manager.user_loader
def load_user(user_id):
    """Load user by ID for Flask-Login"""
    return User.query.get(int(user_id))

# Initialize SocketIO
socketio_config = flask_config.get_socketio_config()
socketio = SocketIO(app,
                   cors_allowed_origins=socketio_config['cors_allowed_origins'],
                   async_mode=socketio_config['async_mode'])

# Security functions
def sanitize_filename(filename):
    """Sanitize filename to prevent path traversal and other security issues"""
    if not filename:
        return None

    # Use werkzeug's secure_filename as base
    filename = secure_filename(filename)

    # Additional sanitization
    # Remove any remaining path separators
    filename = filename.replace('/', '_').replace('\\', '_')

    # Remove or replace dangerous characters
    filename = re.sub(r'[<>:"|?*]', '_', filename)

    # Limit filename length
    if len(filename) > 255:
        name, ext = os.path.splitext(filename)
        filename = name[:255-len(ext)] + ext

    # Ensure filename is not empty after sanitization
    if not filename or filename == '.':
        filename = f"file_{secrets.token_hex(8)}"

    return filename

def is_allowed_file(filename, allowed_extensions=None):
    """Check if file extension is allowed"""
    if not filename:
        return False

    if allowed_extensions is None:
        upload_config = flask_config.get_upload_config()
        allowed_extensions = upload_config.get('allowed_extensions', [])

    # Get file extension
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''

    # Check if extension is allowed
    return ext in [ext.lower() for ext in allowed_extensions]

def validate_file_content(file_path):
    """Basic file content validation"""
    try:
        # Check file size
        file_size = os.path.getsize(file_path)
        max_size = flask_config.get('upload.max_file_size', 104857600)  # 100MB default

        if file_size > max_size:
            return False, f"File size ({file_size} bytes) exceeds maximum allowed size ({max_size} bytes)"

        # Additional content validation could be added here
        # For example, checking file headers, scanning for malware, etc.

        return True, "File is valid"
    except Exception as e:
        return False, f"Error validating file: {str(e)}"

# Initialize database on first run
try:
    with app.app_context():
        db.create_all()

        # Create default admin user with password from config
        admin_config = flask_config.get_admin_config()
        if admin_config['auto_create']:
            admin_user = User.query.filter_by(username=admin_config['username']).first()
            if not admin_user:
                admin_user = User(
                    username=admin_config['username'],
                    email=admin_config['email'],
                    role=admin_config['role'],
                    is_active=True
                )
                admin_user.set_password(admin_config['default_password'])
                db.session.add(admin_user)
                db.session.commit()
                print(f"✅ Created admin user (username: {admin_config['username']}, password: {admin_config['default_password']})")

        # Ensure default user exists for backward compatibility
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
@login_required
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
    output_dir = flask_config.get('directories.output', 'output')
    if os.path.exists(output_dir):
        for file in os.listdir(output_dir):
            if file.endswith(('.json', '.csv', '.xlsx')):
                file_path = os.path.join(output_dir, file)
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
@login_required
def settings():
    """Settings page for API configuration"""
    cm = ConfigManager()
    current_config = cm.load_config()
    
    return render_template('settings.html', config=current_config)

@app.route('/scan')
@login_required
def scan_page():
    """Channel scanning page"""
    return render_template('scan.html')

@app.route('/search')
@login_required
def search_page():
    """Advanced search page"""
    return render_template('search.html')

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
    output_dir = flask_config.get('directories.output', 'output')
    if os.path.exists(output_dir):
        for file in os.listdir(output_dir):
            if file.endswith(('.json', '.csv', '.xlsx')):
                file_path = os.path.join(output_dir, file)
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
        output_dir = flask_config.get('directories.output', 'output')
        file_path = os.path.join(output_dir, filename)
        if not os.path.exists(file_path):
            return jsonify({'error': 'File not found'}), 404

        return send_from_directory(output_dir, filename, as_attachment=True)
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
            output_dir = flask_config.get('directories.output', 'output')
            file_path = os.path.join(output_dir, filename)
            if os.path.exists(file_path):
                # Delete the file
                os.remove(file_path)
                return jsonify({'success': True, 'message': f'File {filename} deleted successfully'})

        return jsonify({'success': False, 'error': 'File not found'})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/files/<int:file_id>/rename', methods=['POST'])
def rename_file(file_id):
    """Rename a file"""
    try:
        data = request.get_json()
        new_name = data.get('name', '').strip()

        if not new_name:
            return jsonify({'success': False, 'error': 'File name is required'})

        user = get_or_create_user()
        file_record = File.query.filter_by(id=file_id, user_id=user.id, is_deleted=False).first()

        if not file_record:
            return jsonify({'success': False, 'error': 'File not found'})

        old_name = file_record.filename
        file_record.filename = new_name
        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'File renamed from "{old_name}" to "{new_name}"',
            'file': file_record.to_dict()
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/files/<int:file_id>/tags', methods=['POST'])
def update_file_tags(file_id):
    """Update file tags"""
    try:
        data = request.get_json()
        tags = data.get('tags', [])

        if not isinstance(tags, list):
            return jsonify({'success': False, 'error': 'Tags must be a list'})

        user = get_or_create_user()
        file_record = File.query.filter_by(id=file_id, user_id=user.id, is_deleted=False).first()

        if not file_record:
            return jsonify({'success': False, 'error': 'File not found'})

        # Validate and clean tags
        clean_tags = []
        for tag in tags:
            if isinstance(tag, str) and tag.strip():
                clean_tag = tag.strip().lower()
                if len(clean_tag) <= 50 and clean_tag not in clean_tags:
                    clean_tags.append(clean_tag)

        file_record.set_tags(clean_tags)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'Tags updated for "{file_record.filename}"',
            'file': file_record.to_dict()
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/files/<int:file_id>/move', methods=['POST'])
def move_file(file_id):
    """Move file to a different folder"""
    try:
        data = request.get_json()
        folder_id = data.get('folder_id')

        user = get_or_create_user()
        file_record = File.query.filter_by(id=file_id, user_id=user.id, is_deleted=False).first()

        if not file_record:
            return jsonify({'success': False, 'error': 'File not found'})

        # Validate target folder
        if folder_id:
            target_folder = Folder.query.filter_by(id=folder_id, user_id=user.id, is_deleted=False).first()
            if not target_folder:
                return jsonify({'success': False, 'error': 'Target folder not found'})

        old_folder_name = file_record.folder.name if file_record.folder else 'Root'
        file_record.folder_id = folder_id
        db.session.commit()

        new_folder_name = file_record.folder.name if file_record.folder else 'Root'

        return jsonify({
            'success': True,
            'message': f'File moved from "{old_folder_name}" to "{new_folder_name}"',
            'file': file_record.to_dict()
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/files/bulk', methods=['POST'])
def bulk_file_operations():
    """Perform bulk operations on files"""
    try:
        data = request.get_json()
        operation = data.get('operation')
        file_ids = data.get('file_ids', [])

        if not operation or not file_ids:
            return jsonify({'success': False, 'error': 'Operation and file IDs are required'})

        user = get_or_create_user()
        files = File.query.filter(
            File.id.in_(file_ids),
            File.user_id == user.id,
            File.is_deleted == False
        ).all()

        if not files:
            return jsonify({'success': False, 'error': 'No valid files found'})

        results = []

        if operation == 'delete':
            for file_record in files:
                file_record.is_deleted = True
                results.append(f'Deleted: {file_record.filename}')

        elif operation == 'move':
            folder_id = data.get('folder_id')
            if folder_id:
                target_folder = Folder.query.filter_by(id=folder_id, user_id=user.id, is_deleted=False).first()
                if not target_folder:
                    return jsonify({'success': False, 'error': 'Target folder not found'})

            for file_record in files:
                file_record.folder_id = folder_id
                folder_name = target_folder.name if target_folder else 'Root'
                results.append(f'Moved {file_record.filename} to {folder_name}')

        elif operation == 'tag':
            tags = data.get('tags', [])
            clean_tags = [tag.strip().lower() for tag in tags if isinstance(tag, str) and tag.strip()]

            for file_record in files:
                file_record.set_tags(clean_tags)
                results.append(f'Tagged: {file_record.filename}')

        else:
            return jsonify({'success': False, 'error': 'Invalid operation'})

        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'Bulk {operation} completed',
            'results': results,
            'affected_files': len(files)
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/upload', methods=['POST'])
def upload_file():
    """Upload files to the system"""
    try:
        if 'files' not in request.files:
            return jsonify({'success': False, 'error': 'No files provided'})

        files = request.files.getlist('files')
        folder_id = request.form.get('folder_id')

        if not files or all(f.filename == '' for f in files):
            return jsonify({'success': False, 'error': 'No files selected'})

        user = get_or_create_user()
        uploaded_files = []

        # Validate folder if specified
        if folder_id:
            folder = Folder.query.filter_by(id=folder_id, user_id=user.id, is_deleted=False).first()
            if not folder:
                return jsonify({'success': False, 'error': 'Invalid folder'})

        # Create uploads directory if it doesn't exist
        upload_config = flask_config.get_upload_config()
        upload_dir = Path(upload_config['upload_directory'])
        upload_dir.mkdir(parents=True, exist_ok=True)

        for file in files:
            if file.filename:
                # Sanitize and validate filename
                original_filename = file.filename
                sanitized_filename = sanitize_filename(original_filename)

                if not sanitized_filename:
                    return jsonify({'success': False, 'error': f'Invalid filename: {original_filename}'})

                # Check if file type is allowed
                if not is_allowed_file(sanitized_filename):
                    return jsonify({'success': False, 'error': f'File type not allowed: {sanitized_filename}'})

                # Generate unique filename to avoid conflicts if configured
                if upload_config['timestamp_filenames']:
                    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                    unique_filename = f"{timestamp}_{sanitized_filename}"
                else:
                    unique_filename = sanitized_filename

                file_path = upload_dir / unique_filename

                # Ensure the file path is within the upload directory (prevent path traversal)
                try:
                    file_path = file_path.resolve()
                    upload_dir_resolved = upload_dir.resolve()
                    if not str(file_path).startswith(str(upload_dir_resolved)):
                        return jsonify({'success': False, 'error': 'Invalid file path'})
                except Exception:
                    return jsonify({'success': False, 'error': 'Invalid file path'})

                # Save file
                file.save(str(file_path))

                # Validate file content after saving
                is_valid, validation_message = validate_file_content(file_path)
                if not is_valid:
                    # Remove the invalid file
                    try:
                        os.remove(file_path)
                    except:
                        pass
                    return jsonify({'success': False, 'error': validation_message})

                # Get file info
                file_size = file_path.stat().st_size
                mime_type = file.content_type or 'application/octet-stream'

                # Create database record
                file_record = File(
                    filename=sanitized_filename,
                    original_filename=original_filename,
                    file_path=str(file_path),
                    file_size=file_size,
                    mime_type=mime_type,
                    folder_id=folder_id,
                    user_id=user.id,
                    description=f'Uploaded file: {original_filename}'
                )

                db.session.add(file_record)
                uploaded_files.append({
                    'filename': sanitized_filename,
                    'size': file_size,
                    'type': mime_type
                })

        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'Successfully uploaded {len(uploaded_files)} files',
            'files': uploaded_files
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/search', methods=['GET'])
def search_files():
    """Advanced search files by name, tags, content, and metadata"""
    try:
        query = request.args.get('q', '').strip()
        file_type = request.args.get('type', '')
        folder_id = request.args.get('folder_id')
        date_from = request.args.get('date_from', '')
        date_to = request.args.get('date_to', '')
        size_min = request.args.get('size_min', '')
        size_max = request.args.get('size_max', '')
        channel = request.args.get('channel', '')
        tags = request.args.get('tags', '')
        sort_by = request.args.get('sort_by', 'date')
        sort_order = request.args.get('sort_order', 'desc')
        limit = min(int(request.args.get('limit', 50)), 100)

        if not query:
            return jsonify({'success': False, 'error': 'Search query is required'})

        user = get_or_create_user()

        # Build search query
        search_query = File.query.filter_by(user_id=user.id, is_deleted=False)

        # Full-text search across multiple fields
        search_terms = query.lower().split()
        for term in search_terms:
            search_query = search_query.filter(
                db.or_(
                    File.filename.ilike(f'%{term}%'),
                    File.description.ilike(f'%{term}%'),
                    File.telegram_channel.ilike(f'%{term}%'),
                    File.tags.ilike(f'%{term}%')
                )
            )

        # Filter by file type if specified
        if file_type:
            if file_type == 'image':
                search_query = search_query.filter(File.mime_type.like('image/%'))
            elif file_type == 'video':
                search_query = search_query.filter(File.mime_type.like('video/%'))
            elif file_type == 'audio':
                search_query = search_query.filter(File.mime_type.like('audio/%'))
            elif file_type == 'document':
                search_query = search_query.filter(File.mime_type.in_([
                    'application/pdf', 'application/msword',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    'text/plain', 'application/json'
                ]))
            elif file_type == 'archive':
                search_query = search_query.filter(File.mime_type.in_([
                    'application/zip', 'application/x-rar-compressed',
                    'application/x-7z-compressed', 'application/gzip'
                ]))

        # Filter by folder if specified
        if folder_id:
            if folder_id == 'root':
                search_query = search_query.filter(File.folder_id.is_(None))
            else:
                search_query = search_query.filter_by(folder_id=folder_id)

        # Filter by date range
        if date_from:
            try:
                from_date = datetime.strptime(date_from, '%Y-%m-%d')
                search_query = search_query.filter(File.created_at >= from_date)
            except ValueError:
                pass

        if date_to:
            try:
                to_date = datetime.strptime(date_to, '%Y-%m-%d')
                # Add one day to include the entire day
                to_date = to_date.replace(hour=23, minute=59, second=59)
                search_query = search_query.filter(File.created_at <= to_date)
            except ValueError:
                pass

        # Filter by file size
        if size_min:
            try:
                min_size = int(size_min)
                search_query = search_query.filter(File.file_size >= min_size)
            except ValueError:
                pass

        if size_max:
            try:
                max_size = int(size_max)
                search_query = search_query.filter(File.file_size <= max_size)
            except ValueError:
                pass

        # Filter by channel
        if channel:
            search_query = search_query.filter(File.telegram_channel.ilike(f'%{channel}%'))

        # Filter by tags
        if tags:
            tag_list = [tag.strip() for tag in tags.split(',') if tag.strip()]
            for tag in tag_list:
                search_query = search_query.filter(File.tags.ilike(f'%{tag}%'))

        # Apply sorting
        if sort_by == 'name':
            if sort_order == 'asc':
                search_query = search_query.order_by(File.filename.asc())
            else:
                search_query = search_query.order_by(File.filename.desc())
        elif sort_by == 'size':
            if sort_order == 'asc':
                search_query = search_query.order_by(File.file_size.asc())
            else:
                search_query = search_query.order_by(File.file_size.desc())
        elif sort_by == 'type':
            if sort_order == 'asc':
                search_query = search_query.order_by(File.mime_type.asc())
            else:
                search_query = search_query.order_by(File.mime_type.desc())
        else:  # Default to date
            if sort_order == 'asc':
                search_query = search_query.order_by(File.created_at.asc())
            else:
                search_query = search_query.order_by(File.created_at.desc())

        # Execute search
        files = search_query.limit(limit).all()

        # Convert to dict format with search relevance
        results = []
        for file_record in files:
            file_dict = file_record.to_dict()

            # Calculate search relevance score
            relevance_score = 0
            filename_lower = file_record.filename.lower()

            for term in search_terms:
                if term in filename_lower:
                    relevance_score += 10
                if file_record.description and term in file_record.description.lower():
                    relevance_score += 5
                if file_record.telegram_channel and term in file_record.telegram_channel.lower():
                    relevance_score += 3
                if file_record.tags and term in file_record.tags.lower():
                    relevance_score += 7

            file_dict['relevance_score'] = relevance_score
            results.append(file_dict)

        # Sort by relevance if no specific sort order
        if sort_by == 'relevance':
            results.sort(key=lambda x: x['relevance_score'], reverse=(sort_order == 'desc'))

        return jsonify({
            'success': True,
            'results': results,
            'total': len(results),
            'query': query,
            'filters': {
                'file_type': file_type,
                'folder_id': folder_id,
                'date_from': date_from,
                'date_to': date_to,
                'size_min': size_min,
                'size_max': size_max,
                'channel': channel,
                'tags': tags,
                'sort_by': sort_by,
                'sort_order': sort_order
            }
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/search/suggestions', methods=['GET'])
def search_suggestions():
    """Get intelligent search suggestions based on partial query"""
    try:
        query = request.args.get('q', '').strip()
        limit = min(int(request.args.get('limit', 10)), 20)

        if len(query) < 2:
            return jsonify({'success': True, 'suggestions': []})

        user = get_or_create_user()
        suggestions = []

        # Get filename suggestions
        files = File.query.filter(
            File.user_id == user.id,
            File.is_deleted == False,
            File.filename.ilike(f'%{query}%')
        ).limit(limit // 2).all()

        for file_record in files:
            suggestions.append({
                'text': file_record.filename,
                'type': 'filename',
                'icon': 'insert_drive_file',
                'file_id': file_record.id,
                'category': 'Files'
            })

        # Get channel suggestions
        channels = db.session.query(File.telegram_channel).filter(
            File.user_id == user.id,
            File.is_deleted == False,
            File.telegram_channel.ilike(f'%{query}%'),
            File.telegram_channel.isnot(None)
        ).distinct().limit(3).all()

        for channel in channels:
            if channel[0]:  # Check if channel name is not None
                suggestions.append({
                    'text': channel[0],
                    'type': 'channel',
                    'icon': 'tv',
                    'category': 'Channels'
                })

        # Get file type suggestions
        file_types = {
            'image': ['jpg', 'jpeg', 'png', 'gif', 'webp'],
            'video': ['mp4', 'avi', 'mov', 'webm'],
            'audio': ['mp3', 'wav', 'flac', 'm4a'],
            'document': ['pdf', 'doc', 'docx', 'txt'],
            'archive': ['zip', 'rar', '7z', 'tar']
        }

        for type_name, extensions in file_types.items():
            if query.lower() in type_name or any(query.lower() in ext for ext in extensions):
                suggestions.append({
                    'text': f'type:{type_name}',
                    'type': 'filter',
                    'icon': 'filter_list',
                    'category': 'Filters',
                    'description': f'Show only {type_name} files'
                })

        # Get tag suggestions (if tags are stored)
        # This is a simplified approach - in a real implementation, you'd have a proper tag system
        tag_files = File.query.filter(
            File.user_id == user.id,
            File.is_deleted == False,
            File.tags.ilike(f'%{query}%'),
            File.tags.isnot(None)
        ).limit(3).all()

        added_tags = set()
        for file_record in tag_files:
            if file_record.tags:
                try:
                    # Assuming tags are stored as comma-separated values
                    tags = [tag.strip() for tag in file_record.tags.split(',')]
                    for tag in tags:
                        if query.lower() in tag.lower() and tag not in added_tags:
                            suggestions.append({
                                'text': f'tag:{tag}',
                                'type': 'tag',
                                'icon': 'label',
                                'category': 'Tags',
                                'description': f'Files tagged with "{tag}"'
                            })
                            added_tags.add(tag)
                            if len(added_tags) >= 3:
                                break
                except:
                    pass

        # Add search operators suggestions
        operators = [
            {'text': f'size:>{query}mb', 'desc': 'Files larger than specified size'},
            {'text': f'date:{query}', 'desc': 'Files from specific date'},
            {'text': f'folder:{query}', 'desc': 'Files in specific folder'}
        ]

        if query.isdigit():
            for op in operators:
                suggestions.append({
                    'text': op['text'],
                    'type': 'operator',
                    'icon': 'search',
                    'category': 'Search Operators',
                    'description': op['desc']
                })

        # Remove duplicates and limit results
        seen = set()
        unique_suggestions = []
        for suggestion in suggestions:
            if suggestion['text'] not in seen:
                seen.add(suggestion['text'])
                unique_suggestions.append(suggestion)

        return jsonify({
            'success': True,
            'suggestions': unique_suggestions[:limit]
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/folders', methods=['GET'])
def get_folders():
    """Get folder hierarchy for current user"""
    try:
        user = get_or_create_user()
        folders = Folder.query.filter_by(user_id=user.id, is_deleted=False).all()

        # Build folder tree
        folder_tree = []
        folder_dict = {}

        # First pass: create folder dictionary
        for folder in folders:
            folder_dict[folder.id] = folder.to_dict()
            folder_dict[folder.id]['children'] = []

        # Second pass: build hierarchy
        for folder in folders:
            if folder.parent_id is None:
                folder_tree.append(folder_dict[folder.id])
            else:
                if folder.parent_id in folder_dict:
                    folder_dict[folder.parent_id]['children'].append(folder_dict[folder.id])

        return jsonify({'success': True, 'folders': folder_tree})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/folders', methods=['POST'])
def create_folder():
    """Create a new folder"""
    try:
        data = request.get_json()
        folder_name = data.get('name', '').strip()
        parent_id = data.get('parent_id')

        if not folder_name:
            return jsonify({'success': False, 'error': 'Folder name is required'})

        # Validate folder name
        if len(folder_name) > 255:
            return jsonify({'success': False, 'error': 'Folder name too long'})

        if '/' in folder_name or '\\' in folder_name:
            return jsonify({'success': False, 'error': 'Folder name cannot contain / or \\'})

        user = get_or_create_user()

        # Check if folder with same name exists in same parent
        existing_folder = Folder.query.filter_by(
            name=folder_name,
            parent_id=parent_id,
            user_id=user.id,
            is_deleted=False
        ).first()

        if existing_folder:
            return jsonify({'success': False, 'error': 'Folder with this name already exists'})

        # Create folder
        new_folder = Folder(
            name=folder_name,
            parent_id=parent_id,
            user_id=user.id
        )

        # Set path
        if parent_id:
            parent_folder = Folder.query.get(parent_id)
            if parent_folder and parent_folder.user_id == user.id:
                new_folder.path = f"{parent_folder.path}/{folder_name}"
            else:
                return jsonify({'success': False, 'error': 'Invalid parent folder'})
        else:
            new_folder.path = folder_name

        db.session.add(new_folder)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'Folder "{folder_name}" created successfully',
            'folder': new_folder.to_dict()
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/folders/<int:folder_id>', methods=['DELETE'])
def delete_folder(folder_id):
    """Delete a folder (mark as deleted)"""
    try:
        user = get_or_create_user()
        folder = Folder.query.filter_by(id=folder_id, user_id=user.id).first()

        if not folder:
            return jsonify({'success': False, 'error': 'Folder not found'})

        # Check if folder has files or subfolders
        has_files = File.query.filter_by(folder_id=folder_id, is_deleted=False).first() is not None
        has_subfolders = Folder.query.filter_by(parent_id=folder_id, is_deleted=False).first() is not None

        if has_files or has_subfolders:
            return jsonify({'success': False, 'error': 'Cannot delete folder that contains files or subfolders'})

        # Mark as deleted
        folder.is_deleted = True
        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'Folder "{folder.name}" deleted successfully'
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/folders/<int:folder_id>/rename', methods=['POST'])
def rename_folder(folder_id):
    """Rename a folder"""
    try:
        data = request.get_json()
        new_name = data.get('name', '').strip()

        if not new_name:
            return jsonify({'success': False, 'error': 'Folder name is required'})

        user = get_or_create_user()
        folder = Folder.query.filter_by(id=folder_id, user_id=user.id).first()

        if not folder:
            return jsonify({'success': False, 'error': 'Folder not found'})

        # Check if folder with same name exists in same parent
        existing_folder = Folder.query.filter_by(
            name=new_name,
            parent_id=folder.parent_id,
            user_id=user.id,
            is_deleted=False
        ).filter(Folder.id != folder_id).first()

        if existing_folder:
            return jsonify({'success': False, 'error': 'Folder with this name already exists'})

        old_name = folder.name
        folder.name = new_name

        # Update path
        if folder.parent_id:
            parent_folder = Folder.query.get(folder.parent_id)
            folder.path = f"{parent_folder.path}/{new_name}"
        else:
            folder.path = new_name

        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'Folder renamed from "{old_name}" to "{new_name}"',
            'folder': folder.to_dict()
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)})

# Authentication routes
@app.route('/login', methods=['GET', 'POST'])
def login():
    """User login page"""
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))

    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(username=form.username.data).first()
        if user and user.check_password(form.password.data):
            login_user(user, remember=form.remember_me.data)
            next_page = request.args.get('next')
            if not next_page or not next_page.startswith('/'):
                next_page = url_for('dashboard')
            flash('Login successful!', 'success')
            return redirect(next_page)
        else:
            flash('Invalid username or password', 'error')

    return render_template('auth/login.html', form=form)

@app.route('/register', methods=['GET', 'POST'])
def register():
    """User registration page"""
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))

    form = RegistrationForm()
    if form.validate_on_submit():
        user = User(
            username=form.username.data,
            email=form.email.data,
            role='user',
            is_active=True
        )
        user.set_password(form.password.data)

        try:
            db.session.add(user)
            db.session.commit()
            flash('Registration successful! You can now log in.', 'success')
            return redirect(url_for('login'))
        except Exception as e:
            db.session.rollback()
            flash('Registration failed. Please try again.', 'error')

    return render_template('auth/register.html', form=form)

@app.route('/logout')
@login_required
def logout():
    """User logout"""
    logout_user()
    flash('You have been logged out.', 'info')
    return redirect(url_for('login'))

@app.route('/profile')
@login_required
def profile():
    """User profile page"""
    return render_template('auth/profile.html', user=current_user)

@app.route('/change_password', methods=['GET', 'POST'])
@login_required
def change_password():
    """Change password page"""
    form = ChangePasswordForm()
    if form.validate_on_submit():
        if current_user.check_password(form.current_password.data):
            current_user.set_password(form.new_password.data)
            try:
                db.session.commit()
                flash('Password changed successfully!', 'success')
                return redirect(url_for('profile'))
            except Exception as e:
                db.session.rollback()
                flash('Failed to change password. Please try again.', 'error')
        else:
            flash('Current password is incorrect.', 'error')

    return render_template('auth/change_password.html', form=form)

# File sharing routes
@app.route('/api/files/<int:file_id>/share', methods=['POST'])
@login_required
def create_share_link(file_id):
    """Create a shareable link for a file"""
    try:
        file_record = File.query.filter_by(id=file_id, user_id=current_user.id, is_deleted=False).first()
        if not file_record:
            return jsonify({'success': False, 'error': 'File not found'})

        data = request.get_json() or {}

        # Create share link
        share_link = ShareLink(
            file_id=file_id,
            user_id=current_user.id,
            name=data.get('name', ''),
            description=data.get('description', ''),
            can_view=data.get('can_view', True),
            can_download=data.get('can_download', True),
            can_preview=data.get('can_preview', True),
            max_downloads=data.get('max_downloads'),
            max_views=data.get('max_views')
        )

        # Set password if provided
        if data.get('password'):
            share_link.set_password(data['password'])

        # Set expiration if provided
        if data.get('expires_in_days'):
            days = int(data['expires_in_days'])
            from datetime import timedelta
            share_link.expires_at = datetime.utcnow() + timedelta(days=days)
        elif data.get('expires_at'):
            share_link.expires_at = datetime.fromisoformat(data['expires_at'])

        db.session.add(share_link)
        db.session.commit()

        # Generate share URL
        base_url = request.url_root.rstrip('/')
        share_url = share_link.get_share_url(base_url)

        return jsonify({
            'success': True,
            'share_link': share_link.to_dict(),
            'share_url': share_url,
            'message': 'Share link created successfully'
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/files/<int:file_id>/shares', methods=['GET'])
@login_required
def get_file_shares(file_id):
    """Get all share links for a file"""
    try:
        file_record = File.query.filter_by(id=file_id, user_id=current_user.id, is_deleted=False).first()
        if not file_record:
            return jsonify({'success': False, 'error': 'File not found'})

        shares = ShareLink.query.filter_by(file_id=file_id, user_id=current_user.id).all()
        base_url = request.url_root.rstrip('/')

        share_data = []
        for share in shares:
            share_dict = share.to_dict()
            share_dict['share_url'] = share.get_share_url(base_url)
            share_data.append(share_dict)

        return jsonify({
            'success': True,
            'shares': share_data
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/shares/<int:share_id>', methods=['DELETE'])
@login_required
def delete_share_link(share_id):
    """Delete a share link"""
    try:
        share_link = ShareLink.query.filter_by(id=share_id, user_id=current_user.id).first()
        if not share_link:
            return jsonify({'success': False, 'error': 'Share link not found'})

        db.session.delete(share_link)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Share link deleted successfully'
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)})

# Public share access routes
@app.route('/share/<token>')
def view_shared_file(token):
    """View a shared file (public access)"""
    try:
        share_link = ShareLink.query.filter_by(token=token).first()
        if not share_link:
            return render_template('share/not_found.html'), 404

        # Check if share link can be accessed
        can_access, message = share_link.can_access()
        if not can_access:
            if "password" in message.lower():
                return render_template('share/password_required.html', token=token, error=None)
            else:
                return render_template('share/access_denied.html', message=message), 403

        # Check view limit
        if share_link.is_view_limit_reached():
            return render_template('share/access_denied.html', message="View limit reached"), 403

        # Increment view count
        share_link.increment_view_count()

        return render_template('share/view.html', share_link=share_link)

    except Exception as e:
        return render_template('share/error.html', error=str(e)), 500

@app.route('/share/<token>/password', methods=['POST'])
def verify_share_password(token):
    """Verify password for protected share"""
    try:
        share_link = ShareLink.query.filter_by(token=token).first()
        if not share_link:
            return render_template('share/not_found.html'), 404

        password = request.form.get('password', '')
        can_access, message = share_link.can_access(password)

        if can_access:
            # Store password verification in session
            from flask import session
            session[f'share_verified_{token}'] = True
            return redirect(url_for('view_shared_file', token=token))
        else:
            return render_template('share/password_required.html', token=token, error="Invalid password")

    except Exception as e:
        return render_template('share/error.html', error=str(e)), 500

@app.route('/share/<token>/download')
def download_shared_file(token):
    """Download a shared file (public access)"""
    try:
        share_link = ShareLink.query.filter_by(token=token).first()
        if not share_link:
            return jsonify({'error': 'Share not found'}), 404

        # Check if share link can be accessed
        can_access, message = share_link.can_access()
        if not can_access:
            return jsonify({'error': message}), 403

        # Check download permission
        if not share_link.can_download:
            return jsonify({'error': 'Download not allowed'}), 403

        # Check download limit
        if share_link.is_download_limit_reached():
            return jsonify({'error': 'Download limit reached'}), 403

        # Increment download count
        share_link.increment_download_count()

        # Serve the file
        output_dir = flask_config.get('directories.output', 'output')
        file_path = os.path.join(output_dir, share_link.file.filename)
        if os.path.exists(file_path):
            return send_from_directory(output_dir, share_link.file.filename, as_attachment=True)
        else:
            return jsonify({'error': 'File not found on disk'}), 404

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    emit('connected', {'status': 'Connected to TeleDrive'})

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    pass

if __name__ == '__main__':
    # Get server configuration
    server_config = flask_config.get_server_config()

    print("🌐 Starting TeleDrive Web Interface...")
    print(f"📱 Access at: http://{server_config['host']}:{server_config['port']}")
    print("⏹️  Press Ctrl+C to stop")

    # Create necessary directories from config
    directories = flask_config.get_directories()
    for name, path in directories.items():
        os.makedirs(path, exist_ok=True)

    # Remove incompatible parameters for socketio.run()
    socketio_config = {
        'host': server_config['host'],
        'port': server_config['port'],
        'debug': server_config['debug']
    }

    # Start server with configuration
    socketio.run(app, **socketio_config)
