#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Database configuration for TeleDrive
Cấu hình database chung cho toàn bộ ứng dụng
"""

from flask_sqlalchemy import SQLAlchemy

# Tạo database instance chung
db = SQLAlchemy()

def init_database(app):
    """Khởi tạo database với Flask app"""
    # Chỉ init nếu chưa được init
    if not hasattr(app, 'extensions') or 'sqlalchemy' not in app.extensions:
        db.init_app(app)

    with app.app_context():
        db.create_all()

    return db
