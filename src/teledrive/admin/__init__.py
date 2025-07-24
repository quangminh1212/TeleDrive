"""
Admin Blueprint

This module contains the admin routes for the TeleDrive application.
"""

from flask import Blueprint

admin_bp = Blueprint('admin', __name__)

from . import routes
from . import users
from . import system
from . import logs
from . import settings 