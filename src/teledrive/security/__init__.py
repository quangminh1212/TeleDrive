"""Security module for TeleDrive application.

This module provides security middleware, CSRF protection, secure headers,
and other security features for the TeleDrive application.
"""

from flask import Flask
from typing import Optional


def init_security_middleware(app: Flask) -> None:
    """Initialize security middleware for the Flask application.
    
    Args:
        app: The Flask application instance
    """
    from .headers import init_security_headers
    from .csrf import init_csrf_protection
    from .middleware import init_security_middleware_chain
    
    # Initialize security headers (HSTS, CSP, etc.)
    init_security_headers(app)
    
    # Initialize CSRF protection
    init_csrf_protection(app)
    
    # Initialize security middleware chain
    init_security_middleware_chain(app)
    
    # Log security initialization
    app.logger.info("Security middleware initialized")


def init_security_headers(app: Flask) -> None:
    """Initialize security headers for the Flask application.
    
    Adds secure headers like Content-Security-Policy, X-Content-Type-Options,
    X-Frame-Options, etc. to protect against common web vulnerabilities.
    
    Args:
        app: The Flask application instance
    """
    @app.after_request
    def add_security_headers(response):
        # Content Security Policy
        csp = {
            'default-src': ["'self'"],
            'script-src': ["'self'", "'unsafe-inline'"],  # Consider removing unsafe-inline in production
            'style-src': ["'self'", "'unsafe-inline'"],
            'img-src': ["'self'", 'data:'],
            'font-src': ["'self'", 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'],
            'connect-src': ["'self'"],
            'frame-ancestors': ["'none'"],
            'form-action': ["'self'"],
            'base-uri': ["'self'"],
            'object-src': ["'none'"]
        }
        
        # Build CSP header
        csp_header = '; '.join([f"{k} {' '.join(v)}" for k, v in csp.items()])
        
        # Set security headers
        response.headers['Content-Security-Policy'] = csp_header
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response.headers['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()'
        
        return response


def init_csrf_protection(app: Flask) -> None:
    """Initialize CSRF protection for the Flask application.
    
    Args:
        app: The Flask application instance
    """
    try:
        from flask_wtf.csrf import CSRFProtect
        
        csrf = CSRFProtect()
        csrf.init_app(app)
        
        # Exempt API routes from CSRF protection if they use token auth
        csrf.exempt('api.token_auth')
        
    except ImportError:
        app.logger.warning("flask_wtf not installed, CSRF protection not enabled")


__all__ = [
    'init_security_middleware',
    'init_security_headers',
    'init_csrf_protection'
]
