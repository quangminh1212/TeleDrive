"""Logging utilities for TeleDrive."""

import logging
import os
from typing import Dict, Any, Optional


def setup_detailed_logging(config: Optional[Dict[str, Any]] = None) -> logging.Logger:
    """Set up detailed logging system based on configuration."""
    if config is None:
        config = {}
    
    # Create logs directory if it doesn't exist
    os.makedirs('logs', exist_ok=True)
    
    # Configure root logger
    logging_level = config.get('level', 'INFO')
    level = getattr(logging, logging_level, logging.INFO)
    
    # Format
    log_format = '%(asctime)s [%(levelname)s] %(name)s: %(message)s'
    date_format = '%Y-%m-%d %H:%M:%S'
    
    # Configure root logger
    logging.basicConfig(
        level=level,
        format=log_format,
        datefmt=date_format,
    )
    
    root_logger = logging.getLogger()
    
    # Add file handlers if separate files are enabled
    if config.get('separate_files', {}).get('enabled', False):
        # Add file handlers for different log types
        handlers = {
            'scanner': config.get('separate_files', {}).get('scanner_log', 'logs/scanner.log'),
            'config': config.get('separate_files', {}).get('config_log', 'logs/config.log'),
            'api': config.get('separate_files', {}).get('api_log', 'logs/api.log'),
            'files': config.get('separate_files', {}).get('files_log', 'logs/files.log'),
            'errors': config.get('separate_files', {}).get('errors_log', 'logs/errors.log'),
        }
        
        for handler_name, log_file in handlers.items():
            file_handler = logging.FileHandler(log_file, 'a', encoding='utf-8')
            file_handler.setFormatter(logging.Formatter(log_format, date_format))
            
            # Set specific level for errors log
            if handler_name == 'errors':
                file_handler.setLevel(logging.ERROR)
                file_handler.addFilter(lambda record: record.levelno >= logging.ERROR)
            else:
                file_handler.setLevel(level)
            
            # Create specific logger for each type
            specific_logger = logging.getLogger(handler_name)
            specific_logger.propagate = False  # Don't propagate to root
            specific_logger.addHandler(file_handler)
            specific_logger.setLevel(level)
    
    return root_logger


def log_step(step_name: str, message: str, level: str = "INFO") -> None:
    """Log a step in the process with formatted output."""
    logger = logging.getLogger("scanner")
    level_func = getattr(logger, level.lower(), logger.info)
    level_func(f"[{step_name}] {message}")


def log_config_change(key: str, old_value: Any, new_value: Any) -> None:
    """Log a configuration change."""
    logger = logging.getLogger("config")
    logger.info(f"Changed '{key}': {old_value} -> {new_value}")


def get_logger(name: str) -> logging.Logger:
    """Get a logger with the specified name."""
    return logging.getLogger(name)