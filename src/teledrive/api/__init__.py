"""
API Blueprint

This module contains the API routes for the TeleDrive application.
"""

from flask import Blueprint

api_bp = Blueprint('api', __name__)

from . import routes
from . import files
# from . import sessions  # Commented out as this module doesn't exist
# from . import search  # Commented out as this module doesn't exist
# from . import system  # Commented out as this module doesn't exist 