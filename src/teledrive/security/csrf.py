#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CSRF Protection
Implements Cross-Site Request Forgery protection
"""

from flask import Flask, request, session, abort, g
import secrets
import hmac
import hashlib
from functools import wraps
from typing import Optional


class CSRFProtection:
    """CSRF protection middleware for Flask applications"""
    
    def __init__(self, app: Flask = None):
        self.app = app
        self.secret_key = None
        if app is not None:
            self.init_app(app)
    
    def init_app(self, app: Flask):
        """Initialize CSRF protection for Flask app"""
        self.secret_key = app.config.get('SECRET_KEY', 'dev-secret-key')
        app.before_request(self.before_request)
        
        # Add template global for CSRF token
        app.jinja_env.globals['csrf_token'] = self.generate_csrf_token
    
    def before_request(self):
        """Generate CSRF token for each request"""
        if 'csrf_token' not in session:
            session['csrf_token'] = secrets.token_urlsafe(32)
        
        g.csrf_token = session['csrf_token']
    
    def generate_csrf_token(self) -> str:
        """Generate CSRF token for templates"""
        return getattr(g, 'csrf_token', session.get('csrf_token', ''))
    
    def validate_csrf_token(self, token: Optional[str] = None) -> bool:
        """Validate CSRF token"""
        if token is None:
            # Try to get token from form data or headers
            token = request.form.get('csrf_token') or request.headers.get('X-CSRF-Token')
        
        if not token:
            return False
        
        session_token = session.get('csrf_token')
        if not session_token:
            return False
        
        # Use constant-time comparison to prevent timing attacks
        return hmac.compare_digest(token, session_token)
    
    def protect(self, f):
        """Decorator to protect routes with CSRF validation"""
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if request.method in ['POST', 'PUT', 'DELETE', 'PATCH']:
                if not self.validate_csrf_token():
                    abort(403, description="CSRF token validation failed")
            return f(*args, **kwargs)
        return decorated_function


# Global CSRF protection instance
csrf = CSRFProtection()


def csrf_protect(f):
    """Decorator for CSRF protection"""
    return csrf.protect(f)


def init_csrf_protection(app: Flask):
    """Initialize CSRF protection"""
    csrf.init_app(app)
