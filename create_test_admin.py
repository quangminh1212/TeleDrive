#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Create test admin user
"""

import sys
import os

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from flask import Flask
from src.auth import auth_manager
from src.database import db

def create_test_admin():
    """Create test admin user"""
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///instance/teledrive.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = 'dev-secret-key'
    
    # Initialize database and auth
    db.init_app(app)
    auth_manager.init_app(app)
    
    with app.app_context():
        try:
            # Create tables if not exist
            db.create_all()
            
            # Check if admin already exists
            existing_user = auth_manager.find_user_by_phone('+84936374950')
            if existing_user:
                print(f"User already exists: {existing_user.username} (Admin: {existing_user.is_admin})")
                if not existing_user.is_admin:
                    # Make user admin
                    existing_user.is_admin = True
                    db.session.commit()
                    print("Made user admin")
                return True
            
            # Create new admin user
            success, message = auth_manager.create_user(
                username='admin',
                phone_number='+84936374950',
                email='admin@test.com',
                is_admin=True
            )
            
            if success:
                print(f"✅ Created admin user successfully")
                return True
            else:
                print(f"❌ Failed to create admin: {message}")
                return False
                
        except Exception as e:
            print(f"Error: {e}")
            return False

if __name__ == '__main__':
    create_test_admin()
