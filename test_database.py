#!/usr/bin/env python3
"""
Database and Model Tests for TeleDrive
Tests database connections, model creation, and data integrity
"""

import pytest
import tempfile
import shutil
import os
from datetime import datetime
from flask import Flask
from sqlalchemy import text

# Import database and model components
from database import configure_flask_app, initialize_database, get_database_stats
from models import db, User, File, Folder, ScanSession, ShareLink, get_or_create_user

# ================================================================
# FIXTURES AND SETUP
# ================================================================

@pytest.fixture
def app():
    """Create a Flask app for testing"""
    app = Flask(__name__)
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = 'test_secret_key'
    
    # Configure database
    configure_flask_app(app)
    
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()

@pytest.fixture
def client(app):
    """Create a test client"""
    return app.test_client()

@pytest.fixture
def sample_user(app):
    """Create a sample user for testing"""
    with app.app_context():
        user = User(
            username='testuser',
            email='test@example.com',
            role='user',
            is_active=True
        )
        user.set_password('testpassword')
        db.session.add(user)
        db.session.commit()
        return user

@pytest.fixture
def sample_folder(app, sample_user):
    """Create a sample folder for testing"""
    with app.app_context():
        folder = Folder(
            name='Test Folder',
            user_id=sample_user.id,
            path='Test Folder'
        )
        db.session.add(folder)
        db.session.commit()
        return folder

@pytest.fixture
def sample_file(app, sample_user, sample_folder):
    """Create a sample file for testing"""
    with app.app_context():
        file = File(
            filename='test_file.txt',
            original_filename='test_file.txt',
            file_size=1024,
            mime_type='text/plain',
            folder_id=sample_folder.id,
            user_id=sample_user.id,
            telegram_channel='@testchannel',
            telegram_message_id=12345
        )
        db.session.add(file)
        db.session.commit()
        return file

# ================================================================
# DATABASE CONNECTION TESTS
# ================================================================

class TestDatabaseConnection:
    """Test database connection and initialization"""
    
    def test_database_initialization(self, app):
        """Test database can be initialized"""
        with app.app_context():
            # Check that tables exist
            inspector = db.inspect(db.engine)
            tables = inspector.get_table_names()
            
            expected_tables = ['users', 'folders', 'files', 'scan_sessions', 'share_links']
            for table in expected_tables:
                assert table in tables, f"Table {table} should exist"
    
    def test_database_connection(self, app):
        """Test database connection works"""
        with app.app_context():
            # Test simple query
            result = db.session.execute(text('SELECT 1')).scalar()
            assert result == 1
    
    def test_database_create_all(self, app):
        """Test that create_all works without errors"""
        with app.app_context():
            try:
                db.create_all()
                assert True  # If no exception, test passes
            except Exception as e:
                pytest.fail(f"create_all() failed: {e}")

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
    
    def test_user_unique_constraints(self, app):
        """Test unique constraints on username and email"""
        with app.app_context():
            # Create first user
            user1 = User(username='testuser', email='test@example.com')
            db.session.add(user1)
            db.session.commit()
            
            # Try to create user with same username
            user2 = User(username='testuser', email='different@example.com')
            db.session.add(user2)
            
            with pytest.raises(Exception):  # Should raise integrity error
                db.session.commit()
    
    def test_user_to_dict(self, app, sample_user):
        """Test user serialization to dictionary"""
        with app.app_context():
            user_dict = sample_user.to_dict()
            
            assert 'id' in user_dict
            assert 'username' in user_dict
            assert 'email' in user_dict
            assert 'role' in user_dict
            assert 'password_hash' not in user_dict  # Should not expose password
            assert user_dict['username'] == sample_user.username
    
    def test_user_relationships(self, app, sample_user, sample_file):
        """Test user relationships with files and folders"""
        with app.app_context():
            # Check that user has files
            assert sample_user.files.count() > 0
            assert sample_file in sample_user.files.all()

# ================================================================
# FOLDER MODEL TESTS
# ================================================================

class TestFolderModel:
    """Test Folder model functionality"""
    
    def test_folder_creation(self, app, sample_user):
        """Test creating a new folder"""
        with app.app_context():
            folder = Folder(
                name='New Folder',
                user_id=sample_user.id,
                path='New Folder'
            )
            db.session.add(folder)
            db.session.commit()
            
            # Verify folder was created
            saved_folder = Folder.query.filter_by(name='New Folder').first()
            assert saved_folder is not None
            assert saved_folder.name == 'New Folder'
            assert saved_folder.user_id == sample_user.id
    
    def test_folder_hierarchy(self, app, sample_user):
        """Test folder parent-child relationships"""
        with app.app_context():
            # Create parent folder
            parent = Folder(
                name='Parent',
                user_id=sample_user.id,
                path='Parent'
            )
            db.session.add(parent)
            db.session.commit()
            
            # Create child folder
            child = Folder(
                name='Child',
                parent_id=parent.id,
                user_id=sample_user.id,
                path='Parent/Child'
            )
            db.session.add(child)
            db.session.commit()
            
            # Test relationships
            assert child.parent == parent
            assert child in parent.children
    
    def test_folder_full_path(self, app, sample_user):
        """Test folder full path generation"""
        with app.app_context():
            # Create nested folder structure
            root = Folder(name='Root', user_id=sample_user.id)
            db.session.add(root)
            db.session.commit()
            
            level1 = Folder(name='Level1', parent_id=root.id, user_id=sample_user.id)
            db.session.add(level1)
            db.session.commit()
            
            level2 = Folder(name='Level2', parent_id=level1.id, user_id=sample_user.id)
            db.session.add(level2)
            db.session.commit()
            
            # Test full path
            assert level2.get_full_path() == 'Root/Level1/Level2'
    
    def test_folder_to_dict(self, app, sample_folder):
        """Test folder serialization to dictionary"""
        with app.app_context():
            folder_dict = sample_folder.to_dict()
            
            assert 'id' in folder_dict
            assert 'name' in folder_dict
            assert 'user_id' in folder_dict
            assert 'file_count' in folder_dict
            assert folder_dict['name'] == sample_folder.name

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
    
    def test_file_to_dict(self, app, sample_file):
        """Test file serialization to dictionary"""
        with app.app_context():
            file_dict = sample_file.to_dict()
            
            assert 'id' in file_dict
            assert 'filename' in file_dict
            assert 'file_size' in file_dict
            assert 'mime_type' in file_dict
            assert 'file_type' in file_dict
            assert file_dict['filename'] == sample_file.filename

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

    def test_scan_session_to_dict(self, app, sample_user):
        """Test scan session serialization"""
        with app.app_context():
            session = ScanSession(
                channel_name='@testchannel',
                user_id=sample_user.id,
                status='completed'
            )
            db.session.add(session)
            db.session.commit()

            session_dict = session.to_dict()
            assert 'id' in session_dict
            assert 'channel_name' in session_dict
            assert 'status' in session_dict
            assert session_dict['channel_name'] == '@testchannel'

# ================================================================
# SHARE LINK MODEL TESTS
# ================================================================

class TestShareLinkModel:
    """Test ShareLink model functionality"""

    def test_share_link_creation(self, app, sample_user, sample_file):
        """Test creating a new share link"""
        with app.app_context():
            share_link = ShareLink(
                file_id=sample_file.id,
                user_id=sample_user.id,
                name='Test Share',
                can_view=True,
                can_download=True
            )
            db.session.add(share_link)
            db.session.commit()

            # Verify share link was created
            saved_link = ShareLink.query.filter_by(name='Test Share').first()
            assert saved_link is not None
            assert saved_link.file_id == sample_file.id
            assert saved_link.can_view is True

    def test_share_link_token_generation(self, app, sample_user, sample_file):
        """Test share link token generation"""
        with app.app_context():
            share_link = ShareLink(
                file_id=sample_file.id,
                user_id=sample_user.id
            )
            db.session.add(share_link)
            db.session.commit()

            # Token should be generated automatically
            assert share_link.token is not None
            assert len(share_link.token) > 0

    def test_share_link_password_protection(self, app, sample_user, sample_file):
        """Test share link password protection"""
        with app.app_context():
            share_link = ShareLink(
                file_id=sample_file.id,
                user_id=sample_user.id
            )

            # Set password
            password = 'sharepassword123'
            share_link.set_password(password)
            db.session.add(share_link)
            db.session.commit()

            # Verify password
            assert share_link.check_password(password) is True
            assert share_link.check_password('wrongpassword') is False

    def test_share_link_expiration(self, app, sample_user, sample_file):
        """Test share link expiration"""
        with app.app_context():
            share_link = ShareLink(
                file_id=sample_file.id,
                user_id=sample_user.id,
                expires_at=datetime.utcnow()  # Already expired
            )
            db.session.add(share_link)
            db.session.commit()

            # Should be expired
            assert share_link.is_expired() is True

# ================================================================
# DATABASE UTILITY TESTS
# ================================================================

class TestDatabaseUtilities:
    """Test database utility functions"""

    def test_get_or_create_user(self, app):
        """Test get_or_create_user utility function"""
        with app.app_context():
            # First call should create user
            user1 = get_or_create_user('testuser', 'test@example.com')
            assert user1 is not None
            assert user1.username == 'testuser'

            # Second call should return existing user
            user2 = get_or_create_user('testuser', 'test@example.com')
            assert user1.id == user2.id

    def test_database_stats(self, app, sample_user, sample_file):
        """Test database statistics function"""
        with app.app_context():
            stats = get_database_stats()

            # Should return dictionary with counts
            assert isinstance(stats, dict)
            assert 'users' in stats
            assert 'files' in stats
            assert 'folders' in stats
            assert stats['users'] >= 1  # At least our sample user
            assert stats['files'] >= 1  # At least our sample file

# ================================================================
# DATA INTEGRITY TESTS
# ================================================================

class TestDataIntegrity:
    """Test data integrity and constraints"""

    def test_cascade_delete_user(self, app, sample_user, sample_file):
        """Test that deleting user cascades to related records"""
        with app.app_context():
            user_id = sample_user.id
            file_id = sample_file.id

            # Delete user
            db.session.delete(sample_user)
            db.session.commit()

            # File should also be deleted (cascade)
            deleted_file = File.query.get(file_id)
            assert deleted_file is None

    def test_foreign_key_constraints(self, app):
        """Test foreign key constraints"""
        with app.app_context():
            # Try to create file with non-existent user
            file = File(
                filename='orphan_file.txt',
                user_id=99999  # Non-existent user ID
            )
            db.session.add(file)

            with pytest.raises(Exception):  # Should raise foreign key error
                db.session.commit()

    def test_soft_delete_functionality(self, app, sample_file):
        """Test soft delete functionality for files"""
        with app.app_context():
            # Mark file as deleted
            sample_file.is_deleted = True
            db.session.commit()

            # File should still exist in database but marked as deleted
            file = File.query.get(sample_file.id)
            assert file is not None
            assert file.is_deleted is True

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
