#!/usr/bin/env python3
"""
TeleDrive Monitor Module

Monitoring, logging, and metrics collection following
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
        
        # Keep only last 1000 response times to prevent memory growth
        if len(self.metrics["response_times"]) > 1000:
            self.metrics["response_times"] = self.metrics["response_times"][-1000:]
    
    def update_system_metrics(self):
        """Update system metrics."""
        try:
            process = psutil.Process(os.getpid())
            self.metrics["memory_usage_mb"] = process.memory_info().rss / 1024 / 1024
            self.metrics["cpu_usage_percent"] = process.cpu_percent(interval=0.1)
        except Exception:
            # Don't crash if psutil fails
            pass
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get all metrics with calculated values."""
        self.update_system_metrics()
        
        # Calculate avg response time
        response_times = self.metrics["response_times"]
        avg_response_time = sum(response_times) / len(response_times) if response_times else 0
        
        # Add calculated metrics
        result = {
            **self.metrics,
            "uptime_seconds": int(time.time() - self.start_time),
            "avg_response_time_ms": round(avg_response_time * 1000, 2)
        }
        
        # Don't return the full response times array
        result["response_times"] = {
            "count": len(response_times),
            "avg_ms": round(avg_response_time * 1000, 2)
        }
        
        return result


class HealthChecker:
    """Health check system for the application."""
    
    def __init__(self, app: Flask):
        self.app = app
        self.checks = {}
    
    def add_check(self, name: str, check_func: Callable[[], bool]):
        """Add a health check."""
        self.checks[name] = check_func
    
    def check_database(self) -> bool:
        """Check database connection."""
        try:
            with self.app.app_context():
                db = self.app.extensions.get('sqlalchemy')
                if db:
                    engine = db.engine
                    connection = engine.connect()
                    connection.close()
                    return True
            return False
        except Exception:
            return False
    
    def check_disk_space(self) -> bool:
        """Check if disk space is sufficient."""
        try:
            path = Path(self.app.instance_path)
            stats = path.stat()
            free_space = psutil.disk_usage(path.root).free / (1024 * 1024)
            return free_space > 100  # At least 100MB free
        except Exception:
            return False
    
    def check_memory(self) -> bool:
        """Check if memory usage is within acceptable limits."""
        try:
            process = psutil.Process(os.getpid())
            memory_mb = process.memory_info().rss / (1024 * 1024)
            return memory_mb < 1024  # Less than 1GB
        except Exception:
            return True  # Assume OK if we can't check
    
    def get_health_status(self) -> Dict[str, Any]:
        """Get health status of all components."""
        results = {}
        status = "healthy"
        
        # Run all registered checks
        for name, check_func in self.checks.items():
            try:
                passed = check_func()
                results[name] = {
                    "status": "pass" if passed else "fail",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
                
                if not passed:
                    status = "unhealthy"
            except Exception as e:
                results[name] = {
                    "status": "fail",
                    "error": str(e),
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
                status = "unhealthy"
        
        # Add system checks
        system_checks = {
            "database": self.check_database,
            "disk": self.check_disk_space,
            "memory": self.check_memory,
        }
        
        for name, check_func in system_checks.items():
            try:
                passed = check_func()
                results[name] = {
                    "status": "pass" if passed else "fail",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
                
                if not passed:
                    status = "unhealthy"
            except Exception as e:
                results[name] = {
                    "status": "fail",
                    "error": str(e),
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
                status = "unhealthy"
        
        # Add version info and uptime
        return {
            "status": status,
            "version": os.environ.get("APP_VERSION", "unknown"),
            "checks": results,
            "uptime": int(time.time() - psutil.boot_time()),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }


# Create logger instance that can be imported by other modules
logger = StructuredLogger("teledrive")

def init_monitoring(app: Flask):
    """Initialize observability components."""
    # Use the global logger instance
    global logger
    metrics = MetricsCollector()
    health = HealthChecker(app)
    
    # Set up request tracking
    @app.before_request
    def before_request():
        """Track request start time."""
        g.start_time = time.time()
    
    @app.after_request
    def after_request(response):
        """Track request metrics."""
        # Calculate response time
        if hasattr(g, 'start_time'):
            response_time = time.time() - g.start_time
            metrics.increment_request(response.status_code, response_time)
            
            # Add Server-Timing header for debugging
            response.headers['Server-Timing'] = f'app;dur={int(response_time*1000)}'
        
        # Add version header
        response.headers['X-App-Version'] = os.environ.get("APP_VERSION", "dev")
        
        return response
    
    @app.errorhandler(Exception)
    def handle_exception(e):
        """Log exceptions and return appropriate responses."""
        # Log error
        logger.error(
            f"Unhandled exception: {str(e)}", 
            exception_type=type(e).__name__,
            path=request.path,
            method=request.method
        )
        
        # Handle HTTP exceptions
        if isinstance(e, HTTPException):
            return e
        
        # For production, return a generic error
        if not app.debug:
            return jsonify({
                "error": "Internal server error",
                "status": 500
            }), 500
        
        # In debug mode, let the default handler show details
        raise e
    
    # Register health check endpoint
    @app.route('/health')
    def health_check():
        """Health check endpoint."""
        status = health.get_health_status()
        http_status = 200 if status['status'] == 'healthy' else 503
        return jsonify(status), http_status
    
    # Register metrics endpoint
    @app.route('/metrics')
    def metrics_endpoint():
        """Metrics endpoint (admin only)."""
        return jsonify(metrics.get_metrics())
    
    # Register readiness probe
    @app.route('/ready')
    def ready_check():
        """Readiness check endpoint."""
        # Database is the main dependency
        if health.check_database():
            return jsonify({
                "status": "ready",
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
        else:
            return jsonify({
                "status": "not_ready",
                "reason": "Database connection failed",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }), 503
    
    # Store components in app for later use
    app.logger = logger
    app.metrics = metrics
    app.health = health


def monitor_function(func_name: Optional[str] = None):
    """Decorator to monitor function execution."""
    def decorator(func: Callable) -> Callable:
        """Decorator implementation."""
        
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            """Wrapper function."""
            start_time = time.time()
            name = func_name or f"{func.__module__}.{func.__name__}"
            
            try:
                result = func(*args, **kwargs)
                execution_time = time.time() - start_time
                
                # Log execution time if it's slow (> 1 second)
                if execution_time > 1:
                    logging.getLogger('teledrive').warning(
                        f"Slow function execution: {name} took {execution_time:.2f}s"
                    )
                
                return result
            except Exception as e:
                execution_time = time.time() - start_time
                
                # Log exception with execution time
                logging.getLogger('teledrive').error(
                    f"Function {name} failed after {execution_time:.2f}s: {str(e)}"
                )
                
                # Re-raise the exception
                raise
                
        return wrapper
    
    # Handle both @monitor_function and @monitor_function('name') forms
    if callable(func_name):
        f = func_name
        func_name = None
        return decorator(f)
    
    return decorator

# For backward compatibility
init_observability = init_monitoring 