#!/usr/bin/env python3
"""
TeleDrive Test Suite
Comprehensive testing framework for TeleDrive project
"""

import os
import sys
import tempfile
import shutil
from pathlib import Path

# Add source directory to Python path for imports
project_root = Path(__file__).parent.parent
source_dir = project_root / 'source'
sys.path.insert(0, str(source_dir))

# Test configuration
TEST_CONFIG = {
    'database_url': 'sqlite:///:memory:',  # Use in-memory database for tests
    'test_data_dir': project_root / 'tests' / 'test_data',
    'temp_dir': None,  # Will be set during test setup
    'telegram_api': {
        'api_id': 'test_api_id',
        'api_hash': 'test_api_hash',
        'phone_number': '+1234567890'
    }
}

def setup_test_environment():
    """Setup test environment with temporary directories and test data"""
    # Create temporary directory for test files
    TEST_CONFIG['temp_dir'] = Path(tempfile.mkdtemp(prefix='teledrive_test_'))
    
    # Create test data directory if it doesn't exist
    TEST_CONFIG['test_data_dir'].mkdir(parents=True, exist_ok=True)
    
    # Set environment variables for testing
    os.environ['TESTING'] = 'true'
    os.environ['DATABASE_URL'] = TEST_CONFIG['database_url']
    
    return TEST_CONFIG['temp_dir']

def teardown_test_environment():
    """Clean up test environment"""
    if TEST_CONFIG['temp_dir'] and TEST_CONFIG['temp_dir'].exists():
        shutil.rmtree(TEST_CONFIG['temp_dir'])
    
    # Clean up environment variables
    os.environ.pop('TESTING', None)
    os.environ.pop('DATABASE_URL', None)

def create_test_file(filename, content="Test file content", size_kb=None):
    """Create a test file with specified content or size"""
    test_file = TEST_CONFIG['temp_dir'] / filename
    
    if size_kb:
        # Create file with specific size
        with open(test_file, 'wb') as f:
            f.write(b'0' * (size_kb * 1024))
    else:
        # Create file with content
        with open(test_file, 'w', encoding='utf-8') as f:
            f.write(content)
    
    return test_file

def create_test_image(filename="test_image.png", width=100, height=100):
    """Create a test image file"""
    try:
        from PIL import Image
        test_file = TEST_CONFIG['temp_dir'] / filename
        
        # Create a simple test image
        img = Image.new('RGB', (width, height), color='red')
        img.save(test_file)
        
        return test_file
    except ImportError:
        # Fallback: create a fake image file
        return create_test_file(filename, "FAKE_PNG_DATA")

class TestDatabase:
    """Test database utilities"""
    
    @staticmethod
    def setup_test_db():
        """Setup test database with test data"""
        from models import db, User, File, Folder
        
        # Create tables
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
        
        # Create test folder
        test_folder = Folder(
            name='Test Folder',
            user_id=test_user.id,
            path='Test Folder'
        )
        db.session.add(test_folder)
        
        # Create test file
        test_file = File(
            filename='test_file.txt',
            original_filename='test_file.txt',
            file_size=1024,
            mime_type='text/plain',
            folder_id=test_folder.id,
            user_id=test_user.id
        )
        db.session.add(test_file)
        
        db.session.commit()
        
        return {
            'user': test_user,
            'folder': test_folder,
            'file': test_file
        }
    
    @staticmethod
    def cleanup_test_db():
        """Clean up test database"""
        from models import db
        db.session.remove()
        db.drop_all()

class MockTelegramClient:
    """Mock Telegram client for testing"""
    
    def __init__(self):
        self.connected = False
        self.messages = []
    
    async def connect(self):
        self.connected = True
    
    async def disconnect(self):
        self.connected = False
    
    async def get_entity(self, channel):
        # Mock entity response
        return type('Entity', (), {
            'id': 123456,
            'title': f'Test Channel {channel}',
            'username': channel
        })()
    
    async def iter_messages(self, entity, limit=None):
        # Mock messages with files
        for i in range(min(limit or 10, 10)):
            yield type('Message', (), {
                'id': i,
                'date': '2025-01-01',
                'media': type('Media', (), {
                    'document': type('Document', (), {
                        'attributes': [
                            type('Attr', (), {'file_name': f'test_file_{i}.txt'})()
                        ],
                        'size': 1024,
                        'mime_type': 'text/plain'
                    })()
                })() if i % 2 == 0 else None
            })()

# Test utilities
def assert_file_exists(file_path):
    """Assert that a file exists"""
    assert Path(file_path).exists(), f"File does not exist: {file_path}"

def assert_file_not_exists(file_path):
    """Assert that a file does not exist"""
    assert not Path(file_path).exists(), f"File should not exist: {file_path}"

def assert_response_success(response):
    """Assert that HTTP response is successful"""
    assert 200 <= response.status_code < 300, f"Response failed with status {response.status_code}"

def assert_response_error(response, expected_status=None):
    """Assert that HTTP response is an error"""
    if expected_status:
        assert response.status_code == expected_status, f"Expected status {expected_status}, got {response.status_code}"
    else:
        assert response.status_code >= 400, f"Expected error status, got {response.status_code}"
