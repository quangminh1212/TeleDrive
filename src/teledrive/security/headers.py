"""
Security Headers

This module provides functions to configure security headers for the Flask application.
"""

from flask import Flask, Response


def init_security_headers(app: Flask) -> None:
    """
    Initialize security headers for the Flask application.
    
    Args:
        app: Flask application instance
    """
    @app.after_request
    def set_security_headers(response: Response) -> Response:
        """
        Set security headers for each response.
        
        Args:
            response: Flask response object
            
        Returns:
            Response: Response with security headers
        """
        # Prevent content-type sniffing
        response.headers['X-Content-Type-Options'] = 'nosniff'
        
        # Enable XSS protection
        response.headers['X-XSS-Protection'] = '1; mode=block'
        
        # Prevent clickjacking
        response.headers['X-Frame-Options'] = 'SAMEORIGIN'
        
        # Content-Security-Policy
        response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;"
        
        # Referrer Policy
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        # Permissions Policy
        response.headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'
        
        # HTTP Strict Transport Security (only in production)
        if not app.debug and not app.testing:
            response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        
        return response
