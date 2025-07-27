#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Performance Module

Cung cấp các công cụ để theo dõi và cải thiện hiệu suất của ứng dụng TeleDrive
"""

import time
import functools
import threading
from typing import Dict, List, Any, Callable, Optional
import logging

# Khởi tạo logger
logger = logging.getLogger(__name__)

# Lưu trữ các metrics hiệu suất
_performance_metrics = {
    'api_calls': {},
    'slow_queries': [],
    'memory_usage': [],
    'request_times': {}
}

# Khóa để đảm bảo thread safety
_metrics_lock = threading.Lock()

def track_time(name: str) -> Callable:
    """Decorator để theo dõi thời gian thực hiện của một hàm
    
    Args:
        name: Tên của hàm/endpoint để theo dõi
        
    Returns:
        Decorator function
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            result = func(*args, **kwargs)
            execution_time = time.time() - start_time
            
            # Lưu metrics
            with _metrics_lock:
                if name not in _performance_metrics['request_times']:
                    _performance_metrics['request_times'][name] = {
                        'count': 0,
                        'total_time': 0,
                        'min_time': float('inf'),
                        'max_time': 0,
                        'avg_time': 0,
                        'last_time': 0
                    }
                
                metrics = _performance_metrics['request_times'][name]
                metrics['count'] += 1
                metrics['total_time'] += execution_time
                metrics['min_time'] = min(metrics['min_time'], execution_time)
                metrics['max_time'] = max(metrics['max_time'], execution_time)
                metrics['avg_time'] = metrics['total_time'] / metrics['count']
                metrics['last_time'] = execution_time
                
                # Log slow operations
                if execution_time > 1.0:  # Ngưỡng cho slow operation: 1s
                    _performance_metrics['slow_queries'].append({
                        'name': name,
                        'time': execution_time,
                        'timestamp': time.time()
                    })
                    # Giới hạn số lượng slow queries được lưu trữ
                    if len(_performance_metrics['slow_queries']) > 100:
                        _performance_metrics['slow_queries'].pop(0)
                    
                    logger.warning(f"Slow operation: {name} took {execution_time:.2f}s")
            
            return result
        return wrapper
    return decorator

def track_api_call(name: str) -> None:
    """Ghi lại thông tin về API call
    
    Args:
        name: Tên của API endpoint
    """
    with _metrics_lock:
        if name not in _performance_metrics['api_calls']:
            _performance_metrics['api_calls'][name] = 0
        _performance_metrics['api_calls'][name] += 1

def track_memory_usage(usage_mb: float) -> None:
    """Ghi lại thông tin về memory usage
    
    Args:
        usage_mb: Memory usage in MB
    """
    with _metrics_lock:
        _performance_metrics['memory_usage'].append({
            'usage_mb': usage_mb,
            'timestamp': time.time()
        })
        
        # Giới hạn số lượng memory measurements được lưu trữ
        if len(_performance_metrics['memory_usage']) > 100:
            _performance_metrics['memory_usage'].pop(0)

def get_performance_metrics() -> Dict[str, Any]:
    """Lấy tất cả performance metrics
    
    Returns:
        Dict chứa tất cả metrics hiệu suất
    """
    with _metrics_lock:
        return {
            'api_calls': dict(_performance_metrics['api_calls']),
            'slow_queries': list(_performance_metrics['slow_queries']),
            'memory_usage': list(_performance_metrics['memory_usage']),
            'request_times': dict(_performance_metrics['request_times'])
        }

def get_slow_operations(threshold: float = 1.0, limit: int = 10) -> List[Dict[str, Any]]:
    """Lấy danh sách các slow operations
    
    Args:
        threshold: Ngưỡng thời gian (giây) để xác định slow operation
        limit: Giới hạn số lượng kết quả
        
    Returns:
        Danh sách các slow operations
    """
    with _metrics_lock:
        # Lọc các slow queries và sắp xếp theo thời gian giảm dần
        slow_operations = [q for q in _performance_metrics['slow_queries'] if q['time'] >= threshold]
        slow_operations.sort(key=lambda x: x['time'], reverse=True)
        return slow_operations[:limit]

def reset_metrics() -> None:
    """Reset tất cả performance metrics"""
    with _metrics_lock:
        _performance_metrics['api_calls'] = {}
        _performance_metrics['slow_queries'] = []
        _performance_metrics['memory_usage'] = []
        _performance_metrics['request_times'] = {}

def memory_monitor_start() -> None:
    """Bắt đầu theo dõi memory usage định kỳ"""
    try:
        import psutil
        import threading
        
        def monitor_memory():
            while True:
                process = psutil.Process()
                memory_info = process.memory_info()
                memory_mb = memory_info.rss / (1024 * 1024)  # Convert to MB
                
                track_memory_usage(memory_mb)
                
                # Sleep for 60 seconds
                time.sleep(60)
        
        # Start monitoring in background thread
        monitor_thread = threading.Thread(target=monitor_memory, daemon=True)
        monitor_thread.start()
        logger.info("Memory monitoring started")
    except ImportError:
        logger.warning("psutil not installed, memory monitoring disabled")
    except Exception as e:
        logger.error(f"Failed to start memory monitoring: {str(e)}")

# Export public API
__all__ = [
    'track_time', 
    'track_api_call', 
    'track_memory_usage',
    'get_performance_metrics', 
    'get_slow_operations',
    'reset_metrics',
    'memory_monitor_start'
] 