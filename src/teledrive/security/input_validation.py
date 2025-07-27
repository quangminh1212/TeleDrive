"""Advanced Input Validation

This module provides advanced input validation utilities for API requests
and form submissions, including JSON schema validation and request sanitization.
"""

import json
from typing import Any, Dict, List, Tuple, Optional, Union, Callable
import re
from functools import wraps
from flask import request, jsonify, current_app

# Import existing validation utilities
from .validation import (
    validate_email, validate_phone_number, validate_username,
    validate_path, validate_filename, sanitize_html,
    sanitize_filename, detect_sql_injection, detect_xss
)


class ValidationError(Exception):
    """Exception raised for validation errors."""
    def __init__(self, message: str, field: Optional[str] = None, code: str = "VALIDATION_ERROR"):
        self.message = message
        self.field = field
        self.code = code
        super().__init__(self.message)


def validate_request_json(schema: Dict[str, Dict[str, Any]], require_all: bool = True) -> Callable:
    """
    Decorator for validating JSON request data against a schema.
    
    Args:
        schema: Schema definition
        require_all: Whether all fields in schema are required
        
    Returns:
        Decorator function
    
    Example schema:
    {
        "username": {
            "type": str,
            "required": True,
            "validator": validate_username,
            "min_length": 3,
            "max_length": 30
        },
        "email": {
            "type": str,
            "required": False,
            "validator": validate_email
        }
    }
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Get JSON data
            if not request.is_json:
                return jsonify({
                    "success": False,
                    "error": "Request must be JSON",
                    "code": "INVALID_CONTENT_TYPE"
                }), 400
            
            try:
                data = request.get_json()
                
                if not isinstance(data, dict):
                    return jsonify({
                        "success": False,
                        "error": "Invalid JSON data format",
                        "code": "INVALID_FORMAT"
                    }), 400
                
                # Validate against schema
                errors = validate_against_schema(data, schema, require_all)
                
                if errors:
                    return jsonify({
                        "success": False,
                        "errors": errors,
                        "code": "VALIDATION_ERROR"
                    }), 400
                
                # Call original function with validated data
                return f(*args, **kwargs)
                
            except json.JSONDecodeError:
                return jsonify({
                    "success": False,
                    "error": "Invalid JSON format",
                    "code": "INVALID_JSON"
                }), 400
            except Exception as e:
                current_app.logger.error(f"Validation error: {str(e)}")
                return jsonify({
                    "success": False,
                    "error": "Error processing request",
                    "code": "REQUEST_ERROR"
                }), 500
        
        return decorated_function
    
    return decorator


def validate_against_schema(data: Dict[str, Any], schema: Dict[str, Dict[str, Any]], 
                          require_all: bool = True) -> List[Dict[str, str]]:
    """
    Validate data against a schema.
    
    Args:
        data: Data to validate
        schema: Schema definition
        require_all: Whether all fields in schema are required
        
    Returns:
        List of error dictionaries, empty if no errors
    """
    errors = []
    
    # Check for required fields
    if require_all:
        for field_name, field_schema in schema.items():
            if field_schema.get("required", True) and field_name not in data:
                errors.append({
                    "field": field_name,
                    "message": f"Field '{field_name}' is required",
                    "code": "REQUIRED_FIELD"
                })
    
    # Validate each field in the data
    for field_name, field_value in data.items():
        if field_name in schema:
            field_schema = schema[field_name]
            field_errors = validate_field(field_name, field_value, field_schema)
            errors.extend(field_errors)
            
    return errors


def validate_field(field_name: str, field_value: Any, 
                 field_schema: Dict[str, Any]) -> List[Dict[str, str]]:
    """
    Validate a single field against its schema.
    
    Args:
        field_name: Name of the field
        field_value: Value of the field
        field_schema: Schema for the field
        
    Returns:
        List of error dictionaries, empty if no errors
    """
    errors = []
    
    # Check for null value
    if field_value is None:
        if field_schema.get("required", True):
            errors.append({
                "field": field_name,
                "message": f"Field '{field_name}' cannot be null",
                "code": "NULL_VALUE"
            })
        return errors
    
    # Type validation
    expected_type = field_schema.get("type")
    if expected_type and not isinstance(field_value, expected_type):
        errors.append({
            "field": field_name,
            "message": f"Field '{field_name}' must be of type {expected_type.__name__}",
            "code": "INVALID_TYPE"
        })
        return errors  # Don't continue validating if type is wrong
    
    # String-specific validations
    if isinstance(field_value, str):
        # Check string length
        min_length = field_schema.get("min_length")
        if min_length is not None and len(field_value) < min_length:
            errors.append({
                "field": field_name,
                "message": f"Field '{field_name}' must be at least {min_length} characters",
                "code": "TOO_SHORT"
            })
        
        max_length = field_schema.get("max_length")
        if max_length is not None and len(field_value) > max_length:
            errors.append({
                "field": field_name,
                "message": f"Field '{field_name}' must be at most {max_length} characters",
                "code": "TOO_LONG"
            })
        
        # Check regex pattern
        pattern = field_schema.get("pattern")
        if pattern and not re.match(pattern, field_value):
            errors.append({
                "field": field_name,
                "message": field_schema.get("pattern_message", f"Field '{field_name}' has invalid format"),
                "code": "INVALID_FORMAT"
            })
        
        # Check for SQL injection and XSS
        if field_schema.get("check_sql_injection", False) and detect_sql_injection(field_value):
            errors.append({
                "field": field_name,
                "message": f"Field '{field_name}' contains potential SQL injection",
                "code": "SECURITY_VIOLATION"
            })
        
        if field_schema.get("check_xss", True) and detect_xss(field_value):
            errors.append({
                "field": field_name,
                "message": f"Field '{field_name}' contains potential XSS",
                "code": "SECURITY_VIOLATION"
            })
    
    # Number-specific validations
    if isinstance(field_value, (int, float)):
        minimum = field_schema.get("minimum")
        if minimum is not None and field_value < minimum:
            errors.append({
                "field": field_name,
                "message": f"Field '{field_name}' must be at least {minimum}",
                "code": "TOO_SMALL"
            })
        
        maximum = field_schema.get("maximum")
        if maximum is not None and field_value > maximum:
            errors.append({
                "field": field_name,
                "message": f"Field '{field_name}' must be at most {maximum}",
                "code": "TOO_LARGE"
            })
    
    # List-specific validations
    if isinstance(field_value, list):
        min_items = field_schema.get("min_items")
        if min_items is not None and len(field_value) < min_items:
            errors.append({
                "field": field_name,
                "message": f"Field '{field_name}' must have at least {min_items} items",
                "code": "TOO_FEW_ITEMS"
            })
        
        max_items = field_schema.get("max_items")
        if max_items is not None and len(field_value) > max_items:
            errors.append({
                "field": field_name,
                "message": f"Field '{field_name}' must have at most {max_items} items",
                "code": "TOO_MANY_ITEMS"
            })
        
        # Validate each item in the list if item_schema is provided
        item_schema = field_schema.get("items")
        if item_schema and field_value:
            for i, item in enumerate(field_value):
                item_errors = validate_field(f"{field_name}[{i}]", item, item_schema)
                errors.extend(item_errors)
    
    # Custom validator function
    validator = field_schema.get("validator")
    if validator and callable(validator):
        if not validator(field_value):
            errors.append({
                "field": field_name,
                "message": field_schema.get("validator_message", f"Field '{field_name}' failed validation"),
                "code": "VALIDATION_FAILED"
            })
    
    # Enum values
    enum_values = field_schema.get("enum")
    if enum_values and field_value not in enum_values:
        errors.append({
            "field": field_name,
            "message": f"Field '{field_name}' must be one of: {', '.join(str(v) for v in enum_values)}",
            "code": "INVALID_CHOICE"
        })
    
    return errors


def validate_query_params(schema: Dict[str, Dict[str, Any]]) -> Callable:
    """
    Decorator for validating query parameters.
    
    Args:
        schema: Schema definition for query params
        
    Returns:
        Decorator function
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            errors = []
            validated_params = {}
            
            for param_name, param_schema in schema.items():
                # Get parameter value
                param_value = request.args.get(param_name)
                
                # Check if required
                if param_schema.get('required', False) and param_value is None:
                    errors.append({
                        "field": param_name,
                        "message": f"Query parameter '{param_name}' is required",
                        "code": "REQUIRED_PARAM"
                    })
                    continue
                
                # Skip validation if param is not present and not required
                if param_value is None:
                    continue
                
                # Type conversion if needed
                param_type = param_schema.get('type', str)
                try:
                    if param_type == int:
                        param_value = int(param_value)
                    elif param_type == float:
                        param_value = float(param_value)
                    elif param_type == bool:
                        param_value = param_value.lower() in ('true', '1', 'yes')
                    
                    validated_params[param_name] = param_value
                except ValueError:
                    errors.append({
                        "field": param_name,
                        "message": f"Query parameter '{param_name}' must be of type {param_type.__name__}",
                        "code": "INVALID_TYPE"
                    })
                    continue
                
                # Validate using field validation
                field_errors = validate_field(param_name, param_value, param_schema)
                errors.extend(field_errors)
            
            if errors:
                return jsonify({
                    "success": False,
                    "errors": errors,
                    "code": "VALIDATION_ERROR"
                }), 400
            
            # Replace request.args with validated_params in kwargs
            kwargs['validated_params'] = validated_params
            return f(*args, **kwargs)
        
        return decorated_function
    
    return decorator


def sanitize_request_data(data: Dict[str, Any], sanitize_map: Dict[str, Callable]) -> Dict[str, Any]:
    """
    Sanitize request data based on a sanitization map.
    
    Args:
        data: Data to sanitize
        sanitize_map: Map of field names to sanitization functions
        
    Returns:
        Sanitized data
    """
    sanitized_data = {}
    
    for key, value in data.items():
        if key in sanitize_map and callable(sanitize_map[key]):
            sanitized_data[key] = sanitize_map[key](value)
        else:
            sanitized_data[key] = value
    
    return sanitized_data


def sanitize_html_fields(data: Dict[str, Any], html_fields: List[str]) -> Dict[str, Any]:
    """
    Sanitize HTML content in specified fields.
    
    Args:
        data: Data to sanitize
        html_fields: List of fields containing HTML content
        
    Returns:
        Data with sanitized HTML fields
    """
    sanitized_data = {**data}
    
    for field in html_fields:
        if field in sanitized_data and isinstance(sanitized_data[field], str):
            sanitized_data[field] = sanitize_html(sanitized_data[field])
    
    return sanitized_data

# Predefined schema validators for common data types
PHONE_NUMBER_SCHEMA = {
    "type": str,
    "required": True,
    "validator": validate_phone_number,
    "min_length": 10,
    "max_length": 20,
    "validator_message": "Số điện thoại không hợp lệ"
}

EMAIL_SCHEMA = {
    "type": str,
    "required": True,
    "validator": validate_email,
    "max_length": 100,
    "validator_message": "Địa chỉ email không hợp lệ"
}

USERNAME_SCHEMA = {
    "type": str,
    "required": True,
    "validator": validate_username,
    "min_length": 3,
    "max_length": 30,
    "validator_message": "Tên người dùng không hợp lệ. Chỉ cho phép chữ cái, số và dấu gạch dưới, độ dài 3-30 ký tự."
}

FILENAME_SCHEMA = {
    "type": str,
    "required": True,
    "validator": validate_filename,
    "max_length": 255,
    "validator_message": "Tên file không hợp lệ"
}

PATH_SCHEMA = {
    "type": str,
    "required": True,
    "validator": validate_path,
    "max_length": 1000,
    "validator_message": "Đường dẫn không hợp lệ"
}

OTP_SCHEMA = {
    "type": str,
    "required": True,
    "min_length": 6,
    "max_length": 6,
    "pattern": r"^\d{6}$",
    "pattern_message": "Mã OTP phải gồm 6 chữ số"
}

# Export public API
__all__ = [
    'ValidationError',
    'validate_request_json',
    'validate_query_params',
    'sanitize_request_data',
    'sanitize_html_fields',
    'PHONE_NUMBER_SCHEMA',
    'EMAIL_SCHEMA',
    'USERNAME_SCHEMA',
    'FILENAME_SCHEMA',
    'PATH_SCHEMA',
    'OTP_SCHEMA',
] 