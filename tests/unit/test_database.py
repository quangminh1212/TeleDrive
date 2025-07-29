#!/usr/bin/env python3
"""
Unit tests for database functionality
Test 1.3: Database initialization and migration tests
"""

import pytest
import tempfile
import sqlite3
from pathlib import Path
import sys
import os

# Add source to path
project_root = Path(__file__).parent.parent.parent
source_dir = project_root / 'source'
sys.path.insert(0, str(source_dir))

from models import db, User, File, Folder, ScanSession, ShareLink, FileComment, FileVersion, ActivityLog
from database import (
    setup_database_config, create_database_directories, 
    backup_database, restore_database, get_database_stats,
    repair_database, migrate_json_data_to_database
)

class TestDatabaseModels:
    """Test database models"""
    
    def test_user_model(self, test_app):
        """Test User model functionality"""
        with test_app.app_context():
            db.create_all()
            
            # Create user
            user = User(
                username='testuser',
                email='test@example.com',
                role='user'
            )
            user.set_password('testpassword')
            db.session.add(user)
            db.session.commit()
            
            # Test password verification
            assert user.check_password('testpassword')
            assert not user.check_password('wrongpassword')
            
            # Test user properties
            assert user.username == 'testuser'
            assert user.email == 'test@example.com'
            assert user.role == 'user'
            assert user.is_active is True
            
            db.session.remove()
            db.drop_all()
    
    def test_file_model(self, test_app):
        """Test File model functionality"""
        with test_app.app_context():
            db.create_all()
            
            # Create user and folder first
            user = User(username='testuser', email='test@example.com')
            user.set_password('test')
            db.session.add(user)
            
            folder = Folder(name='Test Folder', user_id=user.id, path='Test Folder')
            db.session.add(folder)
            db.session.commit()
            
            # Create file
            file = File(
                filename='test.txt',
                original_filename='test.txt',
                file_size=1024,
                mime_type='text/plain',
                folder_id=folder.id,
                user_id=user.id
            )
            db.session.add(file)
            db.session.commit()
            
            # Test file properties
            assert file.filename == 'test.txt'
            assert file.file_size == 1024
            assert file.get_file_type() == 'document'
            assert file.get_size_formatted() == '1.0 KB'
            
            # Test relationships
            assert file.user == user
            assert file.folder == folder
            
            db.session.remove()
            db.drop_all()
    
    def test_folder_model(self, test_app):
        """Test Folder model functionality"""
        with test_app.app_context():
            db.create_all()
            
            # Create user
            user = User(username='testuser', email='test@example.com')
            user.set_password('test')
            db.session.add(user)
            db.session.commit()
            
            # Create parent folder
            parent_folder = Folder(
                name='Parent Folder',
                user_id=user.id,
                path='Parent Folder'
            )
            db.session.add(parent_folder)
            db.session.commit()
            
            # Create child folder
            child_folder = Folder(
                name='Child Folder',
                user_id=user.id,
                parent_id=parent_folder.id,
                path='Parent Folder/Child Folder'
            )
            db.session.add(child_folder)
            db.session.commit()
            
            # Test folder relationships
            assert child_folder.parent == parent_folder
            assert child_folder in parent_folder.children
            
            # Test path generation
            assert child_folder.get_full_path() == 'Parent Folder/Child Folder'
            
            db.session.remove()
            db.drop_all()
    
    def test_scan_session_model(self, test_app):
        """Test ScanSession model functionality"""
        with test_app.app_context():
            db.create_all()
            
            # Create user
            user = User(username='testuser', email='test@example.com')
            user.set_password('test')
            db.session.add(user)
            db.session.commit()
            
            # Create scan session
            session = ScanSession(
                channel_name='test_channel',
                user_id=user.id,
                status='completed',
                files_found=10,
                total_messages=100
            )
            db.session.add(session)
            db.session.commit()
            
            # Test session properties
            assert session.channel_name == 'test_channel'
            assert session.files_found == 10
            assert session.total_messages == 100
            assert session.user == user
            
            db.session.remove()
            db.drop_all()

class TestDatabaseOperations:
    """Test database operations and utilities"""
    
    def test_database_config_setup(self, temp_dir):
        """Test 1.3: Database configuration setup"""
        # Change to temp directory
        original_cwd = os.getcwd()
        try:
            os.chdir(temp_dir)
            
            # Test database config setup
            config = setup_database_config()
            
            assert isinstance(config, dict)
            assert 'url' in config
            assert 'track_modifications' in config
            
            # Check that config.json was created/updated
            config_file = Path('config.json')
            assert config_file.exists()
            
        finally:
            os.chdir(original_cwd)
    
    def test_database_directories_creation(self, temp_dir):
        """Test 1.5: Database directories creation"""
        # Mock PROJECT_ROOT for testing
        import database
        original_project_root = database.PROJECT_ROOT
        database.PROJECT_ROOT = temp_dir
        
        try:
            create_database_directories()
            
            # Check that directories were created
            expected_dirs = [
                temp_dir / 'data',
                temp_dir / 'data' / 'uploads',
                temp_dir / 'data' / 'backups',
                temp_dir / 'data' / 'temp'
            ]
            
            for dir_path in expected_dirs:
                assert dir_path.exists(), f"Directory not created: {dir_path}"
                
        finally:
            database.PROJECT_ROOT = original_project_root
    
    def test_database_backup_restore(self, temp_dir):
        """Test database backup and restore functionality"""
        # Create a test database file
        db_file = temp_dir / 'test.db'
        
        # Create database with some data
        conn = sqlite3.connect(db_file)
        cursor = conn.cursor()
        cursor.execute('CREATE TABLE test (id INTEGER, name TEXT)')
        cursor.execute('INSERT INTO test VALUES (1, "test_data")')
        conn.commit()
        conn.close()
        
        # Mock DATABASE_FILE for testing
        import database
        original_db_file = database.DATABASE_FILE
        database.DATABASE_FILE = db_file
        
        try:
            # Test backup
            backup_file = backup_database()
            assert backup_file is not None
            assert backup_file.exists()
            
            # Modify original database
            conn = sqlite3.connect(db_file)
            cursor = conn.cursor()
            cursor.execute('INSERT INTO test VALUES (2, "modified_data")')
            conn.commit()
            conn.close()
            
            # Test restore
            result = restore_database(backup_file)
            assert result is True
            
            # Verify restore worked
            conn = sqlite3.connect(db_file)
            cursor = conn.cursor()
            cursor.execute('SELECT COUNT(*) FROM test')
            count = cursor.fetchone()[0]
            conn.close()
            
            assert count == 1  # Should be back to original state
            
        finally:
            database.DATABASE_FILE = original_db_file
    
    def test_database_stats(self, temp_dir):
        """Test database statistics functionality"""
        # Create a test database file
        db_file = temp_dir / 'test.db'
        
        # Create database with tables
        conn = sqlite3.connect(db_file)
        cursor = conn.cursor()
        cursor.execute('CREATE TABLE users (id INTEGER)')
        cursor.execute('CREATE TABLE files (id INTEGER)')
        cursor.execute('CREATE TABLE folders (id INTEGER)')
        cursor.execute('CREATE TABLE scan_sessions (id INTEGER)')
        cursor.execute('INSERT INTO users VALUES (1)')
        cursor.execute('INSERT INTO files VALUES (1)')
        conn.commit()
        conn.close()
        
        # Mock DATABASE_FILE for testing
        import database
        original_db_file = database.DATABASE_FILE
        database.DATABASE_FILE = db_file
        
        try:
            stats = get_database_stats()
            assert stats is not None
            assert isinstance(stats, dict)
            assert 'users_count' in stats
            assert 'files_count' in stats
            assert 'database_size' in stats
            assert 'last_modified' in stats
            
            assert stats['users_count'] == 1
            assert stats['files_count'] == 1
            
        finally:
            database.DATABASE_FILE = original_db_file
    
    def test_database_repair(self, temp_dir):
        """Test database repair functionality"""
        # Create a test database file
        db_file = temp_dir / 'test.db'
        
        # Create a valid database
        conn = sqlite3.connect(db_file)
        cursor = conn.cursor()
        cursor.execute('CREATE TABLE test (id INTEGER)')
        conn.commit()
        conn.close()
        
        # Mock DATABASE_FILE for testing
        import database
        original_db_file = database.DATABASE_FILE
        database.DATABASE_FILE = db_file
        
        try:
            # Test repair on valid database
            result = repair_database()
            assert result is True
            
        finally:
            database.DATABASE_FILE = original_db_file

class TestDatabaseMigration:
    """Test database migration functionality"""
    
    def test_json_data_migration(self, test_app, temp_dir):
        """Test migration of JSON data to database"""
        with test_app.app_context():
            db.create_all()
            
            # Create test JSON file
            json_data = {
                "channel": "test_channel",
                "scan_date": "2025-01-01T00:00:00Z",
                "files": [
                    {
                        "filename": "test_file.txt",
                        "file_size": 1024,
                        "mime_type": "text/plain",
                        "message_id": 123,
                        "date": "2025-01-01T00:00:00Z",
                        "download_url": "https://example.com/file",
                        "file_type": "document",
                        "sender": "test_user"
                    }
                ]
            }
            
            json_file = temp_dir / 'test_scan.json'
            import json as json_module
            with open(json_file, 'w') as f:
                json_module.dump(json_data, f)
            
            # Mock output directory
            import database
            original_project_root = database.PROJECT_ROOT
            database.PROJECT_ROOT = temp_dir.parent
            
            # Create output directory and move JSON file there
            output_dir = temp_dir.parent / 'output'
            output_dir.mkdir(exist_ok=True)
            json_file_in_output = output_dir / 'test_scan.json'
            json_file.rename(json_file_in_output)
            
            try:
                # Run migration
                migrate_json_data_to_database()
                
                # Check that data was migrated
                from models import User, File, Folder
                
                # Should have created default user
                user = User.query.filter_by(username='default').first()
                assert user is not None
                
                # Should have created migrated files folder
                folder = Folder.query.filter_by(name='Migrated Files').first()
                assert folder is not None
                
                # Should have migrated the file
                file = File.query.filter_by(filename='test_file.txt').first()
                assert file is not None
                assert file.file_size == 1024
                assert file.mime_type == 'text/plain'
                
            finally:
                database.PROJECT_ROOT = original_project_root
                # Clean up
                if output_dir.exists():
                    import shutil
                    shutil.rmtree(output_dir)
            
            db.session.remove()
            db.drop_all()
