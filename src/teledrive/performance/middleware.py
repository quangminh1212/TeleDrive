#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Performance Middleware

Middleware để theo dõi hiệu suất của các request HTTP trong ứng dụng Flask
"""

import time
from functools import wraps
import logging
from typing import Callable
from flask import request, g
from . import track_api_call, track_time

# Khởi tạo logger
logger = logging.getLogger(__name__)

def init_performance_middleware(app):
    """Khởi tạo performance middleware cho Flask app
    
    Args:
        app: Flask application
    """
    @app.before_request
    def before_request():
        """Ghi lại thời điểm bắt đầu request"""
        g.start_time = time.time()
        g.request_path = request.path
    
    @app.after_request
    def after_request(response):
        """Ghi lại thông tin performance sau khi xử lý request"""
        if hasattr(g, 'start_time'):
            # Tính thời gian xử lý request
            elapsed_time = time.time() - g.start_time
            
            # Định dạng endpoint để theo dõi
            endpoint = request.endpoint or 'unknown_endpoint'
            endpoint_name = f"{request.method}:{endpoint}"
            
            # Ghi lại API call và thời gian xử lý
            track_api_call(endpoint_name)
            
            # Log slow requests (>500ms)
            if elapsed_time > 0.5:
                logger.warning(f"Slow request: {request.method} {request.path} took {elapsed_time:.2f}s")
                
            # Thêm header cho monitoring
            response.headers['X-Response-Time'] = f"{elapsed_time:.6f}"
        
        return response

def performance_trace(label: str = None) -> Callable:
    """Decorator để theo dõi hiệu suất của một function trong Flask route
    
    Args:
        label: Label để xác định function trong metrics (mặc định: function name)
        
    Returns:
        Decorator function
    """
    def decorator(func):
        func_name = label or func.__name__
        
        @wraps(func)
        def wrapped(*args, **kwargs):
            start_time = time.time()
            result = func(*args, **kwargs)
            elapsed_time = time.time() - start_time
            
            # Log chi tiết nếu function chạy chậm
            if elapsed_time > 0.1:  # Ngưỡng 100ms
                logger.debug(f"Function {func_name} took {elapsed_time:.3f}s")
            
            return result
        
        return wrapped
    
    return decorator

def cache_control_middleware(app, cache_timeout=3600):
    """Middleware để cấu hình cache control
    
    Args:
        app: Flask application
        cache_timeout: Thời gian hết hạn cache (giây)
    """
    @app.after_request
    def add_cache_headers(response):
        # Thêm cache headers cho static files
        if request.path.startswith('/static/'):
            response.cache_control.max_age = cache_timeout
            response.cache_control.public = True
        else:
            # Dynamic content không cache trên browser
            response.cache_control.no_cache = True
            response.cache_control.no_store = True
            response.cache_control.must_revalidate = True
        
        return response

def compression_middleware(app):
    """Middleware để nén response
    
    Args:
        app: Flask application
    """
    try:
        from flask_compress import Compress
        compress = Compress()
        compress.init_app(app)
        logger.info("Compression middleware enabled")
    except ImportError:
        logger.warning("flask-compress not installed, compression disabled")

def rate_limit_middleware(app, default_limits=None):
    """Middleware để rate limiting API requests
    
    Args:
        app: Flask application
        default_limits: Default rate limits (e.g. ["200 per day", "50 per hour"])
    """
    try:
        from flask_limiter import Limiter
        from flask_limiter.util import get_remote_address
        
        limiter = Limiter(
            app=app,
            key_func=get_remote_address,
            default_limits=default_limits or ["200 per day", "50 per hour"]
        )
        
        logger.info("Rate limit middleware enabled")
        return limiter
    except ImportError:
        logger.warning("flask-limiter not installed, rate limiting disabled")
        return None 