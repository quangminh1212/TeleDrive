"""
Test Configuration

This module contains test fixtures and configuration for pytest.
"""

import os
import tempfile
import pytest
from typing import Dict, Any, Generator, Tuple

from flask import Flask
from flask.testing import FlaskClient

from src.teledrive.factory import create_app
from src.teledrive.database import db as _db
from src.teledrive.models import User


@pytest.fixture
def app() -> Generator[Flask, None, None]:
    """Create and configure a Flask app for testing."""
    # Create a temporary file to use as the database file
    db_fd, db_path = tempfile.mkstemp()
    
    # Create the app with test configuration
    test_config = {
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': f'sqlite:///{db_path}',
        'SQLALCHEMY_TRACK_MODIFICATIONS': False,
        'WTF_CSRF_ENABLED': False,  # Disable CSRF during testing
        'SERVER_NAME': 'localhost:5000',
        'SESSION_TYPE': 'filesystem',
        'DEV_MODE': True,
        'SECRET_KEY': 'test-key'
    }
    
    app = create_app(test_config)
    
    # Create the database and tables
    with app.app_context():
        _db.create_all()
    
    yield app
    
    # Close and remove the temporary database
    os.close(db_fd)
    os.unlink(db_path)


@pytest.fixture
def client(app: Flask) -> FlaskClient:
    """Create a test client for the app."""
    return app.test_client()


@pytest.fixture
def runner(app: Flask) -> Flask:
    """Create a test CLI runner for the app."""
    return app.test_cli_runner()


@pytest.fixture
def db(app: Flask) -> _db:
    """Create a database for testing."""
    with app.app_context():
        yield _db


@pytest.fixture
def test_user(db: _db) -> User:
    """Create a test user."""
    user = User(
        username="testuser",
        phone_number="+84987654321",
        email="test@example.com",
        is_admin=False,
        is_active=True,
        is_verified=True
    )
    db.session.add(user)
    db.session.commit()
    
    return user


@pytest.fixture
def admin_user(db: _db) -> User:
    """Create an admin user."""
    admin = User(
        username="admin",
        phone_number="+84123456789",
        email="admin@example.com",
        is_admin=True,
        is_active=True,
        is_verified=True
    )
    db.session.add(admin)
    db.session.commit()
    
    return admin


@pytest.fixture
def auth_headers(test_user: User) -> Dict[str, str]:
    """Create authentication headers for a test user."""
    # In a real application, you might generate a JWT token or other auth mechanism
    # For now, return a simple API key
    return {'Authorization': f'Bearer test-token-{test_user.id}'}


class AuthActions:
    """Helper class for authentication in tests."""
    
    def __init__(self, client: FlaskClient):
        self._client = client
        
    def login(self, phone_number: str = "+84987654321") -> FlaskClient:
        """Login with the given phone number."""
        # Note: This would normally verify OTP but for tests we bypass that
        return self._client.post(
            '/auth/login',
            data={'phone_number': phone_number}
        )
        
    def logout(self) -> FlaskClient:
        """Logout the current user."""
        return self._client.get('/auth/logout')


@pytest.fixture
def auth(client: FlaskClient) -> AuthActions:
    """Authentication actions fixture."""
    return AuthActions(client) 