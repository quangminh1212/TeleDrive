#!/usr/bin/env python3
"""
Simple server for TeleDrive
"""

import os
import sys
from pathlib import Path
import sqlite3

# Thêm thư mục src vào Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

# Tắt logging
import logging
logging.disable(logging.CRITICAL)

# Tắt warnings
import warnings
warnings.filterwarnings("ignore")

def setup_database():
    """Setup database"""
    print("Setting up database...")
    
    # Tạo thư mục instance
    instance_dir = Path('instance')
    instance_dir.mkdir(exist_ok=True)
    db_path = instance_dir / 'teledrive.db'
    
    # Tạo database nếu chưa có
    if not db_path.exists():
        print(f"Creating database: {db_path}")
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        # Tạo tables
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username VARCHAR(80) UNIQUE NOT NULL,
                phone_number VARCHAR(20) UNIQUE NOT NULL,
                email VARCHAR(120) UNIQUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login DATETIME,
                is_active BOOLEAN DEFAULT 1,
                is_admin BOOLEAN DEFAULT 0,
                is_verified BOOLEAN DEFAULT 1
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS otp_codes (
                id INTEGER PRIMARY KEY,
                phone_number VARCHAR(20) NOT NULL,
                code VARCHAR(6) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME NOT NULL,
                is_used BOOLEAN DEFAULT 0,
                attempts INTEGER DEFAULT 0
            )
        ''')
        
        conn.commit()
        conn.close()
        print("Database created successfully")
    else:
        print(f"Database already exists: {db_path}")
    
    return db_path

def create_app(db_path):
    """Create Flask app"""
    print("Creating Flask app...")
    
    from flask import Flask
    
    # Tạo app
    app = Flask(__name__)
    
    # Cấu hình
    app.config.update({
        'SQLALCHEMY_DATABASE_URI': f'sqlite:///{db_path.resolve()}',
        'SQLALCHEMY_TRACK_MODIFICATIONS': False,
        'SECRET_KEY': 'dev_secret_key',
        'DEV_MODE': True
    })
    
    # Init database
    from src.teledrive.database import db, init_database
    init_database(app)
    
    # Init auth
    from src.teledrive.auth import auth_manager
    auth_manager.init_app(app)
    
    # Tạo route đơn giản
    @app.route('/hello')
    def hello():
        return 'Hello from TeleDrive!'
    
    # Import routes từ app.py
    try:
        from src.teledrive.app import routes
    except Exception as e:
        print(f"Error importing routes: {e}")
    
    return app

def main():
    """Main function"""
    try:
        print("Starting simple server...")
        
        # Setup database
        db_path = setup_database()
        
        # Create app
        app = create_app(db_path)
        
        # Run app
        print("Starting server at http://localhost:5000")
        print("Press Ctrl+C to stop")
        
        app.run(
            host='0.0.0.0',
            port=5000,
            debug=False,
            threaded=True,
            use_reloader=False
        )
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

if __name__ == '__main__':
    main()
