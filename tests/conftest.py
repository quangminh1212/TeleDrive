"""
Pytest configuration and fixtures for TeleDrive tests.
"""

import os
import sys
import tempfile
import pytest
from pathlib import Path
from unittest.mock import Mock

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from teledrive.app import app as flask_app
from teledrive.database import db, init_database
from teledrive.auth import auth_manager


@pytest.fixture(scope="session")
def app():
    """Create application for testing."""
    # Create temporary database
    db_fd, db_path = tempfile.mkstemp()
    
    flask_app.config.update({
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': f'sqlite:///{db_path}',
        'SQLALCHEMY_TRACK_MODIFICATIONS': False,
        'SECRET_KEY': 'test-secret-key',
        'WTF_CSRF_ENABLED': False,
    })
    
    with flask_app.app_context():
        init_database(flask_app)
        auth_manager.init_app(flask_app)
        db.create_all()
        yield flask_app
        
    # Cleanup
    os.close(db_fd)
    os.unlink(db_path)


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


@pytest.fixture
def runner(app):
    """Create test CLI runner."""
    return app.test_cli_runner()


@pytest.fixture
def auth_headers(client):
    """Create authentication headers for testing."""
    # Create test user
    with client.application.app_context():
        success, message = auth_manager.create_user(
            username='testuser',
            phone_number='+1234567890',
            email='test@example.com',
            is_admin=False
        )
        assert success, f"Failed to create test user: {message}"
        
        # Login
        response = client.post('/api/auth/login', json={
            'phone_number': '+1234567890',
            'otp': '123456'  # Mock OTP
        })
        
        assert response.status_code == 200
        data = response.get_json()
        
        return {
            'Authorization': f"Bearer {data.get('token', '')}",
            'Content-Type': 'application/json'
        }


@pytest.fixture
def admin_headers(client):
    """Create admin authentication headers for testing."""
    # Create test admin user
    with client.application.app_context():
        success, message = auth_manager.create_user(
            username='admin',
            phone_number='+1234567891',
            email='admin@example.com',
            is_admin=True
        )
        assert success, f"Failed to create admin user: {message}"
        
        # Login
        response = client.post('/api/auth/login', json={
            'phone_number': '+1234567891',
            'otp': '123456'  # Mock OTP
        })
        
        assert response.status_code == 200
        data = response.get_json()
        
        return {
            'Authorization': f"Bearer {data.get('token', '')}",
            'Content-Type': 'application/json'
        }


@pytest.fixture
def mock_telegram_client():
    """Mock Telegram client for testing."""
    mock_client = Mock()
    mock_client.connect = Mock()
    mock_client.disconnect = Mock()
    mock_client.is_connected = Mock(return_value=True)
    mock_client.get_dialogs = Mock(return_value=[])
    mock_client.get_messages = Mock(return_value=[])
    return mock_client


@pytest.fixture
def temp_directory():
    """Create temporary directory for testing."""
    with tempfile.TemporaryDirectory() as temp_dir:
        yield Path(temp_dir)


@pytest.fixture
def sample_files(temp_directory):
    """Create sample files for testing."""
    files = {}
    
    # Create sample text file
    text_file = temp_directory / "sample.txt"
    text_file.write_text("This is a sample text file for testing.")
    files['text'] = text_file
    
    # Create sample JSON file
    json_file = temp_directory / "sample.json"
    json_file.write_text('{"test": "data", "number": 42}')
    files['json'] = json_file
    
    # Create sample CSV file
    csv_file = temp_directory / "sample.csv"
    csv_file.write_text("name,age,city\nJohn,30,New York\nJane,25,London")
    files['csv'] = csv_file
    
    return files


@pytest.fixture(autouse=True)
def mock_environment_variables(monkeypatch):
    """Mock environment variables for testing."""
    test_env = {
        'ENVIRONMENT': 'testing',
        'DEBUG': 'true',
        'SECRET_KEY': 'test-secret-key',
        'DATABASE_URL': 'sqlite:///:memory:',
        'TELEGRAM_API_ID': '12345678',
        'TELEGRAM_API_HASH': 'test_api_hash_32_characters_long',
        'TELEGRAM_PHONE': '+1234567890',
        'HOST': 'localhost',
        'PORT': '5000',
    }
    
    for key, value in test_env.items():
        monkeypatch.setenv(key, value)


# Pytest markers
pytest_plugins = []

# Custom markers
def pytest_configure(config):
    """Configure pytest with custom markers."""
    config.addinivalue_line(
        "markers", "slow: marks tests as slow (deselect with '-m \"not slow\"')"
    )
    config.addinivalue_line(
        "markers", "integration: marks tests as integration tests"
    )
    config.addinivalue_line(
        "markers", "unit: marks tests as unit tests"
    )
