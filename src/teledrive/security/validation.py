#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Input Validation and Sanitization
Implements secure input validation and sanitization
"""

import re
import html
import urllib.parse
from typing import Any, Optional, Union, List
from pathlib import Path


class InputValidator:
    """Input validation and sanitization utilities"""
    
    # Common regex patterns
    EMAIL_PATTERN = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    PHONE_PATTERN = re.compile(r'^\+?[1-9]\d{1,14}$')
    USERNAME_PATTERN = re.compile(r'^[a-zA-Z0-9_]{3,30}$')
    FILENAME_PATTERN = re.compile(r'^[a-zA-Z0-9._-]+$')
    
    # Dangerous file extensions
    DANGEROUS_EXTENSIONS = {
        '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js',
        '.jar', '.php', '.asp', '.aspx', '.jsp', '.py', '.rb', '.pl',
        '.sh', '.bash', '.ps1', '.msi', '.deb', '.rpm'
    }
    
    @staticmethod
    def sanitize_html(text: str) -> str:
        """Sanitize HTML content to prevent XSS"""
        if not isinstance(text, str):
            return str(text)
        return html.escape(text)
    
    @staticmethod
    def sanitize_url(url: str) -> str:
        """Sanitize URL to prevent injection"""
        if not isinstance(url, str):
            return ""
        
        # Parse and reconstruct URL to remove dangerous components
        parsed = urllib.parse.urlparse(url)
        
        # Only allow http and https schemes
        if parsed.scheme not in ['http', 'https', '']:
            return ""
        
        return urllib.parse.urlunparse(parsed)
    
    @staticmethod
    def validate_email(email: str) -> bool:
        """Validate email address format"""
        if not isinstance(email, str) or len(email) > 254:
            return False
        return bool(InputValidator.EMAIL_PATTERN.match(email))
    
    @staticmethod
    def validate_phone(phone: str) -> bool:
        """Validate phone number format"""
        if not isinstance(phone, str):
            return False
        # Remove spaces and dashes
        clean_phone = re.sub(r'[\s-]', '', phone)
        return bool(InputValidator.PHONE_PATTERN.match(clean_phone))
    
    @staticmethod
    def validate_username(username: str) -> bool:
        """Validate username format"""
        if not isinstance(username, str):
            return False
        return bool(InputValidator.USERNAME_PATTERN.match(username))
    
    @staticmethod
    def validate_filename(filename: str) -> bool:
        """Validate filename for security"""
        if not isinstance(filename, str) or not filename:
            return False
        
        # Check for path traversal attempts
        if '..' in filename or '/' in filename or '\\' in filename:
            return False
        
        # Check for dangerous extensions
        file_path = Path(filename)
        if file_path.suffix.lower() in InputValidator.DANGEROUS_EXTENSIONS:
            return False
        
        # Check basic filename pattern
        return bool(InputValidator.FILENAME_PATTERN.match(filename))
    
    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """Sanitize filename for safe storage"""
        if not isinstance(filename, str):
            return "unknown"
        
        # Remove path components
        filename = Path(filename).name
        
        # Replace dangerous characters
        safe_chars = re.sub(r'[^\w\-_\.]', '_', filename)
        
        # Limit length
        if len(safe_chars) > 255:
            name, ext = Path(safe_chars).stem, Path(safe_chars).suffix
            safe_chars = name[:255-len(ext)] + ext
        
        return safe_chars or "unknown"
    
    @staticmethod
    def validate_integer(value: Any, min_val: Optional[int] = None, max_val: Optional[int] = None) -> bool:
        """Validate integer value with optional range"""
        try:
            int_val = int(value)
            if min_val is not None and int_val < min_val:
                return False
            if max_val is not None and int_val > max_val:
                return False
            return True
        except (ValueError, TypeError):
            return False
    
    @staticmethod
    def validate_string_length(text: str, min_len: int = 0, max_len: int = 1000) -> bool:
        """Validate string length"""
        if not isinstance(text, str):
            return False
        return min_len <= len(text) <= max_len
    
    @staticmethod
    def sanitize_search_query(query: str) -> str:
        """Sanitize search query to prevent injection"""
        if not isinstance(query, str):
            return ""
        
        # Remove SQL injection patterns
        dangerous_patterns = [
            r'[;\'"\\]',  # SQL injection characters
            r'--',        # SQL comments
            r'/\*.*?\*/', # SQL block comments
            r'\b(union|select|insert|update|delete|drop|create|alter)\b'  # SQL keywords
        ]
        
        sanitized = query
        for pattern in dangerous_patterns:
            sanitized = re.sub(pattern, '', sanitized, flags=re.IGNORECASE)
        
        # Limit length and trim
        return sanitized[:100].strip()
    
    @staticmethod
    def validate_json_keys(data: dict, allowed_keys: List[str]) -> bool:
        """Validate that JSON data only contains allowed keys"""
        if not isinstance(data, dict):
            return False
        
        return all(key in allowed_keys for key in data.keys())


# Convenience functions
def sanitize_html(text: str) -> str:
    """Convenience function for HTML sanitization"""
    return InputValidator.sanitize_html(text)


def validate_email(email: str) -> bool:
    """Convenience function for email validation"""
    return InputValidator.validate_email(email)


def sanitize_filename(filename: str) -> str:
    """Convenience function for filename sanitization"""
    return InputValidator.sanitize_filename(filename)
