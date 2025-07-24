"""
Authentication Routes

This module contains the authentication routes for the TeleDrive application.
"""

from flask import Blueprint

auth_bp = Blueprint('auth', __name__)

from . import login
from . import register
from . import profile 