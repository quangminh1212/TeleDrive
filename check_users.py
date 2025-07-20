#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Check users in database
"""

import sys
import os

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from flask import Flask
from src.auth import auth_manager
from src.database import db

def check_users():
    """Check users in database"""
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///instance/teledrive.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = 'dev-secret-key'
    
    # Initialize database and auth
    db.init_app(app)
    auth_manager.init_app(app)
    
    with app.app_context():
        try:
            # Check if has admin user
            has_admin = auth_manager.has_admin_user()
            print(f"Has admin user: {has_admin}")
            
            # Get all users
            users = auth_manager.get_all_users()
            print(f"Total users: {len(users)}")
            
            for user in users:
                status = "👑 Admin" if user.is_admin else "👤 User"
                active = "✅ Active" if user.is_active else "❌ Inactive"
                print(f"   {status} - {user.username} ({user.phone_number}) - {active}")
                
        except Exception as e:
            print(f"Error: {e}")

if __name__ == '__main__':
    check_users()
