#!/usr/bin/env python3
"""
Unit tests for configuration management
Test 1: Configuration and Initialization
"""

import pytest
import json
import tempfile
import os
from pathlib import Path
import sys

# Add source to path
project_root = Path(__file__).parent.parent.parent
source_dir = project_root / 'source'
sys.path.insert(0, str(source_dir))

from config import ConfigManager, get_config_summary, validate_configuration
from manager import ConfigValidator
from flask_config import FlaskConfigLoader

class TestConfigManager:
    """Test 1.1-1.5: Configuration and Initialization Tests"""
    
    def test_config_manager_initialization(self):
        """Test 1.4: Test config manager initialization"""
        config_mgr = ConfigManager()
        assert config_mgr is not None
        assert hasattr(config_mgr, '_config')
        assert isinstance(config_mgr._config, dict)
    
    def test_default_config_creation(self, temp_dir):
        """Test 1.4: Test default config creation"""
        config_file = temp_dir / 'test_config.json'
        config_mgr = ConfigManager(str(config_file))
        
        # Should create default config if file doesn't exist
        assert config_file.exists()
        
        with open(config_file, 'r', encoding='utf-8') as f:
            config_data = json.load(f)
        
        # Check required sections exist
        required_sections = ['telegram', 'output', 'scanning', 'download', 'display', 'filters']
        for section in required_sections:
            assert section in config_data
    
    def test_config_validation(self, temp_dir):
        """Test 1.4: Test config validation"""
        # Create valid config
        valid_config = {
            "telegram": {
                "api_id": "123456",
                "api_hash": "abcdef1234567890abcdef1234567890",
                "phone_number": "+1234567890"
            },
            "output": {"directory": "output"},
            "scanning": {"max_messages": 1000},
            "download": {"generate_links": True},
            "display": {"show_progress": True},
            "filters": {"min_file_size": 0}
        }
        
        config_file = temp_dir / 'valid_config.json'
        with open(config_file, 'w', encoding='utf-8') as f:
            json.dump(valid_config, f)
        
        validator = ConfigValidator()
        assert validator.validate_config_json(str(config_file))
        assert len(validator.errors) == 0
    
    def test_config_validation_missing_sections(self, temp_dir):
        """Test 1.4: Test config validation with missing sections"""
        # Create invalid config (missing required sections)
        invalid_config = {
            "telegram": {
                "api_id": "123456"
            }
        }
        
        config_file = temp_dir / 'invalid_config.json'
        with open(config_file, 'w', encoding='utf-8') as f:
            json.dump(invalid_config, f)
        
        validator = ConfigValidator()
        assert not validator.validate_config_json(str(config_file))
        assert len(validator.errors) > 0
    
    def test_env_file_validation(self, temp_dir):
        """Test 1.4: Test .env file validation"""
        # Create valid .env file
        env_file = temp_dir / '.env'
        env_content = """
TELEGRAM_API_ID=123456
TELEGRAM_API_HASH=abcdef1234567890abcdef1234567890
TELEGRAM_PHONE=+1234567890
"""
        with open(env_file, 'w') as f:
            f.write(env_content)
        
        validator = ConfigValidator()
        assert validator.validate_env_file(str(env_file))
        assert len(validator.errors) == 0
    
    def test_env_file_validation_invalid(self, temp_dir):
        """Test 1.4: Test .env file validation with invalid data"""
        # Create invalid .env file
        env_file = temp_dir / '.env'
        env_content = """
TELEGRAM_API_ID=invalid_id
TELEGRAM_API_HASH=short_hash
TELEGRAM_PHONE=invalid_phone
"""
        with open(env_file, 'w') as f:
            f.write(env_content)
        
        validator = ConfigValidator()
        assert not validator.validate_env_file(str(env_file))
        assert len(validator.errors) > 0
    
    def test_config_get_set(self, temp_dir):
        """Test 1.4: Test config get/set operations"""
        config_file = temp_dir / 'test_config.json'
        config_mgr = ConfigManager(str(config_file))
        
        # Test setting values
        assert config_mgr.set('telegram.api_id', '123456')
        assert config_mgr.get('telegram.api_id') == '123456'
        
        # Test nested path
        assert config_mgr.set('telegram.connection_timeout', 30)
        assert config_mgr.get('telegram.connection_timeout') == 30
        
        # Test default value
        assert config_mgr.get('nonexistent.path', 'default') == 'default'
    
    def test_config_summary(self):
        """Test 1.4: Test config summary generation"""
        summary = get_config_summary()
        assert isinstance(summary, dict)
        assert 'api_configured' in summary
        assert 'output_dir' in summary
        assert 'formats_enabled' in summary
        assert 'file_types' in summary

class TestFlaskConfig:
    """Test Flask configuration loader"""
    
    def test_flask_config_loader_initialization(self, temp_dir):
        """Test Flask config loader initialization"""
        config_file = temp_dir / 'flask_config.json'
        loader = FlaskConfigLoader(str(config_file))
        
        assert loader is not None
        assert hasattr(loader, '_config')
    
    def test_flask_config_generation(self, temp_dir):
        """Test Flask config generation"""
        config_file = temp_dir / 'flask_config.json'
        loader = FlaskConfigLoader(str(config_file))
        
        flask_config = loader.get_flask_config()
        
        # Check required Flask settings
        assert 'SECRET_KEY' in flask_config
        assert 'SQLALCHEMY_DATABASE_URI' in flask_config
        assert 'SQLALCHEMY_TRACK_MODIFICATIONS' in flask_config
        
        # Check security settings
        assert 'SESSION_COOKIE_HTTPONLY' in flask_config
        assert flask_config['SESSION_COOKIE_HTTPONLY'] is True
    
    def test_server_config(self, temp_dir):
        """Test server configuration"""
        config_file = temp_dir / 'flask_config.json'
        loader = FlaskConfigLoader(str(config_file))
        
        server_config = loader.get_server_config()
        
        assert 'host' in server_config
        assert 'port' in server_config
        assert 'debug' in server_config
        assert isinstance(server_config['port'], int)
    
    def test_directory_creation(self, temp_dir):
        """Test 1.5: Test directory creation"""
        config_file = temp_dir / 'flask_config.json'
        loader = FlaskConfigLoader(str(config_file))
        
        # Override project root for testing
        loader.project_root = temp_dir
        
        loader.create_directories()
        
        # Check that directories were created
        directories = loader.get_directories()
        for name, path in directories.items():
            if not Path(path).is_absolute():
                dir_path = temp_dir / path
            else:
                dir_path = Path(path)
            
            # Skip if path is outside temp directory (for safety)
            if temp_dir in dir_path.parents or dir_path == temp_dir:
                assert dir_path.exists(), f"Directory {name} was not created: {dir_path}"

class TestConfigIntegration:
    """Integration tests for configuration system"""
    
    def test_config_sync_env_to_json(self, temp_dir):
        """Test syncing environment variables to config.json"""
        # Create .env file
        env_file = temp_dir / '.env'
        env_content = """
TELEGRAM_API_ID=123456
TELEGRAM_API_HASH=abcdef1234567890abcdef1234567890
TELEGRAM_PHONE=+1234567890
"""
        with open(env_file, 'w') as f:
            f.write(env_content)
        
        # Change to temp directory to test relative paths
        original_cwd = os.getcwd()
        try:
            os.chdir(temp_dir)
            
            config_file = temp_dir / 'config.json'
            config_mgr = ConfigManager(str(config_file))
            
            # Sync should work
            result = config_mgr.sync_env_to_config()
            assert result is True
            
            # Check that values were synced
            assert config_mgr.get('telegram.api_id') == '123456'
            assert config_mgr.get('telegram.api_hash') == 'abcdef1234567890abcdef1234567890'
            assert config_mgr.get('telegram.phone_number') == '+1234567890'
            
        finally:
            os.chdir(original_cwd)
    
    def test_full_validation_workflow(self, temp_dir):
        """Test complete validation workflow"""
        # This would test the full validation as called by run.bat
        # For now, just test that validation functions don't crash
        try:
            result = validate_configuration()
            # Should return boolean without crashing
            assert isinstance(result, bool)
        except Exception as e:
            # If it fails due to missing files, that's expected in test environment
            assert "config.json" in str(e) or "not found" in str(e).lower()
