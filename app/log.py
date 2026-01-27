#!/usr/bin/env python3
"""
Advanced Logging System cho Telegram File Scanner
Hỗ trợ logging chi tiết cho từng bước và module
"""

import logging
import logging.handlers
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any
import json


class DetailedLogger:
    """Logger chi tiết với nhiều level và file riêng biệt"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.loggers = {}
        self.setup_logging()
    
    def setup_logging(self):
        """Thiết lập logging system"""
        # Tạo thư mục logs
        logs_dir = Path("logs")
        logs_dir.mkdir(exist_ok=True)
        
        # Cấu hình format chi tiết
        detailed_format = logging.Formatter(
            self.config.get('format', 
                '%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s')
        )
        
        simple_format = logging.Formatter(
            '%(asctime)s - %(levelname)s - %(message)s'
        )
        
        # Setup main logger
        self.main_logger = self._create_logger(
            'main', 
            self.config.get('file', 'logs/scanner.log'),
            detailed_format
        )
        
        # Setup specialized loggers nếu enabled
        if self.config.get('separate_files', {}).get('enabled', False):
            separate_files = self.config['separate_files']
            
            self.config_logger = self._create_logger(
                'config', 
                separate_files.get('config_log', 'logs/config.log'),
                detailed_format
            )
            
            self.api_logger = self._create_logger(
                'api', 
                separate_files.get('api_log', 'logs/api.log'),
                detailed_format
            )
            
            self.files_logger = self._create_logger(
                'files', 
                separate_files.get('files_log', 'logs/files.log'),
                detailed_format
            )
            
            self.errors_logger = self._create_logger(
                'errors', 
                separate_files.get('errors_log', 'logs/errors.log'),
                detailed_format,
                level=logging.ERROR
            )
    
    def _create_logger(self, name: str, filename: str, formatter: logging.Formatter, 
                      level: Optional[int] = None) -> logging.Logger:
        """Tạo logger với cấu hình chi tiết"""
        logger = logging.getLogger(name)
        
        # Set level
        if level is None:
            level_str = self.config.get('level', 'INFO').upper()
            level = getattr(logging, level_str, logging.INFO)
        logger.setLevel(level)
        
        # Clear existing handlers
        logger.handlers.clear()
        
        # File handler với rotation
        file_handler = logging.handlers.RotatingFileHandler(
            filename,
            maxBytes=self.config.get('max_size_mb', 10) * 1024 * 1024,
            backupCount=self.config.get('backup_count', 5),
            encoding='utf-8'
        )
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
        
        # Console handler nếu enabled
        if self.config.get('console_output', True):
            # Use UTF-8 encoding for console output on Windows
            if sys.platform == 'win32':
                import codecs
                if hasattr(sys.stdout, 'buffer'):
                    console_stream = codecs.getwriter('utf-8')(sys.stdout.buffer, 'replace')
                else:
                    console_stream = sys.stdout
            else:
                console_stream = sys.stdout
            console_handler = logging.StreamHandler(console_stream)
            console_handler.setFormatter(formatter)
            logger.addHandler(console_handler)
        
        self.loggers[name] = logger
        return logger
    
    def log_step(self, step_name: str, details: str = "", level: str = "INFO"):
        """Log một bước cụ thể với format đặc biệt"""
        if not self.config.get('detailed_steps', True):
            return

        separator = "=" * 60
        timestamp = datetime.now().strftime("%H:%M:%S")

        message = f"\n{separator}\n[{timestamp}] BƯỚC: {step_name}\n{separator}"
        if details:
            message += f"\nChi tiết: {details}"
        message += f"\n{separator}"

        # Map custom levels to standard logging levels
        level_mapping = {
            'success': 'info',
            'debug': 'debug',
            'info': 'info',
            'warning': 'warning',
            'error': 'error',
            'critical': 'critical'
        }

        actual_level = level_mapping.get(level.lower(), 'info')

        # Ensure the level method exists
        if hasattr(self.main_logger, actual_level):
            getattr(self.main_logger, actual_level)(message)
        else:
            # Fallback to info level
            self.main_logger.info(message)
    
    def log_config_change(self, action: str, details: Dict[str, Any]):
        """Log thay đổi cấu hình"""
        if not self.config.get('log_config_changes', True):
            return
            
        if hasattr(self, 'config_logger'):
            self.config_logger.info(f"CONFIG {action}: {json.dumps(details, ensure_ascii=False, indent=2)}")
        else:
            self.main_logger.info(f"CONFIG {action}: {details}")
    
    def log_api_call(self, method: str, params: Dict[str, Any], result: str = ""):
        """Log API calls"""
        if not self.config.get('log_api_calls', True):
            return
            
        if hasattr(self, 'api_logger'):
            self.api_logger.debug(f"API CALL: {method} | Params: {params} | Result: {result}")
        else:
            self.main_logger.debug(f"API CALL: {method} | Params: {params}")
    
    def log_file_operation(self, operation: str, file_path: str, details: str = ""):
        """Log file operations"""
        if not self.config.get('log_file_operations', True):
            return
            
        if hasattr(self, 'files_logger'):
            self.files_logger.info(f"FILE {operation}: {file_path} | {details}")
        else:
            self.main_logger.info(f"FILE {operation}: {file_path}")
    
    def log_progress(self, current: int, total: int, item_name: str = "items"):
        """Log progress với chi tiết"""
        if not self.config.get('show_progress_details', True):
            return
            
        percentage = (current / total * 100) if total > 0 else 0
        self.main_logger.info(f"PROGRESS: {current}/{total} {item_name} ({percentage:.1f}%)")
    
    def log_error(self, error: Exception, context: str = ""):
        """Log lỗi chi tiết"""
        import traceback

        error_details = {
            'error_type': type(error).__name__,
            'error_message': str(error),
            'context': context,
            'traceback': traceback.format_exc()
        }

        if hasattr(self, 'errors_logger'):
            self.errors_logger.error(f"ERROR: {json.dumps(error_details, ensure_ascii=False, indent=2)}")
        else:
            self.main_logger.error(f"ERROR in {context}: {error}")
            self.main_logger.debug(traceback.format_exc())

    def log_authentication_event(self, event_type: str, details: Dict[str, Any], success: bool = True):
        """Log authentication events"""
        if not self.config.get('log_auth_events', True):
            return

        auth_details = {
            'event_type': event_type,
            'success': success,
            'timestamp': datetime.now().isoformat(),
            'details': details
        }

        level = 'INFO' if success else 'WARNING'
        if hasattr(self, 'api_logger'):
            getattr(self.api_logger, level.lower())(f"AUTH {event_type}: {json.dumps(auth_details, ensure_ascii=False)}")
        else:
            getattr(self.main_logger, level.lower())(f"AUTH {event_type}: {details}")

    def log_database_operation(self, operation: str, table: str, details: Dict[str, Any] = None):
        """Log database operations"""
        if not self.config.get('log_db_operations', True):
            return

        db_details = {
            'operation': operation,
            'table': table,
            'timestamp': datetime.now().isoformat(),
            'details': details or {}
        }

        if hasattr(self, 'files_logger'):
            self.files_logger.debug(f"DB {operation}: {json.dumps(db_details, ensure_ascii=False)}")
        else:
            self.main_logger.debug(f"DB {operation} on {table}: {details}")

    def log_performance_metric(self, metric_name: str, value: float, unit: str = "ms", context: str = ""):
        """Log performance metrics"""
        if not self.config.get('log_performance', True):
            return

        perf_details = {
            'metric': metric_name,
            'value': value,
            'unit': unit,
            'context': context,
            'timestamp': datetime.now().isoformat()
        }

        self.main_logger.info(f"PERFORMANCE {metric_name}: {value}{unit} - {context}")

        if hasattr(self, 'api_logger'):
            self.api_logger.debug(f"PERF METRIC: {json.dumps(perf_details, ensure_ascii=False)}")

    def log_security_event(self, event_type: str, details: Dict[str, Any], severity: str = "INFO"):
        """Log security events"""
        if not self.config.get('log_security_events', True):
            return

        security_details = {
            'event_type': event_type,
            'severity': severity,
            'timestamp': datetime.now().isoformat(),
            'details': details
        }

        if hasattr(self, 'errors_logger') and severity in ['WARNING', 'ERROR']:
            getattr(self.errors_logger, severity.lower())(f"SECURITY {event_type}: {json.dumps(security_details, ensure_ascii=False)}")
        else:
            getattr(self.main_logger, severity.lower())(f"SECURITY {event_type}: {details}")

    def log_user_action(self, action: str, user_id: str, details: Dict[str, Any] = None):
        """Log user actions"""
        if not self.config.get('log_user_actions', True):
            return

        action_details = {
            'action': action,
            'user_id': user_id,
            'timestamp': datetime.now().isoformat(),
            'details': details or {}
        }

        if hasattr(self, 'files_logger'):
            self.files_logger.info(f"USER ACTION {action}: {json.dumps(action_details, ensure_ascii=False)}")
        else:
            self.main_logger.info(f"USER {user_id} - {action}: {details}")

    def log_step_start(self, step_name: str, context: str = "", step_id: str = None):
        """Log the start of a detailed step"""
        if not self.config.get('detailed_steps', True):
            return

        step_id = step_id or f"step_{datetime.now().strftime('%H%M%S_%f')}"
        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]

        step_details = {
            'step_id': step_id,
            'step_name': step_name,
            'context': context,
            'status': 'STARTED',
            'timestamp': timestamp
        }

        message = f"🚀 STEP START [{step_id}]: {step_name}"
        if context:
            message += f" | Context: {context}"

        self.main_logger.info(message)

        if hasattr(self, 'api_logger'):
            self.api_logger.debug(f"STEP START: {json.dumps(step_details, ensure_ascii=False)}")

        return step_id

    def log_step_end(self, step_id: str, step_name: str, success: bool = True, result: str = "", error: str = ""):
        """Log the end of a detailed step"""
        if not self.config.get('detailed_steps', True):
            return

        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        status = "SUCCESS" if success else "FAILED"
        icon = "✅" if success else "❌"

        step_details = {
            'step_id': step_id,
            'step_name': step_name,
            'status': status,
            'success': success,
            'result': result,
            'error': error,
            'timestamp': timestamp
        }

        message = f"{icon} STEP END [{step_id}]: {step_name} - {status}"
        if result:
            message += f" | Result: {result}"
        if error:
            message += f" | Error: {error}"

        level = 'info' if success else 'error'
        getattr(self.main_logger, level)(message)

        if hasattr(self, 'api_logger'):
            self.api_logger.debug(f"STEP END: {json.dumps(step_details, ensure_ascii=False)}")

    def log_detailed_error(self, error: Exception, context: str = "", step_id: str = None, additional_info: Dict[str, Any] = None):
        """Log detailed error with enhanced context"""
        import traceback

        error_id = f"err_{datetime.now().strftime('%H%M%S_%f')}"

        error_details = {
            'error_id': error_id,
            'step_id': step_id,
            'error_type': type(error).__name__,
            'error_message': str(error),
            'context': context,
            'timestamp': datetime.now().isoformat(),
            'traceback': traceback.format_exc(),
            'additional_info': additional_info or {}
        }

        # Log to errors logger with full details
        if hasattr(self, 'errors_logger'):
            self.errors_logger.error(f"DETAILED ERROR [{error_id}]: {json.dumps(error_details, ensure_ascii=False, indent=2)}")
        else:
            self.main_logger.error(f"ERROR [{error_id}] in {context}: {error}")
            self.main_logger.debug(traceback.format_exc())

        # Log summary to main logger
        summary = f"❌ ERROR [{error_id}]: {type(error).__name__} in {context}"
        if step_id:
            summary += f" | Step: {step_id}"
        self.main_logger.error(summary)

        return error_id

    def log_function_entry(self, function_name: str, args: Dict[str, Any] = None, kwargs: Dict[str, Any] = None):
        """Log function entry with parameters"""
        if not self.config.get('log_function_calls', False):
            return

        call_details = {
            'function': function_name,
            'args': args or {},
            'kwargs': kwargs or {},
            'timestamp': datetime.now().isoformat()
        }

        self.main_logger.debug(f"🔵 FUNCTION ENTRY: {function_name}")

        if hasattr(self, 'api_logger'):
            self.api_logger.debug(f"FUNCTION ENTRY: {json.dumps(call_details, ensure_ascii=False)}")

    def log_function_exit(self, function_name: str, result: Any = None, execution_time: float = None):
        """Log function exit with result and timing"""
        if not self.config.get('log_function_calls', False):
            return

        exit_details = {
            'function': function_name,
            'result_type': type(result).__name__ if result is not None else 'None',
            'execution_time_ms': execution_time * 1000 if execution_time else None,
            'timestamp': datetime.now().isoformat()
        }

        message = f"🔴 FUNCTION EXIT: {function_name}"
        if execution_time:
            message += f" | Time: {execution_time*1000:.2f}ms"

        self.main_logger.debug(message)

        if hasattr(self, 'api_logger'):
            self.api_logger.debug(f"FUNCTION EXIT: {json.dumps(exit_details, ensure_ascii=False)}")

    def get_logger(self, name: str = 'main') -> logging.Logger:
        """Lấy logger theo tên"""
        return self.loggers.get(name, self.main_logger)


# Global logger instance
_detailed_logger: Optional[DetailedLogger] = None


def setup_detailed_logging(config: Dict[str, Any]) -> DetailedLogger:
    """Setup global detailed logger"""
    global _detailed_logger
    _detailed_logger = DetailedLogger(config)
    return _detailed_logger


def get_logger(name: str = 'main') -> logging.Logger:
    """Lấy logger instance"""
    if _detailed_logger is None:
        # Fallback to basic logging
        logging.basicConfig(level=logging.INFO)
        return logging.getLogger(name)
    return _detailed_logger.get_logger(name)


def log_step(step_name: str, details: str = "", level: str = "INFO"):
    """Log step với global logger"""
    if _detailed_logger:
        _detailed_logger.log_step(step_name, details, level)


def log_config_change(action: str, details: Dict[str, Any]):
    """Log config change với global logger"""
    if _detailed_logger:
        _detailed_logger.log_config_change(action, details)


def log_api_call(method: str, params: Dict[str, Any], result: str = ""):
    """Log API call với global logger"""
    if _detailed_logger:
        _detailed_logger.log_api_call(method, params, result)


def log_file_operation(operation: str, file_path: str, details: str = ""):
    """Log file operation với global logger"""
    if _detailed_logger:
        _detailed_logger.log_file_operation(operation, file_path, details)


def log_progress(current: int, total: int, item_name: str = "items"):
    """Log progress với global logger"""
    if _detailed_logger:
        _detailed_logger.log_progress(current, total, item_name)


def log_error(error: Exception, context: str = ""):
    """Log error với global logger"""
    if _detailed_logger:
        _detailed_logger.log_error(error, context)


def log_authentication_event(event_type: str, details: Dict[str, Any], success: bool = True):
    """Log authentication event với global logger"""
    if _detailed_logger:
        _detailed_logger.log_authentication_event(event_type, details, success)


def log_database_operation(operation: str, table: str, details: Dict[str, Any] = None):
    """Log database operation với global logger"""
    if _detailed_logger:
        _detailed_logger.log_database_operation(operation, table, details)


def log_performance_metric(metric_name: str, value: float, unit: str = "ms", context: str = ""):
    """Log performance metric với global logger"""
    if _detailed_logger:
        _detailed_logger.log_performance_metric(metric_name, value, unit, context)


def log_security_event(event_type: str, details: Dict[str, Any], severity: str = "INFO"):
    """Log security event với global logger"""
    if _detailed_logger:
        _detailed_logger.log_security_event(event_type, details, severity)


def log_user_action(action: str, user_id: str, details: Dict[str, Any] = None):
    """Log user action với global logger"""
    if _detailed_logger:
        _detailed_logger.log_user_action(action, user_id, details)


def log_step_start(step_name: str, context: str = "", step_id: str = None):
    """Log step start với global logger"""
    if _detailed_logger:
        return _detailed_logger.log_step_start(step_name, context, step_id)
    return None


def log_step_end(step_id: str, step_name: str, success: bool = True, result: str = "", error: str = ""):
    """Log step end với global logger"""
    if _detailed_logger:
        _detailed_logger.log_step_end(step_id, step_name, success, result, error)


def log_detailed_error(error: Exception, context: str = "", step_id: str = None, additional_info: Dict[str, Any] = None):
    """Log detailed error với global logger"""
    if _detailed_logger:
        return _detailed_logger.log_detailed_error(error, context, step_id, additional_info)
    return None


def log_function_entry(function_name: str, args: Dict[str, Any] = None, kwargs: Dict[str, Any] = None):
    """Log function entry với global logger"""
    if _detailed_logger:
        _detailed_logger.log_function_entry(function_name, args, kwargs)


def log_function_exit(function_name: str, result: Any = None, execution_time: float = None):
    """Log function exit với global logger"""
    if _detailed_logger:
        _detailed_logger.log_function_exit(function_name, result, execution_time)


def log_function_calls(include_args: bool = False, include_result: bool = False):
    """Decorator to automatically log function calls"""
    def decorator(func):
        import functools
        import time

        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            function_name = f"{func.__module__}.{func.__name__}"

            # Log function entry
            if include_args:
                log_function_entry(function_name,
                                 {'args': str(args)[:200] if args else None},
                                 {'kwargs': str(kwargs)[:200] if kwargs else None})
            else:
                log_function_entry(function_name)

            start_time = time.time()

            try:
                result = func(*args, **kwargs)
                execution_time = time.time() - start_time

                # Log function exit
                if include_result:
                    log_function_exit(function_name, str(result)[:200] if result else None, execution_time)
                else:
                    log_function_exit(function_name, None, execution_time)

                return result

            except Exception as e:
                execution_time = time.time() - start_time
                log_detailed_error(e, f"Function: {function_name}", additional_info={
                    'execution_time': execution_time,
                    'args_count': len(args),
                    'kwargs_count': len(kwargs)
                })
                raise

        return wrapper
    return decorator


def log_step_execution(step_name: str, context: str = ""):
    """Decorator to automatically log step execution"""
    def decorator(func):
        import functools

        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            step_id = log_step_start(step_name, context)

            try:
                result = func(*args, **kwargs)
                log_step_end(step_id, step_name, success=True, result=str(result)[:100] if result else "")
                return result

            except Exception as e:
                log_step_end(step_id, step_name, success=False, error=str(e))
                log_detailed_error(e, f"Step: {step_name}", step_id)
                raise

        return wrapper
    return decorator
