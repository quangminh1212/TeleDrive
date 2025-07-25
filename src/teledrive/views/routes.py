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
    print("[DEBUG] Index route called!")
    try:
        # Sample files for development
        sample_files = []

        # Folders
        sample_files.append({
            'id': 'folder1',
            'name': 'Tài liệu cá nhân',
            'is_directory': True,
            'type': 'folder',
            'modified': '12/05/2023',
            'size': '--'
        })

        sample_files.append({
            'id': 'folder2',
            'name': 'Dự án 2023',
            'is_directory': True,
            'type': 'folder',
            'modified': '20/06/2023',
            'size': '--'
        })

        # Documents
        sample_files.append({
            'id': 'file1',
            'name': 'Báo cáo tài chính Q2 2023.pdf',
            'is_directory': False,
            'type': 'pdf',
            'modified': '10/06/2023',
            'size': '2.4 MB',
            'is_favorite': False,
            'is_shared': True
        })

        sample_files.append({
            'id': 'file2',
            'name': 'Kế hoạch dự án.docx',
            'is_directory': False,
            'type': 'doc',
            'modified': '15/05/2023',
            'size': '1.2 MB',
            'is_favorite': True,
            'is_shared': False
        })

        sample_files.append({
            'id': 'file3',
            'name': 'Dữ liệu phân tích.xlsx',
            'is_directory': False,
            'type': 'xls',
            'modified': '05/06/2023',
            'size': '3.7 MB',
            'is_favorite': False,
            'is_shared': False
        })

        sample_files.append({
            'id': 'file4',
            'name': 'Thuyết trình Q3.pptx',
            'is_directory': False,
            'type': 'ppt',
            'modified': '22/06/2023',
            'size': '8.1 MB',
            'is_favorite': False,
            'is_shared': True
        })

        # Images
        sample_files.append({
            'id': 'file5',
            'name': 'Logo công ty.png',
            'is_directory': False,
            'type': 'image',
            'url': '/static/images/placeholder.png',
            'thumbnail_url': '/static/images/placeholder.png',
            'modified': '01/06/2023',
            'size': '542 KB',
            'is_favorite': True,
            'is_shared': False
        })

        sample_files.append({
            'id': 'file6',
            'name': 'Ảnh sự kiện.jpg',
            'is_directory': False,
            'type': 'image',
            'url': '/static/images/placeholder.png',
            'thumbnail_url': '/static/images/placeholder.png',
            'modified': '18/06/2023',
            'size': '1.8 MB',
            'is_favorite': False,
            'is_shared': False
        })

        # Videos
        sample_files.append({
            'id': 'file7',
            'name': 'Video hướng dẫn.mp4',
            'is_directory': False,
            'type': 'video',
            'modified': '25/06/2023',
            'size': '45.2 MB',
            'is_favorite': False,
            'is_shared': True
        })

        # Audio
        sample_files.append({
            'id': 'file8',
            'name': 'Ghi âm cuộc họp.mp3',
            'is_directory': False,
            'type': 'audio',
            'modified': '28/06/2023',
            'size': '12.5 MB',
            'is_favorite': False,
            'is_shared': False
        })

        # Archives
        sample_files.append({
            'id': 'file9',
            'name': 'Backup dữ liệu.zip',
            'is_directory': False,
            'type': 'archive',
            'modified': '30/06/2023',
            'size': '156.7 MB',
            'is_favorite': False,
            'is_shared': False
        })

        # Text files
        sample_files.append({
            'id': 'file10',
            'name': 'Ghi chú.txt',
            'is_directory': False,
            'type': 'txt',
            'modified': '02/07/2023',
            'size': '4.2 KB',
            'is_favorite': False,
            'is_shared': False
        })

        # Breadcrumbs
        breadcrumbs = [
            {'name': 'TeleDrive', 'path': '/'}
        ]

        # Debug log
        print(f"[DEBUG] Rendering index.html with {len(sample_files)} files")
        print(f"[DEBUG] First file: {sample_files[0] if sample_files else 'None'}")
        print(f"[DEBUG] Dev mode: True")

        return render_template('index.html',
                             files=sample_files,
                             dev_mode=True,
                             breadcrumbs=breadcrumbs)
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