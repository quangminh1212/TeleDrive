#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test script cho cấu trúc mới
"""

import sys
import os

# Thêm thư mục gốc vào Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

def test_imports():
    """Test các import từ cấu trúc mới"""
    print("🧪 Testing imports...")
    
    try:
        # Test database import
        from src.database import db, init_database
        print("✅ Database import successful")

        # Test auth imports
        from src.auth import auth_manager, User, validate_username, validate_email
        print("✅ Auth imports successful")
        
        # Test models imports
        from src.models import OTPManager, format_phone_number, validate_phone_number
        print("✅ Models imports successful")
        
        # Test services imports
        from src.services import send_otp_sync, TelegramOTPService
        print("✅ Services imports successful")
        
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def test_phone_validation():
    """Test phone number validation"""
    print("\n📱 Testing phone validation...")
    
    try:
        from src.models import validate_phone_number, format_phone_number
        
        test_cases = [
            ("0936374950", True),
            ("+84936374950", True),
            ("84936374950", True),
            ("123", False),
            ("", False),
            ("abcd", False)
        ]
        
        for phone, expected in test_cases:
            is_valid, result = validate_phone_number(phone)
            if is_valid == expected:
                print(f"✅ {phone} -> {result}")
            else:
                print(f"❌ {phone} -> Expected {expected}, got {is_valid}")
        
        return True
        
    except Exception as e:
        print(f"❌ Phone validation error: {e}")
        return False

def test_otp_manager():
    """Test OTP Manager"""
    print("\n🔐 Testing OTP Manager...")
    
    try:
        from src.models import OTPManager
        
        # Test OTP generation
        code = OTPManager.generate_otp_code()
        if len(code) == 6 and code.isdigit():
            print(f"✅ OTP generation: {code}")
        else:
            print(f"❌ Invalid OTP: {code}")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ OTP Manager error: {e}")
        return False

def test_database_setup():
    """Test database setup"""
    print("\n🗄️ Testing database setup...")
    
    try:
        from flask import Flask
        from src.database import db, init_database
        from src.auth import auth_manager, User
        
        app = Flask(__name__)
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        app.config['SECRET_KEY'] = 'test-key'

        init_database(app)
        auth_manager.init_app(app)
        
        with app.app_context():
            db.create_all()
            print("✅ Database tables created")
            
            # Test tạo user
            user = User(
                username="testuser",
                phone_number="+84936374950",
                email="test@example.com"
            )
            db.session.add(user)
            db.session.commit()
            print("✅ User created successfully")
            
            # Test query user
            found_user = User.query.filter_by(phone_number="+84936374950").first()
            if found_user and found_user.username == "testuser":
                print("✅ User query successful")
            else:
                print("❌ User query failed")
                return False
        
        return True
        
    except Exception as e:
        print(f"❌ Database setup error: {e}")
        return False

def main():
    """Main test function"""
    print("🚀 Testing new project structure...")
    print("=" * 50)
    
    tests = [
        test_imports,
        test_phone_validation,
        test_otp_manager,
        test_database_setup
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
        print()
    
    print("=" * 50)
    print(f"📊 Test Results: {passed}/{total} passed")
    
    if passed == total:
        print("🎉 All tests passed! New structure is working correctly.")
        return True
    else:
        print("❌ Some tests failed. Please check the issues above.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
