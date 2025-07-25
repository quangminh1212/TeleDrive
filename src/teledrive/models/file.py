#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
File Model for TeleDrive

Database model for file management with metadata, thumbnails, and sharing capabilities.
"""

import os
import mimetypes
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any

from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, BigInteger, ForeignKey
from sqlalchemy.orm import relationship

from ..database import db


class File(db.Model):
    """
    File model for TeleDrive with comprehensive metadata and Google Drive-like features.
    """
    __tablename__ = 'files'
    __table_args__ = {'extend_existing': True}
    
    # Primary key
    id = Column(Integer, primary_key=True)
    
    # Basic file information
    name = Column(String(255), nullable=False, index=True)
    original_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False, unique=True)
    file_size = Column(BigInteger, nullable=False, default=0)
    mime_type = Column(String(100), nullable=True)
    file_extension = Column(String(10), nullable=True)
    
    # File type categorization
    file_type = Column(String(20), nullable=False, default='unknown')  # image, video, audio, document, archive, etc.
    is_directory = Column(Boolean, default=False, nullable=False)
    
    # Metadata
    description = Column(Text, nullable=True)
    tags = Column(Text, nullable=True)  # JSON string of tags
    
    # Thumbnails and previews
    thumbnail_path = Column(String(500), nullable=True)
    preview_path = Column(String(500), nullable=True)
    has_thumbnail = Column(Boolean, default=False)
    has_preview = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    modified_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    accessed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Ownership and permissions
    owner_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    is_public = Column(Boolean, default=False)
    is_shared = Column(Boolean, default=False)
    share_token = Column(String(64), nullable=True, unique=True, index=True)
    
    # Telegram integration
    telegram_message_id = Column(Integer, nullable=True, index=True)
    telegram_chat_id = Column(String(50), nullable=True, index=True)
    telegram_file_id = Column(String(200), nullable=True, index=True)
    
    # File organization
    parent_folder_id = Column(Integer, ForeignKey('files.id'), nullable=True, index=True)
    folder_path = Column(String(1000), nullable=False, default='/', index=True)
    
    # Status and flags
    is_deleted = Column(Boolean, default=False, nullable=False)
    is_favorite = Column(Boolean, default=False, nullable=False)
    download_count = Column(Integer, default=0, nullable=False)
    
    # Relationships
    owner = relationship("User", backref="files")
    parent_folder = relationship("File", remote_side=[id], backref="children")
    
    def __repr__(self):
        return f'<File {self.name}>'
    
    @property
    def url(self) -> str:
        """Get file URL for download/access."""
        return f'/api/file/serve/{self.id}'
    
    @property
    def thumbnail_url(self) -> Optional[str]:
        """Get thumbnail URL if available."""
        if self.has_thumbnail and self.thumbnail_path:
            return f'/api/file/thumbnail/{self.id}'
        return None
    
    @property
    def preview_url(self) -> Optional[str]:
        """Get preview URL if available."""
        if self.has_preview and self.preview_path:
            return f'/api/file/preview/{self.id}'
        return None
    
    @property
    def formatted_size(self) -> str:
        """Get human-readable file size."""
        if self.file_size == 0:
            return '0 B'
        
        size_names = ['B', 'KB', 'MB', 'GB', 'TB']
        size = self.file_size
        i = 0
        
        while size >= 1024 and i < len(size_names) - 1:
            size /= 1024.0
            i += 1
        
        return f'{size:.1f} {size_names[i]}'
    
    @property
    def formatted_modified(self) -> str:
        """Get formatted modification date."""
        now = datetime.utcnow()
        diff = now - self.modified_at
        
        if diff.days == 0:
            if diff.seconds < 3600:
                minutes = diff.seconds // 60
                return f'{minutes} phút trước'
            else:
                hours = diff.seconds // 3600
                return f'{hours} giờ trước'
        elif diff.days == 1:
            return 'Hôm qua'
        elif diff.days < 7:
            return f'{diff.days} ngày trước'
        else:
            return self.modified_at.strftime('%d/%m/%Y')
    
    @property
    def icon_class(self) -> str:
        """Get Font Awesome icon class for file type."""
        if self.is_directory:
            return 'fas fa-folder'
        
        icon_map = {
            'image': 'fas fa-image',
            'video': 'fas fa-video',
            'audio': 'fas fa-music',
            'pdf': 'fas fa-file-pdf',
            'doc': 'fas fa-file-word',
            'docx': 'fas fa-file-word',
            'xls': 'fas fa-file-excel',
            'xlsx': 'fas fa-file-excel',
            'ppt': 'fas fa-file-powerpoint',
            'pptx': 'fas fa-file-powerpoint',
            'txt': 'fas fa-file-alt',
            'zip': 'fas fa-file-archive',
            'rar': 'fas fa-file-archive',
            '7z': 'fas fa-file-archive',
        }
        
        return icon_map.get(self.file_type, 'fas fa-file')
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert file to dictionary for JSON serialization."""
        return {
            'id': self.id,
            'name': self.name,
            'original_name': self.original_name,
            'file_size': self.file_size,
            'formatted_size': self.formatted_size,
            'mime_type': self.mime_type,
            'file_type': self.file_type,
            'file_extension': self.file_extension,
            'is_directory': self.is_directory,
            'description': self.description,
            'has_thumbnail': self.has_thumbnail,
            'has_preview': self.has_preview,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'modified_at': self.modified_at.isoformat() if self.modified_at else None,
            'formatted_modified': self.formatted_modified,
            'is_public': self.is_public,
            'is_shared': self.is_shared,
            'is_favorite': self.is_favorite,
            'folder_path': self.folder_path,
            'download_count': self.download_count,
            'url': self.url,
            'thumbnail_url': self.thumbnail_url,
            'preview_url': self.preview_url,
            'icon_class': self.icon_class,
        }
    
    @classmethod
    def create_from_upload(cls, file_data: Dict[str, Any], owner_id: int) -> 'File':
        """Create file record from upload data."""
        # Determine file type from extension or mime type
        file_type = cls._determine_file_type(
            file_data.get('file_extension', ''),
            file_data.get('mime_type', '')
        )
        
        file_record = cls(
            name=file_data['name'],
            original_name=file_data['original_name'],
            file_path=file_data['file_path'],
            file_size=file_data['file_size'],
            mime_type=file_data.get('mime_type'),
            file_extension=file_data.get('file_extension'),
            file_type=file_type,
            owner_id=owner_id,
            folder_path=file_data.get('folder_path', '/'),
        )
        
        return file_record
    
    @staticmethod
    def _determine_file_type(extension: str, mime_type: str) -> str:
        """Determine file type category from extension or mime type."""
        extension = extension.lower().lstrip('.')
        
        type_map = {
            # Images
            'jpg': 'image', 'jpeg': 'image', 'png': 'image', 'gif': 'image',
            'bmp': 'image', 'webp': 'image', 'svg': 'image', 'ico': 'image',
            
            # Videos
            'mp4': 'video', 'avi': 'video', 'mkv': 'video', 'mov': 'video',
            'wmv': 'video', 'flv': 'video', 'webm': 'video', 'm4v': 'video',
            
            # Audio
            'mp3': 'audio', 'wav': 'audio', 'flac': 'audio', 'aac': 'audio',
            'ogg': 'audio', 'm4a': 'audio', 'wma': 'audio',
            
            # Documents
            'pdf': 'pdf',
            'doc': 'doc', 'docx': 'doc',
            'xls': 'xls', 'xlsx': 'xls',
            'ppt': 'ppt', 'pptx': 'ppt',
            'txt': 'txt', 'rtf': 'txt',
            
            # Archives
            'zip': 'archive', 'rar': 'archive', '7z': 'archive',
            'tar': 'archive', 'gz': 'archive', 'bz2': 'archive',
        }
        
        if extension in type_map:
            return type_map[extension]
        
        # Fallback to mime type
        if mime_type:
            if mime_type.startswith('image/'):
                return 'image'
            elif mime_type.startswith('video/'):
                return 'video'
            elif mime_type.startswith('audio/'):
                return 'audio'
            elif mime_type == 'application/pdf':
                return 'pdf'
            elif 'document' in mime_type or 'word' in mime_type:
                return 'doc'
            elif 'spreadsheet' in mime_type or 'excel' in mime_type:
                return 'xls'
            elif 'presentation' in mime_type or 'powerpoint' in mime_type:
                return 'ppt'
        
        return 'unknown'
