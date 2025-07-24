"""
Security Middleware Module

This module provides security middleware for the TeleDrive application,
including secure HTTP headers, CSRF protection, and rate limiting.
"""

from typing import Dict, List
from flask import Flask, Response, request

from .csrf import init_csrf, csrf, exempt_blueprints
from .ratelimit import init_rate_limiting, limiter


def init_security_middleware(app: Flask) -> None:
    """
    Initialize all security middleware for the Flask application.
    
    Args:
        app: Flask application instance
    """
    # Initialize CSRF protection
    init_csrf(app)
    
    # Initialize rate limiting
    init_rate_limiting(app)
    
    # Setup secure headers
    setup_secure_headers(app)
    
    # Setup Content Security Policy
    setup_content_security_policy(app)
    
    # Exempt API endpoints from CSRF (they use token auth)
    exempt_blueprints(['api_bp', 'api'])
    
    app.logger.info("Security middleware initialized")


def setup_secure_headers(app: Flask) -> None:
    """
    Setup secure HTTP headers for the application.
    
    Args:
        app: Flask application instance
    """
    @app.after_request
    def add_secure_headers(response: Response) -> Response:
        """Add security headers to each response"""
        # Security headers
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        
        # Only add HSTS in production
        if not app.debug and not app.testing:
            response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
            
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response.headers['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()'
        
        return response


def setup_content_security_policy(app: Flask) -> None:
    """
    Setup Content Security Policy headers.
    
    Args:
        app: Flask application instance
    """
    @app.after_request
    def add_csp_headers(response: Response) -> Response:
        """Add Content-Security-Policy headers to each response"""
        # Content Security Policy
        csp = {
            'default-src': ["'self'"],
            'script-src': ["'self'"],
            'style-src': ["'self'"],
            'img-src': ["'self'", 'data:'],
            'font-src': ["'self'"],
            'connect-src': ["'self'"],
            'frame-ancestors': ["'none'"],
            'form-action': ["'self'"],
            'base-uri': ["'self'"],
            'object-src': ["'none'"]
        }
        
        # Add unsafe-inline in development for easier debugging
        if app.debug or app.testing:
            csp['script-src'].append("'unsafe-inline'")
            csp['style-src'].append("'unsafe-inline'")
            
        # Build CSP header
        csp_header = '; '.join([f"{k} {' '.join(v)}" for k, v in csp.items()])
        
        # Set CSP header
        response.headers['Content-Security-Policy'] = csp_header
        
        return response
