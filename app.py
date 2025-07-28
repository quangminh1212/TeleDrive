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

@app.route('/api/search', methods=['GET'])
def search_files():
    """Search files by name, tags, or content"""
    try:
        query = request.args.get('q', '').strip()
        file_type = request.args.get('type', '')
        folder_id = request.args.get('folder_id')
        limit = min(int(request.args.get('limit', 50)), 100)

        if not query:
            return jsonify({'success': False, 'error': 'Search query is required'})

        user = get_or_create_user()

        # Build search query
        search_query = File.query.filter_by(user_id=user.id, is_deleted=False)

        # Search by filename
        search_query = search_query.filter(File.filename.contains(query))

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
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                ]))

        # Filter by folder if specified
        if folder_id:
            search_query = search_query.filter_by(folder_id=folder_id)

        # Execute search
        files = search_query.order_by(File.created_at.desc()).limit(limit).all()

        # Convert to dict format
        results = [file_record.to_dict() for file_record in files]

        return jsonify({
            'success': True,
            'results': results,
            'total': len(results),
            'query': query
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/search/suggestions', methods=['GET'])
def search_suggestions():
    """Get search suggestions based on partial query"""
    try:
        query = request.args.get('q', '').strip()
        limit = min(int(request.args.get('limit', 10)), 20)

        if len(query) < 2:
            return jsonify({'success': True, 'suggestions': []})

        user = get_or_create_user()

        # Get filename suggestions
        files = File.query.filter(
            File.user_id == user.id,
            File.is_deleted == False,
            File.filename.contains(query)
        ).limit(limit).all()

        suggestions = []
        for file_record in files:
            suggestions.append({
                'text': file_record.filename,
                'type': 'filename',
                'file_id': file_record.id
            })

        # Get tag suggestions
        # This would require a more complex query to extract tags from JSON
        # For now, we'll skip tag suggestions

        return jsonify({
            'success': True,
            'suggestions': suggestions[:limit]
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
