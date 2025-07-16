"""
Enhanced logging system for TeleDrive

Provides structured logging with multiple output formats,
file rotation, and detailed step tracking.
"""

import logging
import logging.handlers
import sys
from pathlib import Path
from typing import Optional, Dict, Any
from datetime import datetime

from rich.console import Console
from rich.logging import RichHandler
from rich.text import Text

from ..config.manager import get_config


# Global console for rich output
console = Console()

# Logger cache
_loggers: Dict[str, logging.Logger] = {}


def get_logger(name: str) -> logging.Logger:
    """
    Get or create a logger with the specified name
    
    Args:
        name: Logger name
        
    Returns:
        logging.Logger: Configured logger instance
    """
    if name not in _loggers:
        _loggers[name] = _create_logger(name)
    return _loggers[name]


def _create_logger(name: str) -> logging.Logger:
    """
    Create a new logger with proper configuration
    
    Args:
        name: Logger name
        
    Returns:
        logging.Logger: Configured logger
    """
    logger = logging.getLogger(name)
    
    # Prevent duplicate handlers
    if logger.handlers:
        return logger
        
    try:
        config = get_config()
        log_config = config.logging
        
        # Set level
        logger.setLevel(getattr(logging, log_config.level.upper()))
        
        # Create formatters
        detailed_formatter = logging.Formatter(log_config.format)
        simple_formatter = logging.Formatter('%(levelname)s - %(message)s')
        
        # Console handler with Rich
        if log_config.console_output:
            console_handler = RichHandler(
                console=console,
                show_time=True,
                show_path=True,
                markup=True,
                rich_tracebacks=True
            )
            console_handler.setFormatter(simple_formatter)
            logger.addHandler(console_handler)
        
        # File handler
        if log_config.file:
            log_file = Path(log_config.file)
            log_file.parent.mkdir(parents=True, exist_ok=True)
            
            file_handler = logging.handlers.RotatingFileHandler(
                log_file,
                maxBytes=log_config.max_size_mb * 1024 * 1024,
                backupCount=log_config.backup_count,
                encoding='utf-8'
            )
            file_handler.setFormatter(detailed_formatter)
            logger.addHandler(file_handler)
        
        # Separate log files
        if log_config.separate_files.get('enabled', False):
            _setup_separate_loggers(logger, log_config, detailed_formatter)
            
    except Exception as e:
        # Fallback to basic logging if config fails
        logger.setLevel(logging.INFO)
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(logging.Formatter('%(levelname)s - %(message)s'))
        logger.addHandler(handler)
        logger.error(f"Failed to setup advanced logging: {e}")
    
    return logger


def _setup_separate_loggers(parent_logger: logging.Logger, log_config: Any, formatter: logging.Formatter) -> None:
    """
    Setup separate log files for different categories
    
    Args:
        parent_logger: Parent logger instance
        log_config: Logging configuration
        formatter: Log formatter
    """
    separate_files = log_config.separate_files
    
    # API calls log
    if 'api_log' in separate_files:
        api_file = Path(separate_files['api_log'])
        api_file.parent.mkdir(parents=True, exist_ok=True)
        api_handler = logging.handlers.RotatingFileHandler(
            api_file,
            maxBytes=log_config.max_size_mb * 1024 * 1024,
            backupCount=log_config.backup_count,
            encoding='utf-8'
        )
        api_handler.setFormatter(formatter)
        api_handler.addFilter(lambda record: 'API' in record.getMessage())
        parent_logger.addHandler(api_handler)
    
    # File operations log
    if 'files_log' in separate_files:
        files_file = Path(separate_files['files_log'])
        files_file.parent.mkdir(parents=True, exist_ok=True)
        files_handler = logging.handlers.RotatingFileHandler(
            files_file,
            maxBytes=log_config.max_size_mb * 1024 * 1024,
            backupCount=log_config.backup_count,
            encoding='utf-8'
        )
        files_handler.setFormatter(formatter)
        files_handler.addFilter(lambda record: 'FILE' in record.getMessage())
        parent_logger.addHandler(files_handler)
    
    # Errors log
    if 'errors_log' in separate_files:
        errors_file = Path(separate_files['errors_log'])
        errors_file.parent.mkdir(parents=True, exist_ok=True)
        errors_handler = logging.handlers.RotatingFileHandler(
            errors_file,
            maxBytes=log_config.max_size_mb * 1024 * 1024,
            backupCount=log_config.backup_count,
            encoding='utf-8'
        )
        errors_handler.setFormatter(formatter)
        errors_handler.setLevel(logging.ERROR)
        parent_logger.addHandler(errors_handler)


def setup_logging(config_path: Optional[str] = None) -> None:
    """
    Setup global logging configuration
    
    Args:
        config_path: Path to configuration file
    """
    try:
        # Clear existing loggers
        _loggers.clear()
        
        # Setup root logger
        root_logger = get_logger('teledrive')
        root_logger.info("Logging system initialized")
        
    except Exception as e:
        print(f"Failed to setup logging: {e}")


def log_step(step_name: str, message: str, level: str = "INFO") -> None:
    """
    Log a detailed step with formatting
    
    Args:
        step_name: Name of the step
        message: Step message
        level: Log level (INFO, WARNING, ERROR)
    """
    logger = get_logger('teledrive.steps')
    
    # Format step message
    timestamp = datetime.now().strftime("%H:%M:%S")
    formatted_message = f"[{timestamp}] {step_name}: {message}"
    
    # Log with appropriate level
    log_level = getattr(logging, level.upper(), logging.INFO)
    logger.log(log_level, formatted_message)
    
    # Also display with rich formatting
    if level.upper() == "ERROR":
        console.print(f"❌ {formatted_message}", style="red")
    elif level.upper() == "WARNING":
        console.print(f"⚠️ {formatted_message}", style="yellow")
    else:
        console.print(f"✅ {formatted_message}", style="green")


def log_error(error: Exception, context: str = "", logger_name: str = "teledrive") -> None:
    """
    Log an error with context and formatting
    
    Args:
        error: Exception object
        context: Additional context information
        logger_name: Logger name to use
    """
    logger = get_logger(logger_name)
    
    error_msg = f"ERROR in {context}: {str(error)}" if context else f"ERROR: {str(error)}"
    logger.error(error_msg, exc_info=True)
    
    # Display error with rich formatting
    console.print(f"❌ {error_msg}", style="red bold")


def log_api_call(operation: str, details: str = "", logger_name: str = "teledrive.api") -> None:
    """
    Log API call with details
    
    Args:
        operation: API operation name
        details: Additional details
        logger_name: Logger name to use
    """
    logger = get_logger(logger_name)
    message = f"API CALL - {operation}"
    if details:
        message += f": {details}"
    logger.info(message)


def log_file_operation(operation: str, filename: str, details: str = "", logger_name: str = "teledrive.files") -> None:
    """
    Log file operation
    
    Args:
        operation: File operation (READ, WRITE, DELETE, etc.)
        filename: File name
        details: Additional details
        logger_name: Logger name to use
    """
    logger = get_logger(logger_name)
    message = f"FILE {operation} - {filename}"
    if details:
        message += f": {details}"
    logger.info(message)


def log_progress(current: int, total: int, operation: str = "Processing", logger_name: str = "teledrive.progress") -> None:
    """
    Log progress information
    
    Args:
        current: Current progress
        total: Total items
        operation: Operation description
        logger_name: Logger name to use
    """
    logger = get_logger(logger_name)
    percentage = (current / total * 100) if total > 0 else 0
    message = f"PROGRESS - {operation}: {current}/{total} ({percentage:.1f}%)"
    logger.info(message)


# Compatibility functions for existing code
def setup_detailed_logging(config: Dict[str, Any]) -> None:
    """
    Setup detailed logging (compatibility function)
    
    Args:
        config: Logging configuration dictionary
    """
    setup_logging()


# Export main logger for backward compatibility
main_logger = get_logger('teledrive')
