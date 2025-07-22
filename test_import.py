#!/usr/bin/env python3
"""
Test import app
"""

import sys
import os

# Thêm thư mục src vào Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

print("1. Starting import test...")

try:
    print("2. Importing database...")
    from src.teledrive.database import db
    print("   ✅ Database imported")
    
    print("3. Importing auth...")
    from src.teledrive.auth import auth_manager
    print("   ✅ Auth imported")
    
    print("4. Importing Flask...")
    from flask import Flask
    print("   ✅ Flask imported")
    
    print("5. Creating Flask app...")
    app = Flask(__name__)
    print("   ✅ Flask app created")
    
    print("6. Setting database config...")
    from pathlib import Path

    # Tạo đường dẫn absolute cho database
    project_root = Path(__file__).parent
    instance_dir = project_root / 'instance'
    instance_dir.mkdir(exist_ok=True)
    db_path = instance_dir / 'teledrive.db'

    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = 'test_secret'
    print(f"   ✅ Config set: {db_path}")
    print(f"   📁 Database path: {db_path.absolute()}")
    
    print("7. Initializing database...")
    from src.teledrive.database import init_database
    init_database(app)
    print("   ✅ Database initialized")
    
    print("8. Initializing auth...")
    auth_manager.init_app(app)
    print("   ✅ Auth initialized")
    
    print("✅ All imports successful!")
    
except Exception as e:
    print(f"❌ Import failed: {e}")
    import traceback
    traceback.print_exc()
