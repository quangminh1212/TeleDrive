"""
Pytest configuration and fixtures for TeleDrive tests.
"""

import pytest
import tempfile
import os
from unittest.mock import Mock

from src.teledrive.factory import create_app
from src.teledrive.models import db


@pytest.fixture
def app():
    """Create and configure a test Flask application."""
    # Create a temporary file for the test database
    db_fd, db_path = tempfile.mkstemp()
    
    app = create_app({
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': f'sqlite:///{db_path}',
        'SECRET_KEY': 'test-secret-key',
        'WTF_CSRF_ENABLED': False,
    })
    
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()
    
    os.close(db_fd)
    os.unlink(db_path)


@pytest.fixture
def client(app):
    """Create a test client for the Flask application."""
    return app.test_client()


@pytest.fixture
def runner(app):
    """Create a test runner for the Flask application."""
    return app.test_cli_runner()


@pytest.fixture
def mock_telegram_client():
    """Mock Telegram client for testing."""
    mock_client = Mock()
    mock_client.is_connected.return_value = True
    mock_client.get_me.return_value = Mock(id=123456, username='testuser')
    return mock_client


@pytest.fixture
def sample_file_data():
    """Sample file data for testing uploads."""
    return {
        'file': (
            'test_file.txt',
            b'This is a test file content',
            'text/plain'
        )
    }


@pytest.fixture
def authenticated_user(client):
    """Create an authenticated user session."""
    # Mock authentication for testing
    with client.session_transaction() as sess:
        sess['user_id'] = 1
        sess['authenticated'] = True
    return client
