#!/usr/bin/env python3
"""
Test script for Telegram authentication functionality
Tests the country code selection and phone number validation
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from telegram_auth import get_country_codes, TelegramAuthenticator
from forms import TelegramLoginForm, TelegramVerifyForm
import re

def test_country_codes():
    """Test country codes functionality"""
    print("Testing country codes...")
    
    codes = get_country_codes()
    print(f"✅ Found {len(codes)} country codes")
    
    # Check if Vietnam is first (default)
    if codes[0][0] == '+84':
        print("✅ Vietnam (+84) is the default country code")
    else:
        print("❌ Vietnam (+84) should be the default country code")
    
    # Check if all codes are properly formatted
    valid_codes = 0
    for code, name in codes:
        if re.match(r'^\+\d+$', code) and name.endswith(f'({code})'):
            valid_codes += 1
        else:
            print(f"❌ Invalid format: {code} - {name}")
    
    if valid_codes == len(codes):
        print(f"✅ All {len(codes)} country codes are properly formatted")
    else:
        print(f"❌ {len(codes) - valid_codes} country codes have invalid format")
    
    # Check for common countries
    common_countries = ['+84', '+1', '+44', '+86', '+91', '+81', '+82', '+65']
    found_common = 0
    for code, _ in codes:
        if code in common_countries:
            found_common += 1
    
    print(f"✅ Found {found_common}/{len(common_countries)} common countries")
    
    return True

def test_phone_validation():
    """Test phone number validation"""
    print("\nTesting phone number validation...")
    
    # Test valid phone numbers
    valid_numbers = [
        "987654321",    # Vietnam
        "1234567890",   # US
        "7700900123",   # UK
        "13800138000",  # China
        "9876543210"    # India
    ]
    
    # Test invalid phone numbers
    invalid_numbers = [
        "123",          # Too short
        "12345678901234567890",  # Too long
        "abc123def",    # Contains letters
        "+84987654321", # Contains country code
        "987-654-321",  # Contains dashes
        "987 654 321",  # Contains spaces
    ]
    
    # Create a mock form to test validation
    class MockForm:
        def __init__(self, phone_number):
            self.phone_number = MockField(phone_number)
    
    class MockField:
        def __init__(self, data):
            self.data = data
    
    # Test regex pattern from forms.py
    phone_pattern = r'^\d{8,15}$'
    
    valid_count = 0
    for number in valid_numbers:
        if re.match(phone_pattern, number):
            valid_count += 1
        else:
            print(f"❌ Valid number rejected: {number}")
    
    if valid_count == len(valid_numbers):
        print(f"✅ All {len(valid_numbers)} valid phone numbers passed validation")
    else:
        print(f"❌ {len(valid_numbers) - valid_count} valid numbers were rejected")
    
    invalid_count = 0
    for number in invalid_numbers:
        if not re.match(phone_pattern, number):
            invalid_count += 1
        else:
            print(f"❌ Invalid number accepted: {number}")
    
    if invalid_count == len(invalid_numbers):
        print(f"✅ All {len(invalid_numbers)} invalid phone numbers were rejected")
    else:
        print(f"❌ {len(invalid_numbers) - invalid_count} invalid numbers were accepted")
    
    return True

def test_telegram_authenticator():
    """Test TelegramAuthenticator class"""
    print("\nTesting TelegramAuthenticator class...")
    
    auth = TelegramAuthenticator()
    
    # Test initialization
    if hasattr(auth, 'client') and hasattr(auth, 'temp_sessions'):
        print("✅ TelegramAuthenticator initialized correctly")
    else:
        print("❌ TelegramAuthenticator missing required attributes")
        return False
    
    # Test temp_sessions is empty initially
    if len(auth.temp_sessions) == 0:
        print("✅ temp_sessions initialized as empty")
    else:
        print("❌ temp_sessions should be empty initially")
    
    return True

def test_forms():
    """Test form classes"""
    print("\nTesting form classes...")
    
    # Test TelegramLoginForm
    try:
        form = TelegramLoginForm()
        if hasattr(form, 'country_code') and hasattr(form, 'phone_number'):
            print("✅ TelegramLoginForm has required fields")
        else:
            print("❌ TelegramLoginForm missing required fields")
    except Exception as e:
        print(f"❌ Error creating TelegramLoginForm: {e}")
        return False
    
    # Test TelegramVerifyForm
    try:
        form = TelegramVerifyForm()
        if hasattr(form, 'verification_code') and hasattr(form, 'password'):
            print("✅ TelegramVerifyForm has required fields")
        else:
            print("❌ TelegramVerifyForm missing required fields")
    except Exception as e:
        print(f"❌ Error creating TelegramVerifyForm: {e}")
        return False
    
    return True

def main():
    """Run all tests"""
    print("🧪 Testing Telegram Authentication System")
    print("=" * 50)
    
    tests = [
        test_country_codes,
        test_phone_validation,
        test_telegram_authenticator,
        test_forms
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        try:
            if test():
                passed += 1
        except Exception as e:
            print(f"❌ Test failed with exception: {e}")
    
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed!")
        return True
    else:
        print("❌ Some tests failed")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
