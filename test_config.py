#!/usr/bin/env python3
"""
Test script để kiểm tra config và channel validation
"""

import json

def test_channel_validation():
    """Test channel validation logic"""
    try:
        with open('config.json', 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        channel = config.get('channels', {}).get('default_channel', '')
        print(f"Channel found: '{channel}'")
        
        is_valid = channel and channel not in ['', '@your_channel_here']
        print(f"Channel is valid: {is_valid}")
        
        if is_valid:
            print("✅ Channel validation PASSED")
            return True
        else:
            print("❌ Channel validation FAILED")
            return False
            
    except Exception as e:
        print(f"Error: {e}")
        return False

def test_config_sync():
    """Test config sync functionality"""
    try:
        from config_manager import ConfigManager
        cm = ConfigManager()
        result = cm.sync_env_to_config()
        print(f"Sync result: {result}")
        return result
    except Exception as e:
        print(f"Sync error: {e}")
        return False

if __name__ == "__main__":
    print("=== Testing Channel Validation ===")
    test_channel_validation()
    
    print("\n=== Testing Config Sync ===")
    test_config_sync()
