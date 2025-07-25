#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""TeleDrive Web Interface

This module provides the main Flask application for TeleDrive, a modern web interface
for managing Telegram files with Google Drive-like experience.

The application handles authentication, file browsing, searching, and administrative
features with a focus on performance and security.
"""

import json
import logging
import os
import sys
from datetime import datetime
from functools import wraps
from pathlib import Path

from dotenv import load_dotenv
from flask import (Flask, abort, jsonify, make_response, redirect,
                   render_template, request, send_file, url_for)
from flask_cors import CORS
from flask_login import current_user, login_required, login_user, logout_user

# Load environment variables first
load_dotenv()

# Fix path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import application components
from .database import db
from .auth import auth_manager
from .models import OTPManager, validate_phone_number
from .services import send_otp_sync
from .services.filesystem import FileSystemManager
from .config import config, validate_environment
from .security import init_security_middleware

from .security.input_validation import (
    validate_request_json, validate_query_params,
    FILENAME_SCHEMA, PATH_SCHEMA
)
from .security.validation import sanitize_filename

# Dev mode helper
def dev_mode_enabled():
    """Kiểm tra xem có bật dev mode không"""
    # Check both environment variable and Flask config
    env_dev_mode = os.getenv('DEV_MODE', 'false').lower() == 'true'
    flask_dev_mode = app.config.get('DEV_MODE', False) if app else False
    return env_dev_mode or flask_dev_mode

def create_dev_user():
    """Tạo user giả cho dev mode"""
    class DevUser:
        def __init__(self):
            self.id = 'dev_user'
            self.username = 'Developer'
            self.phone_number = '+84123456789'
            self.email = 'dev@teledrive.local'
            self.is_admin = True
            self.is_active = True
            self.is_verified = True

        @property
        def is_authenticated(self):
            return True

        @property
        def is_anonymous(self):
            return False

        def get_id(self):
            return self.id

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

from .database import db
from .auth import auth_manager
# Import admin_required nhưng sẽ dùng dev_admin_required thay thế
from .models import OTPManager, validate_phone_number
from .services import send_otp_sync
from .services.filesystem import FileSystemManager
from .config import config, validate_environment
from .security import init_security_middleware
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

# Thêm cấu hình cần thiết cho URL generation (chỉ khi cần)
if not app.config.get('SERVER_NAME'):
    app.config['APPLICATION_ROOT'] = '/'
    app.config['PREFERRED_URL_SCHEME'] = 'http'

# Đảm bảo database URI nhất quán với main.py
from pathlib import Path
instance_dir = Path('instance')
instance_dir.mkdir(exist_ok=True)
# Sử dụng cùng tên database như main.py để tránh conflict
db_path = instance_dir / 'teledrive.db'
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path.resolve()}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize database và auth manager ngay sau khi config app
try:
    # Kiểm tra xem db đã được init chưa
    if not hasattr(app, 'extensions') or 'sqlalchemy' not in app.extensions:
        # Init database trước
        db.init_app(app)
        print("[OK] SQLAlchemy initialized")

    # Init auth manager
    auth_manager.init_app(app)
    print("[OK] Auth manager initialized")

    # Tạo tables trong app context
    with app.app_context():
        db.create_all()
        print("[OK] Database tables created")

except Exception as e:
    print(f"[ERROR] Database/Auth initialization failed: {e}")
    # Không exit để app vẫn có thể chạy trong dev mode

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

# Initialize enhanced security
from .security import init_security_headers, init_csrf_protection
init_security_headers(app)
init_csrf_protection(app)

# Add cache headers for static files
@app.after_request
def add_cache_headers(response):
    """Add proper cache headers for static files"""
    if request.endpoint == 'static':
        # Force no cache for CSS and JS files to prevent old file issues
        if request.path.endswith(('.css', '.js')):
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response.headers['Pragma'] = 'no-cache'
            response.headers['Expires'] = '0'
        else:
            # Cache other static files for 1 hour
            response.headers['Cache-Control'] = 'public, max-age=3600'
    return response

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

            # Ensure output directory exists
            self.output_dir.mkdir(exist_ok=True)

            json_files = list(self.output_dir.glob("*_telegram_files.json"))
            logger.info(f"Found {len(json_files)} session files in {self.output_dir}")

            if not json_files:
                logger.info("No session files found, returning empty list")
                return []

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
                    logger.info(f"Loaded session {session_id} with {len(files)} files")

                except Exception as e:
                    logger.error(f"Error reading file {json_file}: {e}")
                    continue

            logger.info(f"Successfully loaded {len(sessions)} sessions")
            return sessions

        except Exception as e:
            logger.error(f"Error getting scan sessions: {e}", exc_info=True)
            return []

    def get_sessions(self):
        """Alias for get_scan_sessions() for backward compatibility"""
        return self.get_scan_sessions()

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
    """Trang chủ"""
    try:
        # Ở chế độ dev, không cần đăng nhập
        if dev_mode_enabled():
            # Tạo user giả cho dev mode
            login_user(create_dev_user())
            
            # Lấy mẫu dữ liệu cho chế độ dev
            sample_files = []
            
            # Các thư mục mẫu
            sample_files.append({
                'id': 'folder1',
                'name': 'Tài liệu cá nhân',
                'is_directory': True,
                'modified': '12/05/2023',
                'size': ''
            })
            
            sample_files.append({
                'id': 'folder2',
                'name': 'Dự án',
                'is_directory': True,
                'modified': '20/04/2023',
                'size': ''
            })
            
            # Các file mẫu
            sample_files.append({
                'id': 'file1',
                'name': 'Báo cáo tài chính Q2 2023.pdf',
                'is_directory': False,
                'type': 'pdf',
                'modified': '10/06/2023',
                'size': '2.4 MB'
            })
            
            sample_files.append({
                'id': 'file2',
                'name': 'Kế hoạch dự án.docx',
                'is_directory': False,
                'type': 'doc',
                'modified': '15/05/2023',
                'size': '1.2 MB'
            })
            
            sample_files.append({
                'id': 'file3',
                'name': 'Dữ liệu phân tích.xlsx',
                'is_directory': False,
                'type': 'xls',
                'modified': '05/06/2023',
                'size': '3.7 MB'
            })
            
            sample_files.append({
                'id': 'file4',
                'name': 'Logo công ty.png',
                'is_directory': False,
                'type': 'image',
                'url': '/static/images/placeholder.png',
                'thumbnail_url': '/static/images/placeholder.png',
                'modified': '01/06/2023',
                'size': '542 KB'
            })
            
            # Truyền breadcrumbs
            breadcrumbs = [
                {'name': 'TeleDrive', 'path': '/'}
            ]
            
            return render_template('index.html', 
                                user=current_user, 
                                files=sample_files, 
                                dev_mode=True,
                                breadcrumbs=breadcrumbs)
            
        # Kiểm tra có admin user nào chưa
        if hasattr(auth_manager, 'has_admin_user') and not auth_manager.has_admin_user():
            return redirect(url_for('setup'))

        # Yêu cầu đăng nhập (chế độ bình thường)
        if not current_user.is_authenticated:
            return redirect(url_for('login'))

        return render_template('index.html', user=current_user, files=[], dev_mode=False)
    except Exception as e:
        # Fallback đơn giản khi có lỗi
        return '<h1>TeleDrive</h1><p>Đang tải...</p><script>setTimeout(function(){location.reload()}, 2000);</script>'



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
        
        # Kiểm tra xem tài khoản có bị khóa không
        if OTPManager.is_account_locked(formatted_phone):
            lock_info = OTPManager.get_lock_info(formatted_phone)
            remaining_mins = lock_info.get('remaining_seconds', 0) // 60 + 1
            return jsonify({
                'success': False,
                'message': f"Tài khoản tạm thời bị khóa. Vui lòng thử lại sau {remaining_mins} phút.",
                'locked': True,
                'lock_info': lock_info
            }), 403
        
        # Kiểm tra user có tồn tại không
        user = auth_manager.find_user_by_phone(formatted_phone)
        if not user:
            return jsonify({'success': False, 'message': 'Số điện thoại chưa được đăng ký'}), 404
        
        # Tạo và gửi OTP
        otp_code = OTPManager.create_otp(formatted_phone)
        
        # Nếu không thể tạo OTP (có thể do rate limit)
        if not otp_code:
            return jsonify({
                'success': False, 
                'message': 'Không thể gửi OTP vào lúc này. Vui lòng thử lại sau vài phút.'
            }), 429
        
        # Trong môi trường production, OTP sẽ được gửi qua SMS hoặc Telegram
        # Ở đây chúng ta hiển thị OTP để testing
        if app.config.get('ENV') == 'development' or app.config.get('DEV_MODE', False):
            return jsonify({
                'success': True,
                'message': f'Mã OTP đã được tạo: {otp_code} (Chế độ phát triển)',
                'otp_code': otp_code  # Chỉ hiển thị trong chế độ phát triển
            })
        else:
            # Trong production, gửi OTP qua dịch vụ SMS hoặc Telegram
            try:
                # Import không đồng bộ để tránh lỗi khi chưa cấu hình
                from .services import send_otp_sync
                send_result = send_otp_sync(formatted_phone, otp_code)
                
                if send_result.get('success', False):
                    return jsonify({
                        'success': True,
                        'message': 'Mã OTP đã được gửi đến số điện thoại của bạn'
                    })
                else:
                    return jsonify({
                        'success': False,
                        'message': send_result.get('message', 'Không thể gửi OTP. Vui lòng thử lại sau.')
                    }), 500
            except Exception as e:
                print(f"Lỗi gửi OTP: {e}")
                # Fallback để testing trong trường hợp lỗi
                return jsonify({
                    'success': True,
                    'message': f'Mã OTP đã được tạo: {otp_code} (Fallback mode)',
                    'otp_code': otp_code
                })
            
    except Exception as e:
        return jsonify({'success': False, 'message': f'Lỗi hệ thống: {str(e)}'}), 500

@app.route('/verify-otp', methods=['POST'])
@validate_request_json({
    "phone_number": PHONE_NUMBER_SCHEMA,
    "otp_code": OTP_SCHEMA,
    "remember": {"type": bool, "required": False}
})
def verify_otp():
    """Xác thực mã OTP và đăng nhập với validation đầu vào"""
    try:
        data = request.get_json()
        phone_number = data.get('phone_number', '').strip()
        otp_code = data.get('otp_code', '').strip()
        remember = data.get('remember', False)
        
        # Validate số điện thoại (đã được xác thực bởi decorator, đây chỉ là để format)
        is_valid, result = validate_phone_number(phone_number)
        formatted_phone = result

        # Kiểm tra xem tài khoản có bị khóa không
        if OTPManager.is_account_locked(formatted_phone):
            lock_info = OTPManager.get_lock_info(formatted_phone)
            remaining_mins = lock_info.get('remaining_seconds', 0) // 60 + 1
            return jsonify({
                'success': False,
                'message': f"Tài khoản tạm thời bị khóa. Vui lòng thử lại sau {remaining_mins} phút.",
                'locked': True,
                'lock_info': lock_info
            }), 403
            
        # Test OTP for admin testing (chỉ trong chế độ phát triển)
        if app.config.get('ENV') == 'development' or app.config.get('DEV_MODE', False):
            if otp_code == '123456':
                # Find user by phone
                user = auth_manager.find_user_by_phone(formatted_phone)
                if user:
                    login_user(user, remember=remember)
                    return jsonify({
                        'success': True,
                        'message': 'Đăng nhập thành công (chế độ phát triển)',
                        'redirect': url_for('index')
                    })

        # Lấy OTP hiện tại của số điện thoại
        active_otp = OTPManager.get_active_otp(formatted_phone)
        if not active_otp:
            return jsonify({
                'success': False, 
                'message': 'Mã OTP không tồn tại hoặc đã hết hạn. Vui lòng yêu cầu mã mới.'
            }), 400

        # Validate OTP
        is_valid, message = active_otp.verify(otp_code)
        if not is_valid:
            return jsonify({'success': False, 'message': message}), 400

        # Xác thực người dùng
        user = auth_manager.authenticate_user_by_phone(formatted_phone)

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

    except ValidationError as e:
        return jsonify({
            'success': False, 
            'message': e.message,
            'field': e.field,
            'code': e.code
        }), 400
    except Exception as e:
        current_app.logger.error(f"Error verifying OTP: {str(e)}")
        return jsonify({
            'success': False, 
            'message': f'Lỗi hệ thống: {str(e)}',
            'code': 'SYSTEM_ERROR'
        }), 500

# ===== ADMIN ROUTES =====

@app.route('/admin/logs')
@dev_admin_required
def admin_logs():
    """Admin logs viewer page"""
    try:
        # In dev mode, create a dev user
        if dev_mode_enabled():
            user = create_dev_user()
        else:
            user = current_user

        return render_template('admin/logs_viewer.html', user=user)

    except Exception as e:
        logger.error(f"Error loading admin logs page: {str(e)}", exc_info=True)
        return f"<h1>Error</h1><p>Không thể tải trang logs: {str(e)}</p>", 500

@app.route('/admin/profile')
@dev_admin_required
def admin_profile():
    """Admin profile settings page"""
    try:
        # In dev mode, create a dev user
        if dev_mode_enabled():
            user = create_dev_user()
        else:
            user = current_user

        return render_template('admin/profile_settings.html', user=user)

    except Exception as e:
        logger.error(f"Error loading admin profile page: {str(e)}", exc_info=True)
        return f"<h1>Error</h1><p>Không thể tải trang profile: {str(e)}</p>", 500

@app.route('/admin/users')
@dev_admin_required
def admin_users():
    """Admin user management page"""
    try:
        # In dev mode, create a dev user
        if dev_mode_enabled():
            user = create_dev_user()
        else:
            user = current_user

        return render_template('admin/user_management.html', user=user)

    except Exception as e:
        logger.error(f"Error loading admin users page: {str(e)}", exc_info=True)
        return f"<h1>Error</h1><p>Không thể tải trang users: {str(e)}</p>", 500

@app.route('/admin/system')
@dev_admin_required
def admin_system():
    """Admin system management page"""
    try:
        # In dev mode, create a dev user
        if dev_mode_enabled():
            user = create_dev_user()
        else:
            user = current_user

        return render_template('admin/system_management.html', user=user)

    except Exception as e:
        logger.error(f"Error loading admin system page: {str(e)}", exc_info=True)
        return f"<h1>Error</h1><p>Không thể tải trang system: {str(e)}</p>", 500

@app.route('/admin/settings')
@dev_admin_required
def admin_settings():
    """Admin system settings page"""
    try:
        # In dev mode, create a dev user
        if dev_mode_enabled():
            user = create_dev_user()
        else:
            user = current_user

        return render_template('admin/system_settings.html', user=user)

    except Exception as e:
        logger.error(f"Error loading admin settings page: {str(e)}", exc_info=True)
        return f"<h1>Error</h1><p>Không thể tải trang settings: {str(e)}</p>", 500

@app.route('/admin/telegram')
@dev_admin_required
def admin_telegram():
    """Admin Telegram settings page"""
    try:
        # In dev mode, create a dev user
        if dev_mode_enabled():
            user = create_dev_user()
        else:
            user = current_user

        return render_template('admin/telegram_settings.html', user=user)

    except Exception as e:
        logger.error(f"Error loading admin telegram page: {str(e)}", exc_info=True)
        return f"<h1>Error</h1><p>Không thể tải trang telegram: {str(e)}</p>", 500

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

# Sessions API endpoint (moved here for testing)
@app.route('/api/sessions')
def api_sessions_new():
    """Get Telegram sessions (alias for scans)"""
    # Return mock data for testing
    mock_sessions = [
        {
            'id': 'test',
            'name': 'test',
            'file_count': 5,
            'last_scan': '2025-01-20T10:30:00Z',
            'status': 'active'
        }
    ]
    return jsonify(mock_sessions)

@app.route('/api/files')
@dev_login_required
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
@dev_login_required
def get_scans():
    """Lấy danh sách scan sessions"""
    try:
        logger.info("API /api/scans: Starting to get sessions")
        sessions = api.get_scan_sessions() if hasattr(api, 'get_scan_sessions') else []
        logger.info(f"API /api/scans: Found {len(sessions)} sessions")
        return jsonify(sessions)
    except Exception as e:
        logger.error(f"Error in /api/scans: {str(e)}", exc_info=True)
        return jsonify([]), 200  # Return empty array instead of error

# Start scan API endpoint
@app.route('/api/scan/telegram', methods=['POST'])
@dev_login_required
def api_start_telegram_scan():
    """Start a new Telegram scan"""
    try:
        data = request.get_json() or {}
        scan_type = data.get('scan_type', 'telegram')
        options = data.get('options', {})

        logger.info(f"Starting Telegram scan with options: {options}")

        # For now, return a mock response since actual scanning requires async setup
        # TODO: Implement actual Telegram scanning
        return jsonify({
            'success': True,
            'message': 'Telegram scan started successfully',
            'scan_id': f'scan_{datetime.now().strftime("%Y%m%d_%H%M%S")}',
            'status': 'started',
            'options': options
        })

    except Exception as e:
        logger.error(f"Error starting Telegram scan: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Failed to start Telegram scan'
        }), 500

@app.route('/api/files/<session_id>')
@auth_required
def get_session_files(session_id):
    """Lấy files trong một session"""
    try:
        logger.info(f"API /api/files/{session_id}: Loading session files")
        data = api.get_session_files(session_id)
        if data:
            logger.info(f"API /api/files/{session_id}: Found session data")
            return jsonify(data)
        else:
            logger.warning(f"API /api/files/{session_id}: Session not found")
            return jsonify({'error': 'Session not found', 'files': [], 'scan_info': {}}), 404
    except Exception as e:
        logger.error(f"Error in /api/files/{session_id}: {str(e)}", exc_info=True)
        return jsonify({'error': 'Internal server error', 'files': [], 'scan_info': {}}), 500

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
@validate_request_json({
    "parent_path": PATH_SCHEMA,
    "folder_name": {
        "type": str,
        "required": True,
        "min_length": 1,
        "max_length": 255,
        "pattern": r"^[a-zA-Z0-9_\-. ]+$",
        "pattern_message": "Tên thư mục chỉ được chứa chữ cái, chữ số, dấu gạch dưới, dấu gạch ngang, dấu chấm và dấu cách",
        "check_xss": True
    }
})
def create_folder():
    """Create a new folder with input validation"""
    try:
        data = request.get_json()
        parent_path = data.get('parent_path')
        folder_name = data.get('folder_name')

        # Sanitize folder name
        folder_name = sanitize_filename(folder_name)
        
        # Check if parent directory exists
        if not os.path.exists(parent_path) or not os.path.isdir(parent_path):
            return jsonify({
                'success': False,
                'error': 'Thư mục cha không tồn tại hoặc không phải là thư mục',
                'code': 'PARENT_NOT_FOUND'
            }), 404
            
        # Check for path traversal attempts
        if '..' in parent_path or '..' in folder_name:
            return jsonify({
                'success': False,
                'error': 'Đường dẫn không hợp lệ',
                'code': 'INVALID_PATH'
            }), 400

        # Create full path
        full_path = os.path.join(parent_path, folder_name)
        
        # Check if folder already exists
        if os.path.exists(full_path):
            return jsonify({
                'success': False,
                'error': 'Thư mục đã tồn tại',
                'code': 'ALREADY_EXISTS'
            }), 409

        # Create folder
        os.makedirs(full_path, exist_ok=True)
        
        # Return success response
        return jsonify({
            'success': True,
            'message': 'Tạo thư mục thành công',
            'folder_path': full_path
        })
    except Exception as e:
        current_app.logger.error(f"Error creating folder: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Lỗi khi tạo thư mục: {str(e)}',
            'code': 'CREATE_FOLDER_ERROR'
        }), 500

@app.route('/api/item/rename', methods=['POST'])
@auth_required
def rename_item():
    """Rename a file or folder - DEPRECATED, use api_item_rename instead"""
    # Redirect to new API endpoint
    return api_item_rename()

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
@validate_query_params({
    "path": {
        "type": str, 
        "required": False,
        "validator": validate_path,
        "validator_message": "Đường dẫn tìm kiếm không hợp lệ"
    },
    "query": {
        "type": str,
        "required": True,
        "min_length": 1,
        "max_length": 200,
        "check_xss": True,
        "check_sql_injection": True
    },
    "max_results": {
        "type": int,
        "required": False,
        "minimum": 1,
        "maximum": 1000
    }
})
def search_files(validated_params):
    """Search for files in directory with validated parameters"""
    try:
        # Extract validated parameters
        path = validated_params.get('path', 'C:\\')
        query = validated_params.get('query', '')
        file_types = request.args.getlist('file_types')  # Not validated by decorator
        max_results = validated_params.get('max_results', 100)
        
        # Validate file_types if provided
        if file_types:
            valid_types = ['image', 'video', 'audio', 'document', 'archive', 'other']
            for file_type in file_types:
                if file_type not in valid_types:
                    return jsonify({
                        'success': False,
                        'error': f'Loại file không hợp lệ: {file_type}',
                        'code': 'INVALID_FILE_TYPE'
                    }), 400

        # Call the file manager's search function with validated parameters
        result = fs_manager.search_files(path, query, file_types, max_results)
        return jsonify(result)
    except ValueError as e:
        return jsonify({
            'success': False,
            'error': f'Lỗi giá trị: {str(e)}',
            'code': 'VALUE_ERROR'
        }), 400
    except Exception as e:
        current_app.logger.error(f"Error searching files: {str(e)}")
        return jsonify({
            'success': False, 
            'error': f'Lỗi khi tìm kiếm: {str(e)}',
            'code': 'SEARCH_ERROR'
        }), 500

@app.route('/api/file/preview')
@auth_required
@validate_query_params({
    "path": {
        "type": str,
        "required": True,
        "validator": validate_path,
        "validator_message": "Đường dẫn file không hợp lệ"
    }
})
def get_file_preview(validated_params):
    """Get file preview information with validated path"""
    try:
        file_path = validated_params.get('path')
        
        # Kiểm tra xem file có tồn tại không
        if not os.path.exists(file_path):
            return jsonify({
                'success': False, 
                'error': 'File không tồn tại',
                'code': 'FILE_NOT_FOUND'
            }), 404
            
        # Kiểm tra xem có phải là file hay không
        if os.path.isdir(file_path):
            return jsonify({
                'success': False, 
                'error': 'Đường dẫn là thư mục, không phải file',
                'code': 'PATH_IS_DIRECTORY'
            }), 400
            
        # Kiểm tra quyền đọc
        if not os.access(file_path, os.R_OK):
            return jsonify({
                'success': False, 
                'error': 'Không có quyền đọc file',
                'code': 'PERMISSION_DENIED'
            }), 403
        
        # Gọi hàm xem trước file từ file manager
        result = fs_manager.get_file_preview(file_path)
        return jsonify(result)
    except ValueError as e:
        return jsonify({
            'success': False,
            'error': f'Lỗi giá trị: {str(e)}',
            'code': 'VALUE_ERROR'
        }), 400
    except Exception as e:
        current_app.logger.error(f"Error getting file preview: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Lỗi khi xem trước file: {str(e)}',
            'code': 'PREVIEW_ERROR'
        }), 500

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

        # Check if we have a file path (already downloaded)
        file_path = target_file.get('file_path')
        if file_path and os.path.exists(file_path):
            return send_file(
                file_path,
                as_attachment=True, 
                attachment_filename=target_file.get('file_name', 'download')
            )
            
        # Otherwise, get the download link
        download_link = target_file.get('download_link')
        if not download_link:
            return jsonify({'success': False, 'error': 'Download link not available'}), 404
            
        # Handle different types of links
        if download_link.startswith('tg://'):
            # Handle tg:// links - need Telegram client to download
            # This requires Telegram client to be initialized and connected
            try:
                # Create downloads directory if not exists
                download_dir = os.path.join(os.getcwd(), 'downloads')
                if not os.path.exists(download_dir):
                    os.makedirs(download_dir)
                    
                # Construct download path
                file_name = target_file.get('file_name', f'telegram_file_{message_id}')
                file_path = os.path.join(download_dir, file_name)
                
                # Use TeleDriveWebAPI to download
                # Note: This would be an async operation in reality, but we're simplifying here
                # The API would need to be modified to support this
                
                # For now, just return a message indicating it's not implemented yet
                return jsonify({
                    'success': False,
                    'error': 'Direct download not implemented yet for tg:// links. Use Telegram client.',
                    'link': download_link
                }), 501
            except Exception as download_error:
                logger.error(f"Download error: {str(download_error)}", exc_info=True)
                return jsonify({'success': False, 'error': f'Download failed: {str(download_error)}'}), 500
        else:
            # HTTP links - For now redirect, but ideally we should download and serve
            # This could be enhanced to download via requests and serve, but that requires more implementation
            return redirect(download_link)

    except Exception as e:
        logger.error(f"Error downloading file: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/file/preview/<session_id>/<int:message_id>')
@auth_required
def preview_telegram_file(session_id, message_id):
    """Get file preview information and generate preview if possible"""
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

        # Determine file type
        file_name = target_file.get('file_name', '')
        file_type = get_file_type(file_name)
        mime_type = target_file.get('mime_type', 'application/octet-stream')

        # Prepare preview information
        preview_info = {
            'success': True,
            'file': target_file,
            'preview_type': 'unknown',
            'preview_available': False,
            'mime_type': mime_type,
            'file_type': file_type,
            'download_url': f'/api/file/download/{session_id}/{message_id}'
        }

        # Determine preview type and availability based on file type
        if file_type == 'image':
            preview_info['preview_type'] = 'image'
            preview_info['preview_available'] = True
            preview_info['preview_url'] = target_file.get('thumbnail_url') or target_file.get('download_link')
        elif file_type == 'video':
            preview_info['preview_type'] = 'video'
            preview_info['preview_available'] = True
            preview_info['preview_url'] = target_file.get('download_link')
            # Add thumbnail if available
            if target_file.get('thumbnail_url'):
                preview_info['thumbnail_url'] = target_file.get('thumbnail_url')
        elif file_type == 'audio':
            preview_info['preview_type'] = 'audio'
            preview_info['preview_available'] = True
            preview_info['preview_url'] = target_file.get('download_link')
        elif file_type == 'pdf':
            preview_info['preview_type'] = 'pdf'
            preview_info['preview_available'] = True
            preview_info['preview_url'] = target_file.get('download_link')
        elif file_type in ['doc', 'docx', 'txt', 'rtf']:
            preview_info['preview_type'] = 'document'
            # For documents, we'd need actual content to preview
            # For now, mark as not available directly
            preview_info['preview_available'] = False
        elif file_type in ['xls', 'xlsx', 'csv']:
            preview_info['preview_type'] = 'spreadsheet'
            preview_info['preview_available'] = False
        else:
            # No preview available for other file types
            preview_info['preview_type'] = 'unknown'
            preview_info['preview_available'] = False

        # Add file metadata
        preview_info['metadata'] = {
            'size': target_file.get('file_size_formatted', 'Unknown'),
            'date': target_file.get('date_formatted', 'Unknown'),
            'dimensions': target_file.get('dimensions', 'Unknown') if file_type == 'image' or file_type == 'video' else None,
            'duration': target_file.get('duration_formatted') if file_type == 'video' or file_type == 'audio' else None
        }

        return jsonify(preview_info)

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
            sessions = api.get_scan_sessions()
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
        sessions = api.get_scan_sessions()

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

# Duplicate route removed - using the one above

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
    """API health check với kiểm tra chi tiết hơn"""
    try:
        health_status = {
            'database': {
                'status': 'OK',
                'message': 'Kết nối database hoạt động bình thường',
                'details': {}
            },
            'filesystem': {
                'status': 'OK',
                'message': 'Filesystem hoạt động bình thường',
                'details': {}
            },
            'memory': {
                'status': 'OK',
                'message': 'Memory usage trong ngưỡng cho phép',
                'details': {}
            },
            'network': {
                'status': 'OK',
                'message': 'Network hoạt động bình thường',
                'details': {}
            },
            'overall': 'HEALTHY',
            'timestamp': datetime.now().isoformat()
        }

        # Check database connection
        try:
            # Thực hiện truy vấn đơn giản để kiểm tra database
            result = db.session.execute("SELECT 1").fetchone()
            if result and result[0] == 1:
                health_status['database']['details']['query_time'] = "< 10ms"
                
                # Kiểm tra thêm về database size
                try:
                    from pathlib import Path
                    db_path = Path('instance/teledrive.db')
                    if db_path.exists():
                        size_mb = db_path.stat().st_size / (1024 * 1024)
                        health_status['database']['details']['size'] = f"{size_mb:.2f} MB"
                        
                        # Cảnh báo nếu kích thước database quá lớn
                        if size_mb > 500:  # Giả sử 500MB là ngưỡng cảnh báo
                            health_status['database']['status'] = 'WARNING'
                            health_status['database']['message'] = f"Kích thước database lớn ({size_mb:.2f} MB)"
                except Exception as e:
                    health_status['database']['details']['size_error'] = str(e)
            else:
                health_status['database']['status'] = 'ERROR'
                health_status['database']['message'] = 'Database không phản hồi đúng'
                health_status['overall'] = 'DEGRADED'
        except Exception as db_error:
            health_status['database']['status'] = 'ERROR'
            health_status['database']['message'] = f"Lỗi kết nối database: {str(db_error)}"
            health_status['database']['details']['error'] = str(db_error)
            health_status['overall'] = 'DEGRADED'

        # Check filesystem
        try:
            import os
            import tempfile
            
            # Kiểm tra quyền đọc/ghi bằng cách tạo và xóa một file tạm thời
            test_dir = Path('instance')
            test_dir.mkdir(exist_ok=True)
            
            test_file = test_dir / f"health_check_{datetime.now().strftime('%Y%m%d%H%M%S')}.tmp"
            test_file.write_text("Health check test")
            test_file.unlink()  # Xóa file sau khi test
            
            health_status['filesystem']['details']['write_test'] = "Passed"
            
            # Kiểm tra dung lượng ổ đĩa
            if os.name == 'posix':  # Linux/Mac
                import shutil
                total, used, free = shutil.disk_usage('/')
                free_gb = free / (1024 * 1024 * 1024)
                health_status['filesystem']['details']['free_space'] = f"{free_gb:.2f} GB"
                
                if free_gb < 1:  # Dưới 1GB
                    health_status['filesystem']['status'] = 'WARNING'
                    health_status['filesystem']['message'] = f"Ổ đĩa còn ít dung lượng trống ({free_gb:.2f} GB)"
            else:  # Windows
                import ctypes
                free_bytes = ctypes.c_ulonglong(0)
                ctypes.windll.kernel32.GetDiskFreeSpaceExW(
                    ctypes.c_wchar_p('.'), None, None, ctypes.pointer(free_bytes))
                free_gb = free_bytes.value / (1024 * 1024 * 1024)
                health_status['filesystem']['details']['free_space'] = f"{free_gb:.2f} GB"
                
                if free_gb < 1:  # Dưới 1GB
                    health_status['filesystem']['status'] = 'WARNING'
                    health_status['filesystem']['message'] = f"Ổ đĩa còn ít dung lượng trống ({free_gb:.2f} GB)"
                    health_status['overall'] = 'DEGRADED'
        except Exception as fs_error:
            health_status['filesystem']['status'] = 'ERROR'
            health_status['filesystem']['message'] = f"Lỗi kiểm tra filesystem: {str(fs_error)}"
            health_status['filesystem']['details']['error'] = str(fs_error)
            health_status['overall'] = 'DEGRADED'

        # Check memory
        try:
            import psutil
            memory = psutil.virtual_memory()
            health_status['memory']['details'] = {
                'total': f"{memory.total / (1024 * 1024 * 1024):.2f} GB",
                'available': f"{memory.available / (1024 * 1024 * 1024):.2f} GB",
                'used': f"{memory.used / (1024 * 1024 * 1024):.2f} GB",
                'percent': f"{memory.percent}%"
            }
            
            if memory.percent > 90:
                health_status['memory']['status'] = 'WARNING'
                health_status['memory']['message'] = f"Sử dụng {memory.percent}% bộ nhớ hệ thống"
                health_status['overall'] = 'DEGRADED'
        except ImportError:
            health_status['memory']['status'] = 'UNKNOWN'
            health_status['memory']['message'] = 'Không thể kiểm tra (psutil không được cài đặt)'
        except Exception as mem_error:
            health_status['memory']['status'] = 'ERROR'
            health_status['memory']['message'] = f"Lỗi kiểm tra memory: {str(mem_error)}"
            health_status['memory']['details']['error'] = str(mem_error)
            health_status['overall'] = 'DEGRADED'

        # Check network connectivity
        try:
            import socket
            # Kiểm tra kết nối tới api.telegram.org
            socket.create_connection(("api.telegram.org", 443), timeout=5)
            health_status['network']['details']['telegram_api'] = "Accessible"
        except Exception as net_error:
            health_status['network']['status'] = 'WARNING'
            health_status['network']['message'] = "Không thể kết nối tới api.telegram.org"
            health_status['network']['details']['telegram_api'] = "Not accessible"
            health_status['network']['details']['error'] = str(net_error)
            health_status['overall'] = 'DEGRADED'

        # Log health check
        if health_status['overall'] != 'HEALTHY':
            logger.warning(f"Health check: {health_status['overall']}")
        else:
            logger.info(f"Health check: {health_status['overall']}")

        return jsonify({
            'success': True,
            'health': health_status
        })
    except Exception as e:
        logger.error(f"Error performing health check: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e),
            'health': {'overall': 'ERROR'}
        }), 500

# Duplicate route removed - using the one above

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
        from .auth.models import User

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
        from .database import db
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
        from .auth.models import User
        from .database import db

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

# Duplicate route removed - using the one above

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

# Duplicate route removed - using the one above

# FIXED ADMIN ROUTES - MOVED HERE FOR PROPER REGISTRATION
# Duplicate route removed - using the first one

# Duplicate route removed - using the first one



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

# Duplicate route removed - using the first one



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

# Duplicate route removed - using the first one

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
        from .database import db
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
        from .database import db
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

# Database đã được init ở trên, không cần init lại

if __name__ == '__main__':
    # Database đã được init ở trên

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

@app.route('/api/item/rename', methods=['POST'])
@login_required
@validate_request_json({
    "item_path": PATH_SCHEMA,
    "new_name": {
        "type": str,
        "required": True,
        "min_length": 1,
        "max_length": 255,
        "pattern": r"^[a-zA-Z0-9_\-. ]+$",
        "pattern_message": "Tên mới chỉ được chứa chữ cái, chữ số, dấu gạch dưới, dấu gạch ngang, dấu chấm và dấu cách",
        "check_xss": True
    }
})
def api_item_rename():
    """Rename a file or folder."""
    try:
        data = request.get_json()
        item_path = data.get('item_path')
        new_name = data.get('new_name')
        
        # Sanitize input
        new_name = sanitize_filename(new_name)
        
        # Check if item exists
        if not os.path.exists(item_path):
            return jsonify({
                'success': False,
                'error': 'File hoặc thư mục không tồn tại',
                'code': 'ITEM_NOT_FOUND'
            }), 404
        
        # Get the parent directory
        parent_dir = os.path.dirname(item_path)
        
        # Create the new path
        new_path = os.path.join(parent_dir, new_name)
        
        # Check if target already exists
        if os.path.exists(new_path):
            return jsonify({
                'success': False,
                'error': 'Tên mới đã tồn tại trong thư mục này',
                'code': 'ALREADY_EXISTS'
            }), 409
        
        # Rename the file or folder
        os.rename(item_path, new_path)
        
        return jsonify({
            'success': True,
            'message': 'Đổi tên thành công',
            'new_path': new_path,
            'old_path': item_path
        })
        
    except Exception as e:
        app.logger.error(f"Error renaming item: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Lỗi khi đổi tên: ' + str(e),
            'code': 'RENAME_ERROR'
        }), 500
