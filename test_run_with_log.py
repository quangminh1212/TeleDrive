#!/usr/bin/env python3
"""
Test chạy TeleDrive và ghi log ra file
"""

import sys
import os
import traceback
from datetime import datetime

def main():
    log_file = "test_run.log"
    
    try:
        with open(log_file, "w", encoding="utf-8") as f:
            f.write(f"=== TeleDrive Test Run - {datetime.now()} ===\n")
            f.write("1. Starting test...\n")
            f.flush()
            
            # Add src to path
            sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))
            f.write("2. Added src to path\n")
            f.flush()
            
            # Test imports
            f.write("3. Testing imports...\n")
            f.flush()
            
            try:
                from pathlib import Path
                f.write("   - pathlib: OK\n")
                
                import sqlite3
                f.write("   - sqlite3: OK\n")
                
                from flask import Flask
                f.write("   - flask: OK\n")
                
                from src.teledrive.database import db
                f.write("   - database: OK\n")
                
                from src.teledrive.auth import auth_manager
                f.write("   - auth: OK\n")
                
            except Exception as e:
                f.write(f"   - Import error: {e}\n")
                f.write(f"   - Traceback: {traceback.format_exc()}\n")
                return False
            
            # Test database creation
            f.write("4. Testing database...\n")
            f.flush()
            
            try:
                instance_dir = Path('instance')
                instance_dir.mkdir(exist_ok=True)
                db_path = instance_dir / 'teledrive.db'
                f.write(f"   - Database path: {db_path}\n")
                
                # Test SQLite connection
                conn = sqlite3.connect(str(db_path))
                cursor = conn.cursor()
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
                tables = cursor.fetchall()
                conn.close()
                f.write(f"   - Database tables: {len(tables)}\n")
                
            except Exception as e:
                f.write(f"   - Database error: {e}\n")
                f.write(f"   - Traceback: {traceback.format_exc()}\n")
                return False
            
            # Test app creation
            f.write("5. Testing app creation...\n")
            f.flush()
            
            try:
                app = Flask(__name__)
                app.config.update({
                    'SQLALCHEMY_DATABASE_URI': f'sqlite:///{db_path.resolve()}',
                    'SQLALCHEMY_TRACK_MODIFICATIONS': False,
                    'SECRET_KEY': 'test_secret',
                    'DEV_MODE': True
                })
                f.write("   - Flask app created: OK\n")
                
                # Test database init
                from src.teledrive.database import init_database
                init_database(app)
                f.write("   - Database initialized: OK\n")
                
                # Test auth init
                auth_manager.init_app(app)
                f.write("   - Auth initialized: OK\n")
                
            except Exception as e:
                f.write(f"   - App creation error: {e}\n")
                f.write(f"   - Traceback: {traceback.format_exc()}\n")
                return False
            
            # Try to import main app
            f.write("6. Testing main app import...\n")
            f.flush()
            
            try:
                from src.teledrive.app import app as main_app
                f.write("   - Main app imported: OK\n")
                
                # Test if app can start (without actually running)
                with main_app.app_context():
                    f.write("   - App context: OK\n")
                
            except Exception as e:
                f.write(f"   - Main app import error: {e}\n")
                f.write(f"   - Traceback: {traceback.format_exc()}\n")
                return False
            
            f.write("7. All tests passed!\n")
            f.write("=== Test completed successfully ===\n")
            return True
            
    except Exception as e:
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(f"FATAL ERROR: {e}\n")
            f.write(f"Traceback: {traceback.format_exc()}\n")
        return False

if __name__ == "__main__":
    success = main()
    print(f"Test {'PASSED' if success else 'FAILED'}")
    print("Check test_run.log for details")
    sys.exit(0 if success else 1)
