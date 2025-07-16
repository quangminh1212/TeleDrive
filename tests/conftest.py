"""
Pytest configuration and fixtures for TeleDrive tests
"""

import pytest
import tempfile
import json
from pathlib import Path
from unittest.mock import Mock, AsyncMock

from src.teledrive.config.manager import ConfigManager
from src.teledrive.config.models import TeleDriveConfig, TelegramConfig


@pytest.fixture
def temp_dir():
    """Create a temporary directory for tests"""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield Path(tmpdir)


@pytest.fixture
def sample_config_data():
    """Sample configuration data for testing"""
    return {
        "telegram": {
            "api_id": "12345",
            "api_hash": "test_hash",
            "phone_number": "+1234567890",
            "session_name": "test_session"
        },
        "output": {
            "directory": "test_output",
            "formats": {
                "json": {"enabled": True, "filename": "test.json"},
                "csv": {"enabled": True, "filename": "test.csv"},
                "excel": {"enabled": False, "filename": "test.xlsx"}
            }
        },
        "scanning": {
            "max_messages": 100,
            "batch_size": 10,
            "file_types": {
                "documents": True,
                "photos": True,
                "videos": False
            }
        }
    }


@pytest.fixture
def config_file(temp_dir, sample_config_data):
    """Create a temporary config file"""
    config_path = temp_dir / "config.json"
    with open(config_path, 'w') as f:
        json.dump(sample_config_data, f)
    return config_path


@pytest.fixture
def config_manager(config_file):
    """Create a ConfigManager instance with test config"""
    return ConfigManager(config_file)


@pytest.fixture
def valid_config(sample_config_data):
    """Create a valid TeleDriveConfig instance"""
    return TeleDriveConfig(**sample_config_data)


@pytest.fixture
def mock_telegram_client():
    """Mock Telegram client for testing"""
    client = Mock()
    client.connect = AsyncMock()
    client.disconnect = AsyncMock()
    client.is_user_authorized = AsyncMock(return_value=True)
    client.get_entity = AsyncMock()
    client.iter_messages = AsyncMock()
    client.get_messages = AsyncMock(return_value=[])
    return client


@pytest.fixture
def sample_telegram_message():
    """Sample Telegram message for testing"""
    message = Mock()
    message.id = 123
    message.date = "2025-01-15T10:30:00Z"
    message.sender_id = 456
    message.text = "Test message"
    message.media = None
    message.document = None
    message.photo = None
    message.video = None
    return message


@pytest.fixture
def sample_file_data():
    """Sample file data for testing"""
    return [
        {
            "name": "test_document.pdf",
            "size": 1048576,
            "type": "document",
            "date": "2025-01-15T10:30:00Z",
            "download_link": "https://t.me/c/123456/789",
            "sender": "test_user",
            "message_id": 789
        },
        {
            "name": "test_image.jpg",
            "size": 524288,
            "type": "photo",
            "date": "2025-01-15T11:00:00Z",
            "download_link": "https://t.me/c/123456/790",
            "sender": "test_user2",
            "message_id": 790
        }
    ]


@pytest.fixture(autouse=True)
def setup_test_environment(temp_dir, monkeypatch):
    """Setup test environment"""
    # Change to temp directory
    monkeypatch.chdir(temp_dir)
    
    # Create necessary directories
    (temp_dir / "logs").mkdir(exist_ok=True)
    (temp_dir / "output").mkdir(exist_ok=True)
    (temp_dir / "downloads").mkdir(exist_ok=True)


@pytest.fixture
def mock_logger():
    """Mock logger for testing"""
    logger = Mock()
    logger.info = Mock()
    logger.error = Mock()
    logger.warning = Mock()
    logger.debug = Mock()
    return logger


# Async test helpers
@pytest.fixture
def event_loop():
    """Create an event loop for async tests"""
    import asyncio
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


# Markers for different test types
def pytest_configure(config):
    """Configure pytest markers"""
    config.addinivalue_line(
        "markers", "unit: mark test as a unit test"
    )
    config.addinivalue_line(
        "markers", "integration: mark test as an integration test"
    )
    config.addinivalue_line(
        "markers", "slow: mark test as slow running"
    )
    config.addinivalue_line(
        "markers", "async_test: mark test as async"
    )
