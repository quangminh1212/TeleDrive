#!/usr/bin/env python3
"""Test login functionality"""

from models import User
from app import app

with app.app_context():
    user = User.query.filter_by(username='admin').first()
    print('User found:', user is not None)
    if user:
        print('Username:', user.username)
        print('Email:', user.email)
        print('Role:', user.role)
        print('Password check for admin123:', user.check_password('admin123'))
        print('Password check for admin:', user.check_password('admin'))
