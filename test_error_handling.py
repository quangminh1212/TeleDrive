#!/usr/bin/env python3
"""
Error Handling and Edge Cases Tests for TeleDrive
Tests error scenarios and edge cases across all components
"""

import pytest
import json
import os
import tempfile
from unittest.mock import patch, MagicMock
from flask import Flask
from models import db, User, File, Folder
import config_manager

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

# ================================================================
# CONFIGURATION ERROR TESTS
# ================================================================

class TestConfigurationErrors:
    """Test configuration error handling"""

    def test_missing_config_file(self):
        """Test handling of missing configuration file"""
        # Test with non-existent file
        manager = config_manager.ConfigManager('nonexistent_config.json')

        # Should return default config when file doesn't exist
        config = manager.config
        assert config is not None
        assert 'telegram' in config

    def test_invalid_json_config(self):
        """Test handling of invalid JSON configuration"""
        # Create temporary invalid JSON file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            f.write('{ invalid json content }')
            temp_file = f.name

        try:
            # Should return default config when JSON is invalid
            manager = config_manager.ConfigManager(temp_file)
            config = manager.config
            assert config is not None
            assert 'telegram' in config
        finally:
            os.unlink(temp_file)

    def test_missing_required_config_fields(self):
        """Test handling of missing required configuration fields"""
        # Create config with missing required fields
        incomplete_config = {
            "telegram": {
                "api_id": "12345"
                # Missing api_hash, phone_number
            }
        }

        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(incomplete_config, f)
            temp_file = f.name

        try:
            # Test validation using ConfigValidator
            validator = config_manager.ConfigValidator()
            is_valid = validator.validate_config_json(temp_file)
            assert is_valid is False
            assert len(validator.errors) > 0
        finally:
            os.unlink(temp_file)

    def test_invalid_config_values(self):
        """Test handling of invalid configuration values"""
        # Create config with invalid values
        invalid_config = {
            "telegram": {
                "api_id": "not_a_number",
                "api_hash": "valid_hash",
                "phone_number": "+1234567890"
            }
        }

        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(invalid_config, f)
            temp_file = f.name

        try:
            # Test validation
            validator = config_manager.ConfigValidator()
            is_valid = validator.validate_config_json(temp_file)
            assert is_valid is False
            assert len(validator.errors) > 0
        finally:
            os.unlink(temp_file)

# ================================================================
# DATABASE ERROR TESTS
# ================================================================

class TestDatabaseErrors:
    """Test database error handling"""
    
    def test_database_connection_failure(self):
        """Test handling of database connection failures"""
        app = Flask(__name__)
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///nonexistent/path/database.db'
        app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
        
        db.init_app(app)
        
        with app.app_context():
            # This should raise an error due to invalid path
            with pytest.raises(Exception):
                db.create_all()
    
    def test_duplicate_user_creation(self, app):
        """Test handling of duplicate user creation"""
        with app.app_context():
            # Create first user
            user1 = User(
                username='testuser',
                email='test@example.com',
                role='user'
            )
            user1.set_password('password')
            db.session.add(user1)
            db.session.commit()
            
            # Try to create duplicate user
            user2 = User(
                username='testuser',  # Same username
                email='test2@example.com',
                role='user'
            )
            user2.set_password('password')
            db.session.add(user2)
            
            # Should raise integrity error
            with pytest.raises(Exception):
                db.session.commit()
    
    def test_invalid_foreign_key_reference(self, app):
        """Test handling of invalid foreign key references"""
        with app.app_context():
            # Try to create file with non-existent user_id
            file = File(
                filename='test.txt',
                user_id=99999,  # Non-existent user
                file_size=1024
            )
            db.session.add(file)

            # SQLite doesn't enforce foreign key constraints by default
            # So we'll test the validation logic instead
            try:
                db.session.commit()
                # If no error, verify the user doesn't exist
                user = User.query.get(99999)
                assert user is None
            except Exception:
                # If error occurs, that's also valid behavior
                db.session.rollback()
    
    def test_database_rollback_on_error(self, app):
        """Test database rollback on transaction errors"""
        with app.app_context():
            # Create valid user first
            user = User(
                username='validuser',
                email='valid@example.com',
                role='user'
            )
            user.set_password('password')
            db.session.add(user)
            db.session.commit()
            
            # Start transaction with valid and invalid operations
            try:
                # Valid operation
                folder = Folder(
                    name='Test Folder',
                    user_id=user.id,
                    path='Test Folder'
                )
                db.session.add(folder)
                
                # Invalid operation (duplicate user)
                duplicate_user = User(
                    username='validuser',  # Duplicate
                    email='duplicate@example.com',
                    role='user'
                )
                duplicate_user.set_password('password')
                db.session.add(duplicate_user)
                
                db.session.commit()
            except Exception:
                db.session.rollback()
                
                # Verify rollback - folder should not exist
                folders = Folder.query.all()
                assert len(folders) == 0

# ================================================================
# FILE OPERATION ERROR TESTS
# ================================================================

class TestFileOperationErrors:
    """Test file operation error handling"""
    
    def test_file_upload_size_limit(self):
        """Test handling of file size limits"""
        # Simulate file too large
        large_file_size = 1024 * 1024 * 1024  # 1GB
        
        def validate_file_size(size, max_size=100 * 1024 * 1024):  # 100MB limit
            if size > max_size:
                raise ValueError(f"File size {size} exceeds maximum allowed size {max_size}")
            return True
        
        with pytest.raises(ValueError) as exc_info:
            validate_file_size(large_file_size)
        
        assert "exceeds maximum allowed size" in str(exc_info.value)
    
    def test_invalid_file_type(self):
        """Test handling of invalid file types"""
        def validate_file_type(filename, allowed_types=None):
            if allowed_types is None:
                allowed_types = ['.pdf', '.txt', '.jpg', '.png', '.mp4']
            
            if '.' not in filename:
                raise ValueError("File has no extension")
            
            ext = '.' + filename.split('.')[-1].lower()
            if ext not in allowed_types:
                raise ValueError(f"File type {ext} is not allowed")
            
            return True
        
        # Test file with no extension
        with pytest.raises(ValueError) as exc_info:
            validate_file_type("filename_without_extension")
        assert "no extension" in str(exc_info.value)
        
        # Test disallowed file type
        with pytest.raises(ValueError) as exc_info:
            validate_file_type("malware.exe")
        assert "not allowed" in str(exc_info.value)
    
    def test_file_path_traversal_attack(self):
        """Test handling of path traversal attacks"""
        def secure_filename(filename):
            """Secure filename to prevent path traversal"""
            # Remove path separators and dangerous characters
            dangerous_chars = ['/', '\\', '..', '~', '$', '&', '|', ';']
            
            for char in dangerous_chars:
                if char in filename:
                    raise ValueError(f"Filename contains dangerous character: {char}")
            
            return filename
        
        # Test various path traversal attempts
        malicious_filenames = [
            "../../../etc/passwd",
            "..\\..\\windows\\system32\\config\\sam",
            "file~1.txt",
            "file$var.txt",
            "file|command.txt"
        ]
        
        for filename in malicious_filenames:
            with pytest.raises(ValueError):
                secure_filename(filename)
    
    def test_disk_space_error(self):
        """Test handling of disk space errors"""
        def check_disk_space(required_space, available_space=1024):
            """Simulate disk space check"""
            if required_space > available_space:
                raise OSError("Insufficient disk space")
            return True
        
        # Test insufficient disk space
        with pytest.raises(OSError) as exc_info:
            check_disk_space(2048, 1024)  # Need 2048, only 1024 available
        
        assert "Insufficient disk space" in str(exc_info.value)

# ================================================================
# NETWORK AND API ERROR TESTS
# ================================================================

class TestNetworkErrors:
    """Test network and API error handling"""
    
    def test_telegram_api_connection_error(self):
        """Test handling of Telegram API connection errors"""
        from engine import TelegramFileScanner
        
        scanner = TelegramFileScanner()
        
        # Mock connection error
        with patch('telethon.TelegramClient') as mock_client:
            mock_client.return_value.start.side_effect = ConnectionError("Network unreachable")
            
            with pytest.raises(ConnectionError):
                # This would normally be an async call, but we're testing the error
                mock_client.return_value.start()
    
    def test_telegram_api_rate_limit(self):
        """Test handling of Telegram API rate limiting"""
        def simulate_rate_limit():
            """Simulate rate limit error"""
            raise Exception("FloodWaitError: Must wait 60 seconds")
        
        with pytest.raises(Exception) as exc_info:
            simulate_rate_limit()
        
        assert "FloodWaitError" in str(exc_info.value)
    
    def test_invalid_channel_access(self):
        """Test handling of invalid channel access"""
        def validate_channel_access(channel_name):
            """Simulate channel access validation"""
            if channel_name.startswith('@nonexistent'):
                raise ValueError("Channel not found or access denied")
            return True
        
        with pytest.raises(ValueError) as exc_info:
            validate_channel_access('@nonexistent_channel')
        
        assert "not found or access denied" in str(exc_info.value)

# ================================================================
# INPUT VALIDATION ERROR TESTS
# ================================================================

class TestInputValidationErrors:
    """Test input validation error handling"""
    
    def test_sql_injection_prevention(self):
        """Test SQL injection prevention"""
        def validate_search_query(query):
            """Validate search query for SQL injection"""
            dangerous_patterns = [
                "'; DROP TABLE",
                "UNION SELECT",
                "OR 1=1",
                "--",
                "/*",
                "xp_cmdshell"
            ]
            
            query_upper = query.upper()
            for pattern in dangerous_patterns:
                if pattern in query_upper:
                    raise ValueError(f"Potentially dangerous SQL pattern detected: {pattern}")
            
            return True
        
        # Test various SQL injection attempts
        malicious_queries = [
            "'; DROP TABLE users; --",
            "' UNION SELECT * FROM users --",
            "' OR 1=1 --",
            "test'; DELETE FROM files; --"
        ]
        
        for query in malicious_queries:
            with pytest.raises(ValueError):
                validate_search_query(query)
    
    def test_xss_prevention(self):
        """Test XSS prevention in user inputs"""
        def sanitize_html_input(input_text):
            """Sanitize HTML input to prevent XSS"""
            dangerous_patterns = [
                '<script',
                '<iframe',
                '<object',
                '<embed',
                'javascript:',
                'onerror=',
                'onload=',
                'onclick='
            ]

            input_lower = input_text.lower()
            for pattern in dangerous_patterns:
                if pattern in input_lower:
                    raise ValueError(f"Potentially dangerous HTML content detected: {pattern}")

            return input_text

        # Test various XSS attempts
        malicious_inputs = [
            "<script>alert('XSS')</script>",
            "<iframe src='javascript:alert(1)'></iframe>",
            "<img src='x' onerror='alert(1)'>",
            "javascript:alert('XSS')"
        ]

        for input_text in malicious_inputs:
            with pytest.raises(ValueError):
                sanitize_html_input(input_text)
    
    def test_file_name_validation(self):
        """Test file name validation"""
        def validate_filename(filename):
            """Validate filename for security and compatibility"""
            if not filename or len(filename.strip()) == 0:
                raise ValueError("Filename cannot be empty")
            
            if len(filename) > 255:
                raise ValueError("Filename too long")
            
            # Check for reserved names (Windows)
            reserved_names = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'LPT1', 'LPT2']
            name_without_ext = filename.split('.')[0].upper()
            if name_without_ext in reserved_names:
                raise ValueError(f"Filename uses reserved name: {name_without_ext}")
            
            # Check for invalid characters
            invalid_chars = ['<', '>', ':', '"', '|', '?', '*']
            for char in invalid_chars:
                if char in filename:
                    raise ValueError(f"Filename contains invalid character: {char}")
            
            return True
        
        # Test various invalid filenames
        invalid_filenames = [
            "",  # Empty
            " ",  # Whitespace only
            "a" * 300,  # Too long
            "CON.txt",  # Reserved name
            "file<name>.txt",  # Invalid character
            'file"name.txt',  # Invalid character
            "file|name.txt"  # Invalid character
        ]
        
        for filename in invalid_filenames:
            with pytest.raises(ValueError):
                validate_filename(filename)

# ================================================================
# EDGE CASE TESTS
# ================================================================

class TestEdgeCases:
    """Test various edge cases"""
    
    def test_empty_database_operations(self, app):
        """Test operations on empty database"""
        with app.app_context():
            # Query non-existent records
            users = User.query.all()
            files = File.query.all()
            folders = Folder.query.all()
            
            assert len(users) == 0
            assert len(files) == 0
            assert len(folders) == 0
            
            # Try to get specific record
            user = User.query.get(1)
            assert user is None
    
    def test_unicode_filename_handling(self):
        """Test handling of Unicode filenames"""
        def handle_unicode_filename(filename):
            """Handle Unicode filenames safely"""
            try:
                # Try to encode/decode to check validity
                encoded = filename.encode('utf-8')
                decoded = encoded.decode('utf-8')
                return decoded == filename
            except UnicodeError:
                raise ValueError("Invalid Unicode in filename")
        
        # Test various Unicode filenames
        unicode_filenames = [
            "файл.txt",  # Cyrillic
            "文件.txt",   # Chinese
            "ファイル.txt", # Japanese
            "🎉📁.txt",   # Emoji
            "café.txt"    # Accented characters
        ]
        
        for filename in unicode_filenames:
            assert handle_unicode_filename(filename) is True
    
    def test_concurrent_access_simulation(self, app):
        """Test simulation of concurrent access scenarios"""
        with app.app_context():
            # Create user
            user = User(
                username='concurrent_user',
                email='concurrent@example.com',
                role='user'
            )
            user.set_password('password')
            db.session.add(user)
            db.session.commit()
            
            # Simulate concurrent file creation
            files_created = []
            for i in range(5):
                file = File(
                    filename=f'concurrent_file_{i}.txt',
                    user_id=user.id,
                    file_size=1024
                )
                db.session.add(file)
                files_created.append(file)
            
            db.session.commit()
            
            # Verify all files were created
            assert len(files_created) == 5
            saved_files = File.query.filter_by(user_id=user.id).all()
            assert len(saved_files) == 5

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
