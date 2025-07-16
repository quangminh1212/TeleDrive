"""
Helper utilities for TeleDrive

Common utility functions used throughout the application.
"""

import re
import os
from typing import Union, Optional
from pathlib import Path
from datetime import datetime, timedelta


def format_file_size(size_bytes: int, decimal_places: int = 2) -> str:
    """
    Format file size in human readable format
    
    Args:
        size_bytes: Size in bytes
        decimal_places: Number of decimal places
        
    Returns:
        str: Formatted file size (e.g., "1.5 MB")
    """
    if size_bytes == 0:
        return "0 B"
        
    size_names = ["B", "KB", "MB", "GB", "TB", "PB"]
    i = 0
    
    while size_bytes >= 1024.0 and i < len(size_names) - 1:
        size_bytes /= 1024.0
        i += 1
        
    return f"{size_bytes:.{decimal_places}f} {size_names[i]}"


def format_duration(seconds: Union[int, float]) -> str:
    """
    Format duration in human readable format
    
    Args:
        seconds: Duration in seconds
        
    Returns:
        str: Formatted duration (e.g., "2h 30m 15s")
    """
    if seconds < 0:
        return "0s"
        
    delta = timedelta(seconds=int(seconds))
    
    days = delta.days
    hours, remainder = divmod(delta.seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    
    parts = []
    if days > 0:
        parts.append(f"{days}d")
    if hours > 0:
        parts.append(f"{hours}h")
    if minutes > 0:
        parts.append(f"{minutes}m")
    if seconds > 0 or not parts:
        parts.append(f"{seconds}s")
        
    return " ".join(parts)


def sanitize_filename(filename: str, max_length: int = 255) -> str:
    """
    Sanitize filename for safe file system usage
    
    Args:
        filename: Original filename
        max_length: Maximum filename length
        
    Returns:
        str: Sanitized filename
    """
    if not filename:
        return "unnamed_file"
        
    # Remove or replace invalid characters
    invalid_chars = r'[<>:"/\\|?*]'
    sanitized = re.sub(invalid_chars, '_', filename)
    
    # Remove control characters
    sanitized = ''.join(char for char in sanitized if ord(char) >= 32)
    
    # Trim whitespace and dots from ends
    sanitized = sanitized.strip(' .')
    
    # Ensure not empty
    if not sanitized:
        sanitized = "unnamed_file"
        
    # Truncate if too long
    if len(sanitized) > max_length:
        name, ext = os.path.splitext(sanitized)
        max_name_length = max_length - len(ext)
        sanitized = name[:max_name_length] + ext
        
    return sanitized


def ensure_directory(path: Union[str, Path]) -> Path:
    """
    Ensure directory exists, create if necessary
    
    Args:
        path: Directory path
        
    Returns:
        Path: Path object for the directory
    """
    path_obj = Path(path)
    path_obj.mkdir(parents=True, exist_ok=True)
    return path_obj


def get_file_extension(filename: str) -> str:
    """
    Get file extension from filename
    
    Args:
        filename: File name
        
    Returns:
        str: File extension (including dot)
    """
    return Path(filename).suffix.lower()


def is_valid_url(url: str) -> bool:
    """
    Check if string is a valid URL
    
    Args:
        url: URL string to validate
        
    Returns:
        bool: True if valid URL
    """
    url_pattern = re.compile(
        r'^https?://'  # http:// or https://
        r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'  # domain...
        r'localhost|'  # localhost...
        r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # ...or ip
        r'(?::\d+)?'  # optional port
        r'(?:/?|[/?]\S+)$', re.IGNORECASE)
    return url_pattern.match(url) is not None


def truncate_string(text: str, max_length: int = 100, suffix: str = "...") -> str:
    """
    Truncate string to maximum length
    
    Args:
        text: Text to truncate
        max_length: Maximum length
        suffix: Suffix to add when truncated
        
    Returns:
        str: Truncated string
    """
    if len(text) <= max_length:
        return text
        
    return text[:max_length - len(suffix)] + suffix


def parse_invite_link(invite_link: str) -> Optional[str]:
    """
    Parse Telegram invite link to extract hash
    
    Args:
        invite_link: Telegram invite link
        
    Returns:
        str: Extracted hash or None if invalid
    """
    if not invite_link:
        return None
        
    # Handle different invite link formats
    if 'joinchat' in invite_link:
        return invite_link.split('joinchat/')[-1]
    elif '+' in invite_link and 't.me' in invite_link:
        return invite_link.split('+')[-1]
    else:
        return None


def get_timestamp(format_str: str = "%Y%m%d_%H%M%S") -> str:
    """
    Get current timestamp as formatted string
    
    Args:
        format_str: Timestamp format string
        
    Returns:
        str: Formatted timestamp
    """
    return datetime.now().strftime(format_str)


def safe_int(value: Union[str, int, None], default: int = 0) -> int:
    """
    Safely convert value to integer
    
    Args:
        value: Value to convert
        default: Default value if conversion fails
        
    Returns:
        int: Converted integer or default
    """
    if value is None:
        return default
        
    try:
        return int(value)
    except (ValueError, TypeError):
        return default


def safe_float(value: Union[str, float, None], default: float = 0.0) -> float:
    """
    Safely convert value to float
    
    Args:
        value: Value to convert
        default: Default value if conversion fails
        
    Returns:
        float: Converted float or default
    """
    if value is None:
        return default
        
    try:
        return float(value)
    except (ValueError, TypeError):
        return default


def chunks(lst: list, chunk_size: int):
    """
    Split list into chunks of specified size
    
    Args:
        lst: List to split
        chunk_size: Size of each chunk
        
    Yields:
        List chunks
    """
    for i in range(0, len(lst), chunk_size):
        yield lst[i:i + chunk_size]


def merge_dicts(dict1: dict, dict2: dict) -> dict:
    """
    Deep merge two dictionaries
    
    Args:
        dict1: First dictionary
        dict2: Second dictionary (takes precedence)
        
    Returns:
        dict: Merged dictionary
    """
    result = dict1.copy()
    
    for key, value in dict2.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = merge_dicts(result[key], value)
        else:
            result[key] = value
            
    return result
