"""
Authentication Routes

This module contains the authentication routes for the TeleDrive application.
"""

from flask import Blueprint

auth_bp = Blueprint('auth', __name__)

from . import login
# from . import register  # Commented out as this module doesn't exist
# from . import profile  # Commented out as this module doesn't exist 