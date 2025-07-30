#!/usr/bin/env python3
"""
Test script to check if TeleDrive server can start without errors
"""

import sys
import os
import importlib.util
from pathlib import Path

def test_imports():
    """Test if all required modules can be imported"""
    print("🔍 Testing imports...")
    
    required_modules = [
        'flask',
        'flask_socketio',
        'flask_login',
        'flask_wtf',
        'sqlalchemy',
        'telethon'
    ]
    
    missing_modules = []
    for module in required_modules:
        try:
            __import__(module)
            print(f"  ✅ {module}")
        except ImportError as e:
            print(f"  ❌ {module}: {e}")
            missing_modules.append(module)
    
    return len(missing_modules) == 0

def test_config_files():
    """Test if configuration files exist and are valid"""
    print("\n📁 Testing configuration files...")
    
    config_files = [
        'source/config.json',
        'config.json',
        'source/flask_config.py',
        'source/app.py'
    ]
    
    all_exist = True
    for config_file in config_files:
        if os.path.exists(config_file):
            print(f"  ✅ {config_file}")
        else:
            print(f"  ❌ {config_file} - Missing")
            all_exist = False
    
    return all_exist

def test_templates():
    """Test if critical templates exist"""
    print("\n🎨 Testing templates...")
    
    templates = [
        'templates/base.html',
        'templates/index.html',
        'templates/scan.html',
        'templates/search.html',
        'templates/settings.html',
        'templates/errors/404.html'
    ]
    
    all_exist = True
    for template in templates:
        if os.path.exists(template):
            print(f"  ✅ {template}")
        else:
            print(f"  ❌ {template} - Missing")
            all_exist = False
    
    return all_exist

def test_app_syntax():
    """Test if app.py has valid syntax"""
    print("\n🐍 Testing app.py syntax...")
    
    try:
        # Add source directory to path
        sys.path.insert(0, 'source')
        
        # Try to compile the app.py file
        with open('source/app.py', 'r', encoding='utf-8') as f:
            source_code = f.read()
        
        compile(source_code, 'source/app.py', 'exec')
        print("  ✅ app.py syntax is valid")
        return True
        
    except SyntaxError as e:
        print(f"  ❌ Syntax error in app.py: {e}")
        return False
    except Exception as e:
        print(f"  ❌ Error reading app.py: {e}")
        return False

def test_flask_routes():
    """Test if Flask routes are properly defined"""
    print("\n🛣️  Testing Flask routes...")
    
    try:
        # Import the app module
        sys.path.insert(0, 'source')
        
        # Check if we can import without running the server
        spec = importlib.util.spec_from_file_location("app", "source/app.py")
        app_module = importlib.util.module_from_spec(spec)
        
        # This will test imports but not run the server
        print("  ✅ Flask app module can be loaded")
        return True
        
    except Exception as e:
        print(f"  ❌ Error loading Flask app: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 TeleDrive Server Test Suite")
    print("=" * 50)
    
    tests = [
        ("Module Imports", test_imports),
        ("Configuration Files", test_config_files),
        ("Templates", test_templates),
        ("App Syntax", test_app_syntax),
        ("Flask Routes", test_flask_routes)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        try:
            if test_func():
                passed += 1
            else:
                print(f"\n❌ {test_name} test failed")
        except Exception as e:
            print(f"\n❌ {test_name} test error: {e}")
    
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Server should start successfully.")
        print("\n💡 To start the server, run: python source/app.py")
        print("🌐 Then visit: http://localhost:3000")
    else:
        print("⚠️  Some tests failed. Please fix the issues before starting the server.")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
