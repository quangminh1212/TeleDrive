#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TeleDrive Web Interface
Giao diện web với phong cách Telegram để hiển thị các file đã quét được
"""

import os
import json
import glob
from datetime import datetime
from pathlib import Path
from flask import Flask, render_template, jsonify, request, send_from_directory, redirect, url_for, flash, session
from flask_cors import CORS
from flask_login import login_user, logout_user, login_required, current_user
from functools import wraps

# Import authentication system
from auth import auth_manager, User, validate_username, validate_email, validate_password

app = Flask(__name__)
CORS(app)

# Khởi tạo authentication system
auth_manager.init_app(app)

# Cấu hình
OUTPUT_DIR = Path("output")
STATIC_DIR = Path("static")

class TeleDriveWebAPI:
    def __init__(self):
        self.output_dir = OUTPUT_DIR
        self.cache = {}
    
    def get_scan_sessions(self):
        """Lấy danh sách các session scan"""
        sessions = []
        json_files = glob.glob(str(self.output_dir / "*_telegram_files.json"))
        
        for file_path in sorted(json_files, reverse=True):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    
                scan_info = data.get('scan_info', {})
                timestamp = scan_info.get('timestamp', '')
                total_files = scan_info.get('total_files', 0)
                scan_date = scan_info.get('scan_date', '')
                
                # Parse timestamp để hiển thị đẹp hơn
                try:
                    dt = datetime.strptime(timestamp, '%Y%m%d_%H%M%S')
                    formatted_date = dt.strftime('%d/%m/%Y %H:%M')
                except:
                    formatted_date = timestamp
                
                sessions.append({
                    'id': timestamp,
                    'timestamp': timestamp,
                    'formatted_date': formatted_date,
                    'total_files': total_files,
                    'scan_date': scan_date,
                    'file_path': file_path
                })
            except Exception as e:
                print(f"Lỗi đọc file {file_path}: {e}")
                continue
        
        return sessions
    
    def get_files_by_session(self, session_id):
        """Lấy danh sách file từ một session"""
        if session_id in self.cache:
            return self.cache[session_id]
        
        file_path = self.output_dir / f"{session_id}_telegram_files.json"
        
        if not file_path.exists():
            return None
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
            # Xử lý và format dữ liệu file
            files = data.get('files', [])
            processed_files = []
            
            for file_data in files:
                processed_file = {
                    'file_name': file_data.get('file_name', 'Unknown'),
                    'download_link': file_data.get('download_link', ''),
                    'file_info': file_data.get('file_info', {}),
                    'message_info': file_data.get('message_info', {}),
                    'file_type': file_data.get('file_info', {}).get('type', 'unknown'),
                    'file_size': file_data.get('file_info', {}).get('size', 0),
                    'size_formatted': file_data.get('file_info', {}).get('size_formatted', '0 B'),
                    'upload_date': file_data.get('file_info', {}).get('upload_date', ''),
                    'mime_type': file_data.get('file_info', {}).get('mime_type', ''),
                    'message_id': file_data.get('message_info', {}).get('message_id', 0)
                }
                processed_files.append(processed_file)
            
            result = {
                'scan_info': data.get('scan_info', {}),
                'files': processed_files
            }
            
            # Cache kết quả
            self.cache[session_id] = result
            return result
            
        except Exception as e:
            print(f"Lỗi đọc session {session_id}: {e}")
            return None
    
    def search_files(self, session_id, query):
        """Tìm kiếm file trong session"""
        data = self.get_files_by_session(session_id)
        if not data:
            return []
        
        query = query.lower()
        filtered_files = []
        
        for file_data in data['files']:
            file_name = file_data.get('file_name', '').lower()
            if query in file_name:
                filtered_files.append(file_data)
        
        return filtered_files
    
    def filter_files_by_type(self, session_id, file_type):
        """Lọc file theo loại"""
        data = self.get_files_by_session(session_id)
        if not data:
            return []
        
        if file_type == 'all':
            return data['files']
        
        filtered_files = []
        for file_data in data['files']:
            if file_data.get('file_type') == file_type:
                filtered_files.append(file_data)
        
        return filtered_files
    
    def get_stats(self, session_id):
        """Lấy thống kê về session"""
        data = self.get_files_by_session(session_id)
        if not data:
            return {}
        
        files = data['files']
        stats = {
            'total_files': len(files),
            'total_size': sum(f.get('file_size', 0) for f in files),
            'file_types': {},
            'largest_file': None,
            'latest_file': None
        }
        
        # Thống kê theo loại file
        for file_data in files:
            file_type = file_data.get('file_type', 'unknown')
            stats['file_types'][file_type] = stats['file_types'].get(file_type, 0) + 1
        
        # File lớn nhất
        if files:
            stats['largest_file'] = max(files, key=lambda x: x.get('file_size', 0))
            
            # File mới nhất
            try:
                stats['latest_file'] = max(files, key=lambda x: x.get('upload_date', ''))
            except:
                stats['latest_file'] = files[0] if files else None
        
        # Format tổng kích thước
        stats['total_size_formatted'] = self.format_file_size(stats['total_size'])
        
        return stats
    
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

# Authentication Routes
@app.route('/login', methods=['GET', 'POST'])
def login():
    """Trang đăng nhập"""
    if current_user.is_authenticated:
        return redirect(url_for('index'))

    if request.method == 'POST':
        data = request.get_json() if request.is_json else request.form
        username_or_email = data.get('username', '').strip()
        password = data.get('password', '')
        remember = data.get('remember', False)

        if not username_or_email or not password:
            error_msg = 'Vui lòng nhập đầy đủ thông tin'
            if request.is_json:
                return jsonify({'success': False, 'message': error_msg}), 400
            flash(error_msg, 'error')
            return render_template('login.html')

        # Xác thực người dùng
        user = auth_manager.authenticate_user(username_or_email, password)
        if user:
            login_user(user, remember=remember)
            next_page = request.args.get('next')

            if request.is_json:
                return jsonify({
                    'success': True,
                    'message': 'Đăng nhập thành công',
                    'redirect': next_page or url_for('index')
                })

            return redirect(next_page) if next_page else redirect(url_for('index'))
        else:
            error_msg = 'Tên đăng nhập hoặc mật khẩu không đúng'
            if request.is_json:
                return jsonify({'success': False, 'message': error_msg}), 401
            flash(error_msg, 'error')

    return render_template('login.html')

@app.route('/logout', methods=['POST'])
@login_required
def logout():
    """Đăng xuất"""
    logout_user()
    if request.is_json:
        return jsonify({'success': True, 'message': 'Đã đăng xuất thành công'})
    flash('Đã đăng xuất thành công', 'success')
    return redirect(url_for('login'))

@app.route('/setup', methods=['GET', 'POST'])
def setup():
    """Tạo tài khoản admin đầu tiên"""
    # Chỉ cho phép setup nếu chưa có admin user
    if auth_manager.has_admin_user():
        flash('Hệ thống đã được thiết lập', 'info')
        return redirect(url_for('login'))

    if request.method == 'POST':
        data = request.get_json() if request.is_json else request.form
        username = data.get('username', '').strip()
        email = data.get('email', '').strip()
        password = data.get('password', '')
        confirm_password = data.get('confirm_password', '')

        # Validate input
        errors = []

        if not username:
            errors.append('Vui lòng nhập tên đăng nhập')
        else:
            valid, msg = validate_username(username)
            if not valid:
                errors.append(msg)

        if not email:
            errors.append('Vui lòng nhập email')
        else:
            valid, msg = validate_email(email)
            if not valid:
                errors.append(msg)

        if not password:
            errors.append('Vui lòng nhập mật khẩu')
        else:
            valid, msg = validate_password(password)
            if not valid:
                errors.append(msg)

        if password != confirm_password:
            errors.append('Mật khẩu xác nhận không khớp')

        if errors:
            if request.is_json:
                return jsonify({'success': False, 'errors': errors}), 400
            for error in errors:
                flash(error, 'error')
            return render_template('setup.html')

        # Tạo admin user
        success, message = auth_manager.create_user(username, email, password, is_admin=True)
        if success:
            if request.is_json:
                return jsonify({'success': True, 'message': message, 'redirect': url_for('login')})
            flash(message, 'success')
            return redirect(url_for('login'))
        else:
            if request.is_json:
                return jsonify({'success': False, 'message': message}), 400
            flash(message, 'error')

    return render_template('setup.html')

# Main Routes
@app.route('/')
@login_required
def index():
    """Trang chính"""
    return render_template('index.html', user=current_user)

@app.route('/api/scans')
@auth_required
def get_scans():
    """API lấy danh sách scan sessions"""
    sessions = api.get_scan_sessions()
    return jsonify(sessions)

@app.route('/api/files/<session_id>')
@auth_required
def get_files(session_id):
    """API lấy danh sách file từ session"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    data = api.get_files_by_session(session_id)
    if not data:
        return jsonify({'error': 'Session not found'}), 404
    
    files = data['files']
    total = len(files)
    
    # Pagination
    start = (page - 1) * per_page
    end = start + per_page
    paginated_files = files[start:end]
    
    return jsonify({
        'scan_info': data['scan_info'],
        'files': paginated_files,
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total': total,
            'pages': (total + per_page - 1) // per_page
        }
    })

@app.route('/api/files/<session_id>/search')
@auth_required
def search_files(session_id):
    """API tìm kiếm file"""
    query = request.args.get('q', '')
    if not query:
        return jsonify([])
    
    files = api.search_files(session_id, query)
    return jsonify(files)

@app.route('/api/files/<session_id>/filter')
@auth_required
def filter_files(session_id):
    """API lọc file theo loại"""
    file_type = request.args.get('type', 'all')
    files = api.filter_files_by_type(session_id, file_type)
    return jsonify(files)

@app.route('/api/stats/<session_id>')
@auth_required
def get_stats(session_id):
    """API lấy thống kê session"""
    stats = api.get_stats(session_id)
    return jsonify(stats)

@app.route('/api/user/info')
@auth_required
def get_user_info():
    """API lấy thông tin người dùng hiện tại"""
    return jsonify(current_user.to_dict())

@app.route('/static/<path:filename>')
def static_files(filename):
    """Serve static files"""
    return send_from_directory('static', filename)

if __name__ == '__main__':
    # Tạo thư mục static nếu chưa có
    STATIC_DIR.mkdir(exist_ok=True)
    (STATIC_DIR / 'css').mkdir(exist_ok=True)
    (STATIC_DIR / 'js').mkdir(exist_ok=True)
    (STATIC_DIR / 'icons').mkdir(exist_ok=True)
    
    print("🚀 Khởi động TeleDrive Web Interface...")
    print("📁 Đang quét thư mục output...")
    
    sessions = api.get_scan_sessions()
    print(f"✅ Tìm thấy {len(sessions)} scan sessions")
    
    print("🌐 Server đang chạy tại: http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)
