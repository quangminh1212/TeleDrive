#!/usr/bin/env python3
"""
TeleDrive Security Core Module

Advanced security features including:
- Content Security Policy (CSP)
- Security headers
- Input validation and sanitization
- Rate limiting
- Session security
- CSRF protection
- SQL injection prevention
"""

import re
import hashlib
import secrets
import time
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from functools import wraps
from urllib.parse import urlparse

from flask import Flask, request, session, abort, jsonify, g
from werkzeug.security import safe_str_cmp
import bleach


class SecurityHeaders:
    """Comprehensive security headers implementation."""
    
    @staticmethod
    def get_security_headers() -> Dict[str, str]:
        """Get comprehensive security headers."""
        return {
            # Prevent clickjacking
            'X-Frame-Options': 'DENY',
            
            # Prevent MIME type sniffing
            'X-Content-Type-Options': 'nosniff',
            
            # Enable XSS protection
            'X-XSS-Protection': '1; mode=block',
            
            # Referrer policy
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            
            # Permissions policy
            'Permissions-Policy': (
                'geolocation=(), microphone=(), camera=(), '
                'payment=(), usb=(), magnetometer=(), gyroscope=()'
            ),
            
            # HSTS (HTTPS only)
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
            
            # Content Security Policy
            'Content-Security-Policy': (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: https:; "
                "font-src 'self' data:; "
                "connect-src 'self'; "
                "frame-ancestors 'none'; "
                "base-uri 'self'; "
                "form-action 'self'"
            ),
        }


class InputValidator:
    """Advanced input validation and sanitization."""
    
    # Common regex patterns
    PATTERNS = {
        'email': re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'),
        'phone': re.compile(r'^\+[1-9]\d{1,14}$'),
        'username': re.compile(r'^[a-zA-Z0-9_]{3,20}$'),
        'filename': re.compile(r'^[a-zA-Z0-9._-]+$'),
        'path': re.compile(r'^[a-zA-Z0-9/._-]+$'),
        'uuid': re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
    }
    
    # Dangerous patterns to block
    DANGEROUS_PATTERNS = [
        re.compile(r'<script[^>]*>.*?</script>', re.IGNORECASE | re.DOTALL),
        re.compile(r'javascript:', re.IGNORECASE),
        re.compile(r'vbscript:', re.IGNORECASE),
        re.compile(r'on\w+\s*=', re.IGNORECASE),
        re.compile(r'(union|select|insert|update|delete|drop|create|alter)\s+', re.IGNORECASE),
        re.compile(r'(\.\./|\.\.\\)', re.IGNORECASE),
    ]
    
    @classmethod
    def validate_email(cls, email: str) -> bool:
        """Validate email format."""
        if not email or len(email) > 254:
            return False
        return bool(cls.PATTERNS['email'].match(email))
    
    @classmethod
    def validate_phone(cls, phone: str) -> bool:
        """Validate phone number format."""
        if not phone:
            return False
        return bool(cls.PATTERNS['phone'].match(phone))
    
    @classmethod
    def validate_username(cls, username: str) -> bool:
        """Validate username format."""
        if not username or len(username) < 3 or len(username) > 20:
            return False
        return bool(cls.PATTERNS['username'].match(username))
    
    @classmethod
    def sanitize_html(cls, content: str) -> str:
        """
        Sanitize HTML content to prevent XSS attacks.
        
        This uses the bleach library to remove dangerous tags and attributes,
        allowing only a safe subset of HTML.
        """
        allowed_tags = [
            'a', 'abbr', 'acronym', 'b', 'blockquote', 'code',
            'em', 'i', 'li', 'ol', 'p', 'strong', 'ul', 'br', 'h1',
            'h2', 'h3', 'h4', 'h5', 'h6', 'pre', 'span'
        ]
        allowed_attrs = {
            'a': ['href', 'title'],
            'abbr': ['title'],
            'acronym': ['title'],
        }
        return bleach.clean(content, tags=allowed_tags, attributes=allowed_attrs)
    
    @classmethod
    def check_dangerous_content(cls, content: str) -> bool:
        """Check if content contains dangerous patterns."""
        if not content:
            return False
        
        for pattern in cls.DANGEROUS_PATTERNS:
            if pattern.search(content):
                return True
        return False
    
    @classmethod
    def validate_file_path(cls, path: str) -> bool:
        """
        Validate a file path for safety.
        
        Checks:
        - No path traversal
        - No dangerous characters
        - No absolute paths
        """
        if not path or path.startswith('/') or path.startswith('\\'):
            return False
        
        if '\\' in path or '..' in path:
            return False
        
        # Check for dangerous patterns
        if cls.check_dangerous_content(path):
            return False
        
        return bool(cls.PATTERNS['path'].match(path))


class RateLimiter:
    """Rate limiting implementation."""
    
    def __init__(self):
        self.request_history = {}
        self.blocked = {}
    
    def is_rate_limited(
        self, 
        identifier: str, 
        limit: int = 60, 
        window: int = 60,
        block_duration: int = 300
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Check if a request should be rate limited.
        
        Args:
            identifier: Unique identifier (e.g., IP address)
            limit: Maximum requests allowed in window
            window: Time window in seconds
            block_duration: How long to block if limit exceeded (seconds)
            
        Returns:
            (is_limited, info): Bool and dict with limit information
        """
        now = time.time()
        
        # Check if already blocked
        if identifier in self.blocked:
            block_end = self.blocked[identifier]
            if now < block_end:
                remaining = int(block_end - now)
                return True, {
                    "limited": True,
                    "remaining_requests": 0,
                    "reset_time": int(block_end),
                    "blocked_for": remaining,
                    "message": f"Rate limit exceeded. Try again in {remaining} seconds."
                }
            else:
                # Block expired
                del self.blocked[identifier]
        
        # Initialize history for this identifier if it doesn't exist
        if identifier not in self.request_history:
            self.request_history[identifier] = []
        
        # Clean old requests
        self.request_history[identifier] = [
            t for t in self.request_history[identifier] 
            if now - t < window
        ]
        
        # Count requests in current window
        request_count = len(self.request_history[identifier])
        
        # Check if limit exceeded
        if request_count >= limit:
            # Block for specified duration
            self.blocked[identifier] = now + block_duration
            return True, {
                "limited": True,
                "remaining_requests": 0,
                "reset_time": int(now + block_duration),
                "blocked_for": block_duration,
                "message": f"Rate limit exceeded. Try again in {block_duration} seconds."
            }
        
        # Add current request to history
        self.request_history[identifier].append(now)
        
        # Calculate remaining requests and reset time
        remaining_requests = limit - request_count - 1
        reset_time = int(now + window)
        
        return False, {
            "limited": False,
            "remaining_requests": remaining_requests,
            "reset_time": reset_time,
            "blocked_for": 0,
            "message": f"Rate limit: {remaining_requests} requests remaining."
        }


class SessionSecurity:
    """Enhanced session security features."""
    
    @staticmethod
    def generate_csrf_token() -> str:
        """Generate a secure CSRF token."""
        return secrets.token_hex(32)
    
    @staticmethod
    def validate_csrf_token(token: str) -> bool:
        """Validate the CSRF token from the request."""
        session_token = session.get('csrf_token')
        if not session_token or not token:
            return False
        return safe_str_cmp(session_token, token)
    
    @staticmethod
    def setup_secure_session(app: Flask):
        """Configure Flask for secure sessions."""
        app.config['SESSION_COOKIE_SECURE'] = True
        app.config['SESSION_COOKIE_HTTPONLY'] = True
        app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
        app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=12)
        app.config['SESSION_PROTECTION'] = 'strong'
    
    @staticmethod
    def regenerate_session_id():
        """
        Regenerate the session ID to prevent session fixation attacks.
        
        This creates a new session with the same data but a new ID.
        It should be called whenever the user's privileges change,
        such as after login or password change.
        """
        old_data = dict(session)
        session.clear()
        session.update(old_data)
        session['_fresh'] = True
        session['_id'] = secrets.token_hex(16)
        session['regenerated_at'] = datetime.now().isoformat()


class SecurityAuditLogger:
    """Security event auditing and logging."""
    
    def __init__(self):
        self.events = []
    
    def log_security_event(
        self,
        event_type: str,
        severity: str,
        description: str,
        **kwargs
    ):
        """
        Log a security-related event.
        
        Args:
            event_type: Type of security event (e.g., 'login_failed')
            severity: Severity level ('low', 'medium', 'high', 'critical')
            description: Human-readable description
            **kwargs: Additional data to log
        """
        now = datetime.now(timezone.utc)
        
        event = {
            'timestamp': now.isoformat(),
            'event_type': event_type,
            'severity': severity,
            'description': description,
            'ip_address': request.remote_addr if request else 'unknown',
            'user_agent': request.user_agent.string if request and request.user_agent else 'unknown',
            'path': request.path if request else 'unknown',
            'method': request.method if request else 'unknown',
            'data': kwargs
        }
        
        self.events.append(event)
        
        # Log to system log if critical
        if severity == 'critical':
            logging.critical(
                f"SECURITY ALERT: {event_type} - {description} "
                f"- IP: {event['ip_address']}"
            )
    
    def get_recent_events(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get most recent security events."""
        return sorted(
            self.events, 
            key=lambda x: x['timestamp'], 
            reverse=True
        )[:limit]


def init_security(app: Flask):
    """Initialize all security features."""
    # Create security components
    rate_limiter = RateLimiter()
    security_logger = SecurityAuditLogger()
    
    @app.after_request
    def add_security_headers(response):
        """Add security headers to all responses."""
        headers = SecurityHeaders.get_security_headers()
        for header, value in headers.items():
            response.headers[header] = value
        return response
    
    @app.before_request
    def csrf_protection():
        """Protect against CSRF attacks."""
        # Skip for GET, HEAD, OPTIONS
        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            return
        
        # Skip for API endpoints that use token auth
        if request.path.startswith('/api/') and 'X-API-Token' in request.headers:
            return
            
        # Check CSRF token
        token = request.form.get('csrf_token') or request.headers.get('X-CSRF-Token')
        if not token or not SessionSecurity.validate_csrf_token(token):
            security_logger.log_security_event(
                'csrf_failure', 'medium', 'CSRF token validation failed'
            )
            abort(403, description="CSRF token validation failed")
    
    @app.before_request
    def rate_limit_check():
        """Check rate limits."""
        # Skip rate limiting for health checks
        if request.path == '/health':
            return
            
        # Create a unique identifier for the client
        client_id = request.remote_addr
        
        # Apply stricter limits for authentication endpoints
        if request.path in ('/login', '/register', '/api/auth/login'):
            is_limited, info = rate_limiter.is_rate_limited(
                f"{client_id}:{request.path}", 
                limit=5,  # Only 5 attempts
                window=60,  # Per minute
                block_duration=600  # Block for 10 minutes
            )
        else:
            # Default rate limiting
            is_limited, info = rate_limiter.is_rate_limited(client_id)
        
        if is_limited:
            security_logger.log_security_event(
                'rate_limit_exceeded', 'low', 
                f"Rate limit exceeded: {info['message']}"
            )
            return jsonify({
                'error': 'Too many requests',
                'message': info['message']
            }), 429
    
    @app.before_request
    def validate_input():
        """Validate and sanitize input data."""
        # Validate JSON payloads
        if request.is_json and request.get_json(silent=True) is not None:
            data = request.get_json()
            
            # Check for dangerous patterns in JSON values
            for key, value in data.items():
                if isinstance(value, str) and InputValidator.check_dangerous_content(value):
                    security_logger.log_security_event(
                        'dangerous_input', 'high',
                        f"Dangerous input detected in JSON field: {key}"
                    )
                    abort(400, description="Invalid input data")
    
    # Setup session security
    SessionSecurity.setup_secure_session(app)
    
    # Register security event view for admins
    @app.route('/admin/security/events')
    def security_events():
        """Get security audit events (admin only)."""
        # Check if user is admin (should be done properly with auth middleware)
        if not g.get('user') or not g.user.is_admin:
            abort(403)
            
        events = security_logger.get_recent_events(limit=100)
        return jsonify({
            'count': len(events),
            'events': events
        })
    
    # Store components in app for later use
    app.rate_limiter = rate_limiter
    app.security_logger = security_logger


def require_csrf_token(f):
    """Decorator to require a valid CSRF token."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.form.get('csrf_token') or request.headers.get('X-CSRF-Token')
        if not token or not SessionSecurity.validate_csrf_token(token):
            abort(403, description="CSRF token validation failed")
        return f(*args, **kwargs)
    return decorated_function


def validate_input_fields(**field_validators):
    """Decorator to validate request input fields."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Validate form data
            if request.form:
                for field, validator in field_validators.items():
                    if field in request.form:
                        value = request.form[field]
                        if not validator(value):
                            abort(400, description=f"Invalid {field}")
            
            # Validate JSON data
            if request.is_json:
                data = request.get_json()
                for field, validator in field_validators.items():
                    if field in data:
                        value = data[field]
                        if not validator(value):
                            abort(400, description=f"Invalid {field}")
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator 