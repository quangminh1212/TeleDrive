#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Security Middleware for TeleDrive
Bảo mật middleware với headers, rate limiting, và input validation
"""

import time
import hashlib
from functools import wraps
from collections import defaultdict, deque
from datetime import datetime, timedelta
from typing import Dict, Optional, Callable, Any
from flask import request, jsonify, g, current_app
from werkzeug.exceptions import TooManyRequests
import re

class SecurityHeaders:
    """Security headers middleware"""
    
    @staticmethod
    def add_security_headers(response):
        """Add security headers to response"""
        # Content Security Policy
        response.headers['Content-Security-Policy'] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self'; "
            "frame-ancestors 'none';"
        )
        
        # Security headers
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response.headers['Permissions-Policy'] = (
            'geolocation=(), microphone=(), camera=(), '
            'payment=(), usb=(), magnetometer=(), gyroscope=()'
        )
        
        # HSTS (only in production with HTTPS)
        if current_app.config.get('HTTPS_ENABLED', False):
            response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        
        return response

class RateLimiter:
    """Rate limiting middleware"""
    
    def __init__(self):
        self.requests = defaultdict(deque)
        self.blocked_ips = {}
        self.cleanup_interval = 300  # 5 minutes
        self.last_cleanup = time.time()
    
    def _get_client_ip(self) -> str:
        """Get client IP address"""
        # Check for forwarded IP (behind proxy)
        if request.headers.get('X-Forwarded-For'):
            return request.headers.get('X-Forwarded-For').split(',')[0].strip()
        elif request.headers.get('X-Real-IP'):
            return request.headers.get('X-Real-IP')
        else:
            return request.remote_addr or 'unknown'
    
    def _cleanup_old_requests(self):
        """Clean up old request records"""
        current_time = time.time()
        
        # Clean up request history
        cutoff_time = current_time - 60  # Keep last 1 minute
        for ip in list(self.requests.keys()):
            while self.requests[ip] and self.requests[ip][0] < cutoff_time:
                self.requests[ip].popleft()
            
            # Remove empty deques
            if not self.requests[ip]:
                del self.requests[ip]
        
        # Clean up blocked IPs
        for ip in list(self.blocked_ips.keys()):
            if current_time > self.blocked_ips[ip]:
                del self.blocked_ips[ip]
        
        self.last_cleanup = current_time
    
    def is_rate_limited(self, limit_per_minute: int = 60, block_duration: int = 300) -> bool:
        """Check if client is rate limited"""
        current_time = time.time()
        client_ip = self._get_client_ip()
        
        # Periodic cleanup
        if current_time - self.last_cleanup > self.cleanup_interval:
            self._cleanup_old_requests()
        
        # Check if IP is currently blocked
        if client_ip in self.blocked_ips:
            if current_time < self.blocked_ips[client_ip]:
                return True
            else:
                del self.blocked_ips[client_ip]
        
        # Add current request
        self.requests[client_ip].append(current_time)
        
        # Count requests in last minute
        cutoff_time = current_time - 60
        recent_requests = sum(1 for req_time in self.requests[client_ip] if req_time > cutoff_time)
        
        # Check rate limit
        if recent_requests > limit_per_minute:
            # Block IP for specified duration
            self.blocked_ips[client_ip] = current_time + block_duration
            return True
        
        return False

class InputValidator:
    """Input validation middleware"""
    
    # Common patterns
    PHONE_PATTERN = re.compile(r'^\+[1-9]\d{1,14}$')
    EMAIL_PATTERN = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    USERNAME_PATTERN = re.compile(r'^[a-zA-Z0-9_]{3,30}$')
    
    # Dangerous patterns to block
    SQL_INJECTION_PATTERNS = [
        re.compile(r'(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)', re.IGNORECASE),
        re.compile(r'(\b(OR|AND)\s+\d+\s*=\s*\d+)', re.IGNORECASE),
        re.compile(r'[\'";]', re.IGNORECASE),
    ]
    
    XSS_PATTERNS = [
        re.compile(r'<script[^>]*>.*?</script>', re.IGNORECASE | re.DOTALL),
        re.compile(r'javascript:', re.IGNORECASE),
        re.compile(r'on\w+\s*=', re.IGNORECASE),
        re.compile(r'<iframe[^>]*>', re.IGNORECASE),
    ]
    
    @classmethod
    def validate_phone(cls, phone: str) -> bool:
        """Validate phone number format"""
        return bool(cls.PHONE_PATTERN.match(phone))
    
    @classmethod
    def validate_email(cls, email: str) -> bool:
        """Validate email format"""
        return bool(cls.EMAIL_PATTERN.match(email))
    
    @classmethod
    def validate_username(cls, username: str) -> bool:
        """Validate username format"""
        return bool(cls.USERNAME_PATTERN.match(username))
    
    @classmethod
    def check_sql_injection(cls, text: str) -> bool:
        """Check for SQL injection patterns"""
        for pattern in cls.SQL_INJECTION_PATTERNS:
            if pattern.search(text):
                return True
        return False
    
    @classmethod
    def check_xss(cls, text: str) -> bool:
        """Check for XSS patterns"""
        for pattern in cls.XSS_PATTERNS:
            if pattern.search(text):
                return True
        return False
    
    @classmethod
    def sanitize_input(cls, text: str) -> str:
        """Sanitize input text"""
        if not isinstance(text, str):
            return str(text)
        
        # Remove dangerous characters
        text = re.sub(r'[<>"\']', '', text)
        
        # Limit length
        if len(text) > 1000:
            text = text[:1000]
        
        return text.strip()

class LoginAttemptTracker:
    """Track failed login attempts"""
    
    def __init__(self):
        self.attempts = defaultdict(list)
        self.blocked_ips = {}
    
    def record_failed_attempt(self, identifier: str):
        """Record a failed login attempt"""
        current_time = datetime.utcnow()
        self.attempts[identifier].append(current_time)
        
        # Clean old attempts (older than 1 hour)
        cutoff_time = current_time - timedelta(hours=1)
        self.attempts[identifier] = [
            attempt for attempt in self.attempts[identifier] 
            if attempt > cutoff_time
        ]
    
    def is_blocked(self, identifier: str, max_attempts: int = 5, block_duration: int = 900) -> bool:
        """Check if identifier is blocked due to too many failed attempts"""
        current_time = datetime.utcnow()
        
        # Check if currently blocked
        if identifier in self.blocked_ips:
            if current_time < self.blocked_ips[identifier]:
                return True
            else:
                del self.blocked_ips[identifier]
        
        # Count recent attempts
        cutoff_time = current_time - timedelta(minutes=15)
        recent_attempts = [
            attempt for attempt in self.attempts.get(identifier, [])
            if attempt > cutoff_time
        ]
        
        if len(recent_attempts) >= max_attempts:
            # Block for specified duration
            self.blocked_ips[identifier] = current_time + timedelta(seconds=block_duration)
            return True
        
        return False
    
    def clear_attempts(self, identifier: str):
        """Clear failed attempts for identifier (after successful login)"""
        if identifier in self.attempts:
            del self.attempts[identifier]
        if identifier in self.blocked_ips:
            del self.blocked_ips[identifier]

# Global instances
rate_limiter = RateLimiter()
login_tracker = LoginAttemptTracker()

def rate_limit(limit_per_minute: int = 60):
    """Rate limiting decorator"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if current_app.config.get('RATELIMIT_ENABLED', True):
                if rate_limiter.is_rate_limited(limit_per_minute):
                    return jsonify({
                        'error': 'Rate limit exceeded',
                        'message': 'Too many requests. Please try again later.'
                    }), 429
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def validate_input(validation_rules: Dict[str, Callable]):
    """Input validation decorator"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if request.is_json:
                data = request.get_json()
            else:
                data = request.form.to_dict()
            
            # Validate each field
            for field, validator in validation_rules.items():
                if field in data:
                    value = data[field]
                    
                    # Check for malicious patterns
                    if isinstance(value, str):
                        if InputValidator.check_sql_injection(value):
                            return jsonify({'error': 'Invalid input detected'}), 400
                        if InputValidator.check_xss(value):
                            return jsonify({'error': 'Invalid input detected'}), 400
                    
                    # Apply custom validation
                    if not validator(value):
                        return jsonify({'error': f'Invalid {field} format'}), 400
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def init_security_middleware(app):
    """Initialize security middleware with Flask app"""
    
    @app.after_request
    def add_security_headers(response):
        return SecurityHeaders.add_security_headers(response)
    
    @app.before_request
    def security_checks():
        """Run security checks before each request"""
        # Skip security checks for static files
        if request.endpoint and request.endpoint.startswith('static'):
            return
        
        # Rate limiting for API endpoints
        if request.path.startswith('/api/') and current_app.config.get('RATELIMIT_ENABLED', True):
            if rate_limiter.is_rate_limited():
                return jsonify({
                    'error': 'Rate limit exceeded',
                    'message': 'Too many requests. Please try again later.'
                }), 429
        
        # Store client info in g for logging
        g.client_ip = rate_limiter._get_client_ip()
        g.user_agent = request.headers.get('User-Agent', 'Unknown')
    
    return app
