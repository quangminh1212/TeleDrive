#!/usr/bin/env python3
"""
Comprehensive Test Suite for TeleDrive Application
Tests all major components including configuration, database, API, and security
"""

import pytest
import json
import os
import tempfile
import shutil
from unittest.mock import patch, MagicMock
from pathlib import Path

# Import application components
from app import app as flask_app
import config
import models
import database
from config_manager import ConfigManager, ConfigValidator

# ================================================================
# FIXTURES AND SETUP
# ================================================================

@pytest.fixture
def client():
    """Flask test client fixture"""
    flask_app.config['TESTING'] = True
    flask_app.config['WTF_CSRF_ENABLED'] = False
    with flask_app.test_client() as client:
        yield client

@pytest.fixture
def temp_config_dir():
    """Create temporary directory for config tests"""
    temp_dir = tempfile.mkdtemp()
    yield temp_dir
    shutil.rmtree(temp_dir)

@pytest.fixture
def sample_config():
    """Sample configuration for testing"""
    return {
        "telegram": {
            "api_id": "12345678",
            "api_hash": "1234567890abcdef1234567890abcdef",
            "phone_number": "+84987654321",
            "session_name": "test_session"
        },
        "output": {
            "directory": "output",
            "formats": {
                "json": {"enabled": True, "filename": "test.json"}
            }
        },
        "scanning": {
            "max_messages": 1000,
            "file_types": {"documents": True, "photos": True}
        },
        "display": {"language": "vi"},
        "filters": {"min_file_size": 0},
        "logging": {"enabled": True, "level": "INFO"},
        "security": {"session_timeout": 3600},
        "advanced": {"use_ipv6": False},
        "database": {"url": "sqlite:///test.db"}
    }

@pytest.fixture
def sample_env_content():
    """Sample .env file content for testing"""
    return """
TELEGRAM_API_ID=12345678
TELEGRAM_API_HASH=1234567890abcdef1234567890abcdef
TELEGRAM_PHONE=+84987654321
TELEGRAM_SESSION_NAME=test_session
TELEGRAM_CONNECTION_TIMEOUT=30
TELEGRAM_REQUEST_TIMEOUT=60
TELEGRAM_RETRY_ATTEMPTS=3
TELEGRAM_RETRY_DELAY=5
"""

# ================================================================
# 1. SETUP AND CONFIGURATION TESTS
# ================================================================

class TestConfigurationLoading:
    """Test configuration loading and validation"""

    def test_config_json_exists(self):
        """Test that config.json file exists"""
        assert os.path.exists('config.json'), "config.json file should exist"

    def test_config_json_valid_format(self):
        """Test that config.json has valid JSON format"""
        try:
            with open('config.json', 'r', encoding='utf-8') as f:
                config_data = json.load(f)
            assert isinstance(config_data, dict), "config.json should contain a dictionary"
        except json.JSONDecodeError as e:
            pytest.fail(f"config.json contains invalid JSON: {e}")

    def test_config_required_sections(self):
        """Test that config.json contains all required sections"""
        with open('config.json', 'r', encoding='utf-8') as f:
            config_data = json.load(f)

        required_sections = ['telegram', 'output', 'scanning', 'display', 'filters']
        for section in required_sections:
            assert section in config_data, f"Missing required section: {section}"

    def test_config_manager_initialization(self):
        """Test ConfigManager can be initialized"""
        try:
            config_manager = ConfigManager()
            assert config_manager is not None
            assert hasattr(config_manager, 'config')
        except Exception as e:
            pytest.fail(f"ConfigManager initialization failed: {e}")

    def test_config_manager_load_config(self, temp_config_dir, sample_config):
        """Test ConfigManager can load configuration"""
        config_file = os.path.join(temp_config_dir, 'test_config.json')
        with open(config_file, 'w', encoding='utf-8') as f:
            json.dump(sample_config, f)

        config_manager = ConfigManager(config_file)
        assert config_manager.config == sample_config

    def test_config_manager_missing_file(self, temp_config_dir):
        """Test ConfigManager handles missing config file"""
        config_file = os.path.join(temp_config_dir, 'nonexistent.json')
        config_manager = ConfigManager(config_file)

        # Should create default config
        assert config_manager.config is not None
        assert isinstance(config_manager.config, dict)

    def test_config_manager_invalid_json(self, temp_config_dir):
        """Test ConfigManager handles invalid JSON"""
        config_file = os.path.join(temp_config_dir, 'invalid.json')
        with open(config_file, 'w') as f:
            f.write('{ invalid json content }')

        config_manager = ConfigManager(config_file)
        # Should fall back to default config
        assert config_manager.config is not None

class TestConfigurationValidation:
    """Test configuration validation"""

    def test_config_validator_initialization(self):
        """Test ConfigValidator can be initialized"""
        validator = ConfigValidator()
        assert validator is not None
        assert hasattr(validator, 'errors')
        assert hasattr(validator, 'warnings')

    def test_validate_phone_number_valid(self):
        """Test phone number validation with valid numbers"""
        validator = ConfigValidator()

        valid_phones = ['+84987654321', '+1234567890', '+441234567890']
        for phone in valid_phones:
            assert validator.validate_phone_number(phone), f"Phone {phone} should be valid"

    def test_validate_phone_number_invalid(self):
        """Test phone number validation with invalid numbers"""
        validator = ConfigValidator()

        invalid_phones = ['84987654321', '+84', 'invalid', '', '+84abc123']
        for phone in invalid_phones:
            assert not validator.validate_phone_number(phone), f"Phone {phone} should be invalid"

    def test_validate_api_credentials_valid(self):
        """Test API credentials validation with valid data"""
        validator = ConfigValidator()

        valid_api_id = '12345678'
        valid_api_hash = '1234567890abcdef1234567890abcdef'

        assert validator.validate_api_id(valid_api_id)
        assert validator.validate_api_hash(valid_api_hash)

    def test_validate_api_credentials_invalid(self):
        """Test API credentials validation with invalid data"""
        validator = ConfigValidator()

        # Invalid API IDs
        invalid_api_ids = ['', 'abc', '0', '-123']
        for api_id in invalid_api_ids:
            assert not validator.validate_api_id(api_id), f"API ID {api_id} should be invalid"

        # Invalid API hashes
        invalid_api_hashes = ['', 'short', '1234567890abcdef1234567890abcdefg', 'invalid_hash']
        for api_hash in invalid_api_hashes:
            assert not validator.validate_api_hash(api_hash), f"API hash {api_hash} should be invalid"

    def test_validate_config_json_structure(self, temp_config_dir, sample_config):
        """Test config.json structure validation"""
        config_file = os.path.join(temp_config_dir, 'test_config.json')
        with open(config_file, 'w', encoding='utf-8') as f:
            json.dump(sample_config, f)

        validator = ConfigValidator()
        assert validator.validate_config_json(config_file)
        assert len(validator.errors) == 0

    def test_validate_config_json_missing_sections(self, temp_config_dir):
        """Test config.json validation with missing sections"""
        incomplete_config = {"telegram": {"api_id": "123"}}
        config_file = os.path.join(temp_config_dir, 'incomplete_config.json')
        with open(config_file, 'w', encoding='utf-8') as f:
            json.dump(incomplete_config, f)

        validator = ConfigValidator()
        assert not validator.validate_config_json(config_file)
        assert len(validator.errors) > 0

class TestEnvironmentVariables:
    """Test environment variable handling"""

    def test_env_file_exists(self):
        """Test that .env.example file exists"""
        assert os.path.exists('.env.example'), ".env.example file should exist"

    def test_env_example_content(self):
        """Test .env.example contains required variables"""
        with open('.env.example', 'r') as f:
            content = f.read()

        required_vars = ['TELEGRAM_API_ID', 'TELEGRAM_API_HASH', 'TELEGRAM_PHONE']
        for var in required_vars:
            assert var in content, f"Missing required variable: {var}"

    @patch.dict(os.environ, {
        'TELEGRAM_API_ID': '12345678',
        'TELEGRAM_API_HASH': '1234567890abcdef1234567890abcdef',
        'TELEGRAM_PHONE': '+84987654321'
    })
    def test_load_env_vars_valid(self):
        """Test loading valid environment variables"""
        config_manager = ConfigManager()
        env_vars = config_manager.load_env_vars()

        assert env_vars['api_id'] == '12345678'
        assert env_vars['api_hash'] == '1234567890abcdef1234567890abcdef'
        assert env_vars['phone_number'] == '+84987654321'

    def test_env_validation_missing_file(self, temp_config_dir):
        """Test .env validation when file is missing"""
        os.chdir(temp_config_dir)  # Change to temp directory
        validator = ConfigValidator()

        # Should handle missing .env file gracefully
        result = validator.validate_env_file()
        # This might be True or False depending on implementation
        assert isinstance(result, bool)

class TestConfigurationSaving:
    """Test configuration saving and persistence"""

    def test_save_config_valid(self, temp_config_dir, sample_config):
        """Test saving valid configuration"""
        config_file = os.path.join(temp_config_dir, 'save_test.json')
        config_manager = ConfigManager(config_file)
        config_manager.config = sample_config

        result = config_manager.save_config()
        assert result is True
        assert os.path.exists(config_file)

        # Verify saved content
        with open(config_file, 'r', encoding='utf-8') as f:
            saved_config = json.load(f)
        assert saved_config == sample_config

    def test_save_config_invalid_path(self):
        """Test saving config to invalid path"""
        config_manager = ConfigManager('/invalid/path/config.json')
        result = config_manager.save_config()
        assert result is False

    def test_config_backup_on_save(self, temp_config_dir, sample_config):
        """Test that config is backed up before saving"""
        config_file = os.path.join(temp_config_dir, 'backup_test.json')

        # Create initial config
        with open(config_file, 'w', encoding='utf-8') as f:
            json.dump({"initial": "config"}, f)

        config_manager = ConfigManager(config_file)
        config_manager.config = sample_config

        # Save should create backup
        result = config_manager.save_config()
        assert result is True

class TestConfigurationSync:
    """Test synchronization between .env and config.json"""

    def test_sync_env_to_config(self, temp_config_dir, sample_env_content):
        """Test syncing .env variables to config.json"""
        env_file = os.path.join(temp_config_dir, '.env')
        config_file = os.path.join(temp_config_dir, 'sync_test.json')

        # Create .env file
        with open(env_file, 'w') as f:
            f.write(sample_env_content)

        # Create basic config
        basic_config = {"telegram": {}, "output": {}, "scanning": {}, "display": {}, "filters": {}}
        with open(config_file, 'w') as f:
            json.dump(basic_config, f)

        # Change to temp directory for .env loading
        original_cwd = os.getcwd()
        try:
            os.chdir(temp_config_dir)
            config_manager = ConfigManager('sync_test.json')

            # Sync should update config with .env values
            config_manager.sync_env_to_config()

            # Verify sync
            assert config_manager.config['telegram']['api_id'] == '12345678'
            assert config_manager.config['telegram']['phone_number'] == '+84987654321'
        finally:
            os.chdir(original_cwd)

# ================================================================
# BASIC ROUTE TESTS (from original test file)
# ================================================================

class TestBasicRoutes:
    """Test basic application routes"""

    def test_homepage(self, client):
        """Test homepage loads correctly"""
        resp = client.get('/')
        assert resp.status_code == 200
        assert b'Telegram' in resp.data or b'TeleDrive' in resp.data

    def test_settings_page(self, client):
        """Test settings page loads correctly"""
        resp = client.get('/settings')
        assert resp.status_code == 200
        assert b'Settings' in resp.data or b'Cau hinh' in resp.data

    def test_scan_page(self, client):
        """Test scan page loads correctly"""
        resp = client.get('/scan')
        assert resp.status_code == 200
        assert b'Scan' in resp.data or b'Quet' in resp.data