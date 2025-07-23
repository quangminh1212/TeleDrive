#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Security Headers Middleware
Implements OWASP security headers and best practices
"""

from flask import Flask, request, g
import secrets
import hashlib


class SecurityHeaders:
    """Security headers middleware for Flask applications"""
    
    def __init__(self, app: Flask = None):
        self.app = app
        if app is not None:
            self.init_app(app)
    
    def init_app(self, app: Flask):
        """Initialize security headers for Flask app"""
        app.before_request(self.before_request)
        app.after_request(self.after_request)
    
    def before_request(self):
        """Generate CSP nonce for each request"""
        g.csp_nonce = secrets.token_urlsafe(16)
    
    def after_request(self, response):
        """Add security headers to response"""
        # Content Security Policy
        csp_policy = self._build_csp_policy()
        response.headers['Content-Security-Policy'] = csp_policy
        
        # X-Frame-Options
        response.headers['X-Frame-Options'] = 'DENY'
        
        # X-Content-Type-Options
        response.headers['X-Content-Type-Options'] = 'nosniff'
        
        # X-XSS-Protection (legacy but still useful)
        response.headers['X-XSS-Protection'] = '1; mode=block'
        
        # Strict-Transport-Security (HTTPS only)
        if request.is_secure:
            response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload'
        
        # Referrer Policy
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        # Permissions Policy
        permissions_policy = (
            "geolocation=(), "
            "microphone=(), "
            "camera=(), "
            "payment=(), "
            "usb=(), "
            "magnetometer=(), "
            "gyroscope=(), "
            "accelerometer=()"
        )
        response.headers['Permissions-Policy'] = permissions_policy
        
        # Cross-Origin Policies
        response.headers['Cross-Origin-Embedder-Policy'] = 'require-corp'
        response.headers['Cross-Origin-Opener-Policy'] = 'same-origin'
        response.headers['Cross-Origin-Resource-Policy'] = 'same-origin'
        
        # Cache Control for sensitive pages
        if self._is_sensitive_route():
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate, private'
            response.headers['Pragma'] = 'no-cache'
            response.headers['Expires'] = '0'
        
        return response
    
    def _build_csp_policy(self) -> str:
        """Build Content Security Policy"""
        nonce = getattr(g, 'csp_nonce', '')
        
        # Base CSP policy
        policy_parts = [
            "default-src 'self'",
            f"script-src 'self' 'nonce-{nonce}' 'unsafe-inline' https://fonts.googleapis.com",
            f"style-src 'self' 'nonce-{nonce}' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com",
            "font-src 'self' https://fonts.gstatic.com data:",
            "img-src 'self' data: blob: https:",
            "connect-src 'self'",
            "media-src 'self'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
            "upgrade-insecure-requests"
        ]
        
        return "; ".join(policy_parts)
    
    def _is_sensitive_route(self) -> bool:
        """Check if current route contains sensitive data"""
        sensitive_paths = [
            '/admin',
            '/api/admin',
            '/login',
            '/setup',
            '/api/auth'
        ]
        
        return any(request.path.startswith(path) for path in sensitive_paths)


def init_security_headers(app: Flask):
    """Initialize security headers middleware"""
    SecurityHeaders(app)
