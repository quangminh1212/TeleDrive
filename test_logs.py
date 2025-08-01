#!/usr/bin/env python3
"""
Script đơn giản để test hệ thống logging
Chạy: python test_logs.py
"""

import sys
import os
from pathlib import Path

# Thêm source vào path
sys.path.insert(0, 'source')

def test_logging():
    """Test logging system"""
    print("🧪 Testing TeleDrive Logging System")
    print("=" * 50)
    
    try:
        # Tạo thư mục logs
        logs_dir = Path("logs")
        logs_dir.mkdir(exist_ok=True)
        print(f"✅ Logs directory: {logs_dir.absolute()}")
        
        # Test import
        from logger import setup_detailed_logging, log_step, log_api_call, log_file_operation
        print("✅ Logger modules imported successfully")
        
        # Load config
        import json
        config_path = Path("source/config.json")
        if config_path.exists():
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
            logging_config = config.get('logging', {})
            print(f"✅ Logging config loaded: enabled={logging_config.get('enabled', False)}")
        else:
            print("⚠️ Config file not found, using default logging config")
            logging_config = {"enabled": True, "level": "INFO", "console_output": True}
        
        # Setup logging
        setup_detailed_logging(logging_config)
        print("✅ Detailed logging setup complete")
        
        # Test logging functions
        log_step("TEST LOGGING", "Đang test hệ thống logging")
        log_api_call("test_api", {"test": "value"}, "success")
        log_file_operation("TEST", "test_file.txt", "Test file operation")
        
        print("✅ All logging functions tested successfully")
        
        # Check log files
        print("\n📁 Log files created:")
        for log_file in logs_dir.glob("*.log"):
            size = log_file.stat().st_size
            print(f"   📄 {log_file.name} ({size} bytes)")
        
        print("\n🎉 Logging system test completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_logging()
    if success:
        print("\n✅ Logging system is working correctly!")
    else:
        print("\n❌ Logging system has issues!")
    
    input("\nPress Enter to exit...")
