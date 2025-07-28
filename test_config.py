#!/usr/bin/env python3
"""
Configuration Tests for TeleDrive
Tests configuration loading, validation, and environment handling
"""

import pytest
import json
import os
import tempfile
import shutil
from unittest.mock import patch

# Import configuration components directly
from config_manager import ConfigManager, ConfigValidator

# ================================================================
# FIXTURES AND SETUP
# ================================================================

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
        "download": {
            "enabled": True,
            "auto_download": False
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
# CONFIGURATION TESTS
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

    def test_validate_env_file_valid(self, temp_config_dir):
        """Test .env file validation with valid content"""
        env_file = os.path.join(temp_config_dir, '.env')
        valid_env_content = """TELEGRAM_API_ID=12345678
TELEGRAM_API_HASH=1234567890abcdef1234567890abcdef
TELEGRAM_PHONE=+84987654321
TELEGRAM_SESSION_NAME=test_session"""

        with open(env_file, 'w', encoding='utf-8') as f:
            f.write(valid_env_content)

        validator = ConfigValidator()
        result = validator.validate_env_file(env_file)
        assert result is True
        assert len(validator.errors) == 0

    def test_validate_env_file_invalid_phone(self, temp_config_dir):
        """Test .env file validation with invalid phone number"""
        env_file = os.path.join(temp_config_dir, '.env')
        invalid_env_content = """TELEGRAM_API_ID=12345678
TELEGRAM_API_HASH=1234567890abcdef1234567890abcdef
TELEGRAM_PHONE=84987654321
TELEGRAM_SESSION_NAME=test_session"""

        with open(env_file, 'w', encoding='utf-8') as f:
            f.write(invalid_env_content)

        validator = ConfigValidator()
        result = validator.validate_env_file(env_file)
        assert result is False
        assert len(validator.errors) > 0
        assert any("TELEGRAM_PHONE" in error for error in validator.errors)

    def test_validate_env_file_invalid_api_id(self, temp_config_dir):
        """Test .env file validation with invalid API ID"""
        env_file = os.path.join(temp_config_dir, '.env')
        invalid_env_content = """TELEGRAM_API_ID=abc123
TELEGRAM_API_HASH=1234567890abcdef1234567890abcdef
TELEGRAM_PHONE=+84987654321
TELEGRAM_SESSION_NAME=test_session"""

        with open(env_file, 'w', encoding='utf-8') as f:
            f.write(invalid_env_content)

        validator = ConfigValidator()
        result = validator.validate_env_file(env_file)
        assert result is False
        assert len(validator.errors) > 0
        assert any("TELEGRAM_API_ID" in error for error in validator.errors)

    def test_validate_env_file_invalid_api_hash(self, temp_config_dir):
        """Test .env file validation with invalid API hash"""
        env_file = os.path.join(temp_config_dir, '.env')
        invalid_env_content = """TELEGRAM_API_ID=12345678
TELEGRAM_API_HASH=short_hash
TELEGRAM_PHONE=+84987654321
TELEGRAM_SESSION_NAME=test_session"""

        with open(env_file, 'w', encoding='utf-8') as f:
            f.write(invalid_env_content)

        validator = ConfigValidator()
        result = validator.validate_env_file(env_file)
        assert result is False
        assert len(validator.errors) > 0
        assert any("TELEGRAM_API_HASH" in error for error in validator.errors)

    def test_validate_env_file_missing_required(self, temp_config_dir):
        """Test .env file validation with missing required fields"""
        env_file = os.path.join(temp_config_dir, '.env')
        incomplete_env_content = """TELEGRAM_API_ID=12345678
TELEGRAM_SESSION_NAME=test_session"""

        with open(env_file, 'w', encoding='utf-8') as f:
            f.write(incomplete_env_content)

        validator = ConfigValidator()
        result = validator.validate_env_file(env_file)
        assert result is False
        assert len(validator.errors) > 0

    def test_validate_config_json_structure(self, temp_config_dir):
        """Test config.json structure validation"""
        # Create a complete config that matches the expected structure
        complete_config = {
            "telegram": {"api_id": "12345678", "api_hash": "1234567890abcdef1234567890abcdef"},
            "output": {"directory": "output"},
            "scanning": {"max_messages": 1000},
            "download": {"enabled": True},  # This section was missing
            "display": {"language": "vi"},
            "filters": {"min_file_size": 0},
            "logging": {"enabled": True},
            "security": {"session_timeout": 3600},
            "advanced": {"use_ipv6": False}
        }

        config_file = os.path.join(temp_config_dir, 'test_config.json')
        with open(config_file, 'w', encoding='utf-8') as f:
            json.dump(complete_config, f)

        validator = ConfigValidator()
        result = validator.validate_config_json(config_file)
        assert result is True
        assert len(validator.errors) == 0

    def test_validate_config_json_missing_sections(self, temp_config_dir):
        """Test config.json validation with missing sections"""
        incomplete_config = {"telegram": {"api_id": "123"}}
        config_file = os.path.join(temp_config_dir, 'incomplete_config.json')
        with open(config_file, 'w', encoding='utf-8') as f:
            json.dump(incomplete_config, f)

        validator = ConfigValidator()
        result = validator.validate_config_json(config_file)
        assert result is False
        assert len(validator.errors) > 0

class TestEnvironmentVariables:
    """Test environment variable handling"""
    
    def test_env_file_exists(self):
        """Test that .env.example file exists"""
        assert os.path.exists('.env.example'), ".env.example file should exist"
    
    def test_env_example_content(self):
        """Test .env.example contains required variables"""
        with open('.env.example', 'r', encoding='utf-8') as f:
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

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
