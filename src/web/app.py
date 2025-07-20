#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TeleDrive Web Interface - Production Ready
Giao diện web với phong cách Telegram để hiển thị các file đã quét được
"""

import json
import os
import sys
from pathlib import Path
from flask import Flask, render_template, jsonify, request, redirect, url_for, flash, send_file
from flask_cors import CORS
from flask_login import login_user, login_required, current_user
from functools import wraps
from dotenv import load_dotenv

# Load environment variables first
load_dotenv()

# Import từ cấu trúc mới
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.database import init_database
from src.auth import auth_manager
from src.models import OTPManager, format_phone_number, validate_phone_number
from src.services import send_otp_sync
from src.services.filesystem import FileSystemManager
from src.config import config, validate_environment
from src.security import init_security_middleware
from src.log_system import init_production_logging, get_logger
from src.monitoring import init_health_monitoring

# Validate environment variables
try:
    validate_environment()
except ValueError as e:
    print(f"❌ Configuration error: {e}")
    sys.exit(1)

# Cấu hình đường dẫn templates và static
basedir = os.path.abspath(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
template_dir = os.path.join(basedir, 'templates')
static_dir = os.path.join(basedir, 'static')

# Tạo Flask app với production config
app = Flask(__name__, template_folder=template_dir, static_folder=static_dir)

# Apply production configuration
app.config.update(config.get_flask_config())

# Initialize CORS with production settings
if config.is_production():
    # Restrictive CORS for production
    CORS(app, origins=['https://yourdomain.com'], supports_credentials=True)
else:
    # Permissive CORS for development
    CORS(app)

# Initialize security middleware
init_security_middleware(app)

# Initialize production logging
logger_instance = init_production_logging(app, config)
logger = get_logger('app')

# Khởi tạo database và authentication system
init_database(app)
auth_manager.init_app(app)

# Initialize health monitoring
init_health_monitoring(app)

class TeleDriveWebAPI:
    """API class để xử lý các request từ web interface"""
    
    def __init__(self):
        self.output_dir = Path("output")
        self.output_dir.mkdir(exist_ok=True)
    
    def get_scan_sessions(self):
        """Lấy danh sách các session scan đã thực hiện"""
        try:
            sessions = []
            json_files = list(self.output_dir.glob("*_telegram_files.json"))
            
            for json_file in sorted(json_files, reverse=True):
                try:
                    with open(json_file, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    
                    # Extract session info từ filename
                    filename = json_file.stem
                    session_id = filename.replace('_telegram_files', '')

                    # Handle different JSON structures
                    if isinstance(data, list):
                        # Direct array of files (old format)
                        files = data
                        scan_info = {}
                    else:
                        # Object with files and scan_info (new format)
                        files = data.get('files', [])
                        scan_info = data.get('scan_info', {})

                    # Calculate total size (handle different file structures)
                    total_size = 0
                    for file in files:
                        if isinstance(data, list):
                            # Old format: file_size directly in file object
                            size = file.get('file_size', 0)
                        else:
                            # New format: size in file_info
                            file_info = file.get('file_info', {})
                            size = file_info.get('size', 0)
                        total_size += size

                    session_info = {
                        'session_id': session_id,
                        'timestamp': session_id,
                        'file_count': len(files),
                        'total_size': total_size,
                        'scan_info': scan_info,
                        'files': files
                    }
                    
                    sessions.append(session_info)
                    
                except Exception as e:
                    print(f"Lỗi đọc file {json_file}: {e}")
                    continue
            
            return sessions
            
        except Exception as e:
            print(f"Lỗi lấy danh sách sessions: {e}")
            return []
    
    def get_session_files(self, session_id):
        """Lấy danh sách files trong một session"""
        try:
            json_file = self.output_dir / f"{session_id}_telegram_files.json"
            
            if not json_file.exists():
                return None
            
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            return data
            
        except Exception as e:
            print(f"Lỗi lấy files cho session {session_id}: {e}")
            return None
    
    def search_files(self, session_id, query, file_type=None):
        """Tìm kiếm files trong session"""
        try:
            session_data = self.get_session_files(session_id)
            if not session_data:
                return []
            
            files = session_data.get('files', [])
            results = []
            
            query_lower = query.lower()
            
            for file in files:
                # Tìm kiếm theo tên file
                if query_lower in file.get('name', '').lower():
                    if not file_type or file.get('type') == file_type:
                        results.append(file)
                # Tìm kiếm theo caption
                elif query_lower in file.get('caption', '').lower():
                    if not file_type or file.get('type') == file_type:
                        results.append(file)
            
            return results
            
        except Exception as e:
            print(f"Lỗi tìm kiếm files: {e}")
            return []
    
    def filter_files(self, session_id, filters):
        """Lọc files theo các tiêu chí"""
        try:
            session_data = self.get_session_files(session_id)
            if not session_data:
                return []
            
            files = session_data.get('files', [])
            results = files.copy()
            
            # Lọc theo loại file
            if filters.get('file_type'):
                results = [f for f in results if f.get('type') == filters['file_type']]
            
            # Lọc theo kích thước
            if filters.get('min_size'):
                min_bytes = int(filters['min_size']) * 1024 * 1024  # MB to bytes
                results = [f for f in results if f.get('size_bytes', 0) >= min_bytes]
            
            if filters.get('max_size'):
                max_bytes = int(filters['max_size']) * 1024 * 1024  # MB to bytes
                results = [f for f in results if f.get('size_bytes', 0) <= max_bytes]
            
            # Lọc theo ngày
            if filters.get('date_from') or filters.get('date_to'):
                # Implementation for date filtering
                pass
            
            return results
            
        except Exception as e:
            print(f"Lỗi lọc files: {e}")
            return []
    
    def get_session_stats(self, session_id):
        """Lấy thống kê cho session"""
        try:
            session_data = self.get_session_files(session_id)
            if not session_data:
                return None
            
            files = session_data.get('files', [])
            
            stats = {
                'total_files': len(files),
                'total_size': sum(file.get('file_info', {}).get('size', 0) for file in files),
                'file_types': {},
                'largest_file': None,
                'oldest_file': None,
                'newest_file': None
            }

            # Thống kê theo loại file
            for file in files:
                file_info = file.get('file_info', {})
                file_type = file_info.get('type', 'unknown')
                file_size = file_info.get('size', 0)

                if file_type not in stats['file_types']:
                    stats['file_types'][file_type] = {'count': 0, 'size': 0}

                stats['file_types'][file_type]['count'] += 1
                stats['file_types'][file_type]['size'] += file_size
            
            # Tìm file lớn nhất
            if files:
                stats['largest_file'] = max(files, key=lambda x: x.get('file_info', {}).get('size', 0))

                # Tìm file cũ nhất và mới nhất
                files_with_date = [f for f in files if f.get('file_info', {}).get('upload_date')]
                if files_with_date:
                    stats['oldest_file'] = min(files_with_date, key=lambda x: x.get('file_info', {}).get('upload_date'))
                    stats['newest_file'] = max(files_with_date, key=lambda x: x.get('file_info', {}).get('upload_date'))

            # Format tổng kích thước
            stats['total_size_formatted'] = self.format_file_size(stats['total_size'])

            return stats

        except Exception as e:
            print(f"Lỗi lấy thống kê: {e}")
            return None
    
    def format_file_size(self, size_bytes):
        """Format kích thước file"""
        if size_bytes == 0:
            return "0 B"
        
        size_names = ["B", "KB", "MB", "GB", "TB"]
        i = 0
        while size_bytes >= 1024 and i < len(size_names) - 1:
            size_bytes /= 1024.0
            i += 1
        
        return f"{size_bytes:.1f} {size_names[i]}"

# Khởi tạo API
api = TeleDriveWebAPI()

# Khởi tạo File System Manager
fs_manager = FileSystemManager()

# Authentication decorator
def auth_required(f):
    """Decorator để yêu cầu xác thực cho API routes"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            return jsonify({'error': 'Authentication required', 'message': 'Vui lòng đăng nhập'}), 401
        return f(*args, **kwargs)
    return decorated_function

# Main Routes
@app.route('/')
def index():
    """Trang chính - Dashboard"""
    # Kiểm tra có admin user nào chưa
    if not auth_manager.has_admin_user():
        return redirect(url_for('setup'))

    # Yêu cầu đăng nhập
    if not current_user.is_authenticated:
        return redirect(url_for('login'))

    return render_template('index.html', user=current_user)

@app.route('/demo')
def demo():
    """Demo page for testing UI"""
    # Create a mock user for demo
    class MockUser:
        username = "admin"
        email = "admin@teledrive.com"
        is_admin = True
        is_authenticated = True

    return render_template('index.html', user=MockUser())

# Authentication Routes
@app.route('/login', methods=['GET'])
def login():
    """Trang đăng nhập"""
    if current_user.is_authenticated:
        return redirect(url_for('index'))

    # Kiểm tra có admin user nào chưa, nếu chưa thì redirect đến setup
    if not auth_manager.has_admin_user():
        return redirect(url_for('setup'))

    return render_template('login.html')

@app.route('/setup', methods=['GET', 'POST'])
def setup():
    """Trang thiết lập admin user đầu tiên"""
    # Nếu đã có admin user thì redirect về login
    if auth_manager.has_admin_user():
        return redirect(url_for('login'))

    if request.method == 'GET':
        return render_template('setup.html')

    # Xử lý POST request
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        phone_number = data.get('phone_number', '').strip()
        email = data.get('email', '').strip() or None

        # Validate input
        errors = []
        if not username or len(username) < 3:
            errors.append('Tên đăng nhập phải có ít nhất 3 ký tự')

        if not phone_number:
            errors.append('Vui lòng nhập số điện thoại')
        else:
            # Validate số điện thoại
            is_valid, result = validate_phone_number(phone_number)
            if not is_valid:
                errors.append(result)
            else:
                phone_number = result  # Sử dụng số đã được format

        if errors:
            return jsonify({'success': False, 'errors': errors}), 400

        # Tạo admin user
        success, message = auth_manager.create_user(
            username=username,
            phone_number=phone_number,
            email=email,
            is_admin=True
        )

        if success:
            return jsonify({
                'success': True,
                'message': 'Tạo tài khoản admin thành công! Bạn có thể đăng nhập ngay.',
                'redirect': url_for('login')
            })
        else:
            return jsonify({'success': False, 'message': message}), 400

    except Exception as e:
        return jsonify({'success': False, 'message': f'Lỗi hệ thống: {str(e)}'}), 500

@app.route('/send-otp', methods=['POST'])
def send_otp():
    """Gửi mã OTP đến số điện thoại"""
    try:
        data = request.get_json()
        phone_number = data.get('phone_number', '').strip()
        
        if not phone_number:
            return jsonify({'success': False, 'message': 'Vui lòng nhập số điện thoại'}), 400
        
        # Validate số điện thoại
        is_valid, result = validate_phone_number(phone_number)
        if not is_valid:
            return jsonify({'success': False, 'message': result}), 400
        
        formatted_phone = result
        
        # Kiểm tra user có tồn tại không
        user = auth_manager.find_user_by_phone(formatted_phone)
        if not user:
            return jsonify({'success': False, 'message': 'Số điện thoại chưa được đăng ký'}), 404
        
        # Gửi OTP qua Telegram
        try:
            # Kiểm tra environment để quyết định cách gửi OTP
            if config.is_development():
                # Development: Hiển thị OTP và cố gắng gửi qua Telegram
                try:
                    success, message = send_otp_sync(formatted_phone)
                    if success:
                        return jsonify({'success': True, 'message': message})
                    else:
                        # Fallback: Tạo mock OTP nếu không gửi được qua Telegram
                        from src.models.otp import OTPManager
                        otp_code = OTPManager.create_otp(formatted_phone)
                        print(f"🔐 Fallback OTP cho {formatted_phone}: {otp_code}")
                        return jsonify({
                            'success': True,
                            'message': f'Không thể gửi qua Telegram. Mã OTP: {otp_code} (Development fallback)'
                        })
                except Exception as e:
                    # Fallback: Tạo mock OTP nếu có lỗi
                    from src.models.otp import OTPManager
                    otp_code = OTPManager.create_otp(formatted_phone)
                    print(f"🔐 Error fallback OTP cho {formatted_phone}: {otp_code}")
                    return jsonify({
                        'success': True,
                        'message': f'Lỗi gửi Telegram: {str(e)}. Mã OTP: {otp_code} (Development fallback)'
                    })
            else:
                # Production: Chỉ gửi qua Telegram, không hiển thị OTP
                success, message = send_otp_sync(formatted_phone)
                if success:
                    return jsonify({'success': True, 'message': message})
                else:
                    return jsonify({'success': False, 'message': message}), 500

        except Exception as e:
            print(f"Lỗi gửi OTP: {e}")
            return jsonify({'success': False, 'message': f'Lỗi hệ thống: {str(e)}'}), 500
            
    except Exception as e:
        return jsonify({'success': False, 'message': f'Lỗi hệ thống: {str(e)}'}), 500

@app.route('/verify-otp', methods=['POST'])
def verify_otp():
    """Xác thực mã OTP và đăng nhập"""
    try:
        data = request.get_json()
        phone_number = data.get('phone_number', '').strip()
        otp_code = data.get('otp_code', '').strip()
        remember = data.get('remember', False)
        
        if not phone_number or not otp_code:
            return jsonify({'success': False, 'message': 'Vui lòng nhập đầy đủ thông tin'}), 400
        
        # Validate OTP
        is_valid, message = OTPManager.verify_otp(phone_number, otp_code)
        if not is_valid:
            return jsonify({'success': False, 'message': message}), 400
        
        # Xác thực người dùng
        user = auth_manager.authenticate_user_by_phone(phone_number)
        if user:
            login_user(user, remember=remember)
            next_page = request.args.get('next')
            
            return jsonify({
                'success': True,
                'message': 'Đăng nhập thành công',
                'redirect': next_page or url_for('index')
            })
        else:
            return jsonify({'success': False, 'message': 'Không thể đăng nhập. Vui lòng thử lại'}), 401
            
    except Exception as e:
        return jsonify({'success': False, 'message': f'Lỗi hệ thống: {str(e)}'}), 500

# API Routes
@app.route('/api/scans')
@auth_required
def get_scans():
    """Lấy danh sách scan sessions"""
    sessions = api.get_scan_sessions()
    return jsonify(sessions)

@app.route('/api/test-scan-history')
def test_scan_history():
    """Test endpoint for scan history"""
    return jsonify({
        'success': True,
        'message': 'Test endpoint working',
        'scans': [
            {
                'session_id': 'session-001',
                'session_name': 'Telegram Files Scan',
                'created_at': '2025-01-20T10:30:00Z',
                'total_files': 1247,
                'total_size': 2847392857,
                'total_chats': 15
            }
        ]
    })

@app.route('/api/files/<session_id>')
@auth_required
def get_session_files(session_id):
    """Lấy files trong một session"""
    data = api.get_session_files(session_id)
    if data:
        return jsonify(data)
    else:
        return jsonify({'error': 'Session not found'}), 404

@app.route('/api/stats/<session_id>')
@auth_required
def get_session_stats(session_id):
    """Lấy thống kê cho một session"""
    try:
        stats = api.get_session_stats(session_id)
        if stats:
            return jsonify(stats)
        else:
            return jsonify({'error': 'Session not found'}), 404
    except Exception as e:
        logger.error(f"Error getting session stats: {str(e)}", exc_info=True)
        return jsonify({'error': 'Internal server error', 'details': str(e)}), 500

# File Management API Routes
@app.route('/api/drives')
@auth_required
def get_drives():
    """Get list of available drives"""
    try:
        result = fs_manager.get_drives()
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error getting drives: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/browse')
@auth_required
def browse_directory():
    """Browse directory contents"""
    try:
        path = request.args.get('path', 'C:\\')
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 50))
        sort_by = request.args.get('sort_by', 'name')
        sort_order = request.args.get('sort_order', 'asc')

        result = fs_manager.browse_directory(path, page, per_page, sort_by, sort_order)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error browsing directory: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/file/create', methods=['POST'])
@auth_required
def create_file():
    """Create a new file"""
    try:
        data = request.get_json()
        parent_path = data.get('parent_path')
        file_name = data.get('file_name')
        content = data.get('content', '')

        if not parent_path or not file_name:
            return jsonify({'success': False, 'error': 'Missing required parameters'}), 400

        result = fs_manager.create_file(parent_path, file_name, content)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error creating file: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/folder/create', methods=['POST'])
@auth_required
def create_folder():
    """Create a new folder"""
    try:
        data = request.get_json()
        parent_path = data.get('parent_path')
        folder_name = data.get('folder_name')

        if not parent_path or not folder_name:
            return jsonify({'success': False, 'error': 'Missing required parameters'}), 400

        result = fs_manager.create_folder(parent_path, folder_name)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error creating folder: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/item/rename', methods=['POST'])
@auth_required
def rename_item():
    """Rename a file or folder"""
    try:
        data = request.get_json()
        item_path = data.get('item_path')
        new_name = data.get('new_name')

        if not item_path or not new_name:
            return jsonify({'success': False, 'error': 'Missing required parameters'}), 400

        result = fs_manager.rename_item(item_path, new_name)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error renaming item: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/item/delete', methods=['POST'])
@auth_required
def delete_item():
    """Delete a file or folder"""
    try:
        data = request.get_json()
        item_path = data.get('item_path')

        if not item_path:
            return jsonify({'success': False, 'error': 'Missing required parameters'}), 400

        result = fs_manager.delete_item(item_path)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error deleting item: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/item/copy', methods=['POST'])
@auth_required
def copy_item():
    """Copy a file or folder"""
    try:
        data = request.get_json()
        source_path = data.get('source_path')
        destination_path = data.get('destination_path')
        new_name = data.get('new_name')

        if not source_path or not destination_path:
            return jsonify({'success': False, 'error': 'Missing required parameters'}), 400

        result = fs_manager.copy_item(source_path, destination_path, new_name)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error copying item: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/item/move', methods=['POST'])
@auth_required
def move_item():
    """Move a file or folder"""
    try:
        data = request.get_json()
        source_path = data.get('source_path')
        destination_path = data.get('destination_path')
        new_name = data.get('new_name')

        if not source_path or not destination_path:
            return jsonify({'success': False, 'error': 'Missing required parameters'}), 400

        result = fs_manager.move_item(source_path, destination_path, new_name)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error moving item: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/search')
@auth_required
def search_files():
    """Search for files in directory"""
    try:
        path = request.args.get('path', 'C:\\')
        query = request.args.get('query', '')
        file_types = request.args.getlist('file_types')
        max_results = int(request.args.get('max_results', 100))

        if not query:
            return jsonify({'success': False, 'error': 'Search query is required'}), 400

        result = fs_manager.search_files(path, query, file_types, max_results)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error searching files: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/file/preview')
@auth_required
def get_file_preview():
    """Get file preview information"""
    try:
        file_path = request.args.get('path')

        if not file_path:
            return jsonify({'success': False, 'error': 'File path is required'}), 400

        result = fs_manager.get_file_preview(file_path)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error getting file preview: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/file/serve')
@auth_required
def serve_file():
    """Serve file content for preview"""
    try:
        file_path = request.args.get('path')

        if not file_path:
            return jsonify({'success': False, 'error': 'File path is required'}), 400

        # Validate path
        validated_path = fs_manager._validate_path(file_path)

        if not validated_path.exists() or validated_path.is_dir():
            return jsonify({'success': False, 'error': 'File not found'}), 404

        # Serve file
        return send_file(str(validated_path), as_attachment=False)

    except Exception as e:
        logger.error(f"Error serving file: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/file/download/<session_id>/<int:message_id>')
@auth_required
def download_telegram_file(session_id, message_id):
    """Download file from Telegram and serve it"""
    try:
        # Get file info from session data
        session_data = api.get_session_files(session_id)
        if not session_data or 'files' not in session_data:
            return jsonify({'success': False, 'error': 'Session not found'}), 404

        # Find the specific file
        target_file = None
        for file in session_data['files']:
            if file.get('message_info', {}).get('message_id') == message_id:
                target_file = file
                break

        if not target_file:
            return jsonify({'success': False, 'error': 'File not found'}), 404

        # For now, redirect to Telegram download link
        # TODO: Implement actual file download from Telegram
        download_link = target_file.get('download_link')
        if download_link:
            if download_link.startswith('tg://'):
                # Handle tg:// links - open in Telegram app
                return jsonify({
                    'success': True,
                    'action': 'open_telegram',
                    'link': download_link,
                    'message': 'File sẽ được mở trong ứng dụng Telegram'
                })
            else:
                # HTTP links - redirect
                return redirect(download_link)
        else:
            return jsonify({'success': False, 'error': 'Download link not available'}), 404

    except Exception as e:
        logger.error(f"Error downloading file: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/file/preview/<session_id>/<int:message_id>')
@auth_required
def preview_telegram_file(session_id, message_id):
    """Get file preview information"""
    try:
        # Get file info from session data
        session_data = api.get_session_files(session_id)
        if not session_data or 'files' not in session_data:
            return jsonify({'success': False, 'error': 'Session not found'}), 404

        # Find the specific file
        target_file = None
        for file in session_data['files']:
            if file.get('message_info', {}).get('message_id') == message_id:
                target_file = file
                break

        if not target_file:
            return jsonify({'success': False, 'error': 'File not found'}), 404

        # Return file info for preview
        return jsonify({
            'success': True,
            'file': target_file,
            'preview_available': True,
            'download_url': f'/api/file/download/{session_id}/{message_id}'
        })

    except Exception as e:
        logger.error(f"Error getting file preview: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/favicon.ico')
def favicon():
    """Serve favicon to prevent 404 errors"""
    return '', 204  # No Content

@app.route('/test-endpoint')
def test_endpoint():
    """Test endpoint để kiểm tra server có load code mới không"""
    return jsonify({'message': 'Server đã load code mới!', 'timestamp': '2025-07-18T20:30:00Z'})

@app.route('/test-icons')
def test_icons():
    """Test page for debugging icons"""
    return '''
    <!DOCTYPE html>
    <html>
    <head>
        <title>Test Icons</title>
        <link rel="stylesheet" href="/static/css/style.css">
    </head>
    <body style="padding: 20px; background: #f5f5f5;">
        <h1>Icon Test Page</h1>

        <div style="display: flex; gap: 20px; flex-wrap: wrap;">
            <div style="text-align: center; padding: 10px; background: white; border-radius: 8px;">
                <div class="file-icon" style="margin: 10px auto;">
                    <i class="icon icon-pdf"></i>
                </div>
                <p>PDF Icon</p>
            </div>

            <div style="text-align: center; padding: 10px; background: white; border-radius: 8px;">
                <div class="file-icon" style="margin: 10px auto;">
                    <i class="icon icon-image"></i>
                </div>
                <p>Image Icon</p>
            </div>

            <div style="text-align: center; padding: 10px; background: white; border-radius: 8px;">
                <div class="file-icon" style="margin: 10px auto;">
                    <i class="icon icon-word"></i>
                </div>
                <p>Word Icon</p>
            </div>

            <div style="text-align: center; padding: 10px; background: white; border-radius: 8px;">
                <div class="file-icon" style="margin: 10px auto;">
                    <i class="icon icon-excel"></i>
                </div>
                <p>Excel Icon</p>
            </div>

            <div style="text-align: center; padding: 10px; background: white; border-radius: 8px;">
                <div class="file-icon" style="margin: 10px auto;">
                    <i class="icon icon-video"></i>
                </div>
                <p>Video Icon</p>
            </div>

            <div style="text-align: center; padding: 10px; background: white; border-radius: 8px;">
                <div class="file-icon" style="margin: 10px auto;">
                    <i class="icon icon-audio"></i>
                </div>
                <p>Audio Icon</p>
            </div>
        </div>

        <h2>File Items Test</h2>
        <div class="files-display content-view" style="background: white; padding: 20px; border-radius: 8px;">
            <div class="file-item" data-id="test.pdf" data-type="file">
                <div class="file-icon"><i class="icon icon-pdf"></i></div>
                <div class="file-info">
                    <div class="file-name">test.pdf</div>
                    <div class="file-description">PDF Document</div>
                </div>
            </div>

            <div class="file-item" data-id="photo.jpg" data-type="file">
                <div class="file-icon"><i class="icon icon-image"></i></div>
                <div class="file-info">
                    <div class="file-name">photo.jpg</div>
                    <div class="file-description">Image File</div>
                </div>
            </div>
        </div>
    </body>
    </html>
    '''

@app.route('/test-dashboard')
def test_dashboard():
    """Test dashboard with mock file data"""
    return render_template('index.html')

@app.route('/test-welcome')
def test_welcome():
    """Test welcome screen without authentication"""
    # Mock user object for testing
    class MockUser:
        def __init__(self):
            self.username = 'test_user'
            self.is_admin = True
            self.id = 1

    mock_user = MockUser()
    return render_template('index.html', user=mock_user)

@app.route('/debug-user')
def debug_user():
    """Debug current user info"""
    if current_user.is_authenticated:
        return jsonify({
            'authenticated': True,
            'username': getattr(current_user, 'username', 'No username'),
            'is_admin': getattr(current_user, 'is_admin', False),
            'id': getattr(current_user, 'id', 'No ID'),
            'user_object': str(current_user)
        })
    else:
        return jsonify({
            'authenticated': False,
            'message': 'User not authenticated'
        })

@app.route('/test-logout')
def test_logout():
    """Test logout functionality"""
    return f"""
    <html>
    <head><title>Test Logout</title></head>
    <body>
        <h2>Test Logout Functionality</h2>
        <p>Current user: {current_user.is_authenticated}</p>
        <p>User info: {getattr(current_user, 'username', 'No username') if current_user.is_authenticated else 'Not logged in'}</p>

        <button onclick="testLogout()">Test Logout (POST)</button>
        <a href="/logout">Test Logout (GET)</a>

        <div id="result"></div>

        <script>
        async function testLogout() {{
            try {{
                const response = await fetch('/logout', {{
                    method: 'POST',
                    headers: {{
                        'Content-Type': 'application/json',
                    }}
                }});

                const data = await response.json();
                document.getElementById('result').innerHTML =
                    '<h3>Result:</h3><pre>' + JSON.stringify(data, null, 2) + '</pre>';

                if (data.success) {{
                    setTimeout(() => {{
                        window.location.href = data.redirect;
                    }}, 2000);
                }}
            }} catch (error) {{
                document.getElementById('result').innerHTML =
                    '<h3>Error:</h3><pre>' + error.message + '</pre>';
            }}
        }}
        </script>
    </body>
    </html>
    """

@app.route('/api/scan-history')
def get_scan_history():
    """Get scan history with statistics"""
    return jsonify({'test': 'API endpoint working'})

@app.route('/api/scan-history-full')
def get_scan_history_full():
    """Get scan history with statistics - full version"""
    try:
        limit = request.args.get('limit', 10, type=int)
        sort = request.args.get('sort', 'created_at')
        order = request.args.get('order', 'desc')

        # Mock data for now - replace with actual database queries
        mock_scans = [
            {
                'session_id': 'session-001',
                'session_name': 'Telegram Files Scan',
                'created_at': '2025-01-20T10:30:00Z',
                'total_files': 1247,
                'total_size': 2847392857,  # ~2.65 GB
                'total_chats': 15,
                'file_types': {
                    'images': 456,
                    'documents': 234,
                    'videos': 123,
                    'audio': 89,
                    'others': 345
                },
                'status': 'completed'
            },
            {
                'session_id': 'session-002',
                'session_name': 'Work Files Scan',
                'created_at': '2025-01-19T15:45:00Z',
                'total_files': 892,
                'total_size': 1456789123,  # ~1.36 GB
                'total_chats': 8,
                'file_types': {
                    'documents': 456,
                    'images': 234,
                    'videos': 67,
                    'audio': 45,
                    'others': 90
                },
                'status': 'completed'
            },
            {
                'session_id': 'session-003',
                'session_name': 'Personal Chat Scan',
                'created_at': '2025-01-18T09:15:00Z',
                'total_files': 567,
                'total_size': 987654321,  # ~918 MB
                'total_chats': 12,
                'file_types': {
                    'images': 345,
                    'videos': 123,
                    'documents': 67,
                    'audio': 23,
                    'others': 9
                },
                'status': 'completed'
            }
        ]

        # Apply sorting
        if sort == 'created_at':
            reverse = (order == 'desc')
            mock_scans.sort(key=lambda x: x['created_at'], reverse=reverse)
        elif sort == 'total_files':
            reverse = (order == 'desc')
            mock_scans.sort(key=lambda x: x['total_files'], reverse=reverse)
        elif sort == 'total_size':
            reverse = (order == 'desc')
            mock_scans.sort(key=lambda x: x['total_size'], reverse=reverse)

        # Apply limit
        limited_scans = mock_scans[:limit]

        return jsonify({
            'success': True,
            'scans': limited_scans,
            'total': len(mock_scans),
            'limit': limit,
            'sort': sort,
            'order': order
        })

    except Exception as e:
        logger.error(f"Error getting scans: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/logout', methods=['GET', 'POST'])
@login_required
def logout():
    """Đăng xuất"""
    from flask_login import logout_user
    logout_user()

    # Nếu là AJAX request (POST), trả về JSON
    if request.method == 'POST':
        return jsonify({
            'success': True,
            'message': 'Đăng xuất thành công',
            'redirect': url_for('login')
        })

    # Nếu là GET request, redirect trực tiếp
    return redirect(url_for('login'))

if __name__ == '__main__':
    # Log application startup
    logger.info("Starting TeleDrive application", extra={
        'extra_fields': {
            'environment': config.environment,
            'debug': config.debug,
            'host': config.server.host,
            'port': config.server.port
        }
    })

    # Run with production or development settings
    if config.is_production():
        # Production should use WSGI server (Gunicorn)
        logger.warning("Running with Flask development server in production. Use Gunicorn instead!")

    app.run(
        debug=config.debug,
        host=config.server.host,
        port=config.server.port,
        threaded=True
    )
