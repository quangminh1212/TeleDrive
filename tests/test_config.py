#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test Configuration
Kiểm tra cấu hình environment variables
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_config():
    """Test cấu hình"""
    print("🔍 Kiểm tra cấu hình environment variables...")
    print("=" * 50)
    
    # Test SECRET_KEY
    secret_key = os.getenv('SECRET_KEY')
    print(f"SECRET_KEY: {'✅ Set' if secret_key else '❌ Not set'}")
    if secret_key:
        print(f"   Value: {secret_key[:20]}...")
    
    # Test DEBUG
    debug = os.getenv('DEBUG', 'false').lower() == 'true'
    print(f"DEBUG: {'✅' if not debug else '⚠️'} {debug}")
    
    # Test ENVIRONMENT
    environment = os.getenv('ENVIRONMENT', 'development')
    print(f"ENVIRONMENT: ✅ {environment}")
    
    # Test Telegram config
    api_id = os.getenv('TELEGRAM_API_ID')
    api_hash = os.getenv('TELEGRAM_API_HASH')
    phone = os.getenv('TELEGRAM_PHONE')
    
    print(f"TELEGRAM_API_ID: {'✅ Set' if api_id else '❌ Not set'}")
    print(f"TELEGRAM_API_HASH: {'✅ Set' if api_hash else '❌ Not set'}")
    print(f"TELEGRAM_PHONE: {'✅ Set' if phone else '❌ Not set'}")
    
    print("=" * 50)
    
    # Test production config
    try:
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))
        from src.config import config
        
        print("🚀 Test production config...")
        print(f"Environment: {config.environment}")
        print(f"Debug: {config.debug}")
        print(f"Secret Key: {'Set' if config.security.secret_key else 'Not set'}")
        print(f"Database URI: {config.database.uri}")
        print(f"Server Host: {config.server.host}")
        print(f"Server Port: {config.server.port}")
        
        print("✅ Cấu hình production hoạt động tốt!")
        
    except Exception as e:
        print(f"❌ Lỗi cấu hình production: {e}")
        assert False, f"Lỗi cấu hình production: {e}"

    assert True, "Cấu hình hoạt động tốt"

if __name__ == '__main__':
    success = test_config()
    sys.exit(0 if success else 1)
