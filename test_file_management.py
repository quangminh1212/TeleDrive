#!/usr/bin/env python3
"""
File Management Tests for TeleDrive
Tests file operations, upload, download, and organization
"""

import pytest
import json
import tempfile
import os
from datetime import datetime
from unittest.mock import patch, MagicMock
from flask import Flask
from models import db, User, File, Folder, ShareLink

# ================================================================
# FIXTURES AND SETUP
# ================================================================

@pytest.fixture
def app():
    """Create a minimal Flask app for testing"""
    app = Flask(__name__)
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = 'test_secret_key'
    
    # Initialize database
    db.init_app(app)
    
    with app.app_context():
        db.create_all()
        
        # Create test user
        test_user = User(
            username='testuser',
            email='test@example.com',
            role='user',
            is_active=True
        )
        test_user.set_password('testpassword')
        db.session.add(test_user)
        db.session.commit()
        
        yield app
        db.drop_all()

# Remove problematic fixtures - create objects directly in tests

# ================================================================
# FILE MODEL TESTS
# ================================================================

class TestFileModel:
    """Test File model functionality"""
    
    def test_file_creation(self, app, test_user):
        """Test creating a new file record"""
        with app.app_context():
            file = File(
                filename='new_file.txt',
                original_filename='new_file.txt',
                file_size=512,
                mime_type='text/plain',
                user_id=test_user.id
            )
            db.session.add(file)
            db.session.commit()
            
            # Verify file was created
            saved_file = File.query.filter_by(filename='new_file.txt').first()
            assert saved_file is not None
            assert saved_file.filename == 'new_file.txt'
            assert saved_file.file_size == 512
            assert saved_file.user_id == test_user.id
    
    def test_file_tags_functionality(self, app):
        """Test file tags functionality"""
        with app.app_context():
            # Create user and file
            user = User.query.filter_by(username='testuser').first()
            file = File(
                filename='test_tags.pdf',
                user_id=user.id,
                file_size=1024
            )
            db.session.add(file)
            db.session.commit()

            # Set tags
            tags = ['important', 'document', 'work']
            file.set_tags(tags)
            db.session.commit()

            # Get tags
            retrieved_tags = file.get_tags()
            assert retrieved_tags == tags

            # Test empty tags
            file.set_tags([])
            db.session.commit()
            assert file.get_tags() == []
    
    def test_file_metadata_functionality(self, app, test_file):
        """Test file metadata functionality"""
        with app.app_context():
            # Set metadata
            metadata = {
                'author': 'Test User',
                'version': '1.0',
                'category': 'document'
            }
            test_file.set_metadata(metadata)
            db.session.commit()
            
            # Get metadata
            retrieved_metadata = test_file.get_metadata()
            assert retrieved_metadata == metadata
            
            # Test empty metadata
            test_file.set_metadata({})
            db.session.commit()
            assert test_file.get_metadata() == {}
    
    def test_file_type_detection(self, app, test_user):
        """Test file type detection"""
        with app.app_context():
            test_cases = [
                ('image.jpg', 'image/jpeg', 'image'),
                ('video.mp4', 'video/mp4', 'video'),
                ('audio.mp3', 'audio/mpeg', 'audio'),
                ('document.pdf', 'application/pdf', 'document'),
                ('text.txt', 'text/plain', 'text'),
                ('archive.zip', 'application/zip', 'archive'),
                ('unknown.xyz', 'application/octet-stream', 'other')
            ]
            
            for filename, mime_type, expected_type in test_cases:
                file = File(
                    filename=filename,
                    mime_type=mime_type,
                    user_id=test_user.id
                )
                assert file.get_file_type() == expected_type
    
    def test_file_to_dict(self, app, test_file):
        """Test file serialization to dictionary"""
        with app.app_context():
            file_dict = test_file.to_dict()
            
            assert 'id' in file_dict
            assert 'filename' in file_dict
            assert 'file_size' in file_dict
            assert 'mime_type' in file_dict
            assert 'file_type' in file_dict
            assert 'created_at' in file_dict
            assert file_dict['filename'] == test_file.filename
            assert file_dict['file_size'] == test_file.file_size

# ================================================================
# FOLDER MODEL TESTS
# ================================================================

class TestFolderModel:
    """Test Folder model functionality"""
    
    def test_folder_creation(self, app, test_user):
        """Test creating a new folder"""
        with app.app_context():
            folder = Folder(
                name='New Folder',
                user_id=test_user.id,
                path='New Folder'
            )
            db.session.add(folder)
            db.session.commit()
            
            # Verify folder was created
            saved_folder = Folder.query.filter_by(name='New Folder').first()
            assert saved_folder is not None
            assert saved_folder.name == 'New Folder'
            assert saved_folder.user_id == test_user.id
    
    def test_folder_hierarchy(self, app, test_user):
        """Test folder parent-child relationships"""
        with app.app_context():
            # Create parent folder
            parent = Folder(
                name='Parent',
                user_id=test_user.id,
                path='Parent'
            )
            db.session.add(parent)
            db.session.commit()
            
            # Create child folder
            child = Folder(
                name='Child',
                parent_id=parent.id,
                user_id=test_user.id,
                path='Parent/Child'
            )
            db.session.add(child)
            db.session.commit()
            
            # Test relationships
            assert child.parent == parent
            assert child in parent.children
    
    def test_folder_full_path(self, app, test_user):
        """Test folder full path generation"""
        with app.app_context():
            # Create nested folder structure
            root = Folder(name='Root', user_id=test_user.id, path='Root')
            db.session.add(root)
            db.session.commit()
            
            level1 = Folder(name='Level1', parent_id=root.id, user_id=test_user.id, path='Root/Level1')
            db.session.add(level1)
            db.session.commit()
            
            level2 = Folder(name='Level2', parent_id=level1.id, user_id=test_user.id, path='Root/Level1/Level2')
            db.session.add(level2)
            db.session.commit()
            
            # Test full path
            assert level2.get_full_path() == 'Root/Level1/Level2'
    
    def test_folder_file_count(self, app, test_user, test_folder):
        """Test folder file count calculation"""
        with app.app_context():
            # Add files to folder
            for i in range(3):
                file = File(
                    filename=f'file_{i}.txt',
                    user_id=test_user.id,
                    folder_id=test_folder.id
                )
                db.session.add(file)
            db.session.commit()
            
            # Check file count
            assert test_folder.get_file_count() == 3

# ================================================================
# FILE OPERATIONS TESTS
# ================================================================

class TestFileOperations:
    """Test file operations functionality"""
    
    def test_file_rename(self, app, test_file):
        """Test file renaming"""
        with app.app_context():
            original_name = test_file.filename
            new_name = 'renamed_document.pdf'
            
            test_file.filename = new_name
            db.session.commit()
            
            # Verify rename
            updated_file = File.query.get(test_file.id)
            assert updated_file.filename == new_name
            assert updated_file.original_filename == original_name
    
    def test_file_move_to_folder(self, app, test_user, test_file):
        """Test moving file to different folder"""
        with app.app_context():
            # Create new folder
            new_folder = Folder(
                name='New Folder',
                user_id=test_user.id,
                path='New Folder'
            )
            db.session.add(new_folder)
            db.session.commit()
            
            # Move file
            original_folder_id = test_file.folder_id
            test_file.folder_id = new_folder.id
            db.session.commit()
            
            # Verify move
            updated_file = File.query.get(test_file.id)
            assert updated_file.folder_id == new_folder.id
            assert updated_file.folder_id != original_folder_id
    
    def test_file_soft_delete(self, app, test_file):
        """Test file soft delete"""
        with app.app_context():
            # Mark as deleted
            test_file.is_deleted = True
            db.session.commit()
            
            # Verify soft delete
            deleted_file = File.query.get(test_file.id)
            assert deleted_file is not None  # Still exists in database
            assert deleted_file.is_deleted is True
            
            # Verify not in active files query
            active_files = File.query.filter_by(is_deleted=False).all()
            assert test_file not in active_files
    
    def test_file_favorite_toggle(self, app, test_file):
        """Test file favorite functionality"""
        with app.app_context():
            # Initially not favorite
            assert test_file.is_favorite is False
            
            # Mark as favorite
            test_file.is_favorite = True
            db.session.commit()
            
            # Verify favorite status
            updated_file = File.query.get(test_file.id)
            assert updated_file.is_favorite is True
    
    def test_file_download_count(self, app, test_file):
        """Test file download count tracking"""
        with app.app_context():
            # Initially zero downloads
            assert test_file.download_count == 0
            
            # Increment download count
            test_file.download_count += 1
            db.session.commit()
            
            # Verify count
            updated_file = File.query.get(test_file.id)
            assert updated_file.download_count == 1

# ================================================================
# FILE SHARING TESTS
# ================================================================

class TestFileSharing:
    """Test file sharing functionality"""
    
    def test_share_link_creation(self, app, test_user, test_file):
        """Test creating a share link"""
        with app.app_context():
            share_link = ShareLink(
                file_id=test_file.id,
                user_id=test_user.id,
                name='Test Share',
                can_view=True,
                can_download=True
            )
            db.session.add(share_link)
            db.session.commit()
            
            # Verify share link was created
            saved_link = ShareLink.query.filter_by(name='Test Share').first()
            assert saved_link is not None
            assert saved_link.file_id == test_file.id
            assert saved_link.can_view is True
            assert saved_link.can_download is True
            assert saved_link.token is not None
    
    def test_share_link_token_generation(self, app, test_user, test_file):
        """Test share link token generation"""
        with app.app_context():
            share_link = ShareLink(
                file_id=test_file.id,
                user_id=test_user.id
            )
            db.session.add(share_link)
            db.session.commit()
            
            # Token should be generated automatically
            assert share_link.token is not None
            assert len(share_link.token) > 0
            
            # Token should be unique
            share_link2 = ShareLink(
                file_id=test_file.id,
                user_id=test_user.id
            )
            db.session.add(share_link2)
            db.session.commit()
            
            assert share_link.token != share_link2.token
    
    def test_share_link_password_protection(self, app, test_user, test_file):
        """Test share link password protection"""
        with app.app_context():
            share_link = ShareLink(
                file_id=test_file.id,
                user_id=test_user.id
            )
            
            # Set password
            password = 'sharepassword123'
            share_link.set_password(password)
            db.session.add(share_link)
            db.session.commit()
            
            # Verify password
            assert share_link.check_password(password) is True
            assert share_link.check_password('wrongpassword') is False
    
    def test_share_link_expiration(self, app, test_user, test_file):
        """Test share link expiration"""
        with app.app_context():
            share_link = ShareLink(
                file_id=test_file.id,
                user_id=test_user.id,
                expires_at=datetime.utcnow()  # Already expired
            )
            db.session.add(share_link)
            db.session.commit()
            
            # Should be expired
            assert share_link.is_expired() is True
    
    def test_share_link_access_limits(self, app, test_user, test_file):
        """Test share link access limits"""
        with app.app_context():
            share_link = ShareLink(
                file_id=test_file.id,
                user_id=test_user.id,
                max_views=2,
                max_downloads=1
            )
            db.session.add(share_link)
            db.session.commit()
            
            # Test view limit
            assert share_link.is_view_limit_reached() is False
            share_link.view_count = 2
            assert share_link.is_view_limit_reached() is True
            
            # Test download limit
            assert share_link.is_download_limit_reached() is False
            share_link.download_count = 1
            assert share_link.is_download_limit_reached() is True

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
