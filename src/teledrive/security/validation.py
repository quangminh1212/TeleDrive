"""Input validation utilities for TeleDrive application.

This module provides input validation and sanitization functions to protect
against common security vulnerabilities like XSS and SQL injection.
"""

import re
from typing import Any, Dict, Optional, Pattern, Union

# Common validation patterns
EMAIL_PATTERN: Pattern = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
PHONE_PATTERN: Pattern = re.compile(r'^\+?[0-9]{10,15}$')
USERNAME_PATTERN: Pattern = re.compile(r'^[a-zA-Z0-9_]{3,30}$')
PATH_PATTERN: Pattern = re.compile(r'^[a-zA-Z0-9_\-./\\]+$')
FILENAME_PATTERN: Pattern = re.compile(r'^[a-zA-Z0-9_\-. ]+\.[a-zA-Z0-9]{1,10}$')

# Security patterns to detect malicious input
SQL_INJECTION_PATTERNS: list[Pattern] = [
    re.compile(r'(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)', re.IGNORECASE),
    re.compile(r'(\b(OR|AND)\s+\d+\s*=\s*\d+)', re.IGNORECASE),
    re.compile(r'[\'";]', re.IGNORECASE),
]

XSS_PATTERNS: list[Pattern] = [
    re.compile(r'<script[^>]*>.*?</script>', re.IGNORECASE | re.DOTALL),
    re.compile(r'javascript:', re.IGNORECASE),
    re.compile(r'on\w+\s*=', re.IGNORECASE),
    re.compile(r'<iframe[^>]*>', re.IGNORECASE),
]


def validate_email(email: str) -> bool:
    """Validate email format.
    
    Args:
        email: Email address to validate
        
    Returns:
        bool: True if email is valid, False otherwise
    """
    if not isinstance(email, str):
        return False
    return bool(EMAIL_PATTERN.match(email))


def validate_phone_number(phone: str) -> bool:
    """Validate phone number format.
    
    Args:
        phone: Phone number to validate
        
    Returns:
        bool: True if phone number is valid, False otherwise
    """
    if not isinstance(phone, str):
        return False
    
    # Remove common separators
    phone = re.sub(r'[\s\-.()\[\]]', '', phone)
    
    return bool(PHONE_PATTERN.match(phone))


def validate_username(username: str) -> bool:
    """Validate username format.
    
    Args:
        username: Username to validate
        
    Returns:
        bool: True if username is valid, False otherwise
    """
    if not isinstance(username, str):
        return False
    return bool(USERNAME_PATTERN.match(username))


def validate_path(path: str) -> bool:
    """Validate file or directory path.
    
    Args:
        path: Path to validate
        
    Returns:
        bool: True if path is valid, False otherwise
    """
    if not isinstance(path, str):
        return False
    
    # Check for directory traversal attempts
    if '..' in path:
        return False
    
    return bool(PATH_PATTERN.match(path))


def validate_filename(filename: str) -> bool:
    """Validate filename.
    
    Args:
        filename: Filename to validate
        
    Returns:
        bool: True if filename is valid, False otherwise
    """
    if not isinstance(filename, str):
        return False
    return bool(FILENAME_PATTERN.match(filename))


def sanitize_html(html: str) -> str:
    """Remove potentially dangerous HTML content.
    
    Args:
        html: HTML content to sanitize
        
    Returns:
        str: Sanitized HTML content
    """
    if not isinstance(html, str):
        return str(html)
    
    # Remove script tags
    html = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL | re.IGNORECASE)
    
    # Remove event handlers
    html = re.sub(r' on\w+=".*?"', '', html, flags=re.IGNORECASE)
    html = re.sub(r' on\w+=\'.*?\'', '', html, flags=re.IGNORECASE)
    
    # Remove javascript: URLs
    html = re.sub(r'javascript:', 'disabled-javascript:', html, flags=re.IGNORECASE)
    
    # Remove iframe tags
    html = re.sub(r'<iframe[^>]*>.*?</iframe>', '', html, flags=re.DOTALL | re.IGNORECASE)
    
    return html


def sanitize_filename(filename: str) -> str:
    """Sanitize a filename to make it safe for filesystem operations.
    
    Args:
        filename: Filename to sanitize
        
    Returns:
        str: Sanitized filename
    """
    if not isinstance(filename, str):
        return "unnamed_file"
    
    # Remove path components
    filename = re.sub(r'.*[/\\]', '', filename)
    
    # Remove dangerous characters
    filename = re.sub(r'[<>:"/\\|?*]', '_', filename)
    
    # Ensure filename isn't empty
    if not filename or filename == '.':
        return "unnamed_file"
    
    # Limit length
    if len(filename) > 255:
        filename = filename[:255]
    
    return filename


def detect_sql_injection(text: str) -> bool:
    """Detect potential SQL injection patterns.
    
    Args:
        text: Text to check
        
    Returns:
        bool: True if SQL injection pattern detected, False otherwise
    """
    if not isinstance(text, str):
        return False
    
    for pattern in SQL_INJECTION_PATTERNS:
        if pattern.search(text):
            return True
    
    return False


def detect_xss(text: str) -> bool:
    """Detect potential XSS patterns.
    
    Args:
        text: Text to check
        
    Returns:
        bool: True if XSS pattern detected, False otherwise
    """
    if not isinstance(text, str):
        return False
    
    for pattern in XSS_PATTERNS:
        if pattern.search(text):
            return True
    
    return False


def validate_input_dict(data: Dict[str, Any], 
                        rules: Dict[str, Any], 
                        require_all: bool = False) -> tuple[bool, Optional[str]]:
    """Validate a dictionary of input data against validation rules.
    
    Args:
        data: Dictionary of input data
        rules: Dictionary of validation rules
        require_all: Whether all keys in rules must be present in data
        
    Returns:
        tuple: (is_valid, error_message)
    """
    if not isinstance(data, dict) or not isinstance(rules, dict):
        return False, "Invalid input or rules format"
    
    # Check required fields
    if require_all:
        for key in rules:
            if key not in data:
                return False, f"Missing required field: {key}"
    
    # Validate each field
    for key, value in data.items():
        if key in rules:
            rule = rules[key]
            
            # If rule is a function, call it
            if callable(rule):
                if not rule(value):
                    return False, f"Invalid value for {key}"
            
            # If rule is a regex pattern
            elif hasattr(rule, 'match'):
                if not rule.match(str(value)):
                    return False, f"Invalid format for {key}"
            
            # If rule is a type
            elif isinstance(rule, type):
                if not isinstance(value, rule):
                    return False, f"Invalid type for {key}, expected {rule.__name__}"
    
    return True, None


__all__ = [
    'validate_email',
    'validate_phone_number',
    'validate_username',
    'validate_path',
    'validate_filename',
    'sanitize_html',
    'sanitize_filename',
    'detect_sql_injection',
    'detect_xss',
    'validate_input_dict',
]
