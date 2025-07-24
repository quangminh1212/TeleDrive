"""
Admin Blueprint

This module contains the admin routes for the TeleDrive application.
"""

from flask import Blueprint

admin_bp = Blueprint('admin', __name__)

from . import routes
# from . import users  # Commented out as this module doesn't exist
# from . import system  # Commented out as this module doesn't exist
# from . import logs  # Commented out as this module doesn't exist
# from . import settings  # Commented out as this module doesn't exist 