#!/usr/bin/env python3
"""
Test script cho detailed logging system
"""

import json
from logger import setup_detailed_logging, log_step, log_config_change, log_api_call, log_file_operation, log_progress, log_error

def test_logging():
    """Test tất cả chức năng logging"""
    
    # Load config
    with open('config.json', 'r', encoding='utf-8') as f:
        config = json.load(f)
    
    # Setup logging
    logging_config = config.get('logging', {})
    detailed_logger = setup_detailed_logging(logging_config)
    
    print("🧪 Testing Detailed Logging System...")
    
    # Test log_step
    log_step("TEST KHỞI ĐẦU", "Bắt đầu test logging system")
    log_step("TEST CẢNH BÁO", "Đây là test warning", "WARNING")
    log_step("TEST LỖI", "Đây là test error", "ERROR")
    
    # Test log_config_change
    log_config_change("UPDATE", {
        "path": "test.setting",
        "old_value": "old",
        "new_value": "new"
    })
    
    # Test log_api_call
    log_api_call("test_api_method", {"param1": "value1", "param2": "value2"}, "success")
    
    # Test log_file_operation
    log_file_operation("CREATE", "test_file.txt", "Test file creation")
    log_file_operation("READ", "config.json", "Reading configuration")
    log_file_operation("WRITE", "output/test.csv", "Writing test data")
    
    # Test log_progress
    for i in range(1, 6):
        log_progress(i, 5, "test items")
    
    # Test log_error
    try:
        raise ValueError("This is a test error")
    except Exception as e:
        log_error(e, "Testing error logging")
    
    log_step("TEST HOÀN THÀNH", "Đã test thành công tất cả chức năng logging")
    
    print("✅ Test hoàn thành! Kiểm tra các file log trong thư mục logs/")

if __name__ == "__main__":
    test_logging()
