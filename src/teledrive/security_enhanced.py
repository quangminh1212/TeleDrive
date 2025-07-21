#!/usr/bin/env python3
"""
TeleDrive Enhanced Security Module

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
        if not phone or len(phone) > 16:
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
        """Sanitize HTML content."""
        if not content:
            return ""
        
        # Allowed tags and attributes
        allowed_tags = ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li']
        allowed_attributes = {}
        
        return bleach.clean(
            content,
            tags=allowed_tags,
            attributes=allowed_attributes,
            strip=True
        )
    
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
        """Validate file path for security."""
        if not path:
            return False
        
        # Check for path traversal
        if '..' in path or path.startswith('/'):
            return False
        
        # Check against dangerous patterns
        if cls.check_dangerous_content(path):
            return False
        
        return True


class RateLimiter:
    """Advanced rate limiting with multiple strategies."""
    
    def __init__(self):
        self.requests: Dict[str, List[float]] = {}
        self.blocked_ips: Dict[str, float] = {}
    
    def is_rate_limited(
        self, 
        identifier: str, 
        limit: int = 60, 
        window: int = 60,
        block_duration: int = 300
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Check if identifier is rate limited.
        
        Args:
            identifier: IP address or user ID
            limit: Number of requests allowed
            window: Time window in seconds
            block_duration: How long to block after limit exceeded
            
        Returns:
            Tuple of (is_limited, info_dict)
        """
        current_time = time.time()
        
        # Check if currently blocked
        if identifier in self.blocked_ips:
            if current_time < self.blocked_ips[identifier]:
                remaining_block = self.blocked_ips[identifier] - current_time
                return True, {
                    'blocked': True,
                    'remaining_block_time': remaining_block,
                    'reason': 'IP temporarily blocked due to rate limit violation'
                }
            else:
                # Block expired, remove from blocked list
                del self.blocked_ips[identifier]
        
        # Initialize request history for new identifiers
        if identifier not in self.requests:
            self.requests[identifier] = []
        
        # Clean old requests outside the window
        self.requests[identifier] = [
            req_time for req_time in self.requests[identifier]
            if current_time - req_time < window
        ]
        
        # Check if limit exceeded
        if len(self.requests[identifier]) >= limit:
            # Block the identifier
            self.blocked_ips[identifier] = current_time + block_duration
            return True, {
                'blocked': True,
                'requests_in_window': len(self.requests[identifier]),
                'limit': limit,
                'window': window,
                'block_duration': block_duration,
                'reason': 'Rate limit exceeded'
            }
        
        # Add current request
        self.requests[identifier].append(current_time)
        
        return False, {
            'blocked': False,
            'requests_in_window': len(self.requests[identifier]),
            'limit': limit,
            'remaining': limit - len(self.requests[identifier])
        }


class SessionSecurity:
    """Enhanced session security."""
    
    @staticmethod
    def generate_csrf_token() -> str:
        """Generate CSRF token."""
        return secrets.token_hex(32)
    
    @staticmethod
    def validate_csrf_token(token: str) -> bool:
        """Validate CSRF token."""
        session_token = session.get('csrf_token')
        if not session_token or not token:
            return False
        return safe_str_cmp(session_token, token)
    
    @staticmethod
    def setup_secure_session(app: Flask):
        """Configure secure session settings."""
        app.config.update({
            'SESSION_COOKIE_SECURE': True,  # HTTPS only
            'SESSION_COOKIE_HTTPONLY': True,  # No JavaScript access
            'SESSION_COOKIE_SAMESITE': 'Lax',  # CSRF protection
            'PERMANENT_SESSION_LIFETIME': timedelta(hours=1),  # Session timeout
        })
    
    @staticmethod
    def regenerate_session_id():
        """Regenerate session ID to prevent session fixation."""
        # Store session data
        session_data = dict(session)
        
        # Clear session
        session.clear()
        
        # Restore data with new session ID
        session.update(session_data)
        session.permanent = True


class SecurityAuditLogger:
    """Security event logging and monitoring."""
    
    def __init__(self):
        self.security_events: List[Dict[str, Any]] = []
    
    def log_security_event(
        self,
        event_type: str,
        severity: str,
        description: str,
        **kwargs
    ):
        """Log security event."""
        event = {
            'timestamp': datetime.utcnow().isoformat(),
            'event_type': event_type,
            'severity': severity,
            'description': description,
            'ip_address': request.remote_addr if request else 'unknown',
            'user_agent': request.headers.get('User-Agent') if request else 'unknown',
            **kwargs
        }
        
        self.security_events.append(event)
        
        # Keep only last 1000 events
        if len(self.security_events) > 1000:
            self.security_events = self.security_events[-1000:]
        
        # Log to application logger
        from teledrive.observability import logger
        logger.warning(f"Security Event: {event_type}", **event)
    
    def get_recent_events(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get recent security events."""
        return self.security_events[-limit:]


# Global instances
rate_limiter = RateLimiter()
security_audit = SecurityAuditLogger()


def init_security(app: Flask):
    """Initialize enhanced security for Flask app."""
    
    # Setup secure session
    SessionSecurity.setup_secure_session(app)
    
    # Add security headers to all responses
    @app.after_request
    def add_security_headers(response):
        headers = SecurityHeaders.get_security_headers()
        for header, value in headers.items():
            response.headers[header] = value
        return response
    
    # CSRF protection for state-changing requests
    @app.before_request
    def csrf_protection():
        if request.method in ['POST', 'PUT', 'DELETE', 'PATCH']:
            token = request.headers.get('X-CSRF-Token') or request.form.get('csrf_token')
            if not SessionSecurity.validate_csrf_token(token):
                security_audit.log_security_event(
                    'csrf_violation',
                    'high',
                    'CSRF token validation failed',
                    endpoint=request.endpoint,
                    method=request.method
                )
                abort(403, 'CSRF token validation failed')
    
    # Rate limiting
    @app.before_request
    def rate_limit_check():
        # Skip rate limiting for health checks
        if request.endpoint in ['health_check', 'ready_check', 'metrics_endpoint']:
            return
        
        identifier = request.remote_addr
        is_limited, info = rate_limiter.is_rate_limited(identifier)
        
        if is_limited:
            security_audit.log_security_event(
                'rate_limit_exceeded',
                'medium',
                'Rate limit exceeded',
                identifier=identifier,
                **info
            )
            return jsonify({
                'error': 'Rate limit exceeded',
                'message': info.get('reason', 'Too many requests'),
                'retry_after': info.get('remaining_block_time', 60)
            }), 429
    
    # Input validation middleware
    @app.before_request
    def validate_input():
        # Validate JSON payloads
        if request.is_json and request.get_json():
            data = request.get_json()
            for key, value in data.items():
                if isinstance(value, str) and InputValidator.check_dangerous_content(value):
                    security_audit.log_security_event(
                        'dangerous_input_detected',
                        'high',
                        f'Dangerous content detected in field: {key}',
                        field=key,
                        value=value[:100]  # Log first 100 chars only
                    )
                    abort(400, 'Invalid input detected')
    
    # Security monitoring endpoint (admin only)
    @app.route('/admin/security/events')
    def security_events():
        """Get recent security events (admin only)."""
        # This should be protected by admin authentication
        return jsonify({
            'events': security_audit.get_recent_events(),
            'total_events': len(security_audit.security_events)
        })
    
    return {
        'rate_limiter': rate_limiter,
        'security_audit': security_audit,
        'input_validator': InputValidator,
        'session_security': SessionSecurity
    }


def require_csrf_token(f):
    """Decorator to require CSRF token for specific endpoints."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('X-CSRF-Token') or request.form.get('csrf_token')
        if not SessionSecurity.validate_csrf_token(token):
            security_audit.log_security_event(
                'csrf_violation',
                'high',
                f'CSRF token validation failed for {f.__name__}',
                function=f.__name__
            )
            abort(403, 'CSRF token required')
        return f(*args, **kwargs)
    return decorated_function


def validate_input_fields(**field_validators):
    """Decorator to validate input fields."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if request.is_json:
                data = request.get_json() or {}
            else:
                data = request.form.to_dict()
            
            for field, validator in field_validators.items():
                if field in data:
                    if not validator(data[field]):
                        security_audit.log_security_event(
                            'input_validation_failed',
                            'medium',
                            f'Input validation failed for field: {field}',
                            field=field,
                            function=f.__name__
                        )
                        abort(400, f'Invalid {field} format')
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator
