"""
Tests for configuration management
"""

import pytest
import json
from pathlib import Path
from pydantic import ValidationError

from src.teledrive.config.manager import ConfigManager
from src.teledrive.config.models import TeleDriveConfig, TelegramConfig


class TestConfigManager:
    """Test ConfigManager functionality"""
    
    def test_config_manager_creation(self, temp_dir):
        """Test that ConfigManager can be created"""
        config_path = temp_dir / "test_config.json"
        manager = ConfigManager(config_path)
        assert manager is not None
        assert manager.config_path == config_path
        
    def test_load_config_success(self, config_manager, sample_config_data):
        """Test successful config loading"""
        config = config_manager.load_config()
        assert isinstance(config, TeleDriveConfig)
        assert config.telegram.api_id == sample_config_data["telegram"]["api_id"]
        assert config.telegram.api_hash == sample_config_data["telegram"]["api_hash"]
        
    def test_load_config_file_not_found(self, temp_dir):
        """Test config loading when file doesn't exist"""
        config_path = temp_dir / "nonexistent.json"
        manager = ConfigManager(config_path)
        
        with pytest.raises(FileNotFoundError):
            manager.load_config()
            
    def test_load_config_invalid_json(self, temp_dir):
        """Test config loading with invalid JSON"""
        config_path = temp_dir / "invalid.json"
        with open(config_path, 'w') as f:
            f.write("invalid json content")
            
        manager = ConfigManager(config_path)
        with pytest.raises(json.JSONDecodeError):
            manager.load_config()
            
    def test_save_config(self, config_manager, valid_config, temp_dir):
        """Test config saving"""
        config_manager.config = valid_config
        config_manager.save_config()
        
        # Verify file was created and contains correct data
        assert config_manager.config_path.exists()
        with open(config_manager.config_path, 'r') as f:
            saved_data = json.load(f)
        assert saved_data["telegram"]["api_id"] == valid_config.telegram.api_id
        
    def test_validate_telegram_config_valid(self, config_manager):
        """Test validation of valid Telegram config"""
        config_manager.load_config()
        assert config_manager.validate_telegram_config() is True
        
    def test_validate_telegram_config_invalid(self, temp_dir):
        """Test validation of invalid Telegram config"""
        invalid_config = {
            "telegram": {
                "api_id": "YOUR_API_ID",  # Invalid placeholder
                "api_hash": "YOUR_API_HASH",  # Invalid placeholder
                "phone_number": "invalid"  # Invalid format
            }
        }
        
        config_path = temp_dir / "invalid_config.json"
        with open(config_path, 'w') as f:
            json.dump(invalid_config, f)
            
        manager = ConfigManager(config_path)
        assert manager.validate_telegram_config() is False
        
    def test_update_config(self, config_manager):
        """Test config updating"""
        config_manager.load_config()
        
        updates = {
            "telegram": {
                "api_id": "54321"
            },
            "scanning": {
                "max_messages": 500
            }
        }
        
        updated_config = config_manager.update_config(updates)
        assert updated_config.telegram.api_id == "54321"
        assert updated_config.scanning.max_messages == 500
        
    def test_create_default_config(self, temp_dir):
        """Test creating default config"""
        config_path = temp_dir / "default_config.json"
        manager = ConfigManager()
        manager.create_default_config(config_path)
        
        assert config_path.exists()
        with open(config_path, 'r') as f:
            config_data = json.load(f)
        assert "telegram" in config_data
        assert "output" in config_data
        assert "scanning" in config_data


class TestTeleDriveConfig:
    """Test TeleDriveConfig model"""
    
    def test_valid_config_creation(self, sample_config_data):
        """Test creating valid config"""
        config = TeleDriveConfig(**sample_config_data)
        assert config.telegram.api_id == sample_config_data["telegram"]["api_id"]
        assert config.output.directory == sample_config_data["output"]["directory"]
        
    def test_invalid_telegram_config(self):
        """Test validation of invalid Telegram config"""
        invalid_data = {
            "telegram": {
                "api_id": "",  # Empty API ID
                "api_hash": "test_hash",
                "phone_number": "invalid_phone"  # Invalid phone format
            }
        }
        
        with pytest.raises(ValidationError):
            TeleDriveConfig(**invalid_data)
            
    def test_phone_number_validation(self):
        """Test phone number validation"""
        # Valid phone number
        valid_data = {
            "telegram": {
                "api_id": "12345",
                "api_hash": "test_hash",
                "phone_number": "+1234567890"
            }
        }
        config = TeleDriveConfig(**valid_data)
        assert config.telegram.phone_number == "+1234567890"
        
        # Invalid phone number (no country code)
        invalid_data = {
            "telegram": {
                "api_id": "12345",
                "api_hash": "test_hash",
                "phone_number": "1234567890"  # Missing +
            }
        }
        
        with pytest.raises(ValidationError):
            TeleDriveConfig(**invalid_data)
            
    def test_default_values(self):
        """Test default configuration values"""
        minimal_data = {
            "telegram": {
                "api_id": "12345",
                "api_hash": "test_hash",
                "phone_number": "+1234567890"
            }
        }
        
        config = TeleDriveConfig(**minimal_data)
        
        # Check default values
        assert config.output.directory == "output"
        assert config.scanning.batch_size == 100
        assert config.telegram.connection_timeout == 30
        assert config.logging.enabled is True
        
    def test_config_serialization(self, valid_config):
        """Test config serialization to dict"""
        config_dict = valid_config.dict()
        
        assert isinstance(config_dict, dict)
        assert "telegram" in config_dict
        assert "output" in config_dict
        assert "scanning" in config_dict
        
        # Test round-trip
        new_config = TeleDriveConfig(**config_dict)
        assert new_config.telegram.api_id == valid_config.telegram.api_id


class TestEnvironmentVariables:
    """Test environment variable handling"""
    
    def test_env_override(self, temp_dir, monkeypatch):
        """Test environment variable override"""
        # Set environment variables
        monkeypatch.setenv("TELEDRIVE_API_ID", "env_api_id")
        monkeypatch.setenv("TELEDRIVE_API_HASH", "env_api_hash")
        monkeypatch.setenv("TELEDRIVE_PHONE_NUMBER", "+9876543210")
        
        # Create config with different values
        config_data = {
            "telegram": {
                "api_id": "config_api_id",
                "api_hash": "config_api_hash",
                "phone_number": "+1234567890"
            }
        }
        
        config_path = temp_dir / "config.json"
        with open(config_path, 'w') as f:
            json.dump(config_data, f)
            
        manager = ConfigManager(config_path)
        config = manager.load_config()
        
        # Environment variables should override config file
        assert config.telegram.api_id == "env_api_id"
        assert config.telegram.api_hash == "env_api_hash"
        assert config.telegram.phone_number == "+9876543210"
