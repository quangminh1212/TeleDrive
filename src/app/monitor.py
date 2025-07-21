#!/usr/bin/env python3
"""
TeleDrive Observability Module

Comprehensive monitoring, logging, and metrics collection following
12-factor app principles and observability best practices.
"""

import os
import sys
import time
import logging
import functools
from typing import Dict, Any, Optional, Callable
from datetime import datetime, timezone
from pathlib import Path

import psutil
from flask import Flask, request, g, jsonify
from werkzeug.exceptions import HTTPException


class StructuredLogger:
    """Structured logging with JSON output for production."""
    
    def __init__(self, name: str, level: str = "INFO"):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(getattr(logging, level.upper()))
        
        # Remove existing handlers
        for handler in self.logger.handlers[:]:
            self.logger.removeHandler(handler)
        
        # Create formatter
        formatter = logging.Formatter(
            '{"timestamp": "%(asctime)s", "level": "%(levelname)s", '
            '"logger": "%(name)s", "message": "%(message)s", '
            '"module": "%(module)s", "function": "%(funcName)s", '
            '"line": %(lineno)d}'
        )
        
        # Console handler
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(formatter)
        self.logger.addHandler(console_handler)
        
        # File handler (if log directory exists)
        log_dir = Path("logs")
        if log_dir.exists():
            file_handler = logging.FileHandler(log_dir / f"{name}.log")
            file_handler.setFormatter(formatter)
            self.logger.addHandler(file_handler)
    
    def info(self, message: str, **kwargs):
        """Log info message with additional context."""
        self._log_with_context("info", message, **kwargs)
    
    def error(self, message: str, **kwargs):
        """Log error message with additional context."""
        self._log_with_context("error", message, **kwargs)
    
    def warning(self, message: str, **kwargs):
        """Log warning message with additional context."""
        self._log_with_context("warning", message, **kwargs)
    
    def debug(self, message: str, **kwargs):
        """Log debug message with additional context."""
        self._log_with_context("debug", message, **kwargs)
    
    def _log_with_context(self, level: str, message: str, **kwargs):
        """Log message with additional context."""
        if kwargs:
            context = ", ".join(f'"{k}": "{v}"' for k, v in kwargs.items())
            message = f"{message} | {context}"
        
        getattr(self.logger, level)(message)


class MetricsCollector:
    """Collect and expose application metrics."""
    
    def __init__(self):
        self.metrics: Dict[str, Any] = {
            "requests_total": 0,
            "requests_by_status": {},
            "response_times": [],
            "active_users": 0,
            "database_connections": 0,
            "memory_usage_mb": 0,
            "cpu_usage_percent": 0,
        }
        self.start_time = time.time()
    
    def increment_request(self, status_code: int, response_time: float):
        """Record request metrics."""
        self.metrics["requests_total"] += 1
        
        status_key = str(status_code)
        if status_key not in self.metrics["requests_by_status"]:
            self.metrics["requests_by_status"][status_key] = 0
        self.metrics["requests_by_status"][status_key] += 1
        
        self.metrics["response_times"].append(response_time)
        
        # Keep only last 1000 response times
        if len(self.metrics["response_times"]) > 1000:
            self.metrics["response_times"] = self.metrics["response_times"][-1000:]
    
    def update_system_metrics(self):
        """Update system resource metrics."""
        process = psutil.Process()
        
        # Memory usage
        memory_info = process.memory_info()
        self.metrics["memory_usage_mb"] = memory_info.rss / 1024 / 1024
        
        # CPU usage
        self.metrics["cpu_usage_percent"] = process.cpu_percent()
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get current metrics snapshot."""
        self.update_system_metrics()
        
        # Calculate response time statistics
        response_times = self.metrics["response_times"]
        if response_times:
            avg_response_time = sum(response_times) / len(response_times)
            max_response_time = max(response_times)
            min_response_time = min(response_times)
        else:
            avg_response_time = max_response_time = min_response_time = 0
        
        return {
            **self.metrics,
            "uptime_seconds": time.time() - self.start_time,
            "avg_response_time_ms": avg_response_time * 1000,
            "max_response_time_ms": max_response_time * 1000,
            "min_response_time_ms": min_response_time * 1000,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }


class HealthChecker:
    """Comprehensive health checking system."""
    
    def __init__(self, app: Flask):
        self.app = app
        self.checks = {}
    
    def add_check(self, name: str, check_func: Callable[[], bool]):
        """Add a health check function."""
        self.checks[name] = check_func
    
    def check_database(self) -> bool:
        """Check database connectivity."""
        try:
            from app.database import db
            with self.app.app_context():
                db.engine.execute("SELECT 1")
            return True
        except Exception:
            return False
    
    def check_disk_space(self) -> bool:
        """Check available disk space."""
        try:
            disk_usage = psutil.disk_usage('/')
            free_percent = (disk_usage.free / disk_usage.total) * 100
            return free_percent > 10  # At least 10% free space
        except Exception:
            return False
    
    def check_memory(self) -> bool:
        """Check memory usage."""
        try:
            memory = psutil.virtual_memory()
            return memory.percent < 90  # Less than 90% memory usage
        except Exception:
            return False
    
    def get_health_status(self) -> Dict[str, Any]:
        """Get comprehensive health status."""
        checks_result = {}
        overall_healthy = True
        
        # Built-in checks
        built_in_checks = {
            "database": self.check_database,
            "disk_space": self.check_disk_space,
            "memory": self.check_memory,
        }
        
        # Run all checks
        all_checks = {**built_in_checks, **self.checks}
        
        for name, check_func in all_checks.items():
            try:
                result = check_func()
                checks_result[name] = {
                    "status": "healthy" if result else "unhealthy",
                    "success": result
                }
                if not result:
                    overall_healthy = False
            except Exception as e:
                checks_result[name] = {
                    "status": "error",
                    "success": False,
                    "error": str(e)
                }
                overall_healthy = False
        
        return {
            "status": "healthy" if overall_healthy else "unhealthy",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "checks": checks_result,
            "version": "1.0.0",  # Should come from package metadata
        }


# Global instances
logger = StructuredLogger("teledrive")
metrics = MetricsCollector()


def init_observability(app: Flask):
    """Initialize observability components for Flask app."""
    
    # Initialize health checker
    health_checker = HealthChecker(app)
    
    # Request timing middleware
    @app.before_request
    def before_request():
        g.start_time = time.time()
    
    @app.after_request
    def after_request(response):
        if hasattr(g, 'start_time'):
            response_time = time.time() - g.start_time
            metrics.increment_request(response.status_code, response_time)
            
            # Log request
            logger.info(
                "Request completed",
                method=request.method,
                path=request.path,
                status_code=response.status_code,
                response_time_ms=response_time * 1000,
                user_agent=request.headers.get('User-Agent', 'Unknown')
            )
        
        return response
    
    # Error handling
    @app.errorhandler(Exception)
    def handle_exception(e):
        # Log error
        logger.error(
            "Unhandled exception",
            error=str(e),
            path=request.path,
            method=request.method,
            user_agent=request.headers.get('User-Agent', 'Unknown')
        )
        
        if isinstance(e, HTTPException):
            return e
        
        # Return generic error for unhandled exceptions
        return jsonify({
            "error": "Internal server error",
            "message": "An unexpected error occurred"
        }), 500
    
    # Health check endpoint
    @app.route('/health')
    def health_check():
        """Health check endpoint."""
        health_status = health_checker.get_health_status()
        status_code = 200 if health_status["status"] == "healthy" else 503
        return jsonify(health_status), status_code
    
    # Metrics endpoint
    @app.route('/metrics')
    def metrics_endpoint():
        """Metrics endpoint."""
        return jsonify(metrics.get_metrics())
    
    # Ready check endpoint
    @app.route('/ready')
    def ready_check():
        """Readiness check endpoint."""
        # Simple check - if app is running, it's ready
        return jsonify({
            "status": "ready",
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
    
    logger.info("Observability initialized", app_name=app.name)
    return health_checker


def monitor_function(func_name: Optional[str] = None):
    """Decorator to monitor function execution."""
    def decorator(func: Callable) -> Callable:
        name = func_name or f"{func.__module__}.{func.__name__}"
        
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                execution_time = time.time() - start_time
                logger.debug(
                    "Function executed successfully",
                    function=name,
                    execution_time_ms=execution_time * 1000
                )
                return result
            except Exception as e:
                execution_time = time.time() - start_time
                logger.error(
                    "Function execution failed",
                    function=name,
                    error=str(e),
                    execution_time_ms=execution_time * 1000
                )
                raise
        
        return wrapper
    return decorator
