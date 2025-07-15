#!/usr/bin/env python3
"""
Basic import tests for TeleDrive
"""

import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

def test_config_imports():
    """Test config module imports"""
    from teledrive.config.settings import validate_config, get_config
    from teledrive.config.manager import ConfigManager
    
    # Test basic functionality
    config = get_config()
    assert isinstance(config, dict)
    
    # Test validation
    result = validate_config()
    assert isinstance(result, bool)
    
    # Test manager
    manager = ConfigManager()
    assert manager is not None
    
    print("✅ Config imports OK")

def test_core_imports():
    """Test core module imports"""
    from teledrive.core.scanner import TelegramFileScanner
    from teledrive.core.client import TelegramClientManager
    
    # Test basic instantiation
    scanner = TelegramFileScanner()
    assert scanner is not None
    
    client_manager = TelegramClientManager()
    assert client_manager is not None
    
    print("✅ Core imports OK")

def test_utils_imports():
    """Test utils module imports"""
    from teledrive.utils.logger import get_logger, setup_logging, log_step
    
    # Test basic functionality
    logger = get_logger('test')
    assert logger is not None
    
    print("✅ Utils imports OK")

def test_cli_imports():
    """Test CLI module imports"""
    from teledrive.cli.main import PrivateChannelScanner, main
    
    # Test basic instantiation
    scanner = PrivateChannelScanner()
    assert scanner is not None
    
    print("✅ CLI imports OK")

def test_package_imports():
    """Test main package imports"""
    from teledrive import TelegramFileScanner, ConfigManager, get_logger
    
    # Test basic instantiation
    scanner = TelegramFileScanner()
    assert scanner is not None
    
    manager = ConfigManager()
    assert manager is not None
    
    logger = get_logger('test')
    assert logger is not None
    
    print("✅ Package imports OK")

if __name__ == "__main__":
    print("🧪 Running TeleDrive import tests...")
    print("=" * 50)
    
    try:
        test_config_imports()
        test_core_imports()
        test_utils_imports()
        test_cli_imports()
        test_package_imports()
        
        print("=" * 50)
        print("🎉 All tests passed!")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
