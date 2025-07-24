"""
API Routes

Main API routes for TeleDrive application.
"""

from flask import jsonify, request

from . import api_bp
from ..auth.decorators import api_auth_required


@api_bp.route('/status')
def api_status():
    """
    API status endpoint.
    
    Returns:
        JSON response with API status
    """
    return jsonify({
        'status': 'online',
        'version': request.app.config.get('VERSION', '1.0.0'),
        'environment': request.app.config.get('ENV', 'production')
    })


@api_bp.route('/health')
def health_check():
    """
    Health check endpoint for monitoring.
    
    Returns:
        JSON response with health status
    """
    return jsonify({
        'status': 'healthy',
        'database': 'connected',
        'services': {
            'telegram': 'connected',
            'storage': 'available'
        }
    }) 