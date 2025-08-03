#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TeleDrive Web Interface
Flask web application for Telegram file scanning with Google Drive-like UI
"""

import os
import sys
import codecs

# Set UTF-8 encoding for stdout and stderr
sys.stdout = codecs.getwriter('utf-8')(sys.stdout.detach())
sys.stderr = codecs.getwriter('utf-8')(sys.stderr.detach())
import json
import asyncio
import threading
import re
import secrets
from datetime import datetime, timedelta
from pathlib import Path
from werkzeug.utils import secure_filename
from flask import Flask, render_template, request, jsonify, redirect, url_for, send_from_directory, flash, send_file
from flask_socketio import SocketIO, emit
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from flask_wtf.csrf import CSRFProtect
import eventlet

# Import existing modules
from engine import TelegramFileScanner
import config

# Import database modules
from models import db, User, File, Folder, ScanSession, ShareLink, FileComment, FileVersion, ActivityLog, SmartFolder, get_or_create_user

# Import forms
from forms import TelegramLoginForm, TelegramVerifyForm

# Import Telegram authentication
from auth import telegram_auth

# Import Flask configuration loader
import flask_config

# Import detailed logging - with fallback
DETAILED_LOGGING_AVAILABLE = False
import logging
logger = logging.getLogger(__name__)

# Async utility functions
async def run_async_safely(coro):
    """Run async coroutine with proper error handling and cleanup"""
    try:
        return await coro
    except Exception as e:
        logger.error(f"Async operation failed: {e}")
        raise

def run_async_in_thread(coro):
    """Run async coroutine in a new thread with proper event loop management"""
    import asyncio
    import threading

    result = {'value': None, 'error': None}

    def run_in_thread():
        try:
            # Use asyncio.run() which properly manages the event loop
            result['value'] = asyncio.run(run_async_safely(coro))
        except Exception as e:
            result['error'] = e

    thread = threading.Thread(target=run_in_thread)
    thread.start()
    thread.join()

    if result['error']:
        raise result['error']
    return result['value']

# Production mode - minimal logging
DETAILED_LOGGING_AVAILABLE = False
import logging
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.WARNING)  # Only warnings and errors

# Initialize Flask app with absolute paths
import os
from pathlib import Path

# Get project root directory (parent of source directory)
project_root = Path(__file__).parent.parent
template_folder = project_root / 'templates'
static_folder = project_root / 'static'

app = Flask(__name__,
           template_folder=str(template_folder.absolute()),
           static_folder=str(static_folder.absolute()))

# Load configuration from config.json
flask_app_config = flask_config.flask_config.get_flask_config()
app.config.update(flask_app_config)

# Create necessary directories
flask_config.flask_config.create_directories()

# Configure database
db.init_app(app)

# Initialize CSRF Protection
csrf = CSRFProtect(app)

# Initialize Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)

# Configure Flask-Login from config file
login_config = flask_config.flask_config.get_login_config()
login_manager.login_view = login_config['login_view']
login_manager.login_message = login_config['login_message']
login_manager.login_message_category = login_config['login_message_category']

@login_manager.user_loader
def load_user(user_id):
    """Load user by ID for Flask-Login"""
    return User.query.get(int(user_id))

@app.before_request
def check_session_timeout():
    """Check if session has expired"""
    from flask import session, request

    # Skip session check for static files and auth routes
    if request.endpoint and (request.endpoint.startswith('static') or
                           request.endpoint in ['login', 'register', 'forgot_password', 'reset_password']):
        return

    # Session timeout check - enforce session expiration
    if current_user.is_authenticated:
        # Check if session has expired
        last_activity = session.get('last_activity')
        if last_activity:
            from datetime import datetime, timedelta
            try:
                last_activity_time = datetime.fromisoformat(last_activity)
                session_timeout = timedelta(seconds=app.config.get('PERMANENT_SESSION_LIFETIME', 1800))  # 30 minutes default

                if datetime.utcnow() - last_activity_time > session_timeout:
                    logout_user()
                    session.clear()
                    flash('Your session has expired. Please log in again.', 'info')
                    return redirect(url_for('telegram_login'))
            except ValueError:
                # Invalid timestamp format, reset session
                session.pop('last_activity', None)

        # Update last activity time
        session['last_activity'] = datetime.utcnow().isoformat()
        session.permanent = True

@app.after_request
def add_security_headers(response):
    """Add security headers to all responses"""
    # Prevent clickjacking
    response.headers['X-Frame-Options'] = 'DENY'

    # Prevent MIME type sniffing
    response.headers['X-Content-Type-Options'] = 'nosniff'

    # Enable XSS protection
    response.headers['X-XSS-Protection'] = '1; mode=block'

    # Referrer policy
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'

    # Content Security Policy
    csp = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "img-src 'self' data: https:; "
        "connect-src 'self' ws: wss:; "
        "frame-ancestors 'none';"
    )
    response.headers['Content-Security-Policy'] = csp

    # HTTPS-only cookies (enable in production with HTTPS)
    if app.config.get('SESSION_COOKIE_SECURE', False):
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'

    return response

# Global Error Handlers - Refactored for DRY principle
def create_error_handler(status_code, error_type, message, log_level='warning', special_action=None):
    """Factory function to create standardized error handlers"""
    def error_handler(error):
        # Log the error
        log_message = f"{error_type}: {request.url} - {error}"
        getattr(app.logger, log_level)(log_message)

        # Execute special action if provided
        if special_action:
            special_action()

        # Return JSON response for API requests
        if request.is_json:
            return jsonify({
                'success': False,
                'error': error_type.lower().replace(' ', '_'),
                'message': message
            }), status_code

        # Handle special cases for non-JSON requests
        if status_code == 413:
            flash('The uploaded file is too large. Please choose a smaller file.', 'error')
            return redirect(request.referrer or url_for('dashboard'))

        # Return HTML template for regular requests
        return render_template(f'errors/{status_code}.html'), status_code

    return error_handler

# Error configuration mapping
ERROR_CONFIGS = {
    400: ('Bad request', 'The request could not be understood by the server', 'warning'),
    401: ('Unauthorized', 'Authentication required', 'warning'),
    403: ('Forbidden', 'You do not have permission to access this resource', 'warning'),
    404: ('Not found', 'The requested resource was not found', 'info'),
    413: ('File too large', 'The uploaded file is too large', 'warning'),
    429: ('Rate limit exceeded', 'Too many requests. Please try again later.', 'warning'),
    500: ('Internal server error', 'An unexpected error occurred. Please try again later.', 'error', lambda: db.session.rollback()),
    502: ('Bad gateway', 'The server received an invalid response from an upstream server', 'error'),
    503: ('Service unavailable', 'The service is temporarily unavailable. Please try again later.', 'error')
}

# Register error handlers using the factory function
for status_code, config in ERROR_CONFIGS.items():
    error_type, message, log_level = config[:3]
    special_action = config[3] if len(config) > 3 else None
    app.errorhandler(status_code)(create_error_handler(status_code, error_type, message, log_level, special_action))

# Database Error Handlers
from sqlalchemy.exc import SQLAlchemyError, IntegrityError, OperationalError

@app.errorhandler(SQLAlchemyError)
def handle_database_error(error):
    """Handle database errors"""
    db.session.rollback()
    app.logger.error(f"Database error: {str(error)}")

    if isinstance(error, IntegrityError):
        message = "Data integrity error. Please check your input and try again."
    elif isinstance(error, OperationalError):
        message = "Database connection error. Please try again later."
    else:
        message = "A database error occurred. Please try again later."

    if request.is_json:
        return jsonify({
            'success': False,
            'error': 'Database error',
            'message': message
        }), 500

    flash(message, 'error')
    return redirect(request.referrer or url_for('dashboard'))

# CSRF Error Handler
from flask_wtf.csrf import CSRFError

@app.errorhandler(CSRFError)
def handle_csrf_error(error):
    """Handle CSRF token errors with auto-refresh"""
    app.logger.warning(f"CSRF error: {request.url} - {error.description}")

    if request.is_json:
        # For AJAX requests, provide new token
        from flask_wtf.csrf import generate_csrf
        return jsonify({
            'success': False,
            'error': 'csrf_token_expired',
            'message': 'Security token expired. Please try again.',
            'new_csrf_token': generate_csrf()
        }), 400

    # For form submissions, redirect back with new token
    flash('Security token expired. Please try again.', 'error')
    return redirect(request.url)

# Initialize SocketIO
socketio_config = flask_config.flask_config.get_socketio_config()
socketio = SocketIO(app,
                   cors_allowed_origins=socketio_config['cors_allowed_origins'],
                   async_mode=socketio_config['async_mode'])

# Security functions
def log_security_event(event_type, user_id=None, username=None, ip_address=None, details=None):
    """Log security-related events"""
    import logging

    # Create security logger if it doesn't exist
    security_logger = logging.getLogger('security')
    if not security_logger.handlers:
        handler = logging.FileHandler('logs/security.log')
        formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
        handler.setFormatter(formatter)
        security_logger.addHandler(handler)
        security_logger.setLevel(logging.INFO)

    # Get IP address if not provided
    if not ip_address:
        ip_address = request.remote_addr if request else 'unknown'

    # Create log message
    log_message = f"Event: {event_type}"
    if user_id:
        log_message += f" | User ID: {user_id}"
    if username:
        log_message += f" | Username: {username}"
    if ip_address:
        log_message += f" | IP: {ip_address}"
    if details:
        log_message += f" | Details: {details}"

    security_logger.info(log_message)

# Utility functions for error handling
def create_error_response(error_type, message, status_code=400, details=None):
    """Create standardized error response"""
    response_data = {
        'success': False,
        'error': error_type,
        'message': message
    }

    if details and app.debug:
        response_data['details'] = details

    return jsonify(response_data), status_code

def create_success_response(data=None, message=None):
    """Create standardized success response"""
    response_data = {
        'success': True
    }

    if message:
        response_data['message'] = message

    if data:
        response_data.update(data)

    return jsonify(response_data)

def handle_api_error(func):
    """Decorator for consistent API error handling"""
    from functools import wraps

    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except ValueError as e:
            app.logger.warning(f"Validation error in {func.__name__}: {str(e)}")
            return create_error_response('validation_error', str(e), 400)
        except PermissionError as e:
            app.logger.warning(f"Permission error in {func.__name__}: {str(e)}")
            return create_error_response('permission_error', 'Access denied', 403)
        except FileNotFoundError as e:
            app.logger.warning(f"File not found in {func.__name__}: {str(e)}")
            return create_error_response('not_found', 'Resource not found', 404)
        except SQLAlchemyError as e:
            db.session.rollback()
            app.logger.error(f"Database error in {func.__name__}: {str(e)}")
            return create_error_response('database_error', 'Database operation failed', 500)
        except Exception as e:
            db.session.rollback()
            app.logger.error(f"Unexpected error in {func.__name__}: {str(e)}")
            return create_error_response('internal_error', 'An unexpected error occurred', 500, str(e) if app.debug else None)

    return wrapper

# Rate limiting functionality
from collections import defaultdict
import time

# In-memory rate limiting storage (use Redis in production)
rate_limit_storage = defaultdict(list)

def is_rate_limited(key, max_requests=5, window_seconds=300):
    """Check if a key is rate limited"""
    now = time.time()

    # Clean old entries
    rate_limit_storage[key] = [timestamp for timestamp in rate_limit_storage[key]
                              if now - timestamp < window_seconds]

    # Check if limit exceeded
    if len(rate_limit_storage[key]) >= max_requests:
        return True

    # Record this request
    rate_limit_storage[key].append(now)
    return False

# Simple caching system (use Redis in production)
cache_storage = {}
cache_ttl = {}

def cache_get(key):
    """Get value from cache if not expired"""
    if key in cache_storage:
        if key in cache_ttl and time.time() > cache_ttl[key]:
            # Cache expired
            del cache_storage[key]
            del cache_ttl[key]
            return None
        return cache_storage[key]
    return None

def cache_set(key, value, ttl_seconds=300):
    """Set value in cache with TTL"""
    cache_storage[key] = value
    cache_ttl[key] = time.time() + ttl_seconds

def cache_delete(key):
    """Delete key from cache"""
    if key in cache_storage:
        del cache_storage[key]
    if key in cache_ttl:
        del cache_ttl[key]

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
        upload_config = flask_config.flask_config.get_upload_config()
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
        max_size = flask_config.flask_config.get('upload.max_file_size', 104857600)  # 100MB default

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
        admin_config = flask_config.flask_config.get_admin_config()
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

# Periodic cleanup task
def start_cleanup_task():
    """Start periodic cleanup of expired sessions"""
    import threading
    import time

    def cleanup_worker():
        while True:
            try:
                # Run cleanup every 5 minutes
                time.sleep(300)
                # Clean up expired sessions
                asyncio.run(telegram_auth.cleanup_expired_sessions())
            except Exception as e:
                logger.error(f"Error in cleanup worker: {e}")

    cleanup_thread = threading.Thread(target=cleanup_worker, daemon=True)
    cleanup_thread.start()
    print("🧹 Started periodic cleanup task")

# Start cleanup task
start_cleanup_task()

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

            # Initialize scanner with timeout
            try:
                scan_progress['status'] = 'connecting'
                scan_progress['message'] = 'Connecting to Telegram...'
                self.socketio.emit('scan_progress', scan_progress)

                await asyncio.wait_for(self.initialize(), timeout=120)  # 2 phút timeout

                scan_progress['status'] = 'connected'
                scan_progress['message'] = 'Connected successfully!'
                self.socketio.emit('scan_progress', scan_progress)

            except asyncio.TimeoutError:
                error_msg = 'Connection timeout - please check your internet connection and try again'
                scan_progress['status'] = 'error'
                scan_progress['error'] = error_msg
                self.scan_session.status = 'failed'
                self.scan_session.error_message = error_msg
                self.scan_session.completed_at = datetime.utcnow()
                db.session.commit()
                self.socketio.emit('scan_progress', scan_progress)
                return False
            except ConnectionError as e:
                error_msg = f'Connection failed: {str(e)}'
                scan_progress['status'] = 'error'
                scan_progress['error'] = error_msg
                self.scan_session.status = 'failed'
                self.scan_session.error_message = error_msg
                self.scan_session.completed_at = datetime.utcnow()
                db.session.commit()
                self.socketio.emit('scan_progress', scan_progress)
                return False

            # Get channel entity
            scan_progress['status'] = 'resolving_channel'
            scan_progress['message'] = 'Resolving channel...'
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

        except asyncio.TimeoutError as e:
            # Handle timeout specifically
            error_msg = 'Operation timeout - the scan took too long to complete'
            if self.scan_session:
                self.scan_session.status = 'failed'
                self.scan_session.error_message = error_msg
                self.scan_session.completed_at = datetime.now()
                db.session.commit()

            scan_progress['status'] = 'error'
            scan_progress['error'] = error_msg
            self.socketio.emit('scan_progress', scan_progress)
            self.socketio.emit('scan_complete', {
                'success': False,
                'error': error_msg,
                'error_type': 'timeout'
            })
            return False

        except ConnectionError as e:
            # Handle connection errors specifically
            error_msg = f'Connection error: {str(e)}'
            if self.scan_session:
                self.scan_session.status = 'failed'
                self.scan_session.error_message = error_msg
                self.scan_session.completed_at = datetime.now()
                db.session.commit()

            scan_progress['status'] = 'error'
            scan_progress['error'] = error_msg
            self.socketio.emit('scan_progress', scan_progress)
            self.socketio.emit('scan_complete', {
                'success': False,
                'error': error_msg,
                'error_type': 'connection_error'
            })
            return False

        except Exception as e:
            # Handle all other errors
            error_msg = str(e)
            if self.scan_session:
                self.scan_session.status = 'failed'
                self.scan_session.error_message = error_msg
                self.scan_session.completed_at = datetime.now()
                db.session.commit()

            scan_progress['status'] = 'error'
            scan_progress['error'] = error_msg
            self.socketio.emit('scan_progress', scan_progress)
            self.socketio.emit('scan_complete', {
                'success': False,
                'error': error_msg,
                'error_type': 'general'
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
    output_dir = flask_config.flask_config.get('directories.output', 'output')
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
    # Use config module directly
    current_config = {
        'telegram': {
            'api_id': config.API_ID,
            'api_hash': config.API_HASH,
            'phone_number': config.PHONE_NUMBER
        }
    }

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

@app.route('/favicon.ico')
def favicon():
    """Handle favicon requests"""
    try:
        # Try to serve favicon from static folder
        return send_from_directory(app.static_folder, 'favicon.ico')
    except:
        # Return a simple SVG favicon if file not found
        svg_favicon = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#1976d2">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
        </svg>'''
        return svg_favicon, 200, {'Content-Type': 'image/svg+xml'}

@app.route('/.well-known/appspecific/com.chrome.devtools.json')
def chrome_devtools():
    """Handle Chrome DevTools requests"""
    # Return empty response to prevent 404 errors
    return '', 204

@app.route('/api/save_settings', methods=['POST'])
@login_required
def save_settings():
    """Save API settings and configuration"""
    try:
        data = request.get_json()

        # Note: Config updates not supported in production mode
        # Settings are read-only from config.json

        # Production mode: Settings are read-only
        return jsonify({
            'success': False,
            'error': 'Settings are read-only in production mode',
            'message': 'Please edit config.json file directly to change settings'
        }), 400

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/start_scan', methods=['POST'])
@login_required
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
        
        # Start scanning in background thread with proper async handling
        def run_scan():
            with app.app_context():  # Ensure Flask application context
                async def scan_with_context():
                    async with scanner:  # Use context manager for proper cleanup
                        await scanner.scan_channel_with_progress(channel_input)

                try:
                    # Use asyncio.run() for proper event loop management
                    asyncio.run(run_async_safely(scan_with_context()))
                except Exception as e:
                    logger.error(f"Scanner error: {e}")
                    # Ensure scanner is cleaned up even on error
                    try:
                        asyncio.run(scanner.close())
                    except:
                        pass

        thread = threading.Thread(target=run_scan)
        thread.daemon = True
        thread.start()
        
        return jsonify({'success': True, 'message': 'Scan started'})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/stop_scan', methods=['POST'])
@login_required
def stop_scan():
    """Stop current scan"""
    global scanning_active
    
    scanning_active = False
    return jsonify({'success': True, 'message': 'Scan stopped'})

@app.route('/api/get_files')
@login_required
def get_files():
    """Get list of files from database and output directory with pagination"""
    # Get pagination parameters
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    per_page = min(per_page, 100)  # Limit max items per page

    # Check cache first
    user = get_or_create_user()
    cache_key = f"files_{user.id}_{page}_{per_page}"
    cached_result = cache_get(cache_key)
    if cached_result:
        return jsonify(cached_result)

    # Get files from database with pagination and eager loading
    db_files_query = File.query.options(
        db.joinedload(File.owner),
        db.joinedload(File.folder)
    ).filter_by(is_deleted=False).order_by(File.created_at.desc())
    pagination = db_files_query.paginate(page=page, per_page=per_page, error_out=False)
    db_files = pagination.items

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
    output_dir = flask_config.flask_config.get('directories.output', 'output')
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

    # Prepare response
    response_data = {
        'files': files,
        'pagination': {
            'page': pagination.page,
            'per_page': pagination.per_page,
            'total': pagination.total,
            'pages': pagination.pages,
            'has_prev': pagination.has_prev,
            'has_next': pagination.has_next,
            'prev_num': pagination.prev_num,
            'next_num': pagination.next_num
        }
    }

    # Cache the response for 5 minutes
    cache_set(cache_key, response_data, 300)

    return jsonify(response_data)

@app.route('/download/<filename>')
@login_required
def download_file(filename):
    """Download output files"""
    try:
        # Security check - only allow files from output directory
        if not filename.endswith(('.json', '.csv', '.xlsx')):
            return jsonify({'error': 'Invalid file type'}), 400

        # Check if file exists
        output_dir = flask_config.flask_config.get('directories.output', 'output')
        file_path = os.path.join(output_dir, filename)
        if not os.path.exists(file_path):
            return jsonify({'error': 'File not found'}), 404

        return send_from_directory(output_dir, filename, as_attachment=True)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/delete_file', methods=['POST'])
@login_required
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
            output_dir = flask_config.flask_config.get('directories.output', 'output')
            file_path = os.path.join(output_dir, filename)
            if os.path.exists(file_path):
                # Delete the file
                os.remove(file_path)
                return jsonify({'success': True, 'message': f'File {filename} deleted successfully'})

        return jsonify({'success': False, 'error': 'File not found'})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/files/<int:file_id>/rename', methods=['POST'])
@login_required
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
@login_required
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
@login_required
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
@login_required
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
@handle_api_error
def upload_file():
    """Upload files to the system with comprehensive validation"""
    upload_step_id = None
    if DETAILED_LOGGING_AVAILABLE:
        upload_step_id = log_step_start("FILE_UPLOAD", f"User IP: {request.remote_addr}")

    try:
        # Rate limiting check
        rate_limit_step_id = None
        if DETAILED_LOGGING_AVAILABLE:
            rate_limit_step_id = log_step_start("RATE_LIMIT_CHECK", f"Checking rate limit for {request.remote_addr}")

        user_ip = request.remote_addr
        if is_rate_limited(f"upload_{user_ip}", max_requests=10, window_seconds=300):
            if DETAILED_LOGGING_AVAILABLE:
                log_step_end(rate_limit_step_id, "RATE_LIMIT_CHECK", success=False, error="Rate limit exceeded")
                log_step_end(upload_step_id, "FILE_UPLOAD", success=False, error="Rate limit exceeded")
                log_security_event("RATE_LIMIT_EXCEEDED", {'ip': user_ip, 'endpoint': '/api/upload'}, "WARNING")
            return create_error_response('rate_limit', 'Too many upload attempts. Please try again later.', 429)

        if DETAILED_LOGGING_AVAILABLE:
            log_step_end(rate_limit_step_id, "RATE_LIMIT_CHECK", success=True, result="Rate limit OK")

    except Exception as e:
        if DETAILED_LOGGING_AVAILABLE:
            log_step_end(rate_limit_step_id, "RATE_LIMIT_CHECK", success=False, error=str(e))
            log_step_end(upload_step_id, "FILE_UPLOAD", success=False, error=str(e))
        return create_error_response('rate_limit_error', 'Rate limit check failed', 500)

    # CSRF protection for AJAX uploads
    csrf_token = request.headers.get('X-CSRFToken') or request.form.get('csrf_token')
    if not csrf_token:
        return create_error_response('csrf_error', 'CSRF token missing', 400)

    try:
        from flask_wtf.csrf import validate_csrf
        validate_csrf(csrf_token)
    except Exception:
        return create_error_response('csrf_error', 'Invalid CSRF token', 400)

    if 'files' not in request.files:
        return create_error_response('validation_error', 'No files provided', 400)

    files = request.files.getlist('files')
    folder_id = request.form.get('folder_id')

    if not files or all(f.filename == '' for f in files):
        return create_error_response('validation_error', 'No files selected', 400)

    # Validate file count
    if len(files) > 50:  # Limit to 50 files per upload
        return create_error_response('validation_error', 'Too many files. Maximum 50 files per upload.', 400)

    user = get_or_create_user()
    uploaded_files = []

    # Validate folder if specified
    if folder_id:
        folder = Folder.query.filter_by(id=folder_id, user_id=user.id, is_deleted=False).first()
        if not folder:
            return create_error_response('validation_error', 'Invalid folder', 400)

    # Create uploads directory if it doesn't exist
    upload_config = flask_config.flask_config.get_upload_config()
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

            # Auto-tag the file
            auto_tags = generate_auto_tags(file_record)
            if auto_tags:
                file_record.tags = ', '.join(sorted(auto_tags))

            # Log upload activity
            ActivityLog.log_activity(
                user_id=user.id,
                action='upload',
                description=f'Uploaded file: {sanitized_filename}',
                file_id=file_record.id,
                metadata={'file_size': file_size, 'mime_type': mime_type, 'auto_tags': auto_tags},
                ip_address=request.remote_addr,
                user_agent=request.headers.get('User-Agent')
            )

    db.session.commit()

    # Invalidate file list cache for this user
    user = get_or_create_user()
    for page in range(1, 11):  # Clear first 10 pages of cache
        for per_page in [20, 50, 100]:
            cache_delete(f"files_{user.id}_{page}_{per_page}")

        return create_success_response({
            'message': f'Successfully uploaded {len(uploaded_files)} files',
            'files': uploaded_files
        })

@app.route('/api/csrf-token', methods=['GET'])
def get_csrf_token():
    """Get CSRF token for AJAX requests - no login required for auth pages"""
    from flask_wtf.csrf import generate_csrf
    return jsonify({
        'success': True,
        'csrf_token': generate_csrf()
    })

@app.route('/api/search', methods=['GET'])
@handle_api_error
def search_files():
    """Advanced search files by name, tags, content, and metadata"""
    # Rate limiting for search
    user_ip = request.remote_addr
    if is_rate_limited(f"search_{user_ip}", max_requests=30, window_seconds=60):
        return create_error_response('rate_limit', 'Too many search requests. Please try again later.', 429)

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
    page = request.args.get('page', 1, type=int)
    per_page = min(int(request.args.get('per_page', 20)), 100)

    if not query:
        return create_error_response('validation_error', 'Search query is required', 400)

    user = get_or_create_user()

    # Build search query
    search_query = File.query.options(
        db.joinedload(File.owner),
        db.joinedload(File.folder)
    ).filter_by(user_id=user.id, is_deleted=False)

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

        # Execute search with pagination
        pagination = search_query.paginate(page=page, per_page=per_page, error_out=False)
        files = pagination.items

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
            'total': pagination.total,
            'query': query,
            'pagination': {
                'page': pagination.page,
                'per_page': pagination.per_page,
                'total': pagination.total,
                'pages': pagination.pages,
                'has_prev': pagination.has_prev,
                'has_next': pagination.has_next,
                'prev_num': pagination.prev_num,
                'next_num': pagination.next_num
            },
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

@app.route('/api/search/suggestions', methods=['GET'])
@login_required
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
@login_required
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
@login_required
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
@login_required
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
@login_required
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
    """Redirect to Telegram login - only Telegram authentication is supported"""
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))

    # Redirect directly to Telegram login
    return redirect(url_for('telegram_login'))

@app.route('/register', methods=['GET', 'POST'])
def register():
    """Registration disabled - only Telegram authentication is supported"""
    flash('Registration is disabled. Please use Telegram authentication.', 'info')
    return redirect(url_for('telegram_login'))

@app.route('/logout')
@login_required
def logout():
    """User logout"""
    # Log logout event
    log_security_event('LOGOUT', current_user.id, current_user.username)

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
    """Password change disabled - only Telegram authentication is supported"""
    flash('Password change is not available for Telegram authentication.', 'info')
    return redirect(url_for('profile'))

@app.route('/forgot_password', methods=['GET', 'POST'])
def forgot_password():
    """Password reset disabled - only Telegram authentication is supported"""
    flash('Password reset is not available. Please use Telegram authentication.', 'info')
    return redirect(url_for('telegram_login'))

@app.route('/reset_password/<token>', methods=['GET', 'POST'])
def reset_password(token):
    """Password reset disabled - only Telegram authentication is supported"""
    flash('Password reset is not available. Please use Telegram authentication.', 'info')
    return redirect(url_for('telegram_login'))

# Telegram authentication routes
@app.route('/telegram_login', methods=['GET', 'POST'])
def telegram_login():
    """Telegram login - phone number input"""
    login_step_id = None
    if DETAILED_LOGGING_AVAILABLE:
        login_step_id = log_step_start("TELEGRAM_LOGIN", f"Method: {request.method}, IP: {request.remote_addr}")

    app.logger.info("=== TELEGRAM LOGIN START ===")

    try:
        # Check if user is already authenticated
        auth_check_step_id = None
        if DETAILED_LOGGING_AVAILABLE:
            auth_check_step_id = log_step_start("AUTH_CHECK", "Checking if user is already authenticated")

        if current_user.is_authenticated:
            app.logger.info(f"User already authenticated: {current_user.username}")
            if DETAILED_LOGGING_AVAILABLE:
                log_step_end(auth_check_step_id, "AUTH_CHECK", success=True, result="User already authenticated")
                log_step_end(login_step_id, "TELEGRAM_LOGIN", success=True, result="Redirected to dashboard")
            return redirect(url_for('dashboard'))

        if DETAILED_LOGGING_AVAILABLE:
            log_step_end(auth_check_step_id, "AUTH_CHECK", success=True, result="User not authenticated")

    except Exception as e:
        app.logger.error(f"Error during authentication check: {str(e)}")
        if DETAILED_LOGGING_AVAILABLE:
            log_step_end(auth_check_step_id, "AUTH_CHECK", success=False, error=str(e))
            log_step_end(login_step_id, "TELEGRAM_LOGIN", success=False, error=str(e))
        flash('An error occurred during authentication check. Please try again.', 'error')
        return redirect(url_for('telegram_login'))

    form = TelegramLoginForm()
    if form.validate_on_submit():
        phone_number = form.phone_number.data
        country_code = form.country_code.data
        full_phone = f"{country_code}{phone_number}"

        app.logger.info(f"Login attempt for phone: {full_phone}")

        # Store form data in session for the verification step
        from flask import session
        session['telegram_phone'] = full_phone
        session['telegram_country_code'] = country_code
        app.logger.info(f"Stored phone in session: {session.get('telegram_phone')}")

        # Send verification code
        async def send_code():
            result = await telegram_auth.send_code_request(phone_number, country_code)
            return result

        # Run async function with proper event loop management
        try:
            app.logger.info("Sending verification code...")
            result = run_async_in_thread(send_code())
            app.logger.info(f"Send code result: {result}")
        except Exception as e:
            app.logger.error(f"Failed to send verification code: {e}")
            result = {'success': False, 'error': str(e)}

        if result['success']:
            session['telegram_session_id'] = result['session_id']
            app.logger.info(f"Session ID stored: {result['session_id']}")
            flash('Verification code sent to your Telegram!', 'success')
            return redirect(url_for('telegram_verify'))
        else:
            app.logger.error(f"Failed to send code: {result['error']}")
            error_message = result['error']

            # Return JSON for AJAX requests
            if request.is_json or request.headers.get('Content-Type') == 'application/x-www-form-urlencoded':
                return jsonify({
                    'success': False,
                    'error': 'send_code_failed',
                    'message': error_message
                }), 400

            flash(error_message, 'error')
    else:
        if form.errors:
            app.logger.warning(f"Form validation errors: {form.errors}")

            # Return JSON for AJAX requests with validation errors
            if request.is_json or request.headers.get('Content-Type') == 'application/x-www-form-urlencoded':
                return jsonify({
                    'success': False,
                    'error': 'validation_error',
                    'message': 'Please check your input and try again.',
                    'errors': form.errors
                }), 400

    return render_template('auth/tg_login.html', form=form)

@app.route('/telegram_verify', methods=['GET', 'POST'])
def telegram_verify():
    """Telegram verification - code input"""
    app.logger.info("=== TELEGRAM VERIFY START ===")

    if current_user.is_authenticated:
        app.logger.info(f"User already authenticated: {current_user.username}")
        return redirect(url_for('dashboard'))

    from flask import session
    app.logger.info(f"Session keys: {list(session.keys())}")

    if 'telegram_session_id' not in session:
        app.logger.error("No telegram_session_id in session - session expired")
        flash('Session expired. Please try again.', 'error')
        return redirect(url_for('telegram_login'))

    form = TelegramVerifyForm()
    phone_number = session.get('telegram_phone', '')
    requires_password = request.args.get('requires_password', False)

    app.logger.info(f"Phone from session: {phone_number}")
    app.logger.info(f"Requires password: {requires_password}")

    if form.validate_on_submit():
        session_id = session['telegram_session_id']
        verification_code = form.verification_code.data
        password = form.password.data if form.password.data else None

        app.logger.info(f"Verification attempt - Session ID: {session_id}")
        app.logger.info(f"Verification code length: {len(verification_code)}")
        app.logger.info(f"Password provided: {bool(password)}")

        # Verify code
        async def verify_code():
            result = await telegram_auth.verify_code(session_id, verification_code, password)
            return result

        # Run async function with proper event loop management
        try:
            app.logger.info("Starting code verification...")
            result = run_async_in_thread(verify_code())
            app.logger.info(f"Verification result: {result}")
        except Exception as e:
            app.logger.error(f"Failed to verify code: {e}")
            result = {'success': False, 'error': str(e)}

        if result['success']:
            app.logger.info("=== AUTHENTICATION SUCCESSFUL ===")
            telegram_id = str(result['user']['telegram_id'])
            app.logger.info(f"Looking for user with telegram_id: {telegram_id}")

            # User was already created/updated in the authentication process
            # Find the user by telegram_id
            user = User.query.filter_by(telegram_id=telegram_id).first()
            if user:
                app.logger.info(f"Found existing user: {user.username} (ID: {user.id})")
                app.logger.info(f"User active status: {user.is_active}")
                app.logger.info(f"User auth method: {user.auth_method}")

                # Ensure user is active
                if not user.is_active:
                    app.logger.info("Activating inactive user")
                    user.is_active = True
                    db.session.commit()

                # Record successful login
                app.logger.info("Recording successful login")
                user.record_successful_login()
                db.session.commit()

                app.logger.info("Calling login_user()")
                login_user(user, remember=True)
                app.logger.info(f"Login completed. current_user.is_authenticated: {current_user.is_authenticated}")

                # Clear session data
                session.pop('telegram_session_id', None)
                session.pop('telegram_phone', None)
                session.pop('telegram_country_code', None)
                app.logger.info("Cleared session data")

                flash('Login successful!', 'success')
                next_page = request.args.get('next')
                if not next_page or not next_page.startswith('/'):
                    next_page = url_for('dashboard')
                app.logger.info(f"Redirecting to: {next_page}")
                return redirect(next_page)
            else:
                # This should not happen since create_or_update_user was called
                # But let's handle it gracefully by creating the user here
                app.logger.warning(f"User not found in database for telegram_id: {telegram_id}")
                app.logger.info("Creating fallback user account")
                try:
                    user = User(
                        username=result['user']['username'],
                        email=f"{result['user']['username']}@telegram.local",
                        telegram_id=str(result['user']['telegram_id']),
                        phone_number=result['user']['phone'],
                        first_name=result['user']['first_name'] or '',
                        last_name=result['user']['last_name'] or '',
                        is_active=True,
                        role='user',
                        auth_method='telegram'
                    )
                    db.session.add(user)
                    db.session.commit()
                    app.logger.info(f"Created fallback user: {user.username} (ID: {user.id})")

                    # Record successful login
                    user.record_successful_login()
                    db.session.commit()

                    login_user(user, remember=True)
                    app.logger.info(f"Logged in fallback user. current_user.is_authenticated: {current_user.is_authenticated}")

                    # Clear session data
                    session.pop('telegram_session_id', None)
                    session.pop('telegram_phone', None)
                    session.pop('telegram_country_code', None)

                    flash('Login successful!', 'success')
                    next_page = request.args.get('next')
                    if not next_page or not next_page.startswith('/'):
                        next_page = url_for('dashboard')
                    app.logger.info(f"Redirecting fallback user to: {next_page}")
                    return redirect(next_page)
                except Exception as e:
                    app.logger.error(f"Error creating fallback user: {str(e)}")
                    flash(f'Error creating user account: {str(e)}', 'error')
        elif result.get('requires_password'):
            app.logger.info("Two-factor authentication required")
            return render_template('auth/tg_verify.html',
                                 form=form,
                                 phone_number=phone_number,
                                 requires_password=True)
        else:
            app.logger.error(f"Authentication failed: {result.get('error', 'Unknown error')}")
            error_message = result['error']

            # Handle specific error cases with better user guidance
            if result.get('code_expired') or result.get('session_expired'):
                app.logger.info("Code or session expired - redirecting to login")
                flash(error_message, 'error')
                # Clear session data
                session.pop('telegram_session_id', None)
                session.pop('telegram_phone', None)
                session.pop('telegram_country_code', None)
                return redirect(url_for('telegram_login'))
            else:
                flash(error_message, 'error')
    else:
        if form.errors:
            app.logger.warning(f"Verification form validation errors: {form.errors}")

    return render_template('auth/tg_verify.html',
                         form=form,
                         phone_number=phone_number,
                         requires_password=requires_password)

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
                return render_template('share/password.html', token=token, error=None)
            else:
                return render_template('share/denied.html', message=message), 403

        # Check view limit
        if share_link.is_view_limit_reached():
            return render_template('share/denied.html', message="View limit reached"), 403

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
            return render_template('share/password.html', token=token, error="Invalid password")

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
        output_dir = flask_config.flask_config.get('directories.output', 'output')
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

@app.route('/api/bulk_operations', methods=['POST'])
@login_required
def bulk_operations():
    """Perform bulk operations on multiple files"""
    try:
        data = request.get_json()
        operation = data.get('operation')
        file_ids = data.get('file_ids', [])

        if not operation or not file_ids:
            return jsonify({'success': False, 'error': 'Operation and file IDs are required'})

        # Validate file ownership
        user = get_or_create_user()
        files = File.query.filter(
            File.id.in_(file_ids),
            File.user_id == user.id,
            File.is_deleted == False
        ).all()

        if len(files) != len(file_ids):
            return jsonify({'success': False, 'error': 'Some files not found or access denied'})

        results = []

        if operation == 'delete':
            for file in files:
                file.is_deleted = True
                results.append({'id': file.id, 'filename': file.filename, 'status': 'deleted'})

            db.session.commit()

            # Invalidate cache
            for page in range(1, 11):
                for per_page in [20, 50, 100]:
                    cache_delete(f"files_{user.id}_{page}_{per_page}")

            return jsonify({
                'success': True,
                'message': f'Successfully deleted {len(files)} files',
                'results': results
            })

        elif operation == 'move':
            folder_id = data.get('folder_id')
            if folder_id:
                # Validate folder ownership
                folder = Folder.query.filter_by(id=folder_id, user_id=user.id).first()
                if not folder:
                    return jsonify({'success': False, 'error': 'Folder not found or access denied'})

            for file in files:
                file.folder_id = folder_id
                results.append({'id': file.id, 'filename': file.filename, 'status': 'moved'})

            db.session.commit()

            # Invalidate cache
            for page in range(1, 11):
                for per_page in [20, 50, 100]:
                    cache_delete(f"files_{user.id}_{page}_{per_page}")

            return jsonify({
                'success': True,
                'message': f'Successfully moved {len(files)} files',
                'results': results
            })

        elif operation == 'favorite':
            is_favorite = data.get('is_favorite', True)
            for file in files:
                file.is_favorite = is_favorite
                results.append({'id': file.id, 'filename': file.filename, 'status': 'favorited' if is_favorite else 'unfavorited'})

            db.session.commit()

            # Invalidate cache
            for page in range(1, 11):
                for per_page in [20, 50, 100]:
                    cache_delete(f"files_{user.id}_{page}_{per_page}")

            return jsonify({
                'success': True,
                'message': f'Successfully updated {len(files)} files',
                'results': results
            })

        else:
            return jsonify({'success': False, 'error': 'Unsupported operation'})

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/bulk_download', methods=['POST'])
@login_required
def bulk_download():
    """Create a ZIP archive for bulk download of multiple files"""
    try:
        data = request.get_json()
        file_ids = data.get('file_ids', [])

        if not file_ids:
            return jsonify({'success': False, 'error': 'File IDs are required'})

        # Validate file ownership
        user = get_or_create_user()
        files = File.query.filter(
            File.id.in_(file_ids),
            File.user_id == user.id,
            File.is_deleted == False
        ).all()

        if not files:
            return jsonify({'success': False, 'error': 'No files found or access denied'})

        import zipfile
        import tempfile
        from pathlib import Path

        # Create temporary ZIP file
        temp_dir = Path(tempfile.gettempdir())
        zip_filename = f"bulk_download_{user.id}_{int(time.time())}.zip"
        zip_path = temp_dir / zip_filename

        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for file in files:
                if file.file_path and os.path.exists(file.file_path):
                    # Add file to ZIP with original filename
                    zipf.write(file.file_path, file.original_filename or file.filename)

        # Return download URL
        return jsonify({
            'success': True,
            'download_url': f'/api/download_bulk/{zip_filename}',
            'filename': f'bulk_download_{len(files)}_files.zip',
            'file_count': len(files)
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/download_bulk/<filename>')
@login_required
def download_bulk_file(filename):
    """Download bulk ZIP file"""
    try:
        import tempfile
        from pathlib import Path

        temp_dir = Path(tempfile.gettempdir())
        zip_path = temp_dir / filename

        if not zip_path.exists():
            return jsonify({'error': 'File not found'}), 404

        # Verify filename format for security
        if not filename.startswith(f'bulk_download_{get_or_create_user().id}_'):
            return jsonify({'error': 'Access denied'}), 403

        def remove_file():
            """Remove temporary file after download"""
            try:
                os.remove(zip_path)
            except:
                pass

        return send_file(
            zip_path,
            as_attachment=True,
            download_name=f'bulk_download_{len(filename.split("_"))}_files.zip',
            mimetype='application/zip'
        )

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/file/<int:file_id>/versions', methods=['GET'])
@login_required
def get_file_versions(file_id):
    """Get version history for a file"""
    try:
        user = get_or_create_user()
        file = File.query.filter_by(id=file_id, user_id=user.id, is_deleted=False).first()

        if not file:
            return jsonify({'error': 'File not found'}), 404

        versions = file.get_version_history()
        version_data = [version.get_file_info() for version in versions]

        return jsonify({
            'success': True,
            'file_id': file_id,
            'current_version': file.current_version,
            'version_count': file.version_count,
            'versions': version_data
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/file/<int:file_id>/create_version', methods=['POST'])
@login_required
def create_file_version(file_id):
    """Create a new version of a file"""
    try:
        data = request.get_json()
        change_description = data.get('change_description', '')
        version_name = data.get('version_name', '')

        user = get_or_create_user()
        file = File.query.filter_by(id=file_id, user_id=user.id, is_deleted=False).first()

        if not file:
            return jsonify({'error': 'File not found'}), 404

        # Create version
        version = file.create_version(change_description, version_name)
        db.session.add(version)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Version created successfully',
            'version': version.get_file_info(),
            'current_version': file.current_version
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/file/<int:file_id>/restore_version/<int:version_number>', methods=['POST'])
@login_required
def restore_file_version(file_id, version_number):
    """Restore a file to a specific version"""
    try:
        user = get_or_create_user()
        file = File.query.filter_by(id=file_id, user_id=user.id, is_deleted=False).first()

        if not file:
            return jsonify({'error': 'File not found'}), 404

        # Create a version of current state before restoring
        current_version = file.create_version(f'Auto-backup before restoring to v{version_number}')
        db.session.add(current_version)

        # Restore to specified version
        if file.restore_version(version_number):
            db.session.commit()

            # Invalidate cache
            for page in range(1, 11):
                for per_page in [20, 50, 100]:
                    cache_delete(f"files_{user.id}_{page}_{per_page}")

            return jsonify({
                'success': True,
                'message': f'File restored to version {version_number}',
                'current_version': file.current_version
            })
        else:
            db.session.rollback()
            return jsonify({'error': 'Failed to restore version'}), 400

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/compress_files', methods=['POST'])
@login_required
def compress_files():
    """Compress multiple files into a ZIP archive"""
    try:
        data = request.get_json()
        file_ids = data.get('file_ids', [])
        archive_name = data.get('archive_name', 'archive.zip')
        compression_level = data.get('compression_level', 6)  # 0-9, 6 is default

        if not file_ids:
            return jsonify({'error': 'File IDs are required'}), 400

        # Validate file ownership
        user = get_or_create_user()
        files = File.query.filter(
            File.id.in_(file_ids),
            File.user_id == user.id,
            File.is_deleted == False
        ).all()

        if not files:
            return jsonify({'error': 'No files found or access denied'}), 404

        import zipfile
        import tempfile
        from pathlib import Path

        # Create compressed archive
        temp_dir = Path(tempfile.gettempdir())
        archive_path = temp_dir / f"compressed_{user.id}_{int(time.time())}_{archive_name}"

        total_original_size = 0
        compressed_files = []

        with zipfile.ZipFile(archive_path, 'w', zipfile.ZIP_DEFLATED, compresslevel=compression_level) as zipf:
            for file in files:
                if file.file_path and os.path.exists(file.file_path):
                    original_size = os.path.getsize(file.file_path)
                    total_original_size += original_size

                    # Add file to archive
                    zipf.write(file.file_path, file.original_filename or file.filename)
                    compressed_files.append({
                        'id': file.id,
                        'filename': file.filename,
                        'original_size': original_size
                    })

        # Get compressed size
        compressed_size = os.path.getsize(archive_path)
        compression_ratio = (1 - compressed_size / total_original_size) * 100 if total_original_size > 0 else 0

        # Save compressed file to database
        compressed_file = File(
            filename=archive_name,
            original_filename=archive_name,
            file_path=str(archive_path),
            file_size=compressed_size,
            mime_type='application/zip',
            user_id=user.id,
            description=f'Compressed archive of {len(files)} files'
        )

        db.session.add(compressed_file)
        db.session.commit()

        # Invalidate cache
        for page in range(1, 11):
            for per_page in [20, 50, 100]:
                cache_delete(f"files_{user.id}_{page}_{per_page}")

        return jsonify({
            'success': True,
            'message': f'Successfully compressed {len(files)} files',
            'archive': {
                'id': compressed_file.id,
                'filename': archive_name,
                'compressed_size': compressed_size,
                'original_size': total_original_size,
                'compression_ratio': round(compression_ratio, 2),
                'file_count': len(compressed_files)
            },
            'compressed_files': compressed_files
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/extract_archive/<int:file_id>', methods=['POST'])
@login_required
def extract_archive(file_id):
    """Extract files from a ZIP archive"""
    try:
        data = request.get_json()
        extract_to_folder = data.get('folder_id')  # Optional folder to extract to

        user = get_or_create_user()
        archive_file = File.query.filter_by(id=file_id, user_id=user.id, is_deleted=False).first()

        if not archive_file:
            return jsonify({'error': 'Archive file not found'}), 404

        if not archive_file.mime_type or 'zip' not in archive_file.mime_type.lower():
            return jsonify({'error': 'File is not a ZIP archive'}), 400

        import zipfile
        from pathlib import Path

        # Validate folder if specified
        folder = None
        if extract_to_folder:
            folder = Folder.query.filter_by(id=extract_to_folder, user_id=user.id).first()
            if not folder:
                return jsonify({'error': 'Destination folder not found'}), 404

        extracted_files = []

        # Extract archive
        with zipfile.ZipFile(archive_file.file_path, 'r') as zipf:
            # Get upload directory
            upload_dir = Path(flask_config.flask_config.get_directories()['uploads'])

            for file_info in zipf.filelist:
                if not file_info.is_dir():
                    # Extract file
                    extracted_data = zipf.read(file_info.filename)

                    # Create unique filename
                    safe_filename = secure_filename(file_info.filename)
                    unique_filename = f"{int(time.time())}_{safe_filename}"
                    file_path = upload_dir / unique_filename

                    # Save extracted file
                    with open(file_path, 'wb') as f:
                        f.write(extracted_data)

                    # Create database record
                    extracted_file = File(
                        filename=safe_filename,
                        original_filename=file_info.filename,
                        file_path=str(file_path),
                        file_size=file_info.file_size,
                        mime_type='application/octet-stream',  # Default mime type
                        user_id=user.id,
                        folder_id=folder.id if folder else None,
                        description=f'Extracted from {archive_file.filename}'
                    )

                    db.session.add(extracted_file)
                    extracted_files.append({
                        'filename': safe_filename,
                        'size': file_info.file_size,
                        'id': extracted_file.id
                    })

        db.session.commit()

        # Invalidate cache
        for page in range(1, 11):
            for per_page in [20, 50, 100]:
                cache_delete(f"files_{user.id}_{page}_{per_page}")

        return jsonify({
            'success': True,
            'message': f'Successfully extracted {len(extracted_files)} files',
            'extracted_files': extracted_files,
            'destination_folder': folder.name if folder else 'Root'
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/share_links', methods=['GET'])
@login_required
def get_share_links():
    """Get all share links created by the current user"""
    try:
        user = get_or_create_user()
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)

        # Get share links with pagination
        pagination = ShareLink.query.filter_by(user_id=user.id).order_by(ShareLink.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

        share_links = []
        for link in pagination.items:
            share_links.append({
                'id': link.id,
                'token': link.token,
                'file_id': link.file_id,
                'file_name': link.file.filename if link.file else 'Unknown',
                'name': link.name,
                'description': link.description,
                'can_view': link.can_view,
                'can_download': link.can_download,
                'can_preview': link.can_preview,
                'max_downloads': link.max_downloads,
                'download_count': link.download_count,
                'max_views': link.max_views,
                'view_count': link.view_count,
                'expires_at': link.expires_at.isoformat() if link.expires_at else None,
                'is_active': link.is_active,
                'created_at': link.created_at.isoformat() if link.created_at else None,
                'last_accessed': link.last_accessed.isoformat() if link.last_accessed else None,
                'has_password': bool(link.password_hash),
                'url': f'/share/{link.token}'
            })

        return jsonify({
            'success': True,
            'share_links': share_links,
            'pagination': {
                'page': pagination.page,
                'per_page': pagination.per_page,
                'total': pagination.total,
                'pages': pagination.pages,
                'has_prev': pagination.has_prev,
                'has_next': pagination.has_next
            }
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/share_link/<int:link_id>/update', methods=['PUT'])
@login_required
def update_share_link(link_id):
    """Update share link settings"""
    try:
        user = get_or_create_user()
        share_link = ShareLink.query.filter_by(id=link_id, user_id=user.id).first()

        if not share_link:
            return jsonify({'error': 'Share link not found'}), 404

        data = request.get_json()

        # Update basic settings
        if 'name' in data:
            share_link.name = data['name']
        if 'description' in data:
            share_link.description = data['description']
        if 'is_active' in data:
            share_link.is_active = data['is_active']

        # Update permissions
        if 'can_view' in data:
            share_link.can_view = data['can_view']
        if 'can_download' in data:
            share_link.can_download = data['can_download']
        if 'can_preview' in data:
            share_link.can_preview = data['can_preview']

        # Update limits
        if 'max_downloads' in data:
            share_link.max_downloads = data['max_downloads']
        if 'max_views' in data:
            share_link.max_views = data['max_views']

        # Update expiration
        if 'expires_at' in data:
            if data['expires_at']:
                share_link.expires_at = datetime.fromisoformat(data['expires_at'])
            else:
                share_link.expires_at = None

        # Update password
        if 'password' in data:
            share_link.set_password(data['password'])

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Share link updated successfully',
            'share_link': {
                'id': share_link.id,
                'token': share_link.token,
                'name': share_link.name,
                'description': share_link.description,
                'is_active': share_link.is_active,
                'url': f'/share/{share_link.token}'
            }
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/share_link/<int:link_id>/analytics', methods=['GET'])
@login_required
def get_share_link_analytics(link_id):
    """Get analytics for a share link"""
    try:
        user = get_or_create_user()
        share_link = ShareLink.query.filter_by(id=link_id, user_id=user.id).first()

        if not share_link:
            return jsonify({'error': 'Share link not found'}), 404

        # Calculate analytics
        total_views = share_link.view_count
        total_downloads = share_link.download_count

        # Calculate usage percentage
        view_usage = 0
        download_usage = 0

        if share_link.max_views:
            view_usage = (total_views / share_link.max_views) * 100
        if share_link.max_downloads:
            download_usage = (total_downloads / share_link.max_downloads) * 100

        # Check if expired
        is_expired = False
        if share_link.expires_at:
            is_expired = datetime.utcnow() > share_link.expires_at

        # Check if limits reached
        view_limit_reached = share_link.max_views and total_views >= share_link.max_views
        download_limit_reached = share_link.max_downloads and total_downloads >= share_link.max_downloads

        return jsonify({
            'success': True,
            'analytics': {
                'total_views': total_views,
                'total_downloads': total_downloads,
                'view_usage_percentage': round(view_usage, 2),
                'download_usage_percentage': round(download_usage, 2),
                'is_expired': is_expired,
                'view_limit_reached': view_limit_reached,
                'download_limit_reached': download_limit_reached,
                'is_active': share_link.is_active,
                'created_at': share_link.created_at.isoformat() if share_link.created_at else None,
                'last_accessed': share_link.last_accessed.isoformat() if share_link.last_accessed else None,
                'expires_at': share_link.expires_at.isoformat() if share_link.expires_at else None
            }
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/file/<int:file_id>/comments', methods=['GET'])
@login_required
def get_file_comments(file_id):
    """Get comments for a file"""
    try:
        user = get_or_create_user()
        file = File.query.filter_by(id=file_id, user_id=user.id, is_deleted=False).first()

        if not file:
            return jsonify({'error': 'File not found'}), 404

        # Get top-level comments (not replies)
        comments = FileComment.query.filter_by(
            file_id=file_id,
            parent_id=None,
            is_deleted=False
        ).order_by(FileComment.is_pinned.desc(), FileComment.created_at.desc()).all()

        comment_threads = [comment.get_thread_info() for comment in comments]

        return jsonify({
            'success': True,
            'file_id': file_id,
            'comment_count': len(comment_threads),
            'comments': comment_threads
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/file/<int:file_id>/comments', methods=['POST'])
@login_required
def add_file_comment(file_id):
    """Add a comment to a file"""
    try:
        user = get_or_create_user()
        file = File.query.filter_by(id=file_id, user_id=user.id, is_deleted=False).first()

        if not file:
            return jsonify({'error': 'File not found'}), 404

        data = request.get_json()
        content = data.get('content', '').strip()
        parent_id = data.get('parent_id')
        content_type = data.get('content_type', 'text')

        if not content:
            return jsonify({'error': 'Comment content is required'}), 400

        # Validate parent comment if specified
        if parent_id:
            parent_comment = FileComment.query.filter_by(
                id=parent_id,
                file_id=file_id,
                is_deleted=False
            ).first()
            if not parent_comment:
                return jsonify({'error': 'Parent comment not found'}), 404

        # Create comment
        comment = FileComment(
            file_id=file_id,
            user_id=user.id,
            parent_id=parent_id,
            content=content,
            content_type=content_type
        )

        db.session.add(comment)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Comment added successfully',
            'comment': comment.get_comment_info()
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/comment/<int:comment_id>', methods=['PUT'])
@login_required
def update_comment(comment_id):
    """Update a comment"""
    try:
        user = get_or_create_user()
        comment = FileComment.query.filter_by(id=comment_id, user_id=user.id, is_deleted=False).first()

        if not comment:
            return jsonify({'error': 'Comment not found or access denied'}), 404

        data = request.get_json()
        content = data.get('content', '').strip()

        if not content:
            return jsonify({'error': 'Comment content is required'}), 400

        # Update comment
        comment.content = content
        comment.is_edited = True

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Comment updated successfully',
            'comment': comment.get_comment_info()
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/comment/<int:comment_id>', methods=['DELETE'])
@login_required
def delete_comment(comment_id):
    """Delete a comment"""
    try:
        user = get_or_create_user()
        comment = FileComment.query.filter_by(id=comment_id, user_id=user.id, is_deleted=False).first()

        if not comment:
            return jsonify({'error': 'Comment not found or access denied'}), 404

        # Mark as deleted instead of actually deleting
        comment.is_deleted = True
        comment.content = '[Comment deleted]'

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Comment deleted successfully'
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/comment/<int:comment_id>/pin', methods=['POST'])
@login_required
def pin_comment(comment_id):
    """Pin/unpin a comment"""
    try:
        user = get_or_create_user()
        comment = FileComment.query.filter_by(id=comment_id, is_deleted=False).first()

        if not comment:
            return jsonify({'error': 'Comment not found'}), 404

        # Check if user owns the file
        file = File.query.filter_by(id=comment.file_id, user_id=user.id, is_deleted=False).first()
        if not file:
            return jsonify({'error': 'Access denied'}), 403

        data = request.get_json()
        is_pinned = data.get('is_pinned', True)

        comment.is_pinned = is_pinned
        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'Comment {"pinned" if is_pinned else "unpinned"} successfully',
            'comment': comment.get_comment_info()
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/activity_logs', methods=['GET'])
@login_required
def get_activity_logs():
    """Get activity logs for the current user"""
    try:
        user = get_or_create_user()
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 50, type=int), 100)
        action_filter = request.args.get('action')
        file_id_filter = request.args.get('file_id', type=int)

        # Build query
        query = ActivityLog.query.filter_by(user_id=user.id)

        if action_filter:
            query = query.filter(ActivityLog.action == action_filter)
        if file_id_filter:
            query = query.filter(ActivityLog.file_id == file_id_filter)

        # Get activities with pagination
        pagination = query.order_by(ActivityLog.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

        activities = [activity.get_activity_info() for activity in pagination.items]

        return jsonify({
            'success': True,
            'activities': activities,
            'pagination': {
                'page': pagination.page,
                'per_page': pagination.per_page,
                'total': pagination.total,
                'pages': pagination.pages,
                'has_prev': pagination.has_prev,
                'has_next': pagination.has_next
            }
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/file/<int:file_id>/activity', methods=['GET'])
@login_required
def get_file_activity(file_id):
    """Get activity logs for a specific file"""
    try:
        user = get_or_create_user()
        file = File.query.filter_by(id=file_id, user_id=user.id, is_deleted=False).first()

        if not file:
            return jsonify({'error': 'File not found'}), 404

        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)

        # Get file activities
        pagination = ActivityLog.query.filter_by(file_id=file_id).order_by(
            ActivityLog.created_at.desc()
        ).paginate(page=page, per_page=per_page, error_out=False)

        activities = [activity.get_activity_info() for activity in pagination.items]

        # Get activity summary
        activity_counts = {}
        for activity in ActivityLog.query.filter_by(file_id=file_id).all():
            activity_counts[activity.action] = activity_counts.get(activity.action, 0) + 1

        return jsonify({
            'success': True,
            'file_id': file_id,
            'file_name': file.filename,
            'activities': activities,
            'activity_summary': activity_counts,
            'pagination': {
                'page': pagination.page,
                'per_page': pagination.per_page,
                'total': pagination.total,
                'pages': pagination.pages,
                'has_prev': pagination.has_prev,
                'has_next': pagination.has_next
            }
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Helper function to log activities
def log_user_activity(action, description=None, file_id=None, metadata=None):
    """Helper function to log user activities"""
    try:
        user = get_or_create_user()
        ip_address = request.remote_addr if request else None
        user_agent = request.headers.get('User-Agent') if request else None

        # Log to database
        ActivityLog.log_activity(
            user_id=user.id,
            action=action,
            description=description,
            file_id=file_id,
            metadata=metadata,
            ip_address=ip_address,
            user_agent=user_agent
        )
        db.session.commit()

        # Log to detailed logging system
        if DETAILED_LOGGING_AVAILABLE:
            log_user_action(action, str(user.id), {
                'description': description,
                'file_id': file_id,
                'metadata': metadata,
                'ip_address': ip_address,
                'user_agent': user_agent[:100] if user_agent else None  # Truncate user agent
            })
            log_database_operation("INSERT", "activity_log", {
                'user_id': user.id,
                'action': action
            })

    except Exception as e:
        if DETAILED_LOGGING_AVAILABLE:
            log_error(e, "log_user_activity")
        print(f"Failed to log activity: {e}")

@app.route('/api/search_suggestions', methods=['GET'])
@login_required
def get_search_suggestions():
    """Get search suggestions based on user's files"""
    try:
        user = get_or_create_user()
        query = request.args.get('q', '').strip()
        limit = min(int(request.args.get('limit', 10)), 20)

        suggestions = {
            'filenames': [],
            'tags': [],
            'channels': [],
            'folders': []
        }

        if query:
            # Filename suggestions
            filename_matches = File.query.filter(
                File.user_id == user.id,
                File.is_deleted == False,
                File.filename.ilike(f'%{query}%')
            ).limit(limit).all()

            suggestions['filenames'] = [f.filename for f in filename_matches]

            # Tag suggestions
            tag_matches = File.query.filter(
                File.user_id == user.id,
                File.is_deleted == False,
                File.tags.ilike(f'%{query}%'),
                File.tags.isnot(None)
            ).limit(limit).all()

            all_tags = set()
            for file in tag_matches:
                if file.tags:
                    file_tags = [tag.strip() for tag in file.tags.split(',')]
                    all_tags.update([tag for tag in file_tags if query.lower() in tag.lower()])

            suggestions['tags'] = list(all_tags)[:limit]

            # Channel suggestions
            channel_matches = File.query.filter(
                File.user_id == user.id,
                File.is_deleted == False,
                File.telegram_channel.ilike(f'%{query}%'),
                File.telegram_channel.isnot(None)
            ).distinct(File.telegram_channel).limit(limit).all()

            suggestions['channels'] = [f.telegram_channel for f in channel_matches if f.telegram_channel]

            # Folder suggestions
            folder_matches = Folder.query.filter(
                Folder.user_id == user.id,
                Folder.name.ilike(f'%{query}%')
            ).limit(limit).all()

            suggestions['folders'] = [{'id': f.id, 'name': f.name} for f in folder_matches]

        return jsonify({
            'success': True,
            'query': query,
            'suggestions': suggestions
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/smart_folders', methods=['GET'])
@login_required
def get_smart_folders():
    """Get all smart folders for the current user"""
    try:
        user = get_or_create_user()
        smart_folders = SmartFolder.query.filter_by(user_id=user.id).order_by(SmartFolder.name).all()

        folders_data = []
        for folder in smart_folders:
            folder_info = folder.get_folder_info()
            folders_data.append(folder_info)

        return jsonify({
            'success': True,
            'smart_folders': folders_data
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/smart_folders', methods=['POST'])
@login_required
def create_smart_folder():
    """Create a new smart folder"""
    try:
        user = get_or_create_user()
        data = request.get_json()

        name = data.get('name', '').strip()
        description = data.get('description', '')
        rules = data.get('rules', {})
        icon = data.get('icon', 'folder')
        color = data.get('color', '#3498db')

        if not name:
            return jsonify({'error': 'Folder name is required'}), 400

        # Check if name already exists
        existing = SmartFolder.query.filter_by(user_id=user.id, name=name).first()
        if existing:
            return jsonify({'error': 'Smart folder with this name already exists'}), 400

        # Create smart folder
        smart_folder = SmartFolder(
            user_id=user.id,
            name=name,
            description=description,
            icon=icon,
            color=color
        )
        smart_folder.set_rules(rules)

        db.session.add(smart_folder)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Smart folder created successfully',
            'smart_folder': smart_folder.get_folder_info()
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/smart_folders/<int:folder_id>', methods=['PUT'])
@login_required
def update_smart_folder(folder_id):
    """Update a smart folder"""
    try:
        user = get_or_create_user()
        smart_folder = SmartFolder.query.filter_by(id=folder_id, user_id=user.id).first()

        if not smart_folder:
            return jsonify({'error': 'Smart folder not found'}), 404

        data = request.get_json()

        # Update basic properties
        if 'name' in data:
            name = data['name'].strip()
            if not name:
                return jsonify({'error': 'Folder name is required'}), 400

            # Check for duplicate names
            existing = SmartFolder.query.filter_by(user_id=user.id, name=name).filter(SmartFolder.id != folder_id).first()
            if existing:
                return jsonify({'error': 'Smart folder with this name already exists'}), 400

            smart_folder.name = name

        if 'description' in data:
            smart_folder.description = data['description']
        if 'icon' in data:
            smart_folder.icon = data['icon']
        if 'color' in data:
            smart_folder.color = data['color']
        if 'is_active' in data:
            smart_folder.is_active = data['is_active']
        if 'auto_update' in data:
            smart_folder.auto_update = data['auto_update']

        # Update rules
        if 'rules' in data:
            smart_folder.set_rules(data['rules'])

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Smart folder updated successfully',
            'smart_folder': smart_folder.get_folder_info()
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/smart_folders/<int:folder_id>/files', methods=['GET'])
@login_required
def get_smart_folder_files(folder_id):
    """Get files that match a smart folder's criteria"""
    try:
        user = get_or_create_user()
        smart_folder = SmartFolder.query.filter_by(id=folder_id, user_id=user.id).first()

        if not smart_folder:
            return jsonify({'error': 'Smart folder not found'}), 404

        # Get matching files
        files = smart_folder.get_matching_files()

        # Format file data
        files_data = []
        for file in files:
            files_data.append({
                'id': file.id,
                'filename': file.filename,
                'original_filename': file.original_filename,
                'file_size': file.file_size,
                'mime_type': file.mime_type,
                'description': file.description,
                'tags': file.tags,
                'is_favorite': file.is_favorite,
                'created_at': file.created_at.isoformat() if file.created_at else None,
                'updated_at': file.updated_at.isoformat() if file.updated_at else None
            })

        # Update last_updated timestamp
        smart_folder.last_updated = datetime.utcnow()
        db.session.commit()

        return jsonify({
            'success': True,
            'smart_folder': smart_folder.get_folder_info(),
            'files': files_data,
            'file_count': len(files_data)
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/smart_folders/<int:folder_id>', methods=['DELETE'])
@login_required
def delete_smart_folder(folder_id):
    """Delete a smart folder"""
    try:
        user = get_or_create_user()
        smart_folder = SmartFolder.query.filter_by(id=folder_id, user_id=user.id).first()

        if not smart_folder:
            return jsonify({'error': 'Smart folder not found'}), 404

        folder_name = smart_folder.name
        db.session.delete(smart_folder)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'Smart folder "{folder_name}" deleted successfully'
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Auto-tagging system
def generate_auto_tags(file_record):
    """Generate automatic tags for a file based on its properties"""
    tags = set()

    # File type based tags
    if file_record.mime_type:
        mime_type = file_record.mime_type.lower()

        if mime_type.startswith('image/'):
            tags.add('image')
            if 'jpeg' in mime_type or 'jpg' in mime_type:
                tags.add('photo')
            elif 'png' in mime_type:
                tags.add('png')
            elif 'gif' in mime_type:
                tags.add('gif')
            elif 'svg' in mime_type:
                tags.add('vector')

        elif mime_type.startswith('video/'):
            tags.add('video')
            if 'mp4' in mime_type:
                tags.add('mp4')
            elif 'avi' in mime_type:
                tags.add('avi')
            elif 'mov' in mime_type:
                tags.add('quicktime')

        elif mime_type.startswith('audio/'):
            tags.add('audio')
            tags.add('music')
            if 'mp3' in mime_type:
                tags.add('mp3')
            elif 'wav' in mime_type:
                tags.add('wav')
            elif 'flac' in mime_type:
                tags.add('lossless')

        elif mime_type.startswith('text/'):
            tags.add('text')
            tags.add('document')

        elif 'pdf' in mime_type:
            tags.add('pdf')
            tags.add('document')

        elif 'word' in mime_type or 'msword' in mime_type:
            tags.add('word')
            tags.add('document')

        elif 'excel' in mime_type or 'spreadsheet' in mime_type:
            tags.add('excel')
            tags.add('spreadsheet')

        elif 'powerpoint' in mime_type or 'presentation' in mime_type:
            tags.add('powerpoint')
            tags.add('presentation')

        elif 'zip' in mime_type or 'rar' in mime_type or '7z' in mime_type:
            tags.add('archive')
            tags.add('compressed')

    # File size based tags
    if file_record.file_size:
        size_mb = file_record.file_size / (1024 * 1024)

        if size_mb < 1:
            tags.add('small')
        elif size_mb < 10:
            tags.add('medium')
        elif size_mb < 100:
            tags.add('large')
        else:
            tags.add('huge')

    # Filename based tags
    if file_record.filename:
        filename_lower = file_record.filename.lower()

        # Common keywords in filenames
        if any(word in filename_lower for word in ['screenshot', 'screen', 'capture']):
            tags.add('screenshot')

        if any(word in filename_lower for word in ['backup', 'bak', 'copy']):
            tags.add('backup')

        if any(word in filename_lower for word in ['temp', 'tmp', 'temporary']):
            tags.add('temporary')

        if any(word in filename_lower for word in ['draft', 'wip', 'work-in-progress']):
            tags.add('draft')

        if any(word in filename_lower for word in ['final', 'finished', 'complete']):
            tags.add('final')

        if any(word in filename_lower for word in ['report', 'summary', 'analysis']):
            tags.add('report')

        if any(word in filename_lower for word in ['invoice', 'receipt', 'bill']):
            tags.add('financial')

        # Date patterns
        import re
        if re.search(r'\d{4}[-_]\d{2}[-_]\d{2}', filename_lower):
            tags.add('dated')

        if re.search(r'\d{4}', filename_lower):
            tags.add('yearly')

    # Channel based tags
    if file_record.telegram_channel:
        channel_lower = file_record.telegram_channel.lower()
        tags.add('telegram')

        if any(word in channel_lower for word in ['news', 'updates', 'announcement']):
            tags.add('news')

        if any(word in channel_lower for word in ['tech', 'technology', 'programming']):
            tags.add('tech')

        if any(word in channel_lower for word in ['music', 'song', 'audio']):
            tags.add('music')

    # Time based tags
    if file_record.created_at:
        now = datetime.utcnow()
        age_days = (now - file_record.created_at).days

        if age_days < 1:
            tags.add('today')
        elif age_days < 7:
            tags.add('recent')
        elif age_days < 30:
            tags.add('this-month')
        elif age_days < 365:
            tags.add('this-year')
        else:
            tags.add('old')

        # Season tags
        month = file_record.created_at.month
        if month in [12, 1, 2]:
            tags.add('winter')
        elif month in [3, 4, 5]:
            tags.add('spring')
        elif month in [6, 7, 8]:
            tags.add('summer')
        elif month in [9, 10, 11]:
            tags.add('autumn')

    return list(tags)

@app.route('/api/file/<int:file_id>/auto_tag', methods=['POST'])
@login_required
def auto_tag_file(file_id):
    """Generate and apply automatic tags to a file"""
    try:
        user = get_or_create_user()
        file_record = File.query.filter_by(id=file_id, user_id=user.id, is_deleted=False).first()

        if not file_record:
            return jsonify({'error': 'File not found'}), 404

        # Generate auto tags
        auto_tags = generate_auto_tags(file_record)

        # Merge with existing tags
        existing_tags = []
        if file_record.tags:
            existing_tags = [tag.strip() for tag in file_record.tags.split(',') if tag.strip()]

        # Combine and deduplicate
        all_tags = list(set(existing_tags + auto_tags))
        file_record.tags = ', '.join(sorted(all_tags))

        db.session.commit()

        # Log activity
        ActivityLog.log_activity(
            user_id=user.id,
            action='auto_tag',
            description=f'Auto-tagged file: {file_record.filename}',
            file_id=file_id,
            metadata={'generated_tags': auto_tags, 'total_tags': len(all_tags)},
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )

        return jsonify({
            'success': True,
            'message': 'File auto-tagged successfully',
            'generated_tags': auto_tags,
            'all_tags': all_tags,
            'file_id': file_id
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/auto_tag_all', methods=['POST'])
@login_required
def auto_tag_all_files():
    """Apply auto-tagging to all files for the current user"""
    try:
        user = get_or_create_user()
        data = request.get_json()
        overwrite_existing = data.get('overwrite_existing', False)

        # Get all files without tags or with overwrite option
        if overwrite_existing:
            files = File.query.filter_by(user_id=user.id, is_deleted=False).all()
        else:
            files = File.query.filter_by(user_id=user.id, is_deleted=False).filter(
                db.or_(File.tags.is_(None), File.tags == '')
            ).all()

        tagged_count = 0
        total_tags_added = 0

        for file_record in files:
            auto_tags = generate_auto_tags(file_record)

            if auto_tags:
                if overwrite_existing:
                    # Replace all tags
                    file_record.tags = ', '.join(sorted(auto_tags))
                    total_tags_added += len(auto_tags)
                else:
                    # Merge with existing tags
                    existing_tags = []
                    if file_record.tags:
                        existing_tags = [tag.strip() for tag in file_record.tags.split(',') if tag.strip()]

                    all_tags = list(set(existing_tags + auto_tags))
                    file_record.tags = ', '.join(sorted(all_tags))
                    total_tags_added += len(auto_tags)

                tagged_count += 1

        db.session.commit()

        # Log activity
        ActivityLog.log_activity(
            user_id=user.id,
            action='bulk_auto_tag',
            description=f'Auto-tagged {tagged_count} files',
            metadata={
                'files_tagged': tagged_count,
                'total_files': len(files),
                'tags_added': total_tags_added,
                'overwrite_existing': overwrite_existing
            },
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )

        return jsonify({
            'success': True,
            'message': f'Auto-tagged {tagged_count} files successfully',
            'files_tagged': tagged_count,
            'total_files': len(files),
            'tags_added': total_tags_added
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

async def cleanup_resources():
    """Clean up all resources on shutdown"""
    print("🧹 Cleaning up resources...")
    try:
        # Clean up global telegram authenticator
        await telegram_auth.close()
        print("✅ Telegram authenticator cleaned up")
    except Exception as e:
        print(f"⚠️ Error cleaning up telegram authenticator: {e}")

def setup_signal_handlers():
    """Setup signal handlers for graceful shutdown"""
    import signal
    import atexit

    def signal_handler(signum, frame):
        print(f"\n🛑 Received signal {signum}, shutting down gracefully...")
        try:
            # Run cleanup in a new event loop since we might not have one
            asyncio.run(cleanup_resources())
        except Exception as e:
            print(f"⚠️ Error during cleanup: {e}")
        finally:
            sys.exit(0)

    # Register signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    # Register cleanup on normal exit
    atexit.register(lambda: asyncio.run(cleanup_resources()) if not asyncio.get_event_loop().is_running() else None)

if __name__ == '__main__':
    print("🌐 Starting TeleDrive Web Interface...")

    # Setup signal handlers for graceful shutdown
    setup_signal_handlers()

    # Create necessary directories from config
    directories = flask_config.flask_config.get_directories()
    for name, path in directories.items():
        os.makedirs(path, exist_ok=True)

    # Get server configuration with port availability checking
    server_config = flask_config.flask_config.get_server_config()

    print(f"📱 Access at: http://{server_config['host']}:{server_config['port']}")
    print("⏹️  Press Ctrl+C to stop")

    # Remove incompatible parameters for socketio.run()
    socketio_config = {
        'host': server_config['host'],
        'port': server_config['port'],
        'debug': server_config['debug']
    }

    try:
        # Start server with configuration
        socketio.run(app, **socketio_config)
    except KeyboardInterrupt:
        print("\n🛑 Keyboard interrupt received, shutting down...")
    except OSError as e:
        if "address already in use" in str(e).lower() or "10048" in str(e):
            print(f"❌ Port {server_config['port']} is already in use")
            print("❌ TeleDrive is configured to use ONLY port 3000")
            print("🔧 Please stop any processes using port 3000 and try again")
            print("💡 You can use: netstat -ano | findstr :3000")
            print("💡 Then kill the process with: taskkill /f /pid <PID>")
            print("🚫 NO ALTERNATIVE PORTS WILL BE USED")
            raise RuntimeError("Port 3000 is required but already in use. TeleDrive uses ONLY port 3000.")
        else:
            raise
    finally:
        # Final cleanup
        try:
            asyncio.run(cleanup_resources())
        except Exception as e:
            print(f"⚠️ Error during final cleanup: {e}")
