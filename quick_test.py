#!/usr/bin/env python3
"""
Quick test để kiểm tra TeleDrive có chạy được không
"""

import sys
import os
from pathlib import Path

def test_database():
    """Test database"""
    print("1. Testing database...")
    
    try:
        # Tạo thư mục instance
        instance_dir = Path('instance')
        instance_dir.mkdir(exist_ok=True)
        db_path = instance_dir / 'teledrive.db'
        
        # Test SQLite
        import sqlite3
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        conn.close()
        
        print(f"   ✅ Database OK: {len(tables)} tables")
        return True
        
    except Exception as e:
        print(f"   ❌ Database Error: {e}")
        return False

def test_imports():
    """Test imports"""
    print("2. Testing imports...")
    
    try:
        # Add src to path
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))
        
        # Test basic imports
        from flask import Flask
        from src.teledrive.database import db
        from src.teledrive.auth import auth_manager
        
        print("   ✅ Imports OK")
        return True
        
    except Exception as e:
        print(f"   ❌ Import Error: {e}")
        return False

def test_app_creation():
    """Test app creation"""
    print("3. Testing app creation...")
    
    try:
        from flask import Flask
        
        # Create app
        app = Flask(__name__)
        
        # Configure database
        project_root = Path(__file__).parent
        instance_dir = project_root / 'instance'
        db_path = instance_dir / 'teledrive.db'
        
        app.config.update({
            'SQLALCHEMY_DATABASE_URI': f'sqlite:///{db_path.resolve()}',
            'SQLALCHEMY_TRACK_MODIFICATIONS': False,
            'SECRET_KEY': 'test_secret',
            'DEV_MODE': True
        })
        
        print("   ✅ App creation OK")
        return True
        
    except Exception as e:
        print(f"   ❌ App creation Error: {e}")
        return False

def main():
    """Main test function"""
    print("🧪 TeleDrive Quick Test")
    print("=" * 30)
    
    tests = [
        test_database,
        test_imports,
        test_app_creation
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
        print()
    
    print("=" * 30)
    print(f"📊 Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! TeleDrive should work.")
        print("💡 Try running: python main.py")
    else:
        print("❌ Some tests failed. Check errors above.")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
