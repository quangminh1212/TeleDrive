#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Health Check System for TeleDrive
Monitoring và health check endpoints cho production
"""

import time
import psutil
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from flask import Blueprint, jsonify, current_app
from sqlalchemy import text
from teledrive.database import db
from teledrive.config import config
import redis

health_bp = Blueprint('health', __name__)

class HealthChecker:
    """Health check manager"""
    
    def __init__(self):
        self.start_time = datetime.utcnow()
        self.checks = {
            'database': self._check_database,
            'redis': self._check_redis,
            'disk_space': self._check_disk_space,
            'memory': self._check_memory,
            'telegram_session': self._check_telegram_session,
        }
    
    def _check_database(self) -> Dict[str, Any]:
        """Check database connectivity and performance"""
        try:
            start_time = time.time()
            
            # Simple connectivity check
            result = db.session.execute(text('SELECT 1')).scalar()
            
            # Performance check
            query_time = (time.time() - start_time) * 1000
            
            if result == 1:
                status = 'healthy' if query_time < 100 else 'slow'
                return {
                    'status': status,
                    'response_time_ms': round(query_time, 2),
                    'message': 'Database connection successful'
                }
            else:
                return {
                    'status': 'unhealthy',
                    'message': 'Database query returned unexpected result'
                }
                
        except Exception as e:
            return {
                'status': 'unhealthy',
                'message': f'Database connection failed: {str(e)}'
            }
    
    def _check_redis(self) -> Dict[str, Any]:
        """Check Redis connectivity and performance"""
        if not config.redis.enabled:
            return {
                'status': 'disabled',
                'message': 'Redis is disabled'
            }
        
        try:
            start_time = time.time()
            
            # Connect to Redis
            r = redis.from_url(config.redis.url, password=config.redis.password)
            
            # Test ping
            r.ping()
            
            # Test set/get
            test_key = 'health_check_test'
            test_value = str(int(time.time()))
            r.set(test_key, test_value, ex=60)
            retrieved_value = r.get(test_key)
            
            response_time = (time.time() - start_time) * 1000
            
            if retrieved_value and retrieved_value.decode() == test_value:
                status = 'healthy' if response_time < 50 else 'slow'
                return {
                    'status': status,
                    'response_time_ms': round(response_time, 2),
                    'message': 'Redis connection successful'
                }
            else:
                return {
                    'status': 'unhealthy',
                    'message': 'Redis set/get test failed'
                }
                
        except Exception as e:
            return {
                'status': 'unhealthy',
                'message': f'Redis connection failed: {str(e)}'
            }
    
    def _check_disk_space(self) -> Dict[str, Any]:
        """Check disk space availability"""
        try:
            disk_usage = psutil.disk_usage('/')
            
            total_gb = disk_usage.total / (1024**3)
            free_gb = disk_usage.free / (1024**3)
            used_percent = (disk_usage.used / disk_usage.total) * 100
            
            if used_percent > 90:
                status = 'critical'
                message = f'Disk space critically low: {used_percent:.1f}% used'
            elif used_percent > 80:
                status = 'warning'
                message = f'Disk space running low: {used_percent:.1f}% used'
            else:
                status = 'healthy'
                message = f'Disk space OK: {used_percent:.1f}% used'
            
            return {
                'status': status,
                'message': message,
                'total_gb': round(total_gb, 2),
                'free_gb': round(free_gb, 2),
                'used_percent': round(used_percent, 1)
            }
            
        except Exception as e:
            return {
                'status': 'unhealthy',
                'message': f'Disk space check failed: {str(e)}'
            }
    
    def _check_memory(self) -> Dict[str, Any]:
        """Check memory usage"""
        try:
            memory = psutil.virtual_memory()
            
            total_gb = memory.total / (1024**3)
            available_gb = memory.available / (1024**3)
            used_percent = memory.percent
            
            if used_percent > 90:
                status = 'critical'
                message = f'Memory usage critically high: {used_percent:.1f}%'
            elif used_percent > 80:
                status = 'warning'
                message = f'Memory usage high: {used_percent:.1f}%'
            else:
                status = 'healthy'
                message = f'Memory usage OK: {used_percent:.1f}%'
            
            return {
                'status': status,
                'message': message,
                'total_gb': round(total_gb, 2),
                'available_gb': round(available_gb, 2),
                'used_percent': round(used_percent, 1)
            }
            
        except Exception as e:
            return {
                'status': 'unhealthy',
                'message': f'Memory check failed: {str(e)}'
            }
    
    def _check_telegram_session(self) -> Dict[str, Any]:
        """Check Telegram session file"""
        try:
            session_file = f"{config.telegram.session_name}.session"
            
            if not os.path.exists(session_file):
                return {
                    'status': 'warning',
                    'message': 'Telegram session file not found'
                }
            
            # Check file age
            import os
            file_age = time.time() - os.path.getmtime(session_file)
            file_age_hours = file_age / 3600
            
            if file_age_hours > 24:
                status = 'warning'
                message = f'Telegram session file is {file_age_hours:.1f} hours old'
            else:
                status = 'healthy'
                message = 'Telegram session file exists and is recent'
            
            return {
                'status': status,
                'message': message,
                'file_age_hours': round(file_age_hours, 1)
            }
            
        except Exception as e:
            return {
                'status': 'unhealthy',
                'message': f'Telegram session check failed: {str(e)}'
            }
    
    def run_all_checks(self) -> Dict[str, Any]:
        """Run all health checks"""
        results = {}
        overall_status = 'healthy'
        
        for check_name, check_func in self.checks.items():
            try:
                result = check_func()
                results[check_name] = result
                
                # Determine overall status
                if result['status'] == 'unhealthy' or result['status'] == 'critical':
                    overall_status = 'unhealthy'
                elif result['status'] == 'warning' and overall_status == 'healthy':
                    overall_status = 'warning'
                    
            except Exception as e:
                results[check_name] = {
                    'status': 'error',
                    'message': f'Health check failed: {str(e)}'
                }
                overall_status = 'unhealthy'
        
        # Calculate uptime
        uptime = datetime.utcnow() - self.start_time
        uptime_seconds = int(uptime.total_seconds())
        
        return {
            'status': overall_status,
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'uptime_seconds': uptime_seconds,
            'environment': config.environment,
            'version': getattr(config, 'version', 'unknown'),
            'checks': results
        }

# Global health checker instance
health_checker = HealthChecker()

@health_bp.route('/health')
def health_check():
    """Basic health check endpoint"""
    try:
        # Quick database check
        db.session.execute(text('SELECT 1'))
        
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'message': 'Service is healthy'
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'message': f'Health check failed: {str(e)}'
        }), 503

@health_bp.route('/health/detailed')
def detailed_health_check():
    """Detailed health check with all components"""
    result = health_checker.run_all_checks()
    
    status_code = 200
    if result['status'] == 'unhealthy':
        status_code = 503
    elif result['status'] == 'warning':
        status_code = 200  # Still operational
    
    return jsonify(result), status_code

@health_bp.route('/ready')
def readiness_check():
    """Kubernetes readiness probe"""
    try:
        # Check critical dependencies
        db.session.execute(text('SELECT 1'))
        
        if config.redis.enabled:
            r = redis.from_url(config.redis.url, password=config.redis.password)
            r.ping()
        
        return jsonify({
            'status': 'ready',
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'not_ready',
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'message': str(e)
        }), 503

@health_bp.route('/metrics')
def metrics():
    """Basic metrics endpoint"""
    try:
        # System metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # Application metrics
        uptime = datetime.utcnow() - health_checker.start_time
        
        return jsonify({
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'uptime_seconds': int(uptime.total_seconds()),
            'system': {
                'cpu_percent': cpu_percent,
                'memory_percent': memory.percent,
                'disk_percent': (disk.used / disk.total) * 100,
                'load_average': list(psutil.getloadavg()) if hasattr(psutil, 'getloadavg') else None
            },
            'environment': config.environment,
            'debug': config.debug
        }), 200
        
    except Exception as e:
        return jsonify({
            'error': f'Metrics collection failed: {str(e)}'
        }), 500

def init_health_monitoring(app):
    """Initialize health monitoring with Flask app"""
    app.register_blueprint(health_bp)
    return health_checker
