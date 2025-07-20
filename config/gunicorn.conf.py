#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gunicorn Configuration for TeleDrive Production
Production WSGI server configuration
"""

import os
import multiprocessing
from pathlib import Path

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Server socket
bind = f"{os.getenv('HOST', '0.0.0.0')}:{os.getenv('PORT', '5000')}"
backlog = 2048

# Worker processes
workers = int(os.getenv('WORKERS', multiprocessing.cpu_count() * 2 + 1))
worker_class = os.getenv('WORKER_CLASS', 'sync')
worker_connections = 1000
timeout = int(os.getenv('TIMEOUT', '30'))
keepalive = int(os.getenv('KEEPALIVE', '2'))

# Restart workers after this many requests, to prevent memory leaks
max_requests = int(os.getenv('MAX_REQUESTS', '1000'))
max_requests_jitter = int(os.getenv('MAX_REQUESTS_JITTER', '100'))

# Worker timeout
graceful_timeout = 30
worker_tmp_dir = '/dev/shm'

# Logging
accesslog = os.getenv('GUNICORN_ACCESS_LOG', 'logs/gunicorn_access.log')
errorlog = os.getenv('GUNICORN_ERROR_LOG', 'logs/gunicorn_error.log')
loglevel = os.getenv('GUNICORN_LOG_LEVEL', 'info')
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = 'teledrive'

# Server mechanics
daemon = False
pidfile = 'logs/gunicorn.pid'
user = None
group = None
tmp_upload_dir = None

# SSL (if enabled)
if os.getenv('HTTPS_ENABLED', 'false').lower() == 'true':
    keyfile = os.getenv('SSL_KEY_PATH')
    certfile = os.getenv('SSL_CERT_PATH')
    ssl_version = 2  # TLS
    ciphers = 'ECDHE+AESGCM:ECDHE+CHACHA20:DHE+AESGCM:DHE+CHACHA20:!aNULL:!MD5:!DSS'

# Application
wsgi_module = 'src.web.app:app'

# Preload application for better performance
preload_app = True

# Enable stats
statsd_host = os.getenv('STATSD_HOST')
statsd_prefix = 'teledrive'

def when_ready(server):
    """Called just after the server is started."""
    server.log.info("TeleDrive server is ready. Listening on %s", bind)

def worker_int(worker):
    """Called just after a worker has been killed by a SIGINT or SIGQUIT signal."""
    worker.log.info("Worker received INT or QUIT signal")

def pre_fork(server, worker):
    """Called just before a worker is forked."""
    server.log.info("Worker spawned (pid: %s)", worker.pid)

def post_fork(server, worker):
    """Called just after a worker has been forked."""
    server.log.info("Worker spawned (pid: %s)", worker.pid)

def post_worker_init(worker):
    """Called just after a worker has initialized the application."""
    worker.log.info("Worker initialized (pid: %s)", worker.pid)

def worker_abort(worker):
    """Called when a worker received the SIGABRT signal."""
    worker.log.info("Worker aborted (pid: %s)", worker.pid)

def pre_exec(server):
    """Called just before a new master process is forked."""
    server.log.info("Forked child, re-executing.")

def pre_request(worker, req):
    """Called just before a worker processes the request."""
    worker.log.debug("%s %s", req.method, req.uri)

def post_request(worker, req, environ, resp):
    """Called after a worker processes the request."""
    worker.log.debug("%s %s - %s", req.method, req.uri, resp.status_code)

# Create logs directory
logs_dir = Path('logs')
logs_dir.mkdir(exist_ok=True)

# Environment-specific settings
environment = os.getenv('ENVIRONMENT', 'development')

if environment == 'production':
    # Production settings
    workers = max(2, multiprocessing.cpu_count())
    worker_class = 'sync'
    timeout = 60
    keepalive = 5
    max_requests = 2000
    preload_app = True
    
elif environment == 'development':
    # Development settings
    workers = 1
    worker_class = 'sync'
    timeout = 30
    reload = True
    preload_app = False
