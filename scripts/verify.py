#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Migration script to add is_verified column to users table
"""

import sys
import os

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from teledrive.database import init_database, db
from flask import Flask

def migrate_database():
    """Add is_verified column to users table"""
    try:
        # Khởi tạo Flask app
        app = Flask(__name__)
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///teledrive.db'
        app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
        
        with app.app_context():
            init_database(app)
            
            # Check if column already exists
            try:
                db.engine.execute("SELECT is_verified FROM users LIMIT 1")
                print("✅ Column is_verified already exists")
                return
            except:
                print("📝 Adding is_verified column...")
            
            # Add is_verified column with default value True
            db.engine.execute("ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT 1")
            
            print("✅ Successfully added is_verified column to users table")
            print("   All existing users are set as verified by default")
            
    except Exception as e:
        print(f"❌ Error during migration: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    migrate_database()
