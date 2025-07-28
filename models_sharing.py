#!/usr/bin/env python3
"""
File Sharing and Permissions Models for TeleDrive
Extended models for file sharing, permissions, and collaboration features
"""

from datetime import datetime, timedelta
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Enum
from sqlalchemy.orm import relationship
import secrets
import enum

# Import the existing db instance
from models import db

class ShareType(enum.Enum):
    """Types of file sharing"""
    PUBLIC = "public"
    PRIVATE = "private"
    PASSWORD = "password"
    EXPIRING = "expiring"

class PermissionLevel(enum.Enum):
    """Permission levels for file access"""
    VIEW = "view"
    DOWNLOAD = "download"
    EDIT = "edit"
    ADMIN = "admin"

class FileShare(db.Model):
    """File sharing model for generating share links and managing access"""
    __tablename__ = 'file_shares'
    
    id = Column(Integer, primary_key=True)
    file_id = Column(Integer, ForeignKey('files.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)  # Owner
    
    # Share configuration
    share_token = Column(String(64), unique=True, nullable=False, index=True)
    share_type = Column(Enum(ShareType), default=ShareType.PRIVATE)
    permission_level = Column(Enum(PermissionLevel), default=PermissionLevel.VIEW)
    
    # Access control
    password_hash = Column(String(128))  # For password-protected shares
    max_downloads = Column(Integer)  # Limit number of downloads
    download_count = Column(Integer, default=0)
    
    # Expiration
    expires_at = Column(DateTime)
    
    # Tracking
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_accessed = Column(DateTime)
    access_count = Column(Integer, default=0)
    
    # Relationships
    file = relationship('File', backref='shares')
    owner = relationship('User', backref='shared_files')
    access_logs = relationship('ShareAccessLog', backref='share', cascade='all, delete-orphan')
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.share_token:
            self.share_token = secrets.token_urlsafe(32)
    
    def __repr__(self):
        return f'<FileShare {self.share_token}>'
    
    def is_expired(self):
        """Check if the share link has expired"""
        if self.expires_at:
            return datetime.utcnow() > self.expires_at
        return False
    
    def is_download_limit_reached(self):
        """Check if download limit has been reached"""
        if self.max_downloads:
            return self.download_count >= self.max_downloads
        return False
    
    def can_access(self, password=None):
        """Check if the share can be accessed"""
        if not self.is_active:
            return False
        if self.is_expired():
            return False
        if self.is_download_limit_reached():
            return False
        if self.share_type == ShareType.PASSWORD and password:
            import bcrypt
            return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))
        return True
    
    def get_share_url(self, base_url="http://localhost:3000"):
        """Generate the full share URL"""
        return f"{base_url}/share/{self.share_token}"
    
    def to_dict(self):
        """Convert to dictionary for JSON serialization"""
        return {
            'id': self.id,
            'file_id': self.file_id,
            'filename': self.file.filename if self.file else None,
            'share_token': self.share_token,
            'share_type': self.share_type.value,
            'permission_level': self.permission_level.value,
            'share_url': self.get_share_url(),
            'max_downloads': self.max_downloads,
            'download_count': self.download_count,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'is_active': self.is_active,
            'is_expired': self.is_expired(),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_accessed': self.last_accessed.isoformat() if self.last_accessed else None,
            'access_count': self.access_count
        }

class FilePermission(db.Model):
    """File permissions for specific users"""
    __tablename__ = 'file_permissions'
    
    id = Column(Integer, primary_key=True)
    file_id = Column(Integer, ForeignKey('files.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    granted_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    permission_level = Column(Enum(PermissionLevel), default=PermissionLevel.VIEW)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime)
    
    # Relationships
    file = relationship('File', backref='permissions')
    user = relationship('User', foreign_keys=[user_id], backref='file_permissions')
    granter = relationship('User', foreign_keys=[granted_by])
    
    def __repr__(self):
        return f'<FilePermission {self.user_id}:{self.file_id}:{self.permission_level.value}>'
    
    def is_expired(self):
        """Check if permission has expired"""
        if self.expires_at:
            return datetime.utcnow() > self.expires_at
        return False
    
    def to_dict(self):
        """Convert to dictionary for JSON serialization"""
        return {
            'id': self.id,
            'file_id': self.file_id,
            'user_id': self.user_id,
            'username': self.user.username if self.user else None,
            'permission_level': self.permission_level.value,
            'is_active': self.is_active,
            'is_expired': self.is_expired(),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'granted_by': self.granter.username if self.granter else None
        }

class ShareAccessLog(db.Model):
    """Log access to shared files"""
    __tablename__ = 'share_access_logs'
    
    id = Column(Integer, primary_key=True)
    share_id = Column(Integer, ForeignKey('file_shares.id'), nullable=False)
    
    # Access details
    ip_address = Column(String(45))  # IPv6 support
    user_agent = Column(Text)
    referer = Column(String(500))
    
    # Action performed
    action = Column(String(50))  # view, download, preview
    success = Column(Boolean, default=True)
    error_message = Column(Text)
    
    # Timing
    accessed_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<ShareAccessLog {self.share_id}:{self.action}>'
    
    def to_dict(self):
        """Convert to dictionary for JSON serialization"""
        return {
            'id': self.id,
            'share_id': self.share_id,
            'ip_address': self.ip_address,
            'action': self.action,
            'success': self.success,
            'accessed_at': self.accessed_at.isoformat() if self.accessed_at else None
        }

class FileComment(db.Model):
    """Comments on files for collaboration"""
    __tablename__ = 'file_comments'
    
    id = Column(Integer, primary_key=True)
    file_id = Column(Integer, ForeignKey('files.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    parent_id = Column(Integer, ForeignKey('file_comments.id'))  # For threaded comments
    
    content = Column(Text, nullable=False)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    file = relationship('File', backref='comments')
    user = relationship('User', backref='comments')
    parent = relationship('FileComment', remote_side=[id], backref='replies')
    
    def __repr__(self):
        return f'<FileComment {self.id}>'
    
    def to_dict(self, include_replies=False):
        """Convert to dictionary for JSON serialization"""
        result = {
            'id': self.id,
            'file_id': self.file_id,
            'user_id': self.user_id,
            'username': self.user.username if self.user else None,
            'parent_id': self.parent_id,
            'content': self.content,
            'is_deleted': self.is_deleted,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_replies:
            result['replies'] = [reply.to_dict() for reply in self.replies if not reply.is_deleted]
        
        return result

class FileVersion(db.Model):
    """File version history for tracking changes"""
    __tablename__ = 'file_versions'
    
    id = Column(Integer, primary_key=True)
    file_id = Column(Integer, ForeignKey('files.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    version_number = Column(Integer, nullable=False)
    file_path = Column(String(500))  # Path to the version file
    file_size = Column(Integer)
    checksum = Column(String(64))  # SHA-256 hash
    
    change_description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    file = relationship('File', backref='versions')
    user = relationship('User', backref='file_versions')
    
    def __repr__(self):
        return f'<FileVersion {self.file_id}:v{self.version_number}>'
    
    def to_dict(self):
        """Convert to dictionary for JSON serialization"""
        return {
            'id': self.id,
            'file_id': self.file_id,
            'version_number': self.version_number,
            'file_size': self.file_size,
            'checksum': self.checksum,
            'change_description': self.change_description,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'created_by': self.user.username if self.user else None
        }
