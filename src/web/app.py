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
from flask import Flask, render_template, jsonify, request, redirect, url_for, flash
from flask_cors import CORS
from flask_login import login_user, login_required, current_user
from functools import wraps

# Import từ cấu trúc mới
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.database import init_database
from src.auth import auth_manager
from src.models import OTPManager, format_phone_number, validate_phone_number
from src.services import send_otp_sync
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
                    
                    session_info = {
                        'session_id': session_id,
                        'timestamp': session_id,
                        'file_count': len(data.get('files', [])),
                        'total_size': sum(file.get('size_bytes', 0) for file in data.get('files', [])),
                        'scan_info': data.get('scan_info', {}),
                        'files': data.get('files', [])
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
                'total_size': sum(file.get('size_bytes', 0) for file in files),
                'file_types': {},
                'largest_file': None,
                'oldest_file': None,
                'newest_file': None
            }
            
            # Thống kê theo loại file
            for file in files:
                file_type = file.get('type', 'unknown')
                if file_type not in stats['file_types']:
                    stats['file_types'][file_type] = {'count': 0, 'size': 0}
                
                stats['file_types'][file_type]['count'] += 1
                stats['file_types'][file_type]['size'] += file.get('size_bytes', 0)
            
            # Tìm file lớn nhất
            if files:
                stats['largest_file'] = max(files, key=lambda x: x.get('size_bytes', 0))
                
                # Tìm file cũ nhất và mới nhất
                files_with_date = [f for f in files if f.get('date')]
                if files_with_date:
                    stats['oldest_file'] = min(files_with_date, key=lambda x: x.get('date'))
                    stats['newest_file'] = max(files_with_date, key=lambda x: x.get('date'))

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
        
        # Gửi OTP - Tạm thời mock để test
        try:
            # Mock OTP cho development
            from src.models.otp import OTPManager
            otp_code = OTPManager.create_otp(formatted_phone)
            print(f"🔐 Mock OTP cho {formatted_phone}: {otp_code}")

            return jsonify({
                'success': True,
                'message': f'Mã OTP đã được tạo: {otp_code} (Development mode)'
            })

            # TODO: Uncomment khi Telegram client hoạt động
            # success, message = send_otp_sync(formatted_phone)
            # if success:
            #     return jsonify({'success': True, 'message': message})
            # else:
            #     return jsonify({'success': False, 'message': message}), 500

        except Exception as e:
            print(f"Lỗi tạo OTP: {e}")
            return jsonify({'success': False, 'message': f'Lỗi tạo OTP: {str(e)}'}), 500
            
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

@app.route('/api/files/<session_id>')
@auth_required
def get_session_files(session_id):
    """Lấy files trong một session"""
    data = api.get_session_files(session_id)
    if data:
        return jsonify(data)
    else:
        return jsonify({'error': 'Session not found'}), 404

@app.route('/logout')
@login_required
def logout():
    """Đăng xuất"""
    from flask_login import logout_user
    logout_user()
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
