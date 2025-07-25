"""
Security Module

This module provides security utilities and middleware for the TeleDrive application.
"""

from .csrf import init_csrf_protection
from .ratelimit import init_rate_limiting
from .middleware import init_security_middleware
from .headers import init_security_headers
from .attack_prevention import init_attack_prevention, brute_force_protection
from .validation import (
    sanitize_html, validate_email, validate_phone_number, validate_username,
    validate_path, validate_filename, sanitize_filename, detect_sql_injection,
    detect_xss
)

__all__ = [
    'init_security_middleware',
    'init_security_headers',
    'init_csrf_protection',
    'init_attack_prevention',
    'brute_force_protection',
    'validate_email',
    'validate_phone_number',
    'validate_username',
    'validate_path',
    'validate_filename',
    'sanitize_html',
    'sanitize_filename',
    'detect_sql_injection',
    'detect_xss'
]
