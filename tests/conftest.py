#!/usr/bin/env python3
"""
Pytest configuration and fixtures for TeleDrive tests
"""

import pytest
import tempfile
import shutil
from pathlib import Path
import sys
import os

# Add source directory to path
project_root = Path(__file__).parent.parent
source_dir = project_root / 'source'
sys.path.insert(0, str(source_dir))

from tests import setup_test_environment, teardown_test_environment, TestDatabase, MockTelegramClient

@pytest.fixture(scope='session')
def test_app():
    """Create test Flask application"""
    os.environ['TESTING'] = 'true'
    os.environ['DATABASE_URL'] = 'sqlite:///:memory:'
    
    from app import app
    app.config['TESTING'] = True
    app.config['WTF_CSRF_ENABLED'] = False
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    
    with app.app_context():
        yield app

@pytest.fixture(scope='session')
def test_client(test_app):
    """Create test client"""
    return test_app.test_client()

@pytest.fixture(scope='function')
def test_db(test_app):
    """Setup test database for each test"""
    from models import db
    
    with test_app.app_context():
        db.create_all()
        test_data = TestDatabase.setup_test_db()
        yield test_data
        db.session.remove()
        db.drop_all()

@pytest.fixture(scope='function')
def temp_dir():
    """Create temporary directory for test files"""
    temp_path = Path(tempfile.mkdtemp(prefix='teledrive_test_'))
    yield temp_path
    shutil.rmtree(temp_path)

@pytest.fixture(scope='function')
def mock_telegram_client():
    """Mock Telegram client"""
    return MockTelegramClient()

@pytest.fixture(scope='function')
def test_user(test_db):
    """Get test user"""
    return test_db['user']

@pytest.fixture(scope='function')
def test_folder(test_db):
    """Get test folder"""
    return test_db['folder']

@pytest.fixture(scope='function')
def test_file(test_db):
    """Get test file"""
    return test_db['file']

@pytest.fixture(scope='function')
def authenticated_client(test_client, test_user):
    """Client with authenticated user"""
    with test_client.session_transaction() as sess:
        sess['user_id'] = test_user.id
        sess['_fresh'] = True
    return test_client

@pytest.fixture(scope='function')
def test_config():
    """Test configuration"""
    return {
        'telegram': {
            'api_id': 'test_api_id',
            'api_hash': 'test_api_hash',
            'phone_number': '+1234567890'
        },
        'database': {
            'url': 'sqlite:///:memory:'
        },
        'upload': {
            'max_file_size': 10 * 1024 * 1024,  # 10MB
            'allowed_extensions': ['txt', 'pdf', 'png', 'jpg']
        }
    }

@pytest.fixture(autouse=True)
def setup_test_env():
    """Setup test environment for each test"""
    temp_dir = setup_test_environment()
    yield temp_dir
    teardown_test_environment()

# Test markers
pytest.mark.unit = pytest.mark.unit
pytest.mark.integration = pytest.mark.integration
pytest.mark.e2e = pytest.mark.e2e
pytest.mark.performance = pytest.mark.performance
pytest.mark.security = pytest.mark.security
pytest.mark.slow = pytest.mark.slow

def pytest_configure(config):
    """Configure pytest with custom markers"""
    config.addinivalue_line("markers", "unit: Unit tests")
    config.addinivalue_line("markers", "integration: Integration tests")
    config.addinivalue_line("markers", "e2e: End-to-end tests")
    config.addinivalue_line("markers", "performance: Performance tests")
    config.addinivalue_line("markers", "security: Security tests")
    config.addinivalue_line("markers", "slow: Slow running tests")

def pytest_collection_modifyitems(config, items):
    """Modify test collection to add markers based on file location"""
    for item in items:
        # Add markers based on test file location
        if "unit" in str(item.fspath):
            item.add_marker(pytest.mark.unit)
        elif "integration" in str(item.fspath):
            item.add_marker(pytest.mark.integration)
        elif "e2e" in str(item.fspath):
            item.add_marker(pytest.mark.e2e)
        elif "performance" in str(item.fspath):
            item.add_marker(pytest.mark.performance)
        elif "security" in str(item.fspath):
            item.add_marker(pytest.mark.security)
