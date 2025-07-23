#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Log Models for TeleDrive
Database models for storing application logs
"""

from datetime import datetime, timedelta
from sqlalchemy import Column, Integer, String, Text, DateTime, Enum
from sqlalchemy.ext.declarative import declarative_base
from ..database import db
import enum

class LogLevel(enum.Enum):
    """Log levels"""
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"

class LogSource(enum.Enum):
    """Log sources"""
    APP = "app"
    AUTH = "auth"
    TELEGRAM = "telegram"
    DATABASE = "database"
    SECURITY = "security"
    SYSTEM = "system"

class LogEntry(db.Model):
    """Log entry model"""
    __tablename__ = 'log_entries'

    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    level = Column(Enum(LogLevel), nullable=False, index=True)
    source = Column(Enum(LogSource), nullable=False, index=True)
    message = Column(Text, nullable=False)
    details = Column(Text, nullable=True)
    user_id = Column(String(50), nullable=True, index=True)
    session_id = Column(String(100), nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)

    def __repr__(self):
        return f'<LogEntry {self.id}: {self.level.value} - {self.message[:50]}>'

    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'level': self.level.value if self.level else None,
            'source': self.source.value if self.source else None,
            'message': self.message,
            'details': self.details,
            'user_id': self.user_id,
            'session_id': self.session_id,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent
        }

class LogManager:
    """Manager for log operations"""

    @staticmethod
    def add_log(level, source, message, details=None, user_id=None,
                session_id=None, ip_address=None, user_agent=None):
        """Add a new log entry"""
        try:
            # Convert string level to enum if needed
            if isinstance(level, str):
                level = LogLevel(level.upper())

            # Convert string source to enum if needed
            if isinstance(source, str):
                source = LogSource(source.lower())

            log_entry = LogEntry(
                level=level,
                source=source,
                message=message,
                details=details,
                user_id=user_id,
                session_id=session_id,
                ip_address=ip_address,
                user_agent=user_agent
            )

            db.session.add(log_entry)
            db.session.commit()
            return log_entry

        except Exception as e:
            db.session.rollback()
            print(f"Error adding log entry: {e}")
            return None

    @staticmethod
    def get_logs(level=None, source=None, search=None, date_from=None,
                 date_to=None, user_id=None, page=1, per_page=100):
        """Get logs with filtering and pagination"""
        try:
            query = LogEntry.query

            # Apply filters
            if level:
                if isinstance(level, str):
                    level = LogLevel(level.upper())
                query = query.filter(LogEntry.level == level)

            if source:
                if isinstance(source, str):
                    source = LogSource(source.lower())
                query = query.filter(LogEntry.source == source)

            if search:
                query = query.filter(
                    LogEntry.message.contains(search) |
                    LogEntry.details.contains(search)
                )

            if date_from:
                if isinstance(date_from, str):
                    date_from = datetime.fromisoformat(date_from.replace('T', ' '))
                query = query.filter(LogEntry.timestamp >= date_from)

            if date_to:
                if isinstance(date_to, str):
                    date_to = datetime.fromisoformat(date_to.replace('T', ' '))
                query = query.filter(LogEntry.timestamp <= date_to)

            if user_id:
                query = query.filter(LogEntry.user_id == user_id)

            # Order by timestamp descending (newest first)
            query = query.order_by(LogEntry.timestamp.desc())

            # Paginate
            pagination = query.paginate(
                page=page,
                per_page=per_page,
                error_out=False
            )

            return {
                'logs': [log.to_dict() for log in pagination.items],
                'pagination': {
                    'current_page': pagination.page,
                    'total_pages': pagination.pages,
                    'total_items': pagination.total,
                    'per_page': pagination.per_page,
                    'has_prev': pagination.has_prev,
                    'has_next': pagination.has_next
                }
            }

        except Exception as e:
            print(f"Error getting logs: {e}")
            return {
                'logs': [],
                'pagination': {
                    'current_page': 1,
                    'total_pages': 1,
                    'total_items': 0,
                    'per_page': per_page,
                    'has_prev': False,
                    'has_next': False
                }
            }

    @staticmethod
    def get_log_stats():
        """Get log statistics"""
        try:
            total_logs = LogEntry.query.count()
            error_logs = LogEntry.query.filter(
                LogEntry.level.in_([LogLevel.ERROR, LogLevel.CRITICAL])
            ).count()
            warning_logs = LogEntry.query.filter(
                LogEntry.level == LogLevel.WARNING
            ).count()

            # Get logs from last 24 hours
            yesterday = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            recent_logs = LogEntry.query.filter(
                LogEntry.timestamp >= yesterday
            ).count()

            return {
                'total': total_logs,
                'errors': error_logs,
                'warnings': warning_logs,
                'recent': recent_logs
            }

        except Exception as e:
            print(f"Error getting log stats: {e}")
            return {
                'total': 0,
                'errors': 0,
                'warnings': 0,
                'recent': 0
            }

    @staticmethod
    def clear_logs(older_than_days=None):
        """Clear logs, optionally only older than specified days"""
        try:
            query = LogEntry.query

            if older_than_days:
                cutoff_date = datetime.utcnow() - timedelta(days=older_than_days)
                query = query.filter(LogEntry.timestamp < cutoff_date)

            deleted_count = query.count()
            query.delete()
            db.session.commit()

            return {'success': True, 'deleted_count': deleted_count}

        except Exception as e:
            db.session.rollback()
            print(f"Error clearing logs: {e}")
            return {'success': False, 'error': str(e)}

# Convenience functions for logging
def log_info(source, message, **kwargs):
    """Log info message"""
    return LogManager.add_log(LogLevel.INFO, source, message, **kwargs)

def log_warning(source, message, **kwargs):
    """Log warning message"""
    return LogManager.add_log(LogLevel.WARNING, source, message, **kwargs)

def log_error(source, message, **kwargs):
    """Log error message"""
    return LogManager.add_log(LogLevel.ERROR, source, message, **kwargs)

def log_debug(source, message, **kwargs):
    """Log debug message"""
    return LogManager.add_log(LogLevel.DEBUG, source, message, **kwargs)

def log_auth_event(message, user_id=None, **kwargs):
    """Log authentication event"""
    return LogManager.add_log(LogLevel.INFO, LogSource.AUTH, message, user_id=user_id, **kwargs)

def log_security_event(message, level=LogLevel.WARNING, **kwargs):
    """Log security event"""
    return LogManager.add_log(level, LogSource.SECURITY, message, **kwargs)

def log_telegram_event(message, level=LogLevel.INFO, **kwargs):
    """Log Telegram-related event"""
    return LogManager.add_log(level, LogSource.TELEGRAM, message, **kwargs)