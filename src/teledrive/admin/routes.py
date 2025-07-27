"""
Admin Routes

Administrative routes for TeleDrive application.
"""

from flask import render_template, jsonify

from . import admin_bp
from ..auth.decorators import dev_admin_required


@admin_bp.route('/')
@dev_admin_required
def index():
    """
    Admin dashboard index.
    
    Returns:
        Rendered template for admin dashboard
    """
    return render_template('admin/index.html')


@admin_bp.route('/logs')
@dev_admin_required
def logs():
    """
    Admin logs page.
    
    Returns:
        Rendered template for logs view
    """
    return render_template('admin/logs.html')


@admin_bp.route('/users')
@dev_admin_required
def users():
    """
    Admin users management page.
    
    Returns:
        Rendered template for users management
    """
    return render_template('admin/users.html')


@admin_bp.route('/system')
@dev_admin_required
def system():
    """
    Admin system information page.
    
    Returns:
        Rendered template for system information
    """
    return render_template('admin/system.html')


@admin_bp.route('/settings')
@dev_admin_required
def settings():
    """
    Admin settings page.
    
    Returns:
        Rendered template for settings page
    """
    return render_template('admin/settings.html')


@admin_bp.route('/telegram')
@dev_admin_required
def telegram():
    """
    Admin Telegram management page.
    
    Returns:
        Rendered template for Telegram management
    """
    return render_template('admin/telegram.html') 