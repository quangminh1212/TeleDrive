#!/usr/bin/env python3
"""
Logger utilities for TeleDrive application.

Provides a centralized logging system with various output formats and levels.
"""

import logging
import os
import sys
from datetime import datetime
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Dict, Optional, Union


class Logger:
    """Centralized logger for TeleDrive application."""
    
    DEFAULT_LOG_LEVEL = logging.INFO
    DEFAULT_LOG_FORMAT = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
    DEFAULT_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"
    
    def __init__(
        self,
        name: str,
        level: Optional[Union[str, int]] = None,
        log_format: Optional[str] = None,
        date_format: Optional[str] = None,
        log_to_console: bool = True,
        log_to_file: bool = True,
        log_file: Optional[str] = None,
        max_bytes: int = 5 * 1024 * 1024,  # 5MB
        backup_count: int = 3
    ):
        """Initialize logger instance.
        
        Args:
            name: Logger name
            level: Log level (default: INFO)
            log_format: Log format string
            date_format: Date format string
            log_to_console: Whether to log to console
            log_to_file: Whether to log to file
            log_file: Log file path (default: logs/{name}.log)
            max_bytes: Maximum log file size
            backup_count: Number of backup files to keep
        """
        self.name = name
        self.level = self._parse_level(level) if level else self.DEFAULT_LOG_LEVEL
        self.log_format = log_format or self.DEFAULT_LOG_FORMAT
        self.date_format = date_format or self.DEFAULT_DATE_FORMAT
        self.log_to_console = log_to_console
        self.log_to_file = log_to_file
        self.log_file = log_file or f"logs/{name.lower()}.log"
        self.max_bytes = max_bytes
        self.backup_count = backup_count
        
        # Create logger
        self.logger = logging.getLogger(name)
        self.logger.setLevel(self.level)
        self.logger.handlers = []  # Remove any existing handlers
        
        # Create formatter
        self.formatter = logging.Formatter(
            fmt=self.log_format,
            datefmt=self.date_format
        )
        
        # Add console handler
        if log_to_console:
            self._add_console_handler()
        
        # Add file handler
        if log_to_file:
            self._add_file_handler()
    
    def _parse_level(self, level: Union[str, int]) -> int:
        """Parse log level from string or int."""
        if isinstance(level, int):
            return level
        
        level_map = {
            "DEBUG": logging.DEBUG,
            "INFO": logging.INFO,
            "WARNING": logging.WARNING,
            "ERROR": logging.ERROR,
            "CRITICAL": logging.CRITICAL
        }
        
        return level_map.get(level.upper(), self.DEFAULT_LOG_LEVEL)
    
    def _add_console_handler(self) -> None:
        """Add console handler to logger."""
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(self.formatter)
        self.logger.addHandler(console_handler)
    
    def _add_file_handler(self) -> None:
        """Add file handler to logger."""
        # Create logs directory if it doesn't exist
        log_dir = os.path.dirname(self.log_file)
        if log_dir and not os.path.exists(log_dir):
            os.makedirs(log_dir, exist_ok=True)
        
        # Create rotating file handler
        file_handler = RotatingFileHandler(
            self.log_file,
            maxBytes=self.max_bytes,
            backupCount=self.backup_count
        )
        file_handler.setFormatter(self.formatter)
        self.logger.addHandler(file_handler)
    
    def get_logger(self) -> logging.Logger:
        """Get the configured logger instance."""
        return self.logger
    
    def debug(self, message: str, **kwargs) -> None:
        """Log debug message."""
        self._log("debug", message, **kwargs)
    
    def info(self, message: str, **kwargs) -> None:
        """Log info message."""
        self._log("info", message, **kwargs)
    
    def warning(self, message: str, **kwargs) -> None:
        """Log warning message."""
        self._log("warning", message, **kwargs)
    
    def error(self, message: str, **kwargs) -> None:
        """Log error message."""
        self._log("error", message, **kwargs)
    
    def critical(self, message: str, **kwargs) -> None:
        """Log critical message."""
        self._log("critical", message, **kwargs)
    
    def _log(self, level: str, message: str, **kwargs) -> None:
        """Log message with extra context."""
        extra = kwargs.get("extra", {})
        if kwargs and "extra" not in kwargs:
            extra = {"extra_fields": kwargs}
        
        if extra:
            # Add extra context to log message
            context = ", ".join(f"{k}={v}" for k, v in extra.items())
            message = f"{message} [{context}]"
        
        getattr(self.logger, level)(message)


class SimpleLogger:
    """Simplified logger for basic use cases."""
    
    def __init__(self, name: str = "teledrive", log_level: str = "INFO"):
        """Initialize simple logger."""
        self.name = name
        self.log_level = logging.getLevelName(log_level)
        
        # Create logger
        logging.basicConfig(
            level=self.log_level,
            format="[%(asctime)s] %(levelname)s: %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )
        self.logger = logging.getLogger(name)
        self.logger.setLevel(self.log_level)
    
    def debug(self, message: str, **kwargs) -> None:
        """Log debug message."""
        self.logger.debug(message)
    
    def info(self, message: str, **kwargs) -> None:
        """Log info message."""
        self.logger.info(message)
    
    def warning(self, message: str, **kwargs) -> None:
        """Log warning message."""
        self.logger.warning(message)
    
    def error(self, message: str, **kwargs) -> None:
        """Log error message."""
        self.logger.error(message)
    
    def critical(self, message: str, **kwargs) -> None:
        """Log critical message."""
        self.logger.critical(message)


# Default logger instance for application
app_logger = Logger("TeleDrive")


def get_logger(name: str, **kwargs) -> Logger:
    """Get logger instance with specific name."""
    return Logger(name, **kwargs)


def setup_simple_logging(name: str = "teledrive", level: str = "INFO") -> SimpleLogger:
    """Set up simple logging for basic use cases."""
    return SimpleLogger(name=name, log_level=level)


def get_simple_logger() -> SimpleLogger:
    """Get simple logger instance."""
    return SimpleLogger() 