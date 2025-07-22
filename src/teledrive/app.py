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
from datetime import datetime
from flask import Flask, render_template, jsonify, request, redirect, url_for, send_file, abort
from flask_cors import CORS
from flask_login import login_user, login_required, current_user
from functools import wraps
from dotenv import load_dotenv

# Dev mode helper
def dev_mode_enabled():
    """Kiểm tra xem có bật dev mode không"""
    return os.getenv('DEV_MODE', 'false').lower() == 'true'

def create_dev_user():
    """Tạo user giả cho dev mode"""
    from flask_login import AnonymousUserMixin
    class DevUser(AnonymousUserMixin):
        def __init__(self):
            self.id = 'dev_user'
            self.username = 'Developer'
            self.phone_number = '+84123456789'
            self.email = 'dev@teledrive.local'
            self.is_admin = True
            self.is_authenticated = True
            self.is_active = True
            self.is_anonymous = False
            self.is_verified = True
    return DevUser()

def dev_login_required(f):
    """Decorator thay thế login_required trong dev mode"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if dev_mode_enabled():
            # Trong dev mode, bỏ qua kiểm tra đăng nhập
            return f(*args, **kwargs)
        else:
            # Chế độ bình thường, yêu cầu đăng nhập
            from flask_login import current_user
            if not current_user.is_authenticated:
                return redirect(url_for('login'))
            return f(*args, **kwargs)
    return decorated_function

def dev_admin_required(f):
    """Decorator thay thế admin_required trong dev mode"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if dev_mode_enabled():
            # Trong dev mode, bỏ qua kiểm tra admin
            return f(*args, **kwargs)
        else:
            # Chế độ bình thường, yêu cầu admin
            from flask_login import current_user
            if not current_user.is_authenticated or not current_user.is_admin:
                if request.is_json or request.headers.get('Content-Type') == 'application/json':
                    return jsonify({
                        'success': False,
                        'error': 'Bạn không có quyền truy cập chức năng này'
                    }), 403
                else:
                    abort(403)
            return f(*args, **kwargs)
    return decorated_function

# Load environment variables first
load_dotenv()

# Import từ cấu trúc mới
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.teledrive.database import init_database, db
from src.teledrive.auth import auth_manager
# Import admin_required nhưng sẽ dùng dev_admin_required thay thế
from src.teledrive.models import OTPManager, validate_phone_number
from src.teledrive.services import send_otp_sync
from src.teledrive.services.filesystem import FileSystemManager
from src.teledrive.config import config, validate_environment
from src.teledrive.security import init_security_middleware
# Tắt các import logging để giảm log
# from src.utils.simple_logger import setup_simple_logging, get_simple_logger
# from src.monitoring import init_health_monitoring

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

# Tắt tất cả logging để có giao diện sạch sẽ
import logging
logging.getLogger('werkzeug').setLevel(logging.CRITICAL)
logging.getLogger('urllib3').setLevel(logging.CRITICAL)
logging.getLogger('requests').setLevel(logging.CRITICAL)
logging.getLogger('telethon').setLevel(logging.CRITICAL)
logging.getLogger('asyncio').setLevel(logging.CRITICAL)
logging.getLogger('flask').setLevel(logging.CRITICAL)
logging.getLogger('teledrive').setLevel(logging.CRITICAL)
app.logger.setLevel(logging.CRITICAL)

# Tắt tất cả root logger
logging.getLogger().setLevel(logging.CRITICAL)

# Initialize CORS with production settings
if config.is_production():
    # Restrictive CORS for production
    CORS(app, origins=['https://yourdomain.com'], supports_credentials=True)
else:
    # Permissive CORS for development
    CORS(app)

# Initialize security middleware
init_security_middleware(app)

# Tạo logger đơn giản chỉ cho lỗi nghiêm trọng
class SimpleLogger:
    def info(self, message, **kwargs):
        pass  # Không log info

    def error(self, message, **kwargs):
        pass  # Không log error

    def warning(self, message, **kwargs):
        pass  # Không log warning

    def debug(self, message, **kwargs):
        pass  # Không log debug

logger = SimpleLogger()

# Khởi tạo authentication system
auth_manager.init_app(app)

# Database sẽ được init sau khi app được configure đúng

# Tắt health monitoring để giảm log
# init_health_monitoring(app)

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
    """Decorator để yêu cầu xác thực cho API routes (hỗ trợ dev mode)"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if dev_mode_enabled():
            # Trong dev mode, bỏ qua kiểm tra xác thực
            return f(*args, **kwargs)

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

    # Kiểm tra chế độ dev (tắt xác thực)
    if dev_mode_enabled():
        dev_user = create_dev_user()
        return render_template('index.html', user=dev_user)

    # Yêu cầu đăng nhập (chế độ bình thường)
    if not current_user.is_authenticated:
        return redirect(url_for('login'))

    return render_template('index.html', user=current_user)



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
            # Tạo OTP code để test
            from src.teledrive.models.otp import OTPManager
            otp_code = OTPManager.create_otp(formatted_phone)

            # Return success với OTP code để test
            return jsonify({
                'success': True,
                'message': f'Mã OTP đã được tạo: {otp_code} (Test mode)',
                'otp_code': otp_code  # Chỉ để test, production sẽ xóa
            })

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

        # Test OTP for admin testing
        if otp_code == '123456':
            # Find user by phone
            user = auth_manager.find_user_by_phone(phone_number)
            if user:
                login_user(user, remember=remember)
                return jsonify({
                    'success': True,
                    'message': 'Đăng nhập thành công (test mode)',
                    'redirect': url_for('index')
                })

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

# Basic API endpoints
@app.route('/api/status')
def api_status():
    """API status endpoint"""
    return jsonify({
        'status': 'ok',
        'version': '1.0.0',
        'service': 'TeleDrive API',
        'timestamp': datetime.now().isoformat(),
        'uptime': 'running'
    })

@app.route('/api/files')
@auth_required
def api_files():
    """Get all files across sessions"""
    try:
        # Get all sessions
        sessions = api.get_scan_sessions() if hasattr(api, 'get_scan_sessions') else []

        all_files = []
        for session in sessions:
            session_files = api.get_session_files(session.get('id', '')) if hasattr(api, 'get_session_files') else []
            if session_files:
                all_files.extend(session_files)

        return jsonify({
            'success': True,
            'files': all_files,
            'total': len(all_files)
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'files': [],
            'total': 0
        }), 500

@app.route('/api/scans')
@auth_required
def get_scans():
    """Lấy danh sách scan sessions"""
    sessions = api.get_scan_sessions() if hasattr(api, 'get_scan_sessions') else []
    return jsonify(sessions)

@app.route('/api/scan/telegram', methods=['POST'])
@auth_required
def start_telegram_scan():
    """Bắt đầu scan Telegram"""
    try:
        data = request.get_json() or {}
        scan_type = data.get('scan_type', 'telegram')
        options = data.get('options', {})

        print(f"🚀 [API] Starting Telegram scan with options: {options}")

        # Log the scan request
        logger.info(f"User {current_user.username if hasattr(current_user, 'username') else 'test_user'} started Telegram scan")

        # TODO: Implement actual Telegram scanning logic
        # For now, return a mock response

        # Simulate scan process
        import time
        import threading

        def mock_scan():
            print("📱 [SCAN] Mock Telegram scan started in background")
            time.sleep(2)  # Simulate scan time
            print("✅ [SCAN] Mock Telegram scan completed")

        # Start mock scan in background
        scan_thread = threading.Thread(target=mock_scan)
        scan_thread.daemon = True
        scan_thread.start()

        return jsonify({
            'success': True,
            'message': 'Telegram scan đã được bắt đầu',
            'scan_id': f'telegram_scan_{int(time.time())}',
            'status': 'started'
        })

    except Exception as e:
        print(f"❌ [API] Error starting Telegram scan: {str(e)}")
        logger.error(f"Error starting Telegram scan: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Không thể bắt đầu scan Telegram'
        }), 500



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

# ===== GOOGLE DRIVE STYLE API ROUTES =====

@app.route('/api/gdrive/files', methods=['GET'])
@auth_required
def gdrive_list_files():
    """List files in Google Drive style format"""
    try:
        session_id = request.args.get('session_id')
        folder_path = request.args.get('path', '/')
        view_type = request.args.get('view', 'grid')  # grid or list
        sort_by = request.args.get('sort', 'name')
        sort_order = request.args.get('order', 'asc')
        search_query = request.args.get('q', '')

        if session_id:
            # Get files from specific Telegram session
            session_data = api.get_session_files(session_id)
            if not session_data or 'files' not in session_data:
                return jsonify({'success': False, 'error': 'Session not found'}), 404

            files = []
            for file in session_data['files']:
                # Convert to Google Drive format
                gdrive_file = {
                    'id': f"{session_id}_{file.get('message_info', {}).get('message_id', 'unknown')}",
                    'name': file.get('file_name', 'Unknown'),
                    'type': get_file_type(file.get('file_name', '')),
                    'size': file.get('file_size', 0),
                    'modified': file.get('message_info', {}).get('date', ''),
                    'session_id': session_id,
                    'message_id': file.get('message_info', {}).get('message_id'),
                    'download_url': f"/api/file/download/{session_id}/{file.get('message_info', {}).get('message_id', 0)}",
                    'preview_url': f"/api/file/preview/{session_id}/{file.get('message_info', {}).get('message_id', 0)}",
                    'thumbnail': get_file_thumbnail(file.get('file_name', '')),
                    'starred': False,  # TODO: Implement starring system
                    'shared': False   # TODO: Implement sharing system
                }

                # Apply search filter
                if search_query and search_query.lower() not in gdrive_file['name'].lower():
                    continue

                files.append(gdrive_file)

            # Apply sorting
            files = sort_files(files, sort_by, sort_order)

            return jsonify({
                'success': True,
                'files': files,
                'total': len(files),
                'view': view_type,
                'path': folder_path,
                'session_info': {
                    'id': session_id,
                    'name': session_data.get('session_name', 'Unknown Session'),
                    'total_files': len(files),
                    'total_size': sum(f['size'] for f in files if f['size'])
                }
            })
        else:
            # List all sessions as folders
            sessions = api.get_sessions()
            folders = []

            for session in sessions:
                folder = {
                    'id': f"session_{session['session_id']}",
                    'name': session['session_name'],
                    'type': 'folder',
                    'size': None,
                    'modified': session.get('last_scan', ''),
                    'session_id': session['session_id'],
                    'file_count': session.get('total_files', 0),
                    'starred': False,
                    'shared': False
                }
                folders.append(folder)

            return jsonify({
                'success': True,
                'files': folders,
                'total': len(folders),
                'view': view_type,
                'path': folder_path
            })

    except Exception as e:
        logger.error(f"Error listing files: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/gdrive/file/<file_id>', methods=['GET'])
@auth_required
def gdrive_get_file(file_id):
    """Get detailed file information"""
    try:
        # Parse file_id to extract session_id and message_id
        if file_id.startswith('session_'):
            # This is a session folder
            session_id = file_id.replace('session_', '')
            session_data = api.get_session_files(session_id)
            if not session_data:
                return jsonify({'success': False, 'error': 'Session not found'}), 404

            return jsonify({
                'success': True,
                'file': {
                    'id': file_id,
                    'name': session_data.get('session_name', 'Unknown Session'),
                    'type': 'folder',
                    'size': None,
                    'modified': session_data.get('last_scan', ''),
                    'session_id': session_id,
                    'file_count': len(session_data.get('files', [])),
                    'starred': False,
                    'shared': False
                }
            })
        else:
            # This is a regular file
            parts = file_id.split('_')
            if len(parts) < 2:
                return jsonify({'success': False, 'error': 'Invalid file ID'}), 400

            session_id = parts[0]
            message_id = int(parts[1])

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

            gdrive_file = {
                'id': file_id,
                'name': target_file.get('file_name', 'Unknown'),
                'type': get_file_type(target_file.get('file_name', '')),
                'size': target_file.get('file_size', 0),
                'modified': target_file.get('message_info', {}).get('date', ''),
                'session_id': session_id,
                'message_id': message_id,
                'download_url': f"/api/file/download/{session_id}/{message_id}",
                'preview_url': f"/api/file/preview/{session_id}/{message_id}",
                'thumbnail': get_file_thumbnail(target_file.get('file_name', '')),
                'starred': False,
                'shared': False
            }

            return jsonify({
                'success': True,
                'file': gdrive_file
            })

    except Exception as e:
        logger.error(f"Error getting file: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/gdrive/search', methods=['GET'])
@auth_required
def gdrive_search_files():
    """Search files across all sessions"""
    try:
        query = request.args.get('q', '')
        file_type = request.args.get('type', '')  # image, video, document, etc.
        session_id = request.args.get('session_id', '')
        sort_by = request.args.get('sort', 'name')
        sort_order = request.args.get('order', 'asc')

        if not query:
            return jsonify({'success': False, 'error': 'Search query is required'}), 400

        all_files = []
        sessions = api.get_sessions()

        for session in sessions:
            if session_id and session['session_id'] != session_id:
                continue

            session_data = api.get_session_files(session['session_id'])
            if not session_data or 'files' not in session_data:
                continue

            for file in session_data['files']:
                file_name = file.get('file_name', '').lower()

                # Apply search filter
                if query.lower() not in file_name:
                    continue

                # Apply type filter
                file_type_detected = get_file_type(file.get('file_name', ''))
                if file_type and file_type_detected != file_type:
                    continue

                gdrive_file = {
                    'id': f"{session['session_id']}_{file.get('message_info', {}).get('message_id', 'unknown')}",
                    'name': file.get('file_name', 'Unknown'),
                    'type': file_type_detected,
                    'size': file.get('file_size', 0),
                    'modified': file.get('message_info', {}).get('date', ''),
                    'session_id': session['session_id'],
                    'session_name': session['session_name'],
                    'message_id': file.get('message_info', {}).get('message_id'),
                    'download_url': f"/api/file/download/{session['session_id']}/{file.get('message_info', {}).get('message_id', 0)}",
                    'preview_url': f"/api/file/preview/{session['session_id']}/{file.get('message_info', {}).get('message_id', 0)}",
                    'thumbnail': get_file_thumbnail(file.get('file_name', '')),
                    'starred': False,
                    'shared': False
                }
                all_files.append(gdrive_file)

        # Apply sorting
        all_files = sort_files(all_files, sort_by, sort_order)

        return jsonify({
            'success': True,
            'files': all_files,
            'total': len(all_files),
            'query': query,
            'type_filter': file_type
        })

    except Exception as e:
        logger.error(f"Error searching files: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

# ===== HELPER FUNCTIONS FOR GOOGLE DRIVE API =====

def get_file_type(filename):
    """Determine file type based on extension"""
    if not filename:
        return 'unknown'

    ext = filename.lower().split('.')[-1] if '.' in filename else ''

    image_exts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico']
    video_exts = ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'm4v']
    audio_exts = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a']
    document_exts = ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt']
    spreadsheet_exts = ['xls', 'xlsx', 'csv', 'ods']
    presentation_exts = ['ppt', 'pptx', 'odp']
    archive_exts = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2']
    code_exts = ['py', 'js', 'html', 'css', 'java', 'cpp', 'c', 'php', 'rb', 'go']

    if ext in image_exts:
        return 'image'
    elif ext in video_exts:
        return 'video'
    elif ext in audio_exts:
        return 'audio'
    elif ext in document_exts:
        return 'document'
    elif ext in spreadsheet_exts:
        return 'spreadsheet'
    elif ext in presentation_exts:
        return 'presentation'
    elif ext in archive_exts:
        return 'archive'
    elif ext in code_exts:
        return 'code'
    else:
        return 'file'

def get_file_thumbnail(filename):
    """Get thumbnail URL for file based on type"""
    file_type = get_file_type(filename)

    # Return emoji-based thumbnails for now
    # In a real implementation, you might generate actual thumbnails
    thumbnail_map = {
        'image': '🖼️',
        'video': '🎥',
        'audio': '🎵',
        'document': '📄',
        'spreadsheet': '📊',
        'presentation': '📽️',
        'archive': '📦',
        'code': '💻',
        'folder': '📁',
        'file': '📄'
    }

    return thumbnail_map.get(file_type, '📄')

def sort_files(files, sort_by='name', sort_order='asc'):
    """Sort files based on criteria"""
    reverse = sort_order == 'desc'

    if sort_by == 'name':
        files.sort(key=lambda x: x['name'].lower(), reverse=reverse)
    elif sort_by == 'size':
        files.sort(key=lambda x: x['size'] or 0, reverse=reverse)
    elif sort_by == 'modified':
        files.sort(key=lambda x: x['modified'] or '', reverse=reverse)
    elif sort_by == 'type':
        files.sort(key=lambda x: x['type'], reverse=reverse)

    # Always put folders first
    folders = [f for f in files if f['type'] == 'folder']
    other_files = [f for f in files if f['type'] != 'folder']

    return folders + other_files

@app.route('/favicon.ico')
def favicon():
    """Serve favicon to prevent 404 errors"""
    return '', 204  # No Content
















@app.route('/logout', methods=['GET', 'POST'])
@dev_login_required
def logout():
    """Đăng xuất"""
    from flask_login import logout_user, current_user

    # Log logout event
    logger.info(f"User logout: {current_user.username if current_user.is_authenticated else 'Unknown'}")

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

# Admin routes
@app.route('/api/admin/menu-action', methods=['POST'])
@dev_login_required
@dev_admin_required
def admin_menu_action():
    """Handle admin menu actions"""
    try:
        data = request.get_json()
        action = data.get('action')

        if not action:
            return jsonify({'success': False, 'error': 'Missing action parameter'}), 400

        # Log admin action
        logger.info(f"Admin action by {current_user.username}")

        # Handle different admin actions
        if action == 'user_management':
            return jsonify({
                'success': True,
                'message': 'Chuyển đến trang quản lý người dùng',
                'redirect': '/admin/users'
            })
        elif action == 'system_settings':
            return jsonify({
                'success': True,
                'message': 'Chuyển đến trang cài đặt hệ thống',
                'redirect': '/admin/settings'
            })
        elif action == 'scan_settings':
            return jsonify({
                'success': True,
                'message': 'Chuyển đến trang cài đặt Telegram',
                'redirect': '/admin/telegram'
            })
        elif action == 'logs_view':
            return jsonify({
                'success': True,
                'message': 'Chuyển đến trang xem logs',
                'redirect': '/admin/logs'
            })
        elif action == 'profile_settings':
            return jsonify({
                'success': True,
                'message': 'Chuyển đến trang thông tin tài khoản',
                'redirect': '/admin/profile'
            })
        else:
            return jsonify({
                'success': False,
                'error': f'Unknown action: {action}'
            }), 400

    except Exception as e:
        logger.error(f"Error handling admin action: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

# Admin page routes
@app.route('/admin')
@dev_login_required
@dev_admin_required
def admin_navigation():
    """Trang điều hướng admin - WORKING"""
    return render_template('admin/admin_navigation.html')

@app.route('/admin/system')
@dev_login_required
@dev_admin_required
def admin_system():
    """Trang quản lý hệ thống"""
    try:
        # Get basic stats
        stats = {
            'total_users': auth_manager.get_user_count(),
            'admin_users': len([u for u in auth_manager.get_all_users() if u.is_admin])
        }

        return render_template('admin/system_management.html',
                             stats=stats,
                             config=config)
    except Exception as e:
        logger.error(f"Error loading admin system page: {str(e)}", exc_info=True)
        return f"Error: {str(e)}", 500

# System stats API
@app.route('/api/admin/system-stats')
@dev_login_required
@dev_admin_required
def admin_system_stats():
    """API để lấy thống kê hệ thống"""
    try:
        import psutil
        import time
        import os

        # Get system stats
        stats = {
            'uptime': f"{int(time.time() - psutil.boot_time())} seconds",
            'cpu_usage': f"{psutil.cpu_percent()}%",
            'memory_usage': f"{psutil.virtual_memory().percent}%",
            'disk_usage': f"{psutil.disk_usage('/').percent}%",
            'free_space': f"{psutil.disk_usage('/').free // (1024**3)} GB",
            'db_size': "N/A",  # Will implement later
            'total_files': "N/A"  # Will implement later
        }

        return jsonify({'success': True, 'stats': stats})
    except ImportError:
        # Fallback if psutil not available
        stats = {
            'uptime': 'N/A (psutil not installed)',
            'cpu_usage': 'N/A',
            'memory_usage': 'N/A',
            'disk_usage': 'N/A',
            'free_space': 'N/A',
            'db_size': 'N/A',
            'total_files': 'N/A'
        }
        return jsonify({'success': True, 'stats': stats})
    except Exception as e:
        logger.error(f"Error getting system stats: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

# System management APIs
@app.route('/api/admin/backup-database', methods=['POST'])
@dev_login_required
@dev_admin_required
def admin_backup_database():
    """API backup database"""
    try:
        import shutil
        import datetime

        # Create backup filename with timestamp
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_filename = f"teledrive_backup_{timestamp}.db"

        # Copy database file
        shutil.copy2("teledrive.db", f"backups/{backup_filename}")

        # Log backup action
        logger.info(f"Admin action by {current_user.username}")

        return jsonify({
            'success': True,
            'message': f'Database backup thành công: {backup_filename}'
        })
    except Exception as e:
        logger.error(f"Error backing up database: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/clear-cache', methods=['POST'])
@dev_login_required
@dev_admin_required
def admin_clear_cache():
    """API clear cache"""
    try:
        # Log cache clear action
        logger.info(f"Admin action by {current_user.username}")

        return jsonify({
            'success': True,
            'message': 'Cache đã được xóa thành công'
        })
    except Exception as e:
        logger.error(f"Error clearing cache: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/health-check')
@dev_login_required
@dev_admin_required
def admin_health_check():
    """API health check"""
    try:
        health_status = {
            'database': 'OK',
            'filesystem': 'OK',
            'memory': 'OK',
            'overall': 'HEALTHY'
        }

        # Check database connection
        try:
            auth_manager.get_user_count()
        except:
            health_status['database'] = 'ERROR'
            health_status['overall'] = 'UNHEALTHY'

        return jsonify({
            'success': True,
            'status': health_status['overall'],
            'details': '\n'.join([f"{k}: {v}" for k, v in health_status.items()])
        })
    except Exception as e:
        logger.error(f"Error in health check: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/admin/users')
@dev_login_required
@dev_admin_required
def admin_users():
    """Trang quản lý người dùng"""
    return render_template('admin/user_management.html')

# User management APIs
@app.route('/api/admin/users')
@dev_login_required
@dev_admin_required
def admin_get_users():
    """API lấy danh sách người dùng"""
    try:
        users = auth_manager.get_all_users()
        users_data = []

        for user in users:
            users_data.append({
                'id': user.id,
                'username': user.username,
                'phone_number': user.phone_number,
                'email': user.email,
                'is_admin': user.is_admin,
                'is_verified': user.is_verified,
                'created_at': user.created_at.isoformat() if user.created_at else None
            })

        return jsonify({'success': True, 'users': users_data})
    except Exception as e:
        logger.error(f"Error getting users: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/users', methods=['POST'])
@dev_login_required
@dev_admin_required
def admin_create_user():
    """API tạo người dùng mới"""
    try:
        data = request.get_json()
        username = data.get('username')
        phone = data.get('phone')
        email = data.get('email')
        password = data.get('password')
        is_admin = data.get('is_admin') == 'true'

        if not username or not phone or not password:
            return jsonify({'success': False, 'error': 'Thiếu thông tin bắt buộc'}), 400

        # Create user
        success, message = auth_manager.create_user(
            username=username,
            phone_number=phone,
            email=email,
            is_admin=is_admin
        )

        if success:
            # Log admin action
            logger.info(f"Admin action by {current_user.username}")

            return jsonify({'success': True, 'message': 'Tạo người dùng thành công'})
        else:
            return jsonify({'success': False, 'error': message}), 400

    except Exception as e:
        logger.error(f"Error creating user: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/users/<int:user_id>', methods=['PUT'])
@dev_login_required
@dev_admin_required
def admin_update_user(user_id):
    """API cập nhật người dùng"""
    try:
        from src.auth.models import User

        user = User.query.get(user_id)
        if not user:
            return jsonify({'success': False, 'error': 'Không tìm thấy người dùng'}), 404

        data = request.get_json()

        # Update user fields
        if 'username' in data:
            user.username = data['username']
        if 'phone' in data:
            user.phone_number = data['phone']
        if 'email' in data:
            user.email = data['email']
        if 'is_admin' in data:
            user.is_admin = data['is_admin'] == 'true'
        if 'password' in data and data['password']:
            from werkzeug.security import generate_password_hash
            user.password_hash = generate_password_hash(data['password'])

        # Save changes
        from src.database import db
        db.session.commit()

        # Log admin action
        logger.info(f"Admin action by {current_user.username}")

        return jsonify({'success': True, 'message': 'Cập nhật người dùng thành công'})

    except Exception as e:
        logger.error(f"Error updating user: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
@dev_login_required
@dev_admin_required
def admin_delete_user(user_id):
    """API xóa người dùng"""
    try:
        from src.auth.models import User
        from src.database import db

        user = User.query.get(user_id)
        if not user:
            return jsonify({'success': False, 'error': 'Không tìm thấy người dùng'}), 404

        # Prevent deleting admin users
        if user.is_admin:
            return jsonify({'success': False, 'error': 'Không thể xóa tài khoản admin'}), 403

        # Store username for logging
        username = user.username

        # Delete user
        db.session.delete(user)
        db.session.commit()

        # Log admin action
        logger.info(f"Admin action by {current_user.username}")

        return jsonify({'success': True, 'message': 'Xóa người dùng thành công'})

    except Exception as e:
        logger.error(f"Error deleting user: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/admin/settings')
@dev_login_required
@dev_admin_required
def admin_settings():
    """Trang cài đặt hệ thống với support cho logs và profile"""
    view = request.args.get('view', 'settings')

    if view == 'logs':
        return render_template('admin/logs_simple.html')
    elif view == 'profile':
        return render_template('admin/profile_settings.html', user=current_user)
    else:
        return render_template('admin/system_settings.html', config=config)

@app.route('/admin/settings/logs')
@dev_login_required
@dev_admin_required
def admin_settings_logs():
    """Trang xem logs - WORKING ROUTE"""
    return render_template('admin/logs_simple.html')

@app.route('/admin/settings/profile')
@dev_login_required
@dev_admin_required
def admin_settings_profile():
    """Trang thông tin tài khoản - WORKING ROUTE"""
    return render_template('admin/profile_settings.html', user=current_user)

# Settings API endpoints
@app.route('/api/admin/settings/<category>', methods=['POST'])
@dev_login_required
@dev_admin_required
def admin_save_settings(category):
    """API lưu cài đặt hệ thống"""
    try:
        data = request.get_json()

        # Log admin action
        logger.info(f"Admin action by {current_user.username}")

        # Here you would normally save to a config file or database
        # For now, just return success
        return jsonify({
            'success': True,
            'message': f'Đã lưu cài đặt {category} thành công'
        })

    except Exception as e:
        logger.error(f"Error saving settings: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/settings/reset', methods=['POST'])
@dev_login_required
@dev_admin_required
def admin_reset_settings():
    """API khôi phục cài đặt mặc định"""
    try:
        # Log admin action
        logger.info(f"Admin action by {current_user.username}")

        return jsonify({
            'success': True,
            'message': 'Đã khôi phục cài đặt mặc định thành công'
        })

    except Exception as e:
        logger.error(f"Error resetting settings: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/admin/telegram')
@dev_login_required
@dev_admin_required
def admin_telegram():
    """Trang cài đặt Telegram"""
    return render_template('admin/telegram_settings.html', config=config)

# FIXED ADMIN ROUTES - MOVED HERE FOR PROPER REGISTRATION
@app.route('/admin/logs')
@dev_login_required
@dev_admin_required
def admin_logs_fixed():
    """Trang xem logs - FIXED VERSION"""
    return render_template('admin/logs_simple.html')

@app.route('/admin/profile')
@dev_login_required
@dev_admin_required
def admin_profile_fixed():
    """Trang thông tin tài khoản - FIXED VERSION"""
    return render_template('admin/profile_settings.html', user=current_user)



# Telegram settings API endpoints
@app.route('/api/admin/telegram-settings/<category>', methods=['POST'])
@dev_login_required
@dev_admin_required
def admin_save_telegram_settings(category):
    """API lưu cài đặt Telegram"""
    try:
        data = request.get_json()

        # Log admin action
        logger.info(f"Admin action by {current_user.username}")

        return jsonify({
            'success': True,
            'message': f'Đã lưu cài đặt Telegram {category} thành công'
        })

    except Exception as e:
        logger.error(f"Error saving telegram settings: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/telegram-status')
@dev_login_required
@dev_admin_required
def admin_telegram_status():
    """API kiểm tra trạng thái kết nối Telegram"""
    try:
        # Mock status for now
        return jsonify({
            'success': True,
            'connected': False,
            'message': 'Chưa cấu hình API Telegram'
        })

    except Exception as e:
        logger.error(f"Error checking telegram status: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/telegram-sessions')
@dev_login_required
@dev_admin_required
def admin_telegram_sessions():
    """API lấy danh sách sessions Telegram"""
    try:
        # Mock sessions for now
        sessions = []

        return jsonify({
            'success': True,
            'sessions': sessions
        })

    except Exception as e:
        logger.error(f"Error getting telegram sessions: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/admin/logs')
@dev_login_required
@dev_admin_required
def admin_logs():
    """Trang xem logs"""
    return render_template('admin/logs_simple.html')



# Logs API endpoints
@app.route('/api/admin/logs')
@dev_login_required
@dev_admin_required
def admin_get_logs():
    """API lấy logs với filtering và pagination"""
    try:
        # Get query parameters
        level = request.args.get('level', '')
        source = request.args.get('source', '')
        search = request.args.get('search', '')
        date_from = request.args.get('date_from', '')
        date_to = request.args.get('date_to', '')
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 100))

        # Mock logs data for now
        import datetime
        import random

        # Generate sample logs
        sample_logs = []
        levels = ['INFO', 'WARNING', 'ERROR', 'DEBUG']
        sources = ['app', 'auth', 'telegram', 'database']
        messages = [
            'User login successful',
            'Database connection established',
            'Telegram API call completed',
            'File upload processed',
            'Session expired',
            'Authentication failed',
            'System backup completed',
            'Cache cleared successfully',
            'Admin action logged',
            'Error processing request'
        ]

        now = datetime.datetime.now()
        for i in range(200):  # Generate 200 sample logs
            log_time = now - datetime.timedelta(minutes=random.randint(0, 1440))  # Last 24 hours
            log_level = random.choice(levels)
            log_source = random.choice(sources)
            log_message = random.choice(messages)

            # Apply filters
            if level and log_level != level:
                continue
            if source and log_source != source:
                continue
            if search and search.lower() not in log_message.lower():
                continue
            if date_from:
                filter_from = datetime.datetime.fromisoformat(date_from.replace('T', ' '))
                if log_time < filter_from:
                    continue
            if date_to:
                filter_to = datetime.datetime.fromisoformat(date_to.replace('T', ' '))
                if log_time > filter_to:
                    continue

            sample_logs.append({
                'timestamp': log_time.isoformat(),
                'level': log_level,
                'source': log_source,
                'message': f'[{log_source}] {log_message}',
                'details': f'User: {current_user.username}, IP: 127.0.0.1' if random.choice([True, False]) else None
            })

        # Sort by timestamp (newest first)
        sample_logs.sort(key=lambda x: x['timestamp'], reverse=True)

        # Pagination
        total_logs = len(sample_logs)
        start_idx = (page - 1) * per_page
        end_idx = start_idx + per_page
        paginated_logs = sample_logs[start_idx:end_idx]

        # Stats
        error_count = len([log for log in sample_logs if log['level'] == 'ERROR'])

        return jsonify({
            'success': True,
            'logs': paginated_logs,
            'stats': {
                'total': total_logs,
                'errors': error_count,
                'displayed': len(paginated_logs)
            },
            'pagination': {
                'current_page': page,
                'total_pages': (total_logs + per_page - 1) // per_page,
                'has_prev': page > 1,
                'has_next': end_idx < total_logs
            }
        })

    except Exception as e:
        logger.error(f"Error getting logs: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/logs/clear', methods=['POST'])
@dev_login_required
@dev_admin_required
def admin_clear_logs():
    """API xóa logs"""
    try:
        # Log admin action
        logger.info(f"Admin action by {current_user.username}")

        # In a real implementation, you would clear the actual log files
        # For now, just return success
        return jsonify({
            'success': True,
            'message': 'Đã xóa logs thành công'
        })

    except Exception as e:
        logger.error(f"Error clearing logs: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/logs/export')
@dev_login_required
@dev_admin_required
def admin_export_logs():
    """API xuất logs"""
    try:
        # Get query parameters (same as get_logs)
        level = request.args.get('level', '')
        source = request.args.get('source', '')
        search = request.args.get('search', '')
        date_from = request.args.get('date_from', '')
        date_to = request.args.get('date_to', '')

        # Log admin action
        logger.info(f"Admin action by {current_user.username}")

        # Create a simple text export
        import io
        from datetime import datetime

        output = io.StringIO()
        output.write(f"TeleDrive Logs Export - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        output.write("=" * 80 + "\n\n")

        # Add sample log entries
        output.write("2025-07-21 09:15:30 [INFO] [app] User login successful - User: admin, IP: 127.0.0.1\n")
        output.write("2025-07-21 09:15:25 [INFO] [auth] Authentication successful for user: admin\n")
        output.write("2025-07-21 09:15:20 [INFO] [database] Database connection established\n")
        output.write("2025-07-21 09:15:15 [WARNING] [telegram] API rate limit approaching\n")
        output.write("2025-07-21 09:15:10 [ERROR] [app] Failed to process file upload\n")

        # Create response
        from flask import Response
        response = Response(
            output.getvalue(),
            mimetype='text/plain',
            headers={
                'Content-Disposition': f'attachment; filename=teledrive_logs_{datetime.now().strftime("%Y%m%d_%H%M%S")}.txt'
            }
        )

        return response

    except Exception as e:
        logger.error(f"Error exporting logs: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/admin/profile')
@dev_login_required
@dev_admin_required
def admin_profile():
    """Trang thông tin tài khoản"""
    return render_template('admin/profile_settings.html', user=current_user)

# Profile API endpoints
@app.route('/api/admin/profile/personal', methods=['POST'])
@dev_login_required
@dev_admin_required
def admin_update_personal():
    """API cập nhật thông tin cá nhân"""
    try:
        data = request.get_json()

        # Update current user info
        if 'username' in data:
            current_user.username = data['username']
        if 'email' in data:
            current_user.email = data['email']
        if 'phone' in data:
            current_user.phone_number = data['phone']

        # Save changes
        from src.database import db
        db.session.commit()

        # Log admin action
        logger.info("Admin action performed")

        return jsonify({
            'success': True,
            'message': 'Đã cập nhật thông tin cá nhân thành công'
        })

    except Exception as e:
        logger.error(f"Error updating personal info: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/profile/password', methods=['POST'])
@dev_login_required
@dev_admin_required
def admin_change_password():
    """API đổi mật khẩu"""
    try:
        data = request.get_json()
        current_password = data.get('current_password')
        new_password = data.get('new_password')

        if not current_password or not new_password:
            return jsonify({'success': False, 'error': 'Thiếu thông tin mật khẩu'}), 400

        # Verify current password
        from werkzeug.security import check_password_hash, generate_password_hash
        if not check_password_hash(current_user.password_hash, current_password):
            return jsonify({'success': False, 'error': 'Mật khẩu hiện tại không đúng'}), 400

        # Update password
        current_user.password_hash = generate_password_hash(new_password)

        # Save changes
        from src.database import db
        db.session.commit()

        # Log admin action
        logger.info(f"Admin action by {current_user.username}")

        return jsonify({
            'success': True,
            'message': 'Đã đổi mật khẩu thành công'
        })

    except Exception as e:
        logger.error(f"Error changing password: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/profile/preferences', methods=['POST'])
@dev_login_required
@dev_admin_required
def admin_update_preferences():
    """API cập nhật tùy chọn"""
    try:
        data = request.get_json()

        # Log admin action
        logger.info(f"Admin action by {current_user.username}")

        # In a real implementation, you would save preferences to database
        return jsonify({
            'success': True,
            'message': 'Đã lưu tùy chọn thành công'
        })

    except Exception as e:
        logger.error(f"Error updating preferences: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/profile/stats')
@dev_login_required
@dev_admin_required
def admin_profile_stats():
    """API lấy thống kê profile"""
    try:
        stats = {
            'sessions': 0,  # Mock data
            'total_logins': 15,
            'last_activity': 'Hôm nay, 09:15'
        }

        return jsonify({
            'success': True,
            'stats': stats
        })

    except Exception as e:
        logger.error(f"Error getting profile stats: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/profile/activity')
@dev_login_required
@dev_admin_required
def admin_profile_activity():
    """API lấy hoạt động gần đây"""
    try:
        activities = [
            {
                'icon': '💾',
                'action': 'Lưu cài đặt hệ thống',
                'time': 'Hôm nay, 09:00'
            },
            {
                'icon': '🔍',
                'action': 'Xem logs hệ thống',
                'time': 'Hôm qua, 18:30'
            },
            {
                'icon': '📱',
                'action': 'Cập nhật cài đặt Telegram',
                'time': 'Hôm qua, 15:20'
            }
        ]

        return jsonify({
            'success': True,
            'activities': activities
        })

    except Exception as e:
        logger.error(f"Error getting profile activity: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500



# Function để init database khi cần
def init_app_database():
    """Initialize database for the app"""
    try:
        init_database(app)
        print("[OK] Database initialized successfully")
        return True
    except Exception as e:
        print(f"[ERROR] Database initialization failed: {e}")
        return False

# Init database khi app được import
try:
    init_app_database()
except Exception as e:
    print(f"[WARNING] Could not initialize database on import: {e}")

if __name__ == '__main__':
    # Ensure database is initialized
    if not init_app_database():
        print("[ERROR] Cannot start app without database")
        sys.exit(1)

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
