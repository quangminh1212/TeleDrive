#!/usr/bin/env python3
"""
Test script to check if all imports work correctly after cleanup
"""

import sys
import os

# Add source to path
sys.path.insert(0, 'source')

print("🧪 Testing TeleDrive imports after cleanup...")
print("=" * 50)

try:
    print("1. Testing basic Python modules...")
    import json
    import pathlib
    print("   ✅ Basic modules OK")
    
    print("2. Testing Flask modules...")
    import flask
    import flask_socketio
    import flask_login
    import flask_wtf
    print("   ✅ Flask modules OK")
    
    print("3. Testing database modules...")
    import sqlalchemy
    import flask_sqlalchemy
    print("   ✅ Database modules OK")
    
    print("4. Testing Telegram modules...")
    import telethon
    print("   ✅ Telegram modules OK")
    
    print("5. Testing TeleDrive config...")
    import flask_config
    print("   ✅ flask_config imported")
    
    # Test config loading
    config = flask_config.flask_config
    print(f"   ✅ Config loaded: {type(config)}")
    
    print("6. Testing TeleDrive app modules...")
    # Test individual modules
    import database
    print("   ✅ database module OK")
    
    import models
    print("   ✅ models module OK")
    
    import forms
    print("   ✅ forms module OK")
    
    import auth
    print("   ✅ auth module OK")
    
    print("7. Testing main app import...")
    import app
    print("   ✅ app module imported")
    
    print("\n🎉 ALL IMPORTS SUCCESSFUL!")
    print("✅ TeleDrive should work correctly after cleanup")
    
except ImportError as e:
    print(f"❌ Import Error: {e}")
    print("🔧 You may need to install missing dependencies:")
    print("   pip install -r requirements.txt")
    sys.exit(1)
    
except Exception as e:
    print(f"❌ Unexpected Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n" + "=" * 50)
print("🧪 Import test completed successfully!")
