#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Production Logging System for TeleDrive
Structured logging với JSON format, rotation và centralized collection
"""

import os
import json
import logging
import logging.handlers
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional
from flask import request, g, has_request_context
import traceback

class JSONFormatter(logging.Formatter):
    """JSON formatter for structured logging"""

    def format(self, record):
        """Format log record as JSON"""
        log_entry = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno,
        }

        # Add request context if available
        if has_request_context():
            log_entry.update({
                'request_id': getattr(g, 'request_id', None),
                'client_ip': getattr(g, 'client_ip', None),
                'user_agent': getattr(g, 'user_agent', None),
                'method': request.method,
                'path': request.path,
                'endpoint': request.endpoint,
            })

            # Add user info if authenticated
            from flask_login import current_user
            if current_user and current_user.is_authenticated:
                log_entry['user_id'] = current_user.id
                log_entry['username'] = current_user.username

        # Add exception info if present
        if record.exc_info:
            log_entry['exception'] = {
                'type': record.exc_info[0].__name__,
                'message': str(record.exc_info[1]),
                'traceback': traceback.format_exception(*record.exc_info)
            }

        # Add extra fields
        if hasattr(record, 'extra_fields'):
            log_entry.update(record.extra_fields)

        return json.dumps(log_entry, ensure_ascii=False)

class ProductionLogger:
    """Production logging manager"""

    def __init__(self, config):
        self.config = config
        self.loggers = {}
        self._setup_logging()

    def _setup_logging(self):
        """Setup logging configuration"""
        # Create logs directory
        log_dir = Path(self.config.logging.file_path).parent
        log_dir.mkdir(parents=True, exist_ok=True)

        # Configure root logger
        root_logger = logging.getLogger()
        root_logger.setLevel(getattr(logging, self.config.logging.level.upper()))

        # Clear existing handlers
        root_logger.handlers.clear()

        # Setup formatters
        if self.config.logging.format == 'json':
            formatter = JSONFormatter()
        else:
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )

        # File handler with rotation
        file_handler = logging.handlers.RotatingFileHandler(
            filename=self.config.logging.file_path,
            maxBytes=self.config.logging.max_bytes,
            backupCount=self.config.logging.backup_count,
            encoding='utf-8'
        )
        file_handler.setFormatter(formatter)
        root_logger.addHandler(file_handler)

        # Console handler (if enabled)
        if self.config.logging.enable_console:
            console_handler = logging.StreamHandler()
            console_handler.setFormatter(formatter)
            root_logger.addHandler(console_handler)

        # Setup specific loggers
        self._setup_app_loggers()

    def _setup_app_loggers(self):
        """Setup application-specific loggers"""
        # Main application logger
        self.loggers['app'] = logging.getLogger('teledrive.app')

        # Authentication logger
        self.loggers['auth'] = logging.getLogger('teledrive.auth')

        # API logger
        self.loggers['api'] = logging.getLogger('teledrive.api')

        # Security logger
        self.loggers['security'] = logging.getLogger('teledrive.security')

        # Database logger
        self.loggers['database'] = logging.getLogger('teledrive.database')

        # Telegram logger
        self.loggers['telegram'] = logging.getLogger('teledrive.telegram')

        # Performance logger
        self.loggers['performance'] = logging.getLogger('teledrive.performance')

    def get_logger(self, name: str) -> logging.Logger:
        """Get logger by name"""
        return self.loggers.get(name, logging.getLogger(f'teledrive.{name}'))

    def log_request(self, response_status: int, response_time: float):
        """Log HTTP request"""
        logger = self.get_logger('api')

        log_data = {
            'response_status': response_status,
            'response_time_ms': round(response_time * 1000, 2),
        }

        if response_status >= 500:
            logger.error("Server error", extra={'extra_fields': log_data})
        elif response_status >= 400:
            logger.warning("Client error", extra={'extra_fields': log_data})
        else:
            logger.info("Request completed", extra={'extra_fields': log_data})

    def log_auth_event(self, event_type: str, user_id: Optional[int] = None,
                      phone_number: Optional[str] = None, success: bool = True,
                      details: Optional[Dict[str, Any]] = None):
        """Log authentication events"""
        logger = self.get_logger('auth')

        log_data = {
            'event_type': event_type,
            'user_id': user_id,
            'phone_number': phone_number,
            'success': success,
        }

        if details:
            log_data.update(details)

        if success:
            logger.info(f"Auth event: {event_type}", extra={'extra_fields': log_data})
        else:
            logger.warning(f"Auth failed: {event_type}", extra={'extra_fields': log_data})

    def log_security_event(self, event_type: str, severity: str = 'info',
                          details: Optional[Dict[str, Any]] = None):
        """Log security events"""
        logger = self.get_logger('security')

        log_data = {
            'event_type': event_type,
            'severity': severity,
        }

        if details:
            log_data.update(details)

        log_method = getattr(logger, severity.lower(), logger.info)
        log_method(f"Security event: {event_type}", extra={'extra_fields': log_data})

    def log_performance(self, operation: str, duration: float,
                       details: Optional[Dict[str, Any]] = None):
        """Log performance metrics"""
        logger = self.get_logger('performance')

        log_data = {
            'operation': operation,
            'duration_ms': round(duration * 1000, 2),
        }

        if details:
            log_data.update(details)

        logger.info(f"Performance: {operation}", extra={'extra_fields': log_data})

    def log_database_event(self, event_type: str, query: Optional[str] = None,
                          duration: Optional[float] = None, error: Optional[str] = None):
        """Log database events"""
        logger = self.get_logger('database')

        log_data = {
            'event_type': event_type,
            'query': query,
            'duration_ms': round(duration * 1000, 2) if duration else None,
            'error': error,
        }

        if error:
            logger.error(f"Database error: {event_type}", extra={'extra_fields': log_data})
        else:
            logger.info(f"Database event: {event_type}", extra={'extra_fields': log_data})

class RequestLoggingMiddleware:
    """Middleware for request logging"""

    def __init__(self, app, logger_instance):
        self.app = app
        self.logger = logger_instance
        self._setup_middleware()

    def _setup_middleware(self):
        """Setup request logging middleware"""

        @self.app.before_request
        def before_request():
            """Log request start"""
            g.start_time = datetime.utcnow()

            # Generate request ID
            import uuid
            g.request_id = str(uuid.uuid4())

        @self.app.after_request
        def after_request(response):
            """Log request completion"""
            if hasattr(g, 'start_time'):
                duration = (datetime.utcnow() - g.start_time).total_seconds()
                self.logger.log_request(response.status_code, duration)

            return response

        @self.app.errorhandler(404)
        def handle_404(e):
            """Handle 404 errors more gracefully"""
            logger = self.logger.get_logger('app')
            logger.warning(f"404 Not Found: {request.path}")

            # Return JSON for API endpoints, HTML for others
            if request.path.startswith('/api/'):
                return {
                    'error': 'Not Found',
                    'message': f'API endpoint {request.path} not found'
                }, 404
            else:
                return '', 404  # Silent 404 for non-API requests like favicon

        @self.app.errorhandler(Exception)
        def handle_exception(e):
            """Log unhandled exceptions"""
            logger = self.logger.get_logger('app')
            logger.error(f"Unhandled exception: {str(e)}", exc_info=True)

            # Return generic error response
            return {
                'error': 'Internal server error',
                'message': 'An unexpected error occurred'
            }, 500

# Global logger instance
production_logger = None

def init_production_logging(app, config):
    """Initialize production logging"""
    global production_logger

    production_logger = ProductionLogger(config)

    # Setup request logging middleware
    RequestLoggingMiddleware(app, production_logger)

    # Log application startup
    logger = production_logger.get_logger('app')
    logger.info("TeleDrive application started", extra={
        'extra_fields': {
            'environment': config.environment,
            'debug': config.debug,
            'version': getattr(config, 'version', 'unknown')
        }
    })

    return production_logger

def get_logger(name: str = 'app') -> logging.Logger:
    """Get logger instance"""
    if production_logger:
        return production_logger.get_logger(name)
    else:
        return logging.getLogger(f'teledrive.{name}')

# Convenience functions
def log_auth_event(event_type: str, **kwargs):
    """Log authentication event"""
    if production_logger:
        production_logger.log_auth_event(event_type, **kwargs)

def log_security_event(event_type: str, **kwargs):
    """Log security event"""
    if production_logger:
        production_logger.log_security_event(event_type, **kwargs)

def log_performance(operation: str, duration: float, **kwargs):
    """Log performance metric"""
    if production_logger:
        production_logger.log_performance(operation, duration, **kwargs)
