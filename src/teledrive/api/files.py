"""
Files API

API endpoints for file operations in TeleDrive.
"""

from flask import jsonify, request, send_file, current_app, abort
from werkzeug.utils import secure_filename
import os
import time
import uuid
import mimetypes
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple

from . import api_bp
from ..auth.decorators import api_auth_required
from ..security.validation import validate_path, sanitize_filename, detect_xss


def _is_allowed_file(filename: str, allowed_extensions: Optional[List[str]] = None) -> bool:
    """
    Check if file has an allowed extension.
    
    Args:
        filename: Name of the file to check
        allowed_extensions: List of allowed extensions (if None, all extensions are allowed)
    
    Returns:
        bool: True if file is allowed, False otherwise
    """
    if allowed_extensions is None:
        # Default allowed extensions
        allowed_extensions = [
            # Images
            'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg',
            # Documents
            'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv',
            # Archives
            'zip', 'tar', 'gz', '7z', 'rar',
            # Media
            'mp3', 'mp4', 'avi', 'mov', 'webm'
        ]
    
    if '.' not in filename:
        return False
    
    extension = filename.rsplit('.', 1)[1].lower()
    return extension in allowed_extensions


def _check_file_mime_type(file_content, filename: str) -> Tuple[bool, str]:
    """
    Check if the file's content matches its extension.
    
    Args:
        file_content: File content to check
        filename: Name of the file
    
    Returns:
        Tuple[bool, str]: (is_valid, mime_type)
    """
    # Get mime type from content
    try:
        import magic
        mime = magic.Magic(mime=True)
        detected_mime = mime.from_buffer(file_content.read(2048))
        # Reset file pointer
        file_content.seek(0)
    except ImportError:
        # Fallback if python-magic not available
        detected_mime = mimetypes.guess_type(filename)[0]
    
    if not detected_mime:
        # Default to octet-stream if mime type can't be detected
        detected_mime = 'application/octet-stream'
    
    # Check if mime type is allowed
    allowed_mimes = [
        'image/', 'application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument',
        'application/vnd.ms-excel', 'application/vnd.ms-powerpoint',
        'text/', 'video/', 'audio/', 'application/zip', 'application/x-rar',
        'application/x-7z-compressed', 'application/x-tar', 'application/gzip'
    ]
    
    is_allowed = any(detected_mime.startswith(allowed) for allowed in allowed_mimes)
    
    return is_allowed, detected_mime


def _get_upload_path(user_id: int, filename: str) -> str:
    """
    Get secure path for file upload.
    
    Args:
        user_id: User ID
        filename: Original filename
        
    Returns:
        str: Secure path for file upload
    """
    # Create directory structure with user ID and date
    base_dir = os.path.join(current_app.config.get('UPLOAD_FOLDER', 'uploads'))
    user_dir = os.path.join(base_dir, f"user_{user_id}")
    date_dir = os.path.join(user_dir, time.strftime('%Y%m%d'))
    
    # Create directories if they don't exist
    os.makedirs(date_dir, exist_ok=True)
    
    # Generate a random filename with original extension
    extension = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
    random_filename = f"{uuid.uuid4().hex}"
    if extension:
        random_filename += f".{extension}"
    
    return os.path.join(date_dir, random_filename)


@api_bp.route('/files')
@api_auth_required
def api_files():
    """
    Get list of files for the current user.
    
    Returns:
        JSON response with file listing
    """
    # Mock implementation
    files = [
        {'id': 1, 'name': 'Document.pdf', 'size': 1024000, 'type': 'pdf', 'modified': '2023-01-01T12:00:00Z'},
        {'id': 2, 'name': 'Image.jpg', 'size': 512000, 'type': 'image', 'modified': '2023-01-02T12:00:00Z'},
        {'id': 3, 'name': 'Video.mp4', 'size': 10485760, 'type': 'video', 'modified': '2023-01-03T12:00:00Z'},
    ]
    
    return jsonify({
        'success': True,
        'files': files
    })


@api_bp.route('/files/<session_id>')
@api_auth_required
def get_session_files(session_id: str):
    """
    Get files for a specific session.
    
    Args:
        session_id: Session identifier
        
    Returns:
        JSON response with session files
    """
    # Mock implementation
    files = [
        {'id': 1, 'name': f'Session_{session_id}_Doc.pdf', 'size': 1024000, 'type': 'pdf'},
        {'id': 2, 'name': f'Session_{session_id}_Image.jpg', 'size': 512000, 'type': 'image'},
    ]
    
    return jsonify({
        'success': True,
        'session_id': session_id,
        'files': files
    })


@api_bp.route('/file/create', methods=['POST'])
@api_auth_required
def create_file():
    """
    Create a new file.
    
    Returns:
        JSON response with file information
    """
    if 'file' not in request.files:
        return jsonify({
            'success': False,
            'error': 'No file provided'
        }), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({
            'success': False,
            'error': 'No file selected'
        }), 400
        
    # Example processing (not actually saving)
    filename = secure_filename(file.filename)
    
    return jsonify({
        'success': True,
        'file': {
            'id': 123,
            'name': filename,
            'size': 1024000,
            'type': filename.split('.')[-1],
            'modified': '2023-01-01T12:00:00Z'
        }
    })


@api_bp.route('/file/upload', methods=['POST'])
@api_auth_required
def upload_file():
    """
    Upload a file.

    Returns:
        JSON response with file information
    """
    current_app.logger.info("Upload request received")

    # Check if file is present in the request
    if 'file' not in request.files:
        current_app.logger.error("No file in request")
        return jsonify({
            'success': False,
            'error': 'No file provided',
            'code': 'MISSING_FILE'
        }), 400

    file = request.files['file']
    current_app.logger.info(f"File received: {file.filename}")
    
    # Check if file has a name
    if file.filename == '':
        return jsonify({
            'success': False,
            'error': 'No file selected',
            'code': 'EMPTY_FILENAME'
        }), 400
    
    # Sanitize the filename to prevent path traversal and XSS
    original_filename = file.filename
    secure_name = sanitize_filename(secure_filename(original_filename))
    
    # Check for XSS in filename
    if detect_xss(original_filename):
        return jsonify({
            'success': False,
            'error': 'Invalid file name',
            'code': 'SECURITY_VIOLATION'
        }), 400
    
    # Check for allowed file extensions
    if not _is_allowed_file(secure_name):
        return jsonify({
            'success': False,
            'error': 'File type not allowed',
            'code': 'INVALID_FILE_TYPE',
        }), 400
    
    # Check file size limit (10MB default)
    max_size = current_app.config.get('MAX_CONTENT_LENGTH', 10 * 1024 * 1024)
    if request.content_length is not None and request.content_length > max_size:
        return jsonify({
            'success': False,
            'error': f'File exceeds maximum size ({max_size // (1024 * 1024)}MB)',
            'code': 'FILE_TOO_LARGE'
        }), 413
    
    # Check file mime type
    is_valid_mime, mime_type = _check_file_mime_type(file, secure_name)
    if not is_valid_mime:
        return jsonify({
            'success': False,
            'error': f'File content type not allowed: {mime_type}',
            'code': 'INVALID_CONTENT_TYPE'
        }), 400
    
    try:
        # Get path for the upload based on user and current date
        from flask_login import current_user
        user_id = getattr(current_user, 'id', 0) or 0
        current_app.logger.info(f"Upload attempt: user_id={user_id}, filename={secure_name}")

        # Get secure path for file upload
        upload_path = _get_upload_path(user_id, secure_name)
        current_app.logger.info(f"Upload path: {upload_path}")
        
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(upload_path), exist_ok=True)
        
        # Save the file
        file.save(upload_path)
        
        # Get file size and other metadata
        file_size = os.path.getsize(upload_path)
        file_type = secure_name.rsplit('.', 1)[1].lower() if '.' in secure_name else 'unknown'
        
        # Log the upload (for security audit)
        current_app.logger.info(
            f"File uploaded: {upload_path} "
            f"(user_id: {user_id}, size: {file_size}, type: {mime_type})"
        )
        
        # Return success response with file details
        return jsonify({
            'success': True,
            'message': 'File uploaded successfully',
            'file': {
                'name': secure_name,
                'original_name': original_filename,
                'size': file_size,
                'size_formatted': _format_file_size(file_size),
                'type': file_type,
                'mime_type': mime_type,
                'upload_path': upload_path,
                'upload_time': time.strftime('%Y-%m-%dT%H:%M:%SZ')
            }
        })
        
    except Exception as e:
        current_app.logger.error(f"File upload error: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to upload file',
            'details': str(e),
            'code': 'UPLOAD_ERROR'
        }), 500


def _format_file_size(size_bytes):
    """Format file size in a human-readable format"""
    if size_bytes == 0:
        return "0 B"
        
    units = ["B", "KB", "MB", "GB", "TB"]
    i = 0
    while size_bytes >= 1024 and i < len(units) - 1:
        size_bytes /= 1024.0
        i += 1
        
    return f"{size_bytes:.1f} {units[i]}"


@api_bp.route('/file/preview/<session_id>/<int:message_id>')
@api_auth_required
def preview_file(session_id: str, message_id: int):
    """
    Get preview for a file.
    
    Args:
        session_id: Session identifier
        message_id: Message identifier
        
    Returns:
        JSON response with file preview information
    """
    # Mock implementation
    return jsonify({
        'success': True,
        'preview': {
            'url': f'/api/file/serve?session_id={session_id}&message_id={message_id}',
            'type': 'image/jpeg',
            'thumbnail': f'/api/file/thumbnail?session_id={session_id}&message_id={message_id}'
        }
    })


@api_bp.route('/file/serve/<path:filepath>')
@api_auth_required
def serve_file(filepath: str):
    """
    Serve a file for viewing.
    
    Args:
        filepath: Path to the file to serve
        
    Returns:
        File content or error response
    """
    try:
        # Validate the file path to prevent path traversal
        if not validate_path(filepath):
            current_app.logger.warning(f"Invalid file path requested: {filepath}")
            return jsonify({
                'success': False,
                'error': 'Invalid file path',
                'code': 'INVALID_PATH'
            }), 400
        
        # Check if file exists
        if not os.path.isfile(filepath):
            return jsonify({
                'success': False,
                'error': 'File not found',
                'code': 'FILE_NOT_FOUND'
            }), 404
        
        # Check read permission
        if not os.access(filepath, os.R_OK):
            return jsonify({
                'success': False,
                'error': 'Access denied',
                'code': 'ACCESS_DENIED'
            }), 403
        
        # Determine mime type
        mime_type, _ = mimetypes.guess_type(filepath)
        if not mime_type:
            mime_type = 'application/octet-stream'
        
        # Return the file
        return send_file(filepath, mimetype=mime_type)
        
    except Exception as e:
        current_app.logger.error(f"Error serving file: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to serve file',
            'details': str(e),
            'code': 'SERVE_ERROR'
        }), 500


@api_bp.route('/file/download/<session_id>/<int:message_id>')
@api_auth_required
def download_file(session_id: str, message_id: int):
    """
    Download a file.
    
    Args:
        session_id: Session identifier
        message_id: Message identifier
        
    Returns:
        File download response
    """
    # This would normally download the file from Telegram
    # For now, return a placeholder response
    return jsonify({
        'success': False,
        'error': 'Download functionality not implemented in this blueprint'
    }), 501 