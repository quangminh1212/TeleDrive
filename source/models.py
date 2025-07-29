#!/usr/bin/env python3
"""
Database Models for TeleDrive
SQLAlchemy models for users, files, folders, and scan sessions
"""

from datetime import datetime, timedelta
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
import json
import os
import bcrypt
import secrets
import hashlib

db = SQLAlchemy()

class User(UserMixin, db.Model):
    """User model for authentication and authorization"""
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True)
    username = Column(String(80), unique=True, nullable=False, index=True)
    email = Column(String(120), unique=True, nullable=False, index=True)
    password_hash = Column(String(128))
    role = Column(String(20), default='user')  # user, admin, viewer
    _is_active = Column('is_active', Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Telegram-specific fields
    telegram_id = Column(String(50), unique=True, nullable=True, index=True)
    phone_number = Column(String(20), nullable=True)
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    auth_method = Column(String(20), default='password')  # password, telegram

    # Password reset fields
    reset_token = Column(String(64), nullable=True, index=True)
    reset_token_expires = Column(DateTime, nullable=True)

    # Account security fields
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime, nullable=True)
    last_login_attempt = Column(DateTime, nullable=True)
    email_verified = Column(Boolean, default=False)
    email_verification_token = Column(String(64), nullable=True, index=True)
    
    # Relationships
    files = relationship('File', backref='owner', lazy='dynamic', cascade='all, delete-orphan')
    folders = relationship('Folder', backref='owner', lazy='dynamic', cascade='all, delete-orphan')
    scan_sessions = relationship('ScanSession', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    file_versions = relationship('FileVersion', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    file_comments = relationship('FileComment', backref='author', lazy='dynamic', cascade='all, delete-orphan')
    activity_logs = relationship('ActivityLog', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    smart_folders = relationship('SmartFolder', backref='owner', lazy='dynamic', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<User {self.username}>'

    # Flask-Login required methods
    def get_id(self):
        """Return the user ID as a string"""
        return str(self.id)

    def is_authenticated(self):
        """Return True if the user is authenticated"""
        return True

    def is_anonymous(self):
        """Return False as anonymous users aren't supported"""
        return False

    @property
    def is_active(self):
        """Return True if the user account is active"""
        return self._is_active

    @is_active.setter
    def is_active(self, value):
        """Set the user account active status"""
        self._is_active = value

    # Password methods
    def set_password(self, password):
        """Hash and set the user's password"""
        if password:
            password_bytes = password.encode('utf-8')
            salt = bcrypt.gensalt()
            self.password_hash = bcrypt.hashpw(password_bytes, salt).decode('utf-8')

    def check_password(self, password):
        """Check if the provided password matches the stored hash"""
        if not self.password_hash or not password:
            return False
        password_bytes = password.encode('utf-8')
        hash_bytes = self.password_hash.encode('utf-8')
        return bcrypt.checkpw(password_bytes, hash_bytes)

    def generate_reset_token(self):
        """Generate a password reset token"""
        self.reset_token = secrets.token_urlsafe(32)
        self.reset_token_expires = datetime.utcnow() + timedelta(hours=1)  # Token expires in 1 hour
        return self.reset_token

    def verify_reset_token(self, token):
        """Verify if the reset token is valid and not expired"""
        if not self.reset_token or not self.reset_token_expires:
            return False
        if self.reset_token != token:
            return False
        if datetime.utcnow() > self.reset_token_expires:
            return False
        return True

    def clear_reset_token(self):
        """Clear the reset token after use"""
        self.reset_token = None
        self.reset_token_expires = None

    def is_account_locked(self):
        """Check if account is currently locked"""
        if not self.locked_until:
            return False
        return datetime.utcnow() < self.locked_until

    def record_failed_login(self):
        """Record a failed login attempt"""
        self.failed_login_attempts = (self.failed_login_attempts or 0) + 1
        self.last_login_attempt = datetime.utcnow()

        # Lock account after 5 failed attempts for 15 minutes
        max_attempts = 5
        lockout_duration = timedelta(minutes=15)

        if self.failed_login_attempts >= max_attempts:
            self.locked_until = datetime.utcnow() + lockout_duration

    def record_successful_login(self):
        """Record a successful login and clear failed attempts"""
        self.failed_login_attempts = 0
        self.locked_until = None
        self.last_login_attempt = datetime.utcnow()

    def generate_email_verification_token(self):
        """Generate an email verification token"""
        self.email_verification_token = secrets.token_urlsafe(32)
        return self.email_verification_token

    def verify_email_token(self, token):
        """Verify email verification token"""
        if not self.email_verification_token:
            return False
        if self.email_verification_token != token:
            return False

        # Mark email as verified and clear token
        self.email_verified = True
        self.email_verification_token = None
        return True

    def to_dict(self):
        """Convert user to dictionary for JSON serialization"""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'is_active': self.is_active,
            'telegram_id': self.telegram_id,
            'phone_number': self.phone_number,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'auth_method': self.auth_method,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class Folder(db.Model):
    """Folder model for organizing files hierarchically"""
    __tablename__ = 'folders'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    parent_id = Column(Integer, ForeignKey('folders.id'), nullable=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    path = Column(String(1000))  # Full path for quick lookups
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    parent = relationship('Folder', remote_side=[id], backref='children')
    files = relationship('File', backref='folder', lazy='dynamic')
    
    def __repr__(self):
        return f'<Folder {self.name}>'
    
    def get_full_path(self):
        """Get the full path of the folder"""
        if self.parent:
            return f"{self.parent.get_full_path()}/{self.name}"
        return self.name
    
    def to_dict(self, include_children=False):
        """Convert folder to dictionary for JSON serialization"""
        result = {
            'id': self.id,
            'name': self.name,
            'parent_id': self.parent_id,
            'user_id': self.user_id,
            'path': self.path or self.get_full_path(),
            'is_deleted': self.is_deleted,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'file_count': self.files.count()
        }
        
        if include_children:
            result['children'] = [child.to_dict() for child in self.children if not child.is_deleted]
        
        return result

class File(db.Model):
    """File model for storing file metadata and information"""
    __tablename__ = 'files'
    
    id = Column(Integer, primary_key=True)
    filename = Column(String(255), nullable=False, index=True)
    original_filename = Column(String(255))
    file_path = Column(String(500))  # Path on disk
    file_size = Column(Integer, default=0)
    mime_type = Column(String(100), index=True)  # Index for file type filtering
    folder_id = Column(Integer, ForeignKey('folders.id'), nullable=True, index=True)  # Index for folder queries
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)  # Index for user queries
    
    # Telegram-specific fields
    telegram_message_id = Column(Integer)
    telegram_channel = Column(String(255))
    telegram_channel_id = Column(String(100))
    
    # File metadata and organization
    tags = Column(Text)  # JSON array of tags
    file_metadata = Column(Text)  # JSON metadata
    description = Column(Text)
    
    # File status and tracking
    is_deleted = Column(Boolean, default=False, index=True)  # Index for filtering deleted files
    is_favorite = Column(Boolean, default=False, index=True)  # Index for favorite files
    download_count = Column(Integer, default=0)
    
    # Versioning
    current_version = Column(Integer, default=1)
    version_count = Column(Integer, default=1)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    telegram_date = Column(DateTime)  # Original message date from Telegram
    
    def create_version(self, change_description=None, version_name=None):
        """Create a new version of this file"""
        import hashlib
        import shutil

        # Calculate file hash
        file_hash = None
        if self.file_path and os.path.exists(self.file_path):
            with open(self.file_path, 'rb') as f:
                file_hash = hashlib.sha256(f.read()).hexdigest()

        # Create version record
        version = FileVersion(
            file_id=self.id,
            user_id=self.user_id,
            version_number=self.current_version,
            version_name=version_name,
            change_description=change_description,
            filename=self.filename,
            file_path=self.file_path,
            file_size=self.file_size,
            mime_type=self.mime_type,
            file_hash=file_hash
        )

        # Update file version info
        self.current_version += 1
        self.version_count += 1

        return version

    def get_version_history(self):
        """Get version history for this file"""
        return FileVersion.query.filter_by(file_id=self.id).order_by(FileVersion.version_number.desc()).all()

    def restore_version(self, version_number):
        """Restore file to a specific version"""
        version = FileVersion.query.filter_by(file_id=self.id, version_number=version_number).first()
        if not version:
            return False

        # Copy version file to current location
        if version.file_path and os.path.exists(version.file_path):
            import shutil
            shutil.copy2(version.file_path, self.file_path)

            # Update file metadata
            self.file_size = version.file_size
            self.mime_type = version.mime_type

            return True

        return False

    def __repr__(self):
        return f'<File {self.filename}>'

    # Composite indexes for better query performance
    __table_args__ = (
        db.Index('idx_user_deleted_created', 'user_id', 'is_deleted', 'created_at'),
        db.Index('idx_folder_deleted_created', 'folder_id', 'is_deleted', 'created_at'),
        db.Index('idx_mime_deleted_created', 'mime_type', 'is_deleted', 'created_at'),
        db.Index('idx_user_favorite', 'user_id', 'is_favorite'),
    )

class FileVersion(db.Model):
    """File version model for tracking file history and changes"""
    __tablename__ = 'file_versions'

    id = Column(Integer, primary_key=True)
    file_id = Column(Integer, ForeignKey('files.id'), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)

    # Version information
    version_number = Column(Integer, nullable=False, default=1)
    version_name = Column(String(100))  # Optional version name/tag
    change_description = Column(Text)  # Description of changes

    # File metadata for this version
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)  # Path to version file
    file_size = Column(Integer, default=0)
    mime_type = Column(String(100))
    file_hash = Column(String(64))  # SHA-256 hash for integrity

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    # Relationships
    file = relationship('File', backref='versions')

    def __repr__(self):
        return f'<FileVersion {self.filename} v{self.version_number}>'

    def get_file_info(self):
        """Get file information for this version"""
        return {
            'id': self.id,
            'file_id': self.file_id,
            'version_number': self.version_number,
            'version_name': self.version_name,
            'filename': self.filename,
            'file_size': self.file_size,
            'mime_type': self.mime_type,
            'change_description': self.change_description,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'file_hash': self.file_hash
        }
    
    def get_tags(self):
        """Get tags as a list"""
        if self.tags:
            try:
                return json.loads(self.tags)
            except json.JSONDecodeError:
                return []
        return []
    
    def set_tags(self, tags_list):
        """Set tags from a list"""
        self.tags = json.dumps(tags_list) if tags_list else None
    
    def get_metadata(self):
        """Get metadata as a dictionary"""
        if self.file_metadata:
            try:
                return json.loads(self.file_metadata)
            except json.JSONDecodeError:
                return {}
        return {}

    def set_metadata(self, metadata_dict):
        """Set metadata from a dictionary"""
        self.file_metadata = json.dumps(metadata_dict) if metadata_dict else None
    
    def get_file_type(self):
        """Get file type category based on mime type"""
        if not self.mime_type:
            return 'unknown'
        
        if self.mime_type.startswith('image/'):
            return 'image'
        elif self.mime_type.startswith('video/'):
            return 'video'
        elif self.mime_type.startswith('audio/'):
            return 'audio'
        elif self.mime_type in ['application/pdf']:
            return 'document'
        elif self.mime_type.startswith('text/'):
            return 'text'
        else:
            return 'other'
    
    def to_dict(self):
        """Convert file to dictionary for JSON serialization"""
        return {
            'id': self.id,
            'filename': self.filename,
            'original_filename': self.original_filename,
            'file_path': self.file_path,
            'file_size': self.file_size,
            'mime_type': self.mime_type,
            'file_type': self.get_file_type(),
            'folder_id': self.folder_id,
            'folder_name': self.folder.name if self.folder else None,
            'user_id': self.user_id,
            'telegram_message_id': self.telegram_message_id,
            'telegram_channel': self.telegram_channel,
            'telegram_channel_id': self.telegram_channel_id,
            'tags': self.get_tags(),
            'metadata': self.get_metadata(),
            'description': self.description,
            'is_deleted': self.is_deleted,
            'is_favorite': self.is_favorite,
            'download_count': self.download_count,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'telegram_date': self.telegram_date.isoformat() if self.telegram_date else None
        }

class ScanSession(db.Model):
    """Scan session model for tracking Telegram channel scans"""
    __tablename__ = 'scan_sessions'
    
    id = Column(Integer, primary_key=True)
    channel_name = Column(String(255), nullable=False)
    channel_id = Column(String(100))
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    # Scan status and progress
    status = Column(String(50), default='pending')  # pending, running, completed, failed, cancelled
    files_found = Column(Integer, default=0)
    messages_scanned = Column(Integer, default=0)
    total_messages = Column(Integer, default=0)
    
    # Error handling
    error_message = Column(Text)
    
    # Timestamps
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    
    def __repr__(self):
        return f'<ScanSession {self.channel_name} - {self.status}>'
    
    def get_progress_percentage(self):
        """Calculate scan progress percentage"""
        if self.total_messages and self.total_messages > 0:
            return min(100, (self.messages_scanned / self.total_messages) * 100)
        return 0
    
    def get_duration(self):
        """Get scan duration in seconds"""
        if self.started_at:
            end_time = self.completed_at or datetime.utcnow()
            return (end_time - self.started_at).total_seconds()
        return 0
    
    def to_dict(self):
        """Convert scan session to dictionary for JSON serialization"""
        return {
            'id': self.id,
            'channel_name': self.channel_name,
            'channel_id': self.channel_id,
            'user_id': self.user_id,
            'status': self.status,
            'files_found': self.files_found,
            'messages_scanned': self.messages_scanned,
            'total_messages': self.total_messages,
            'progress_percentage': self.get_progress_percentage(),
            'duration': self.get_duration(),
            'error_message': self.error_message,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }

class ShareLink(db.Model):
    """Model for file sharing links with permissions and expiration"""
    __tablename__ = 'share_links'

    id = Column(Integer, primary_key=True)
    token = Column(String(64), unique=True, nullable=False, index=True)
    file_id = Column(Integer, ForeignKey('files.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)  # Creator of the link

    # Sharing settings
    name = Column(String(255))  # Optional name for the share
    description = Column(Text)  # Optional description
    password_hash = Column(String(128))  # Optional password protection

    # Permissions
    can_view = Column(Boolean, default=True)
    can_download = Column(Boolean, default=True)
    can_preview = Column(Boolean, default=True)

    # Access control
    max_downloads = Column(Integer)  # Maximum number of downloads (None = unlimited)
    download_count = Column(Integer, default=0)
    max_views = Column(Integer)  # Maximum number of views (None = unlimited)
    view_count = Column(Integer, default=0)

    # Expiration
    expires_at = Column(DateTime)  # When the link expires (None = never)

    # Tracking
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_accessed = Column(DateTime)

    # Relationships
    file = relationship('File', backref='share_links')
    creator = relationship('User', backref='created_shares')

    def __init__(self, **kwargs):
        super(ShareLink, self).__init__(**kwargs)
        if not self.token:
            self.token = self.generate_token()

    @staticmethod
    def generate_token():
        """Generate a secure random token for the share link"""
        return secrets.token_urlsafe(32)

    def set_password(self, password):
        """Set password protection for the share link"""
        if password:
            password_bytes = password.encode('utf-8')
            salt = bcrypt.gensalt()
            self.password_hash = bcrypt.hashpw(password_bytes, salt).decode('utf-8')
        else:
            self.password_hash = None

    def check_password(self, password):
        """Check if the provided password matches the stored hash"""
        if not self.password_hash:
            return True  # No password required
        if not password:
            return False
        password_bytes = password.encode('utf-8')
        hash_bytes = self.password_hash.encode('utf-8')
        return bcrypt.checkpw(password_bytes, hash_bytes)

    def is_expired(self):
        """Check if the share link has expired"""
        if not self.expires_at:
            return False
        return datetime.utcnow() > self.expires_at

    def is_download_limit_reached(self):
        """Check if download limit has been reached"""
        if not self.max_downloads:
            return False
        return self.download_count >= self.max_downloads

    def is_view_limit_reached(self):
        """Check if view limit has been reached"""
        if not self.max_views:
            return False
        return self.view_count >= self.max_views

    def can_access(self, password=None):
        """Check if the share link can be accessed"""
        if not self.is_active:
            return False, "Share link is disabled"

        if self.is_expired():
            return False, "Share link has expired"

        if not self.check_password(password):
            return False, "Invalid password"

        return True, "Access granted"

    def increment_view_count(self):
        """Increment the view count and update last accessed time"""
        self.view_count += 1
        self.last_accessed = datetime.utcnow()
        db.session.commit()

    def increment_download_count(self):
        """Increment the download count and update last accessed time"""
        self.download_count += 1
        self.last_accessed = datetime.utcnow()
        db.session.commit()

    def get_share_url(self, base_url):
        """Get the full share URL"""
        return f"{base_url}/share/{self.token}"

    def to_dict(self):
        """Convert share link to dictionary for JSON serialization"""
        return {
            'id': self.id,
            'token': self.token,
            'file_id': self.file_id,
            'name': self.name,
            'description': self.description,
            'has_password': bool(self.password_hash),
            'can_view': self.can_view,
            'can_download': self.can_download,
            'can_preview': self.can_preview,
            'max_downloads': self.max_downloads,
            'download_count': self.download_count,
            'max_views': self.max_views,
            'view_count': self.view_count,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_accessed': self.last_accessed.isoformat() if self.last_accessed else None,
            'file': {
                'filename': self.file.filename,
                'file_size': self.file.file_size,
                'mime_type': self.file.mime_type
            } if self.file else None
        }

# Database utility functions
def init_db(app):
    """Initialize database with Flask app"""
    db.init_app(app)
    
    with app.app_context():
        # Create all tables
        db.create_all()
        
        # Create default admin user if it doesn't exist
        admin_user = User.query.filter_by(username='admin').first()
        if not admin_user:
            admin_user = User(
                username='admin',
                email='admin@teledrive.local',
                role='admin',
                is_active=True
            )
            db.session.add(admin_user)
            db.session.commit()
            print("✅ Created default admin user")

class FileComment(db.Model):
    """Model for file comments and discussions"""
    __tablename__ = 'file_comments'

    id = Column(Integer, primary_key=True)
    file_id = Column(Integer, ForeignKey('files.id'), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    parent_id = Column(Integer, ForeignKey('file_comments.id'), nullable=True, index=True)  # For threaded comments

    # Comment content
    content = Column(Text, nullable=False)
    content_type = Column(String(20), default='text')  # text, markdown, html

    # Status
    is_edited = Column(Boolean, default=False)
    is_deleted = Column(Boolean, default=False)
    is_pinned = Column(Boolean, default=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    file = relationship('File', backref='comments')
    parent = relationship('FileComment', remote_side=[id], backref='replies')

    def __repr__(self):
        return f'<FileComment {self.id} on File {self.file_id}>'

    def get_comment_info(self):
        """Get comment information"""
        return {
            'id': self.id,
            'file_id': self.file_id,
            'user_id': self.user_id,
            'author_name': self.author.username if self.author else 'Unknown',
            'parent_id': self.parent_id,
            'content': self.content,
            'content_type': self.content_type,
            'is_edited': self.is_edited,
            'is_deleted': self.is_deleted,
            'is_pinned': self.is_pinned,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'reply_count': len(self.replies) if self.replies else 0
        }

    def get_thread_info(self):
        """Get comment with all replies"""
        comment_info = self.get_comment_info()
        comment_info['replies'] = [reply.get_comment_info() for reply in self.replies if not reply.is_deleted]
        return comment_info

class ActivityLog(db.Model):
    """Model for tracking user activities and file operations"""
    __tablename__ = 'activity_logs'

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    file_id = Column(Integer, ForeignKey('files.id'), nullable=True, index=True)

    # Activity details
    action = Column(String(50), nullable=False, index=True)  # upload, download, view, delete, share, etc.
    description = Column(Text)  # Human-readable description
    activity_metadata = Column(Text)  # JSON metadata for additional details

    # Context
    ip_address = Column(String(45))  # IPv4 or IPv6
    user_agent = Column(Text)
    session_id = Column(String(64))

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    # Relationships
    file = relationship('File', backref='activity_logs')

    def __repr__(self):
        return f'<ActivityLog {self.action} by User {self.user_id}>'

    def get_activity_info(self):
        """Get activity information"""
        metadata = {}
        if self.activity_metadata:
            try:
                metadata = json.loads(self.activity_metadata)
            except:
                pass

        return {
            'id': self.id,
            'user_id': self.user_id,
            'username': self.user.username if self.user else 'Unknown',
            'file_id': self.file_id,
            'file_name': self.file.filename if self.file else None,
            'action': self.action,
            'description': self.description,
            'metadata': metadata,
            'ip_address': self.ip_address,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

    @staticmethod
    def log_activity(user_id, action, description=None, file_id=None, metadata=None, ip_address=None, user_agent=None):
        """Log an activity"""
        activity = ActivityLog(
            user_id=user_id,
            file_id=file_id,
            action=action,
            description=description,
            activity_metadata=json.dumps(metadata) if metadata else None,
            ip_address=ip_address,
            user_agent=user_agent
        )

        db.session.add(activity)
        return activity

class SmartFolder(db.Model):
    """Model for smart/dynamic folders based on rules and criteria"""
    __tablename__ = 'smart_folders'

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)

    # Folder details
    name = Column(String(255), nullable=False)
    description = Column(Text)
    icon = Column(String(50), default='folder')
    color = Column(String(7), default='#3498db')  # Hex color

    # Rules and criteria (stored as JSON)
    rules = Column(Text, nullable=False)  # JSON string with filter criteria

    # Settings
    is_active = Column(Boolean, default=True)
    auto_update = Column(Boolean, default=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_updated = Column(DateTime)  # When files were last matched

    def __repr__(self):
        return f'<SmartFolder {self.name}>'

    def get_rules(self):
        """Get parsed rules"""
        try:
            return json.loads(self.rules) if self.rules else {}
        except:
            return {}

    def set_rules(self, rules_dict):
        """Set rules from dictionary"""
        self.rules = json.dumps(rules_dict)

    def get_matching_files(self):
        """Get files that match this smart folder's criteria"""
        rules = self.get_rules()

        # Build query based on rules
        query = File.query.filter_by(user_id=self.user_id, is_deleted=False)

        # File type filter
        if rules.get('file_types'):
            file_types = rules['file_types']
            mime_conditions = []
            for file_type in file_types:
                if file_type == 'image':
                    mime_conditions.append(File.mime_type.like('image/%'))
                elif file_type == 'video':
                    mime_conditions.append(File.mime_type.like('video/%'))
                elif file_type == 'audio':
                    mime_conditions.append(File.mime_type.like('audio/%'))
                elif file_type == 'document':
                    mime_conditions.extend([
                        File.mime_type.like('application/pdf'),
                        File.mime_type.like('application/msword'),
                        File.mime_type.like('application/vnd.openxmlformats-officedocument%'),
                        File.mime_type.like('text/%')
                    ])

            if mime_conditions:
                query = query.filter(db.or_(*mime_conditions))

        # Size filter
        if rules.get('size_min'):
            query = query.filter(File.file_size >= rules['size_min'])
        if rules.get('size_max'):
            query = query.filter(File.file_size <= rules['size_max'])

        # Date filter
        if rules.get('date_from'):
            date_from = datetime.fromisoformat(rules['date_from'])
            query = query.filter(File.created_at >= date_from)
        if rules.get('date_to'):
            date_to = datetime.fromisoformat(rules['date_to'])
            query = query.filter(File.created_at <= date_to)

        # Tags filter
        if rules.get('tags'):
            for tag in rules['tags']:
                query = query.filter(File.tags.ilike(f'%{tag}%'))

        # Favorites filter
        if rules.get('favorites_only'):
            query = query.filter(File.is_favorite == True)

        # Name pattern filter
        if rules.get('name_pattern'):
            query = query.filter(File.filename.ilike(f'%{rules["name_pattern"]}%'))

        return query.all()

    def get_folder_info(self):
        """Get smart folder information"""
        matching_files = self.get_matching_files()

        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'icon': self.icon,
            'color': self.color,
            'rules': self.get_rules(),
            'is_active': self.is_active,
            'auto_update': self.auto_update,
            'file_count': len(matching_files),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'last_updated': self.last_updated.isoformat() if self.last_updated else None
        }

def get_or_create_user(username='default', email='default@teledrive.local'):
    """Get or create a default user for backward compatibility"""
    user = User.query.filter_by(username=username).first()
    if not user:
        user = User(
            username=username,
            email=email,
            role='user',
            is_active=True
        )
        db.session.add(user)
        db.session.commit()
    return user
