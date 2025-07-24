"""
API Blueprint

This module contains the API routes for the TeleDrive application.
"""

from flask import Blueprint

api_bp = Blueprint('api', __name__)

from . import routes
from . import files
from . import sessions
from . import search
from . import system 