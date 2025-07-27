"""
User Model

Database model for users in TeleDrive.
"""

from datetime import datetime
from typing import Optional
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

from ..database import db


class User(db.Model, UserMixin):
    """
    User model for TeleDrive authentication and authorization.
    """
    __tablename__ = 'users'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    phone_number = db.Column(db.String(20), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=True)
    password_hash = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime, nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    is_admin = db.Column(db.Boolean, default=False)
    is_verified = db.Column(db.Boolean, default=True)
    
    def __init__(self, username: str, phone_number: str, email: Optional[str] = None, 
                 is_admin: bool = False, is_active: bool = True, is_verified: bool = True):
        """
        Initialize a new user.
        
        Args:
            username: Username
            phone_number: User's phone number
            email: User's email address (optional)
            is_admin: Whether the user is an admin
            is_active: Whether the user account is active
            is_verified: Whether the user is verified
        """
        self.username = username
        self.phone_number = phone_number
        self.email = email
        self.is_admin = is_admin
        self.is_active = is_active
        self.is_verified = is_verified
    
    def set_password(self, password: str) -> None:
        """
        Set user password.
        
        Args:
            password: Plain text password to hash and store
        """
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password: str) -> bool:
        """
        Check if password is correct.
        
        Args:
            password: Plain text password to check
            
        Returns:
            bool: True if password matches, False otherwise
        """
        if self.password_hash is None:
            return False
        return check_password_hash(self.password_hash, password)
    
    def update_last_login(self) -> None:
        """
        Update the last login timestamp to the current time.
        """
        self.last_login = datetime.utcnow()
        db.session.commit()
    
    def to_dict(self) -> dict:
        """
        Convert user object to dictionary.
        
        Returns:
            dict: Dictionary representation of the user
        """
        return {
            'id': self.id,
            'username': self.username,
            'phone_number': self.phone_number,
            'email': self.email,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'is_active': self.is_active,
            'is_admin': self.is_admin,
            'is_verified': self.is_verified
        }
    
    def __repr__(self) -> str:
        """
        String representation of the user.
        
        Returns:
            str: String representation
        """
        return f'<User {self.username}>' 