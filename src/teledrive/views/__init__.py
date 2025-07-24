"""
Views Blueprint

This module contains the main view routes for the TeleDrive application.
"""

from flask import Blueprint

views_bp = Blueprint('views', __name__)

from . import routes 