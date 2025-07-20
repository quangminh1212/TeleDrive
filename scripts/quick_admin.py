#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Quick script to create admin user
"""

import sys
import os

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

try:
    from flask import Flask
    from src.database import init_database, db
    from src.auth import auth_manager
    from src.auth.models import User
    
    # Create Flask app
    app = Flask(__name__)
    
    # Configure database
    basedir = os.path.abspath(os.path.dirname(__file__))
    basedir = os.path.dirname(basedir)  # Go up to TeleDrive directory
    instance_dir = os.path.join(basedir, 'instance')
    os.makedirs(instance_dir, exist_ok=True)
    db_path = os.path.join(instance_dir, 'teledrive.db')
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = 'teledrive-secret-key'
    
    # Initialize
    init_database(app)
    auth_manager.init_app(app)
    
    with app.app_context():
        print("Creating admin user...")
        
        # Check if admin exists
        admin_exists = User.query.filter_by(is_admin=True).first()
        if admin_exists:
            print(f"Admin user already exists: {admin_exists.username}")
            sys.exit(0)
        
        # Create admin user
        admin_user = User(
            username='admin',
            phone_number='+84936374950',
            email='admin@teledrive.com',
            is_admin=True,
            is_active=True
        )
        
        db.session.add(admin_user)
        db.session.commit()
        
        print("✅ Admin user created successfully!")
        print(f"Username: {admin_user.username}")
        print(f"Phone: {admin_user.phone_number}")
        print(f"Admin: {admin_user.is_admin}")
        
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
