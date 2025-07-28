#!/usr/bin/env python3
"""
Model Tests for TeleDrive
Tests database models without complex configuration dependencies
"""

import pytest
import tempfile
import os
from datetime import datetime
from flask import Flask
from flask_sqlalchemy import SQLAlchemy

# Import models directly
from models import db, User, File, Folder, ScanSession, ShareLink

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
        yield app
        db.drop_all()

# Remove the problematic fixtures and create objects directly in tests

# ================================================================
# USER MODEL TESTS
# ================================================================

class TestUserModel:
    """Test User model functionality"""
    
    def test_user_creation(self, app):
        """Test creating a new user"""
        with app.app_context():
            user = User(
                username='newuser',
                email='newuser@example.com',
                role='user'
            )
            db.session.add(user)
            db.session.commit()
            
            # Verify user was created
            saved_user = User.query.filter_by(username='newuser').first()
            assert saved_user is not None
            assert saved_user.username == 'newuser'
            assert saved_user.email == 'newuser@example.com'
            assert saved_user.role == 'user'
    
    def test_user_password_hashing(self, app):
        """Test password hashing and verification"""
        with app.app_context():
            user = User(username='testuser', email='test@example.com')
            password = 'testpassword123'
            
            # Set password
            user.set_password(password)
            assert user.password_hash is not None
            assert user.password_hash != password  # Should be hashed
            
            # Verify password
            assert user.check_password(password) is True
            assert user.check_password('wrongpassword') is False
    
    def test_user_to_dict(self, app):
        """Test user serialization to dictionary"""
        with app.app_context():
            user = User(
                username='testuser',
                email='test@example.com',
                role='user',
                is_active=True
            )
            db.session.add(user)
            db.session.commit()

            user_dict = user.to_dict()

            assert 'id' in user_dict
            assert 'username' in user_dict
            assert 'email' in user_dict
            assert 'role' in user_dict
            assert 'password_hash' not in user_dict  # Should not expose password
            assert user_dict['username'] == user.username

# ================================================================
# FOLDER MODEL TESTS
# ================================================================

class TestFolderModel:
    """Test Folder model functionality"""
    
    def test_folder_creation(self, app):
        """Test creating a new folder"""
        with app.app_context():
            # Create user first
            user = User(username='testuser', email='test@example.com')
            db.session.add(user)
            db.session.commit()

            folder = Folder(
                name='New Folder',
                user_id=user.id,
                path='New Folder'
            )
            db.session.add(folder)
            db.session.commit()

            # Verify folder was created
            saved_folder = Folder.query.filter_by(name='New Folder').first()
            assert saved_folder is not None
            assert saved_folder.name == 'New Folder'
            assert saved_folder.user_id == user.id
    
    def test_folder_hierarchy(self, app):
        """Test folder parent-child relationships"""
        with app.app_context():
            # Create user first
            user = User(username='testuser', email='test@example.com')
            db.session.add(user)
            db.session.commit()

            # Create parent folder
            parent = Folder(
                name='Parent',
                user_id=user.id,
                path='Parent'
            )
            db.session.add(parent)
            db.session.commit()

            # Create child folder
            child = Folder(
                name='Child',
                parent_id=parent.id,
                user_id=user.id,
                path='Parent/Child'
            )
            db.session.add(child)
            db.session.commit()

            # Test relationships
            assert child.parent == parent
            assert child in parent.children
    
    def test_folder_full_path(self, app):
        """Test folder full path generation"""
        with app.app_context():
            # Create user first
            user = User(username='testuser', email='test@example.com')
            db.session.add(user)
            db.session.commit()

            # Create nested folder structure
            root = Folder(name='Root', user_id=user.id)
            db.session.add(root)
            db.session.commit()

            level1 = Folder(name='Level1', parent_id=root.id, user_id=user.id)
            db.session.add(level1)
            db.session.commit()

            level2 = Folder(name='Level2', parent_id=level1.id, user_id=user.id)
            db.session.add(level2)
            db.session.commit()

            # Test full path
            assert level2.get_full_path() == 'Root/Level1/Level2'

# ================================================================
# FILE MODEL TESTS
# ================================================================

class TestFileModel:
    """Test File model functionality"""
    
    def test_file_creation(self, app, sample_user, sample_folder):
        """Test creating a new file"""
        with app.app_context():
            file = File(
                filename='new_file.pdf',
                original_filename='new_file.pdf',
                file_size=2048,
                mime_type='application/pdf',
                folder_id=sample_folder.id,
                user_id=sample_user.id
            )
            db.session.add(file)
            db.session.commit()
            
            # Verify file was created
            saved_file = File.query.filter_by(filename='new_file.pdf').first()
            assert saved_file is not None
            assert saved_file.filename == 'new_file.pdf'
            assert saved_file.file_size == 2048
    
    def test_file_tags(self, app, sample_file):
        """Test file tags functionality"""
        with app.app_context():
            # Set tags
            tags = ['important', 'document', 'work']
            sample_file.set_tags(tags)
            db.session.commit()
            
            # Get tags
            retrieved_tags = sample_file.get_tags()
            assert retrieved_tags == tags
    
    def test_file_metadata(self, app, sample_file):
        """Test file metadata functionality"""
        with app.app_context():
            # Set metadata
            metadata = {'author': 'Test User', 'version': '1.0'}
            sample_file.set_metadata(metadata)
            db.session.commit()
            
            # Get metadata
            retrieved_metadata = sample_file.get_metadata()
            assert retrieved_metadata == metadata
    
    def test_file_type_detection(self, app, sample_user):
        """Test file type detection"""
        with app.app_context():
            test_cases = [
                ('image.jpg', 'image/jpeg', 'image'),
                ('video.mp4', 'video/mp4', 'video'),
                ('audio.mp3', 'audio/mpeg', 'audio'),
                ('document.pdf', 'application/pdf', 'document'),
                ('text.txt', 'text/plain', 'text')
            ]
            
            for filename, mime_type, expected_type in test_cases:
                file = File(
                    filename=filename,
                    mime_type=mime_type,
                    user_id=sample_user.id
                )
                assert file.get_file_type() == expected_type

# ================================================================
# SCAN SESSION MODEL TESTS
# ================================================================

class TestScanSessionModel:
    """Test ScanSession model functionality"""
    
    def test_scan_session_creation(self, app, sample_user):
        """Test creating a new scan session"""
        with app.app_context():
            session = ScanSession(
                channel_name='@testchannel',
                channel_id='123456789',
                user_id=sample_user.id,
                status='pending'
            )
            db.session.add(session)
            db.session.commit()
            
            # Verify session was created
            saved_session = ScanSession.query.filter_by(channel_name='@testchannel').first()
            assert saved_session is not None
            assert saved_session.channel_name == '@testchannel'
            assert saved_session.status == 'pending'
    
    def test_scan_session_progress_tracking(self, app, sample_user):
        """Test scan session progress tracking"""
        with app.app_context():
            session = ScanSession(
                channel_name='@testchannel',
                user_id=sample_user.id,
                status='running',
                total_messages=1000,
                messages_scanned=500,
                files_found=50
            )
            db.session.add(session)
            db.session.commit()
            
            # Test progress calculation
            progress = session.get_progress()
            assert progress == 50.0  # 500/1000 * 100

# ================================================================
# BASIC DATABASE TESTS
# ================================================================

class TestBasicDatabase:
    """Test basic database functionality"""
    
    def test_database_tables_created(self, app):
        """Test that all expected tables are created"""
        with app.app_context():
            # Check that tables exist
            inspector = db.inspect(db.engine)
            tables = inspector.get_table_names()
            
            expected_tables = ['users', 'folders', 'files', 'scan_sessions']
            for table in expected_tables:
                assert table in tables, f"Table {table} should exist"
    
    def test_database_connection(self, app):
        """Test database connection works"""
        with app.app_context():
            # Test simple query
            result = db.session.execute(db.text('SELECT 1')).scalar()
            assert result == 1

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
