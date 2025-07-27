#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Caching utilities for performance optimization
"""

import functools
import hashlib
import json
import time
from typing import Any, Optional, Callable, Dict
from flask import current_app
import redis
from pathlib import Path


class CacheManager:
    """Centralized cache management"""
    
    def __init__(self, redis_url: Optional[str] = None):
        self.redis_client = None
        self.memory_cache: Dict[str, Dict[str, Any]] = {}
        self.cache_stats = {'hits': 0, 'misses': 0}
        
        if redis_url:
            try:
                self.redis_client = redis.from_url(redis_url)
                self.redis_client.ping()  # Test connection
            except Exception:
                self.redis_client = None
    
    def _generate_key(self, prefix: str, *args, **kwargs) -> str:
        """Generate cache key from arguments"""
        key_data = {
            'args': args,
            'kwargs': sorted(kwargs.items())
        }
        key_string = json.dumps(key_data, sort_keys=True, default=str)
        key_hash = hashlib.md5(key_string.encode()).hexdigest()
        return f"{prefix}:{key_hash}"
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        # Try Redis first
        if self.redis_client:
            try:
                value = self.redis_client.get(key)
                if value:
                    self.cache_stats['hits'] += 1
                    return json.loads(value)
            except Exception:
                pass
        
        # Fallback to memory cache
        if key in self.memory_cache:
            cache_entry = self.memory_cache[key]
            if cache_entry['expires'] > time.time():
                self.cache_stats['hits'] += 1
                return cache_entry['value']
            else:
                del self.memory_cache[key]
        
        self.cache_stats['misses'] += 1
        return None
    
    def set(self, key: str, value: Any, ttl: int = 3600):
        """Set value in cache"""
        # Try Redis first
        if self.redis_client:
            try:
                self.redis_client.setex(
                    key, 
                    ttl, 
                    json.dumps(value, default=str)
                )
                return
            except Exception:
                pass
        
        # Fallback to memory cache
        self.memory_cache[key] = {
            'value': value,
            'expires': time.time() + ttl
        }
        
        # Clean up expired entries periodically
        if len(self.memory_cache) > 1000:
            self._cleanup_memory_cache()
    
    def delete(self, key: str):
        """Delete value from cache"""
        if self.redis_client:
            try:
                self.redis_client.delete(key)
            except Exception:
                pass
        
        self.memory_cache.pop(key, None)
    
    def clear(self):
        """Clear all cache"""
        if self.redis_client:
            try:
                self.redis_client.flushdb()
            except Exception:
                pass
        
        self.memory_cache.clear()
    
    def _cleanup_memory_cache(self):
        """Remove expired entries from memory cache"""
        current_time = time.time()
        expired_keys = [
            key for key, entry in self.memory_cache.items()
            if entry['expires'] <= current_time
        ]
        for key in expired_keys:
            del self.memory_cache[key]
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        total_requests = self.cache_stats['hits'] + self.cache_stats['misses']
        hit_rate = (self.cache_stats['hits'] / total_requests * 100) if total_requests > 0 else 0
        
        return {
            'hits': self.cache_stats['hits'],
            'misses': self.cache_stats['misses'],
            'hit_rate': round(hit_rate, 2),
            'memory_cache_size': len(self.memory_cache),
            'redis_connected': self.redis_client is not None
        }


# Global cache instance
cache_manager = CacheManager()


def cached(ttl: int = 3600, prefix: str = "cache"):
    """Decorator for caching function results"""
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = cache_manager._generate_key(
                f"{prefix}:{func.__name__}", 
                *args, 
                **kwargs
            )
            
            # Try to get from cache
            cached_result = cache_manager.get(cache_key)
            if cached_result is not None:
                return cached_result
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            cache_manager.set(cache_key, result, ttl)
            return result
        
        return wrapper
    return decorator


def cache_file_metadata(file_path: str, ttl: int = 1800) -> Optional[Dict[str, Any]]:
    """Cache file metadata to avoid repeated filesystem calls"""
    cache_key = f"file_metadata:{hashlib.md5(file_path.encode()).hexdigest()}"
    
    # Check cache first
    cached_metadata = cache_manager.get(cache_key)
    if cached_metadata:
        return cached_metadata
    
    # Get file metadata
    try:
        path = Path(file_path)
        if not path.exists():
            return None
        
        stat = path.stat()
        metadata = {
            'size': stat.st_size,
            'modified': stat.st_mtime,
            'created': stat.st_ctime,
            'is_file': path.is_file(),
            'is_dir': path.is_dir(),
            'name': path.name,
            'suffix': path.suffix
        }
        
        # Cache the metadata
        cache_manager.set(cache_key, metadata, ttl)
        return metadata
        
    except Exception:
        return None


def init_cache(app, redis_url: Optional[str] = None):
    """Initialize cache manager with Flask app"""
    global cache_manager
    
    if redis_url is None:
        redis_url = app.config.get('REDIS_URL')
    
    cache_manager = CacheManager(redis_url)
    
    # Add cache stats to app context
    @app.context_processor
    def inject_cache_stats():
        return {'cache_stats': cache_manager.get_stats()}
