"""
Authentication Decorators

This module provides decorators for authentication and authorization.
"""

import os
from functools import wraps
from typing import Callable, Any

from flask import redirect, url_for, abort, request, jsonify
from flask_login import current_user


def dev_mode_enabled() -> bool:
    """
    Check if dev mode is enabled.
    
    Returns:
        bool: True if dev mode is enabled
    """
    from flask import current_app
    
    # Check both environment variable and Flask config
    env_dev_mode = os.getenv('DEV_MODE', 'false').lower() == 'true'
    flask_dev_mode = current_app.config.get('DEV_MODE', False)
    return env_dev_mode or flask_dev_mode


def dev_login_required(f: Callable) -> Callable:
    """
    Decorator to check if user is logged in.
    In dev mode, authentication is bypassed.
    
    Args:
        f: Function to decorate
        
    Returns:
        Decorated function
    """
    @wraps(f)
    def decorated_function(*args: Any, **kwargs: Any) -> Any:
        if dev_mode_enabled():
            # In dev mode, bypass authentication
            return f(*args, **kwargs)
        else:
            # Normal mode, require login
            if not current_user.is_authenticated:
                return redirect(url_for('auth.login'))
            return f(*args, **kwargs)
    return decorated_function


def dev_admin_required(f: Callable) -> Callable:
    """
    Decorator to check if user is an admin.
    In dev mode, admin check is bypassed.
    
    Args:
        f: Function to decorate
        
    Returns:
        Decorated function
    """
    @wraps(f)
    def decorated_function(*args: Any, **kwargs: Any) -> Any:
        if dev_mode_enabled():
            # In dev mode, bypass admin check
            return f(*args, **kwargs)
        else:
            # Normal mode, require admin
            if not current_user.is_authenticated or not current_user.is_admin:
                if request.is_json or request.headers.get('Content-Type') == 'application/json':
                    return jsonify({
                        'success': False,
                        'error': 'Bạn không có quyền truy cập chức năng này'
                    }), 403
                else:
                    abort(403)
            return f(*args, **kwargs)
    return decorated_function


def api_auth_required(f: Callable) -> Callable:
    """
    Decorator to check if API request is authenticated.
    In dev mode, authentication is bypassed.
    
    Args:
        f: Function to decorate
        
    Returns:
        Decorated function
    """
    @wraps(f)
    def decorated_function(*args: Any, **kwargs: Any) -> Any:
        if dev_mode_enabled():
            # In dev mode, bypass authentication
            return f(*args, **kwargs)
        else:
            # Normal mode, require login
            if not current_user.is_authenticated:
                return jsonify({
                    'success': False,
                    'error': 'Unauthorized access'
                }), 401
            return f(*args, **kwargs)
    return decorated_function 