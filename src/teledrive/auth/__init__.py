"""
Authentication Module

This module handles user authentication for the TeleDrive application.
"""

from flask_login import LoginManager

# Authentication manager
auth_manager = LoginManager()
auth_manager.login_view = 'auth.login'
auth_manager.login_message = 'Vui lòng đăng nhập để truy cập trang này.'
auth_manager.login_message_category = 'info'

# Import models and load user
from .models import User

# Import blueprint
try:
    from .routes import auth_bp
except ImportError:
    # Create a dummy blueprint if routes are not available
    from flask import Blueprint
    auth_bp = Blueprint('auth', __name__)

@auth_manager.user_loader
def load_user(user_id):
    """Load user by ID for Flask-Login."""
    return User.query.get(int(user_id))
