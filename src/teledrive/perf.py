#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Performance optimization utilities
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
        """Clear all cache entries"""
        if self.redis_client:
            try:
                self.redis_client.flushdb()
            except Exception:
                pass
        
        self.memory_cache.clear()
        self.cache_stats = {'hits': 0, 'misses': 0}
    
    def _cleanup_memory_cache(self):
        """Remove expired entries from memory cache"""
        now = time.time()
        expired_keys = [
            key for key, entry in self.memory_cache.items() 
            if entry['expires'] < now
        ]
        for key in expired_keys:
            del self.memory_cache[key]
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        stats = {
            'hits': self.cache_stats['hits'],
            'misses': self.cache_stats['misses'],
            'memory_entries': len(self.memory_cache),
        }
        
        if self.redis_client:
            try:
                stats['redis_connected'] = True
                stats['redis_keys'] = self.redis_client.dbsize()
                stats['redis_memory'] = self.redis_client.info('memory')['used_memory_human']
            except Exception:
                stats['redis_connected'] = False
                
        return stats


# Create global cache manager
cache_manager = CacheManager()


def cached(ttl: int = 3600, prefix: str = "cache"):
    """Cache decorator for functions"""
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = cache_manager._generate_key(
                f"{prefix}:{func.__module__}.{func.__name__}",
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
    """Cache file metadata for faster file operations"""
    path = Path(file_path)
    cache_key = f"file_metadata:{path.absolute()}"
    
    # Try to get from cache
    metadata = cache_manager.get(cache_key)
    if metadata is not None:
        return metadata
        
    # Get metadata and cache
    try:
        if not path.exists():
            return None
            
        stats = path.stat()
        metadata = {
            'size': stats.st_size,
            'created': stats.st_ctime,
            'modified': stats.st_mtime,
            'accessed': stats.st_atime,
            'is_file': path.is_file(),
            'is_dir': path.is_dir(),
            'extension': path.suffix.lower() if path.is_file() else None,
        }
        
        cache_manager.set(cache_key, metadata, ttl)
        return metadata
    except Exception:
        return None


def init_cache(app, redis_url: Optional[str] = None):
    """Initialize cache with Flask app"""
    global cache_manager
    cache_manager = CacheManager(redis_url)
    app.cache = cache_manager
    
    @app.context_processor
    def inject_cache_stats():
        return {'cache_stats': cache_manager.get_stats()}
        
    app.teardown_appcontext(lambda _: None)  # Placeholder for cleanup 