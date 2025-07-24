"""
Rate Limiting Module

This module provides rate limiting functionality to prevent abuse of the TeleDrive API.
"""

from typing import Optional, Dict, Any, Callable, Union
from flask import Flask, request, Blueprint
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# Create rate limiter instance with defaults
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://",
)


def init_rate_limiting(app: Flask) -> None:
    """
    Initialize rate limiting for the Flask application.
    
    Args:
        app: Flask application instance
    """
    # Initialize limiter with app
    limiter.init_app(app)
    
    # Configure rate limiting from app config
    limiter.enabled = app.config.get('RATELIMIT_ENABLED', True)
    
    # Use Redis if available
    if app.config.get('RATELIMIT_STORAGE_URL'):
        limiter.storage_uri = app.config.get('RATELIMIT_STORAGE_URL')
    
    # Log rate limit initialization
    app.logger.info(f"Rate limiting initialized (enabled: {limiter.enabled})")


def limit_blueprint(blueprint: Blueprint, 
                   limits: Union[str, list], 
                   key_func: Optional[Callable] = None,
                   exempt_when: Optional[Callable] = None) -> None:
    """
    Apply rate limits to all routes in a blueprint.
    
    Args:
        blueprint: The Flask blueprint to limit
        limits: Rate limit string (e.g., "100 per minute") or list of limit strings
        key_func: Optional function to extract the rate limit key
        exempt_when: Optional function that returns True when the rate limit should be exempted
    """
    limiter.limit(
        limits,
        key_func=key_func or get_remote_address,
        exempt_when=exempt_when
    )(blueprint)


def exempt_from_limits(f: Callable) -> Callable:
    """
    Decorator to exempt a route from rate limiting.
    
    Args:
        f: The view function to exempt
        
    Returns:
        The decorated function
    """
    return limiter.exempt(f) 