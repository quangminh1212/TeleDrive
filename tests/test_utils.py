"""
Tests for utility functions
"""

import pytest
from pathlib import Path

from src.teledrive.utils.helpers import (
    format_file_size, format_duration, sanitize_filename,
    ensure_directory, get_file_extension, is_valid_url,
    truncate_string, parse_invite_link, safe_int, safe_float
)


class TestFileHelpers:
    """Test file-related helper functions"""
    
    def test_format_file_size(self):
        """Test file size formatting"""
        assert format_file_size(0) == "0 B"
        assert format_file_size(1024) == "1.00 KB"
        assert format_file_size(1048576) == "1.00 MB"
        assert format_file_size(1073741824) == "1.00 GB"
        assert format_file_size(1536) == "1.50 KB"
        
    def test_format_file_size_decimal_places(self):
        """Test file size formatting with different decimal places"""
        assert format_file_size(1536, 0) == "2 KB"
        assert format_file_size(1536, 1) == "1.5 KB"
        assert format_file_size(1536, 3) == "1.500 KB"
        
    def test_sanitize_filename(self):
        """Test filename sanitization"""
        # Test invalid characters
        assert sanitize_filename("file<>name.txt") == "file__name.txt"
        assert sanitize_filename('file"name.txt') == "file_name.txt"
        assert sanitize_filename("file|name.txt") == "file_name.txt"
        
        # Test empty filename
        assert sanitize_filename("") == "unnamed_file"
        assert sanitize_filename("   ") == "unnamed_file"
        
        # Test long filename
        long_name = "a" * 300 + ".txt"
        sanitized = sanitize_filename(long_name)
        assert len(sanitized) <= 255
        assert sanitized.endswith(".txt")
        
    def test_get_file_extension(self):
        """Test file extension extraction"""
        assert get_file_extension("file.txt") == ".txt"
        assert get_file_extension("file.PDF") == ".pdf"
        assert get_file_extension("file") == ""
        assert get_file_extension("file.tar.gz") == ".gz"
        
    def test_ensure_directory(self, temp_dir):
        """Test directory creation"""
        test_dir = temp_dir / "test" / "nested" / "directory"
        result = ensure_directory(test_dir)
        
        assert result == test_dir
        assert test_dir.exists()
        assert test_dir.is_dir()


class TestStringHelpers:
    """Test string-related helper functions"""
    
    def test_format_duration(self):
        """Test duration formatting"""
        assert format_duration(0) == "0s"
        assert format_duration(30) == "30s"
        assert format_duration(60) == "1m"
        assert format_duration(90) == "1m 30s"
        assert format_duration(3600) == "1h"
        assert format_duration(3661) == "1h 1m 1s"
        assert format_duration(86400) == "1d"
        assert format_duration(90061) == "1d 1h 1m 1s"
        
    def test_format_duration_negative(self):
        """Test duration formatting with negative values"""
        assert format_duration(-10) == "0s"
        
    def test_truncate_string(self):
        """Test string truncation"""
        text = "This is a long string that needs to be truncated"
        
        assert truncate_string(text, 20) == "This is a long st..."
        assert truncate_string(text, 50) == text  # No truncation needed
        assert truncate_string(text, 20, "***") == "This is a long st***"
        
    def test_is_valid_url(self):
        """Test URL validation"""
        # Valid URLs
        assert is_valid_url("https://example.com") is True
        assert is_valid_url("http://example.com") is True
        assert is_valid_url("https://example.com/path") is True
        assert is_valid_url("https://example.com:8080") is True
        
        # Invalid URLs
        assert is_valid_url("not_a_url") is False
        assert is_valid_url("ftp://example.com") is False
        assert is_valid_url("") is False
        
    def test_parse_invite_link(self):
        """Test Telegram invite link parsing"""
        # Valid invite links
        assert parse_invite_link("https://t.me/joinchat/AAAAAEhZCQeOiMuVEiuuKQ") == "AAAAAEhZCQeOiMuVEiuuKQ"
        assert parse_invite_link("https://t.me/+AAAAAEhZCQeOiMuVEiuuKQ") == "AAAAAEhZCQeOiMuVEiuuKQ"
        
        # Invalid links
        assert parse_invite_link("https://t.me/channel") is None
        assert parse_invite_link("") is None
        assert parse_invite_link(None) is None


class TestTypeHelpers:
    """Test type conversion helper functions"""
    
    def test_safe_int(self):
        """Test safe integer conversion"""
        assert safe_int("123") == 123
        assert safe_int("123.45") == 123  # Truncates float string
        assert safe_int("not_a_number") == 0
        assert safe_int("not_a_number", 42) == 42
        assert safe_int(None) == 0
        assert safe_int(None, 42) == 42
        assert safe_int(123) == 123  # Already int
        
    def test_safe_float(self):
        """Test safe float conversion"""
        assert safe_float("123.45") == 123.45
        assert safe_float("123") == 123.0
        assert safe_float("not_a_number") == 0.0
        assert safe_float("not_a_number", 42.5) == 42.5
        assert safe_float(None) == 0.0
        assert safe_float(None, 42.5) == 42.5
        assert safe_float(123.45) == 123.45  # Already float


class TestUtilityFunctions:
    """Test miscellaneous utility functions"""
    
    def test_chunks(self):
        """Test list chunking"""
        from src.teledrive.utils.helpers import chunks
        
        data = list(range(10))
        chunked = list(chunks(data, 3))
        
        assert len(chunked) == 4
        assert chunked[0] == [0, 1, 2]
        assert chunked[1] == [3, 4, 5]
        assert chunked[2] == [6, 7, 8]
        assert chunked[3] == [9]
        
    def test_chunks_empty_list(self):
        """Test chunking empty list"""
        from src.teledrive.utils.helpers import chunks
        
        chunked = list(chunks([], 3))
        assert chunked == []
        
    def test_merge_dicts(self):
        """Test dictionary merging"""
        from src.teledrive.utils.helpers import merge_dicts
        
        dict1 = {
            "a": 1,
            "b": {
                "c": 2,
                "d": 3
            }
        }
        
        dict2 = {
            "b": {
                "d": 4,
                "e": 5
            },
            "f": 6
        }
        
        result = merge_dicts(dict1, dict2)
        
        assert result["a"] == 1
        assert result["b"]["c"] == 2
        assert result["b"]["d"] == 4  # Overridden
        assert result["b"]["e"] == 5  # Added
        assert result["f"] == 6  # Added
        
    def test_get_timestamp(self):
        """Test timestamp generation"""
        from src.teledrive.utils.helpers import get_timestamp
        
        timestamp = get_timestamp()
        assert len(timestamp) == 15  # YYYYMMDD_HHMMSS format
        assert "_" in timestamp
        
        # Custom format
        custom_timestamp = get_timestamp("%Y-%m-%d")
        assert len(custom_timestamp) == 10  # YYYY-MM-DD format
        assert "-" in custom_timestamp
