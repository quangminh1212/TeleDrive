"""Security middleware for TeleDrive application.

This module provides security middleware components like rate limiting,
IP blocking, and request validation for the TeleDrive application.
"""

import time
from datetime import datetime
from functools import wraps
from typing import Any, Callable, Dict, List, Optional, Tuple, Union

from flask import Flask, Response, abort, current_app, g, request


class RateLimiter:
    """Rate limiting implementation to prevent abuse and DoS attacks.
    
    Attributes:
        limits: Dictionary mapping route patterns to rate limits
        request_counts: Dictionary tracking requests per IP
        window_size: Time window for rate limiting in seconds
    """
    
    def __init__(self, window_size: int = 60):
        """Initialize the rate limiter.
        
        Args:
            window_size: Time window in seconds for rate limiting
        """
        self.limits: Dict[str, int] = {}
        self.request_counts: Dict[str, Dict[str, Tuple[int, float]]] = {}
        self.window_size = window_size
    
    def add_limit(self, route_pattern: str, max_requests: int) -> None:
        """Add a rate limit for a specific route pattern.
        
        Args:
            route_pattern: Route pattern to limit
            max_requests: Maximum requests allowed in the time window
        """
        self.limits[route_pattern] = max_requests
    
    def is_rate_limited(self, ip: str, route: str) -> bool:
        """Check if a request should be rate limited.
        
        Args:
            ip: IP address of the requester
            route: Current route being accessed
            
        Returns:
            bool: True if request should be rate limited, False otherwise
        """
        now = time.time()
        
        # Find applicable limit
        max_requests = None
        for pattern, limit in self.limits.items():
            if route.startswith(pattern) or pattern == '*':
                max_requests = limit
                break
        
        if max_requests is None:
            return False  # No limit for this route
        
        # Get or initialize counter
        key = f"{ip}:{route}"
        if key not in self.request_counts:
            self.request_counts[key] = (0, now)
        
        count, window_start = self.request_counts[key]
        
        # Check if window expired
        if now - window_start > self.window_size:
            # Reset window
            self.request_counts[key] = (1, now)
            return False
        
        # Increment count
        count += 1
        self.request_counts[key] = (count, window_start)
        
        # Check if limit exceeded
        return count > max_requests


class LoginAttemptTracker:
    """Tracks failed login attempts to prevent brute force attacks.
    
    Attributes:
        max_attempts: Maximum allowed login attempts before lockout
        lockout_time: Lockout time in seconds
        attempts: Dictionary tracking login attempts per IP/username
    """
    
    def __init__(self, max_attempts: int = 5, lockout_time: int = 600):
        """Initialize the login attempt tracker.
        
        Args:
            max_attempts: Maximum allowed login attempts
            lockout_time: Lockout time in seconds
        """
        self.max_attempts = max_attempts
        self.lockout_time = lockout_time
        self.attempts: Dict[str, Tuple[int, float]] = {}
    
    def record_attempt(self, username: str, ip: str, success: bool) -> None:
        """Record a login attempt.
        
        Args:
            username: Username used in the attempt
            ip: IP address of the requester
            success: Whether the attempt was successful
        """
        key = f"{ip}:{username}"
        
        if success:
            # Reset attempts on success
            if key in self.attempts:
                del self.attempts[key]
            return
        
        now = time.time()
        if key not in self.attempts:
            self.attempts[key] = (1, now)
        else:
            attempts, first_attempt = self.attempts[key]
            
            # Reset if lockout period has passed
            if now - first_attempt > self.lockout_time:
                self.attempts[key] = (1, now)
            else:
                self.attempts[key] = (attempts + 1, first_attempt)
    
    def is_locked_out(self, username: str, ip: str) -> bool:
        """Check if a user is currently locked out.
        
        Args:
            username: Username to check
            ip: IP address to check
            
        Returns:
            bool: True if the user is locked out, False otherwise
        """
        key = f"{ip}:{username}"
        
        if key not in self.attempts:
            return False
        
        attempts, first_attempt = self.attempts[key]
        now = time.time()
        
        # Reset if lockout period has passed
        if now - first_attempt > self.lockout_time:
            self.attempts[key] = (0, now)
            return False
        
        return attempts >= self.max_attempts


# Initialize global instances
rate_limiter = RateLimiter()
login_tracker = LoginAttemptTracker()


def rate_limit(max_requests: int, window_size: int = 60):
    """Decorator for applying rate limiting to a route.
    
    Args:
        max_requests: Maximum requests allowed in the time window
        window_size: Time window in seconds
        
    Returns:
        Function: Decorated route handler
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Get client IP
            ip = request.remote_addr
            
            # Initialize limiter for this route if needed
            route = request.path
            
            # Check if rate limited
            if rate_limiter.is_rate_limited(ip, route):
                abort(429, description="Too many requests")
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def init_security_middleware_chain(app: Flask) -> None:
    """Initialize security middleware chain for the Flask application.
    
    Args:
        app: The Flask application instance
    """
    # Configure default rate limits
    rate_limiter.add_limit("/api/", 60)  # 60 requests per minute for API endpoints
    rate_limiter.add_limit("/login", 10)  # 10 login attempts per minute
    rate_limiter.add_limit("/admin/", 30)  # 30 requests per minute for admin endpoints
    
    @app.before_request
    def security_middleware():
        """Apply security middleware to each request."""
        # Skip for static files
        if request.path.startswith('/static/'):
            return None
        
        # Store request start time for logging
        g.request_start_time = time.time()
        
        # Global rate limiting check for sensitive endpoints
        ip = request.remote_addr
        
        # Check login rate limiting
        if request.path == '/login' and request.method == 'POST':
            if rate_limiter.is_rate_limited(ip, '/login'):
                app.logger.warning(f"Rate limit exceeded for login from IP: {ip}")
                return Response("Too many login attempts. Try again later.", 429)
        
        # Check admin rate limiting
        if request.path.startswith('/admin/'):
            if rate_limiter.is_rate_limited(ip, '/admin/'):
                app.logger.warning(f"Rate limit exceeded for admin endpoint from IP: {ip}")
                return Response("Too many requests to admin endpoints. Try again later.", 429)
        
        # Check API rate limiting
        if request.path.startswith('/api/'):
            if rate_limiter.is_rate_limited(ip, '/api/'):
                app.logger.warning(f"Rate limit exceeded for API from IP: {ip}")
                return Response("API rate limit exceeded. Try again later.", 429)
        
        return None
    
    @app.after_request
    def log_request(response):
        """Log request details for security monitoring."""
        if hasattr(g, 'request_start_time'):
            request_time = time.time() - g.request_start_time
            
            # Only log non-static requests and errors
            if not request.path.startswith('/static/') and (response.status_code >= 400 or request_time > 1.0):
                app.logger.info(
                    f"Request: {request.method} {request.path} - "
                    f"Status: {response.status_code} - "
                    f"IP: {request.remote_addr} - "
                    f"Time: {request_time:.2f}s"
                )
        
        return response
