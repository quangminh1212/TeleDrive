#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Attack Prevention and Detection Module

Cung cấp các tiện ích để phát hiện và ngăn chặn các cuộc tấn công như brute force,
request flooding, directory traversal, và các mẫu tấn công khác.
"""

import re
import time
import logging
from typing import Dict, List, Set, Optional, Callable, Any, Tuple
from collections import defaultdict
import threading
import ipaddress
from flask import request, abort, current_app, g
import json
import hashlib
from functools import wraps

# Khởi tạo logger
logger = logging.getLogger(__name__)

# Lưu trữ thông tin về các lần đăng nhập không thành công
failed_login_attempts = defaultdict(list)  # ip -> [timestamp1, timestamp2, ...]

# Lưu trữ thông tin về các IP đang bị block
blocked_ips = {}  # ip -> expiry_time

# Danh sách các đường dẫn nhạy cảm
SENSITIVE_PATHS = [
    "/admin", "/config", "/system", "/backup", "/database",
    "/install", "/setup", "/phpMyAdmin", "/phpmyadmin",
    "/.git", "/.env", "/wp-admin", "/wp-login", "/console"
]

# Các mẫu tấn công phổ biến
ATTACK_PATTERNS = [
    r'.*\/\.\.\/',  # Directory traversal
    r'.*\b(union|select|from|where|insert|delete|update|drop|alter)\b.*',  # SQL Injection
    r'.*<script.*>.*<\/script>.*',  # XSS
    r'.*\bon\w+\s*=.*',  # Event handler XSS
    r'.*document\.cookie.*',  # Cookie stealing
    r'.*\b(eval|setTimeout|setInterval)\s*\(.*',  # JavaScript injection
    r'.*\b(cmd|exec|system|passthru|shell_exec)\s*\(.*'  # Command injection
]

# Khóa thread cho biến global
lock = threading.RLock()

def init_attack_prevention(app):
    """Khởi tạo module bảo vệ chống tấn công
    
    Args:
        app: Flask application
    """
    # Đăng ký middleware
    @app.before_request
    def check_security():
        """Kiểm tra các vấn đề bảo mật trước mỗi request"""
        client_ip = request.remote_addr
        
        # Kiểm tra IP có bị chặn không
        if is_ip_blocked(client_ip):
            logger.warning(f"Blocked request from banned IP: {client_ip}")
            abort(403)
            
        # Kiểm tra các mẫu tấn công
        if detect_attack_patterns():
            logger.warning(f"Attack pattern detected from IP: {client_ip}, path: {request.path}")
            record_attack(client_ip)
            abort(400)
            
        # Kiểm tra request flooding
        if detect_request_flooding(client_ip):
            logger.warning(f"Request flooding detected from IP: {client_ip}")
            block_ip(client_ip, duration=300)  # Block trong 5 phút
            abort(429)
            
        # Kiểm tra truy cập đường dẫn nhạy cảm
        if is_sensitive_path(request.path):
            logger.warning(f"Sensitive path access attempt from IP: {client_ip}, path: {request.path}")
            record_suspicious_activity(client_ip, "sensitive_path_access", request.path)
    
    # Tự động dọn dẹp danh sách các IP bị chặn
    @app.after_request
    def cleanup_security_data(response):
        """Dọn dẹp dữ liệu bảo mật sau mỗi request"""
        cleanup_expired_blocks()
        return response
    
    # Định kỳ xóa lịch sử cũ
    def cleanup_thread():
        while True:
            time.sleep(3600)  # 1 giờ
            with lock:
                cleanup_old_failed_attempts()
                
    # Khởi động thread dọn dẹp
    cleanup_t = threading.Thread(target=cleanup_thread, daemon=True)
    cleanup_t.start()
    
    logger.info("Attack prevention module initialized")
    return app

def is_ip_blocked(ip: str) -> bool:
    """Kiểm tra xem một IP có bị chặn không
    
    Args:
        ip: Địa chỉ IP để kiểm tra
        
    Returns:
        bool: True nếu IP đang bị chặn
    """
    with lock:
        if ip in blocked_ips:
            if time.time() < blocked_ips[ip]:
                return True
            else:
                # Hết thời gian block
                del blocked_ips[ip]
        return False

def block_ip(ip: str, duration: int = 3600) -> None:
    """Chặn một IP trong một khoảng thời gian
    
    Args:
        ip: Địa chỉ IP cần chặn
        duration: Thời gian chặn (giây), mặc định 1 giờ
    """
    with lock:
        # Tính thời gian hết hạn
        expiry_time = time.time() + duration
        blocked_ips[ip] = expiry_time
        
        logger.warning(f"IP {ip} blocked for {duration} seconds")
        
def cleanup_expired_blocks() -> None:
    """Dọn dẹp các IP đã hết thời gian chặn"""
    now = time.time()
    with lock:
        to_remove = [ip for ip, expiry in blocked_ips.items() if now >= expiry]
        for ip in to_remove:
            del blocked_ips[ip]

def record_failed_login(ip: str) -> bool:
    """Ghi nhận đăng nhập thất bại và kiểm tra brute force
    
    Args:
        ip: Địa chỉ IP
        
    Returns:
        bool: True nếu phát hiện brute force
    """
    now = time.time()
    with lock:
        # Thêm timestamp mới vào danh sách
        failed_login_attempts[ip].append(now)
        
        # Chỉ giữ lại các lần thất bại trong 30 phút gần nhất
        failed_login_attempts[ip] = [t for t in failed_login_attempts[ip] if now - t < 1800]
        
        # Nếu có quá nhiều lần thất bại (5+) trong thời gian ngắn, đó có thể là brute force
        if len(failed_login_attempts[ip]) >= 5:
            logger.warning(f"Possible brute force attack detected from IP: {ip}")
            block_ip(ip, duration=1800)  # Block IP trong 30 phút
            return True
            
        return False

def cleanup_old_failed_attempts() -> None:
    """Dọn dẹp lịch sử đăng nhập thất bại cũ"""
    now = time.time()
    with lock:
        for ip in list(failed_login_attempts.keys()):
            # Giữ lại các lần thất bại trong 30 phút gần nhất
            failed_login_attempts[ip] = [t for t in failed_login_attempts[ip] if now - t < 1800]
            
            # Nếu không còn lần thất bại nào, xóa IP khỏi dict
            if not failed_login_attempts[ip]:
                del failed_login_attempts[ip]

def detect_attack_patterns() -> bool:
    """Phát hiện các mẫu tấn công trong request
    
    Returns:
        bool: True nếu phát hiện mẫu tấn công
    """
    # Kiểm tra URL path
    path = request.path
    for pattern in ATTACK_PATTERNS:
        if re.match(pattern, path, re.IGNORECASE):
            return True
    
    # Kiểm tra query parameters
    if request.args:
        query_string = "&".join([f"{k}={v}" for k, v in request.args.items()])
        for pattern in ATTACK_PATTERNS:
            if re.match(pattern, query_string, re.IGNORECASE):
                return True
    
    # Kiểm tra form data
    if request.form:
        form_data = "&".join([f"{k}={v}" for k, v in request.form.items()])
        for pattern in ATTACK_PATTERNS:
            if re.match(pattern, form_data, re.IGNORECASE):
                return True
    
    # Kiểm tra JSON data
    if request.is_json:
        try:
            json_data = json.dumps(request.get_json())
            for pattern in ATTACK_PATTERNS:
                if re.match(pattern, json_data, re.IGNORECASE):
                    return True
        except:
            # Invalid JSON, có thể là tấn công
            return True
    
    return False

def is_sensitive_path(path: str) -> bool:
    """Kiểm tra xem path có phải là đường dẫn nhạy cảm không
    
    Args:
        path: Đường dẫn cần kiểm tra
        
    Returns:
        bool: True nếu là đường dẫn nhạy cảm
    """
    path_lower = path.lower()
    
    # Kiểm tra các đường dẫn nhạy cảm
    for sensitive in SENSITIVE_PATHS:
        if sensitive.lower() in path_lower:
            # Cho phép đường dẫn /admin nếu là một phần của ứng dụng
            if sensitive == "/admin" and path_lower.startswith("/admin") and current_app.url_map.is_endpoint_expecting(request.endpoint):
                return False
            return True
    
    return False

def detect_request_flooding(ip: str, max_requests: int = 50, interval: int = 10) -> bool:
    """Phát hiện request flooding từ một IP
    
    Args:
        ip: Địa chỉ IP
        max_requests: Số request tối đa trong interval
        interval: Khoảng thời gian (giây)
        
    Returns:
        bool: True nếu phát hiện flooding
    """
    # Lưu request history vào g object của Flask
    now = time.time()
    if not hasattr(g, 'request_history'):
        g.request_history = defaultdict(list)
    
    # Thêm timestamp mới
    g.request_history[ip].append(now)
    
    # Chỉ giữ lại các request trong khoảng thời gian interval
    g.request_history[ip] = [t for t in g.request_history[ip] if now - t < interval]
    
    # Nếu có quá nhiều request trong khoảng thời gian, đó là flooding
    return len(g.request_history[ip]) > max_requests

def record_attack(ip: str) -> None:
    """Ghi nhận một cuộc tấn công từ IP
    
    Args:
        ip: Địa chỉ IP
    """
    # Mặc định sẽ block IP nếu phát hiện tấn công
    block_ip(ip, duration=3600)  # Block 1 giờ
    
    # Log chi tiết về cuộc tấn công
    logger.warning(f"Attack detected from IP: {ip}")
    logger.warning(f"Request path: {request.path}")
    logger.warning(f"Request method: {request.method}")
    logger.warning(f"User agent: {request.user_agent}")
    
    # TODO: Gửi thông báo tới admin nếu cần
    
def record_suspicious_activity(ip: str, activity_type: str, details: str) -> None:
    """Ghi nhận hoạt động đáng ngờ
    
    Args:
        ip: Địa chỉ IP
        activity_type: Loại hoạt động
        details: Chi tiết
    """
    logger.warning(f"Suspicious activity: {activity_type} from IP: {ip}")
    logger.warning(f"Details: {details}")
    
    # TODO: Lưu vào database nếu cần
    
def brute_force_protection(view_func=None, max_attempts: int = 5, block_duration: int = 1800):
    """Decorator để bảo vệ các route dễ bị brute force
    
    Args:
        view_func: View function
        max_attempts: Số lần thử tối đa
        block_duration: Thời gian block (giây)
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            client_ip = request.remote_addr
            
            # Kiểm tra IP có bị chặn không
            if is_ip_blocked(client_ip):
                logger.warning(f"Blocked brute force attempt from IP: {client_ip}")
                abort(403)
                
            # Kiểm tra số lần thử
            with lock:
                now = time.time()
                attempts = [t for t in failed_login_attempts[client_ip] if now - t < 1800]
                
                if len(attempts) >= max_attempts:
                    # Block IP và trả về lỗi
                    block_ip(client_ip, duration=block_duration)
                    logger.warning(f"Brute force detected from IP: {client_ip}, blocking for {block_duration} seconds")
                    abort(403)
            
            # Nếu OK, tiếp tục chạy view function
            return f(*args, **kwargs)
        return decorated_function
    
    if view_func:
        return decorator(view_func)
    return decorator 