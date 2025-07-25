"""
Views Routes

Main page routes for TeleDrive application.
"""

from flask import render_template, redirect, url_for

from . import views_bp
from ..auth.decorators import dev_login_required


@views_bp.route('/')
def index():
    """
    Home page route.

    Returns:
        Rendered template for the home page
    """
    try:
        return render_template('index.html')
    except Exception as e:
        return f"Error: {str(e)}", 500

@views_bp.route('/test')
def test():
    """Test route"""
    return "TeleDrive is working!"


@views_bp.route('/login')
def login():
    """
    Login page route.
    
    Returns:
        Rendered template for the login page or redirect to auth blueprint
    """
    return redirect(url_for('auth.login'))


@views_bp.route('/dashboard')
@dev_login_required
def dashboard():
    """
    Dashboard page route.
    
    Requires user authentication.
    
    Returns:
        Rendered template for the dashboard
    """
    return render_template('dashboard.html')


@views_bp.route('/browser')
@dev_login_required
def browser():
    """
    File browser page route.
    
    Requires user authentication.
    
    Returns:
        Rendered template for the file browser
    """
    return render_template('browser.html')


@views_bp.route('/search')
@dev_login_required
def search():
    """
    Search page route.
    
    Requires user authentication.
    
    Returns:
        Rendered template for the search page
    """
    return render_template('search.html') 