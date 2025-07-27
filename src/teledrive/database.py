"""
Database Module

This module provides database connections and models for TeleDrive.
"""

from flask_sqlalchemy import SQLAlchemy
from typing import Any, Dict, List, Optional, Tuple, Union

# Create SQLAlchemy instance
db = SQLAlchemy()


def init_db(app: Any) -> None:
    """
    Initialize database with the Flask application.
    
    Args:
        app: Flask application instance
    """
    db.init_app(app)
    
    with app.app_context():
        db.create_all()
        
        # Import models to ensure they are registered
        # No need to do anything with them here
        from .models.user import User


def get_or_create(model: Any, defaults: Optional[Dict[str, Any]] = None, **kwargs: Any) -> Tuple[Any, bool]:
    """
    Get an existing instance or create a new one.
    
    Args:
        model: SQLAlchemy model class
        defaults: Default values to use when creating a new instance
        **kwargs: Attributes to query for existing instance
        
    Returns:
        Tuple containing (instance, created) where created is a boolean
        indicating whether a new instance was created
    """
    instance = model.query.filter_by(**kwargs).first()
    if instance:
        return instance, False
    else:
        params = dict((k, v) for k, v in kwargs.items())
        if defaults:
            params.update(defaults)
        instance = model(**params)
        db.session.add(instance)
        db.session.commit()
        return instance, True
