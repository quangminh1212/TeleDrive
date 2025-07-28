"""Test configuration for pytest."""

import os
import sys
import pytest


@pytest.fixture(scope="session", autouse=True)
def add_project_root_to_path():
    """Add the project root directory to the Python path."""
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    if project_root not in sys.path:
        sys.path.insert(0, project_root)


@pytest.fixture
def sample_config():
    """Return a sample configuration for testing."""
    return {
        "telegram": {
            "api_id": "12345",
            "api_hash": "abcdef1234567890",
            "phone_number": "+1234567890",
            "session_name": "test_session",
        },
        "output": {
            "directory": "test_output",
            "create_subdirs": True,
            "timestamp_folders": False,
        },
        "logging": {
            "enabled": True,
            "level": "INFO",
        }
    }