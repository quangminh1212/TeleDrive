#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
User Model for TeleDrive Authentication
"""

from datetime import datetime
from flask_login import UserMixin

# Import database chung
from ..database import db

class User(UserMixin, db.Model):
    """User model cho hệ thống xác thực"""
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    phone_number = db.Column(db.String(20), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=True, index=True)  # Optional now
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    is_active = db.Column(db.Boolean, default=True)
    is_admin = db.Column(db.Boolean, default=False)

    def __init__(self, username, phone_number, email=None, is_admin=False):
        self.username = username
        self.phone_number = phone_number
        self.email = email
        self.is_admin = is_admin

    def update_last_login(self):
        """Cập nhật thời gian đăng nhập cuối"""
        self.last_login = datetime.utcnow()
        db.session.commit()

    def to_dict(self):
        """Chuyển đổi user thành dictionary"""
        return {
            'id': self.id,
            'username': self.username,
            'phone_number': self.phone_number,
            'email': self.email,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'is_active': self.is_active,
            'is_admin': self.is_admin
        }

    def __repr__(self):
        return f'<User {self.username}>'
