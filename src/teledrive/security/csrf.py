"""
CSRF Protection Module

This module provides Cross-Site Request Forgery (CSRF) protection for the TeleDrive application.
"""

from typing import List, Optional, Union
from flask import Flask, Blueprint
from flask_wtf.csrf import CSRFProtect

# Create CSRF protection instance
csrf = CSRFProtect()


def init_csrf(app: Flask) -> None:
    """
    Initialize CSRF protection for the Flask application.
    
    Args:
        app: Flask application instance
    """
    csrf.init_app(app)
    
    # Configure CSRF settings
    app.config['WTF_CSRF_TIME_LIMIT'] = 3600  # 1 hour
    app.config['WTF_CSRF_SSL_STRICT'] = True
    
    app.logger.info("CSRF protection initialized")


def exempt_blueprints(blueprints: List[Union[str, Blueprint]]) -> None:
    """
    Exempt blueprints from CSRF protection.
    Useful for API endpoints that use token authentication.
    
    Args:
        blueprints: List of blueprint names or Blueprint objects to exempt
    """
    for bp in blueprints:
        csrf.exempt(bp)


def exempt_views(view_names: List[str]) -> None:
    """
    Exempt specific views from CSRF protection.
    
    Args:
        view_names: List of view function names to exempt
    """
    for view_name in view_names:
        csrf.exempt(view_name)
