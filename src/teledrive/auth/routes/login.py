"""
Authentication Login Routes

Routes for user login and authentication in TeleDrive.
"""

from flask import render_template, redirect, url_for, flash, request, jsonify
from flask_login import login_user, current_user

from .. import auth_bp
from ...models.user import User
from ...auth.forms import LoginForm, OTPForm


@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    """
    User login route.
    
    Handles both GET and POST requests for user login.
    
    Returns:
        Rendered template or redirect
    """
    if current_user.is_authenticated:
        return redirect(url_for('views.dashboard'))
    
    form = LoginForm()
    
    if form.validate_on_submit():
        phone_number = form.phone_number.data
        
        # Check if user exists
        user = User.query.filter_by(phone_number=phone_number).first()
        
        if not user:
            # User not found
            flash('Số điện thoại không đúng', 'danger')
            return render_template('auth/login.html', form=form)
        
        # Generate and send OTP
        # This is a placeholder for actual OTP sending logic
        # send_otp_to_user(user.phone_number)
        
        # Redirect to OTP verification
        return redirect(url_for('auth.verify_otp', phone=phone_number))
    
    return render_template('auth/login.html', form=form)


@auth_bp.route('/verify-otp', methods=['GET', 'POST'])
def verify_otp():
    """
    OTP verification route.
    
    Handles both GET and POST requests for OTP verification.
    
    Returns:
        Rendered template or redirect
    """
    phone_number = request.args.get('phone', '')
    
    if not phone_number:
        flash('Số điện thoại không hợp lệ', 'danger')
        return redirect(url_for('auth.login'))
    
    form = OTPForm()
    
    if form.validate_on_submit():
        otp_code = form.otp_code.data
        
        # This is a placeholder for actual OTP verification
        # In a real app, we would verify the OTP with the stored value
        if otp_code == '123456':  # Dev mode OTP
            # Get user by phone number
            user = User.query.filter_by(phone_number=phone_number).first()
            
            if user:
                # Log the user in
                login_user(user, remember=True)
                flash('Đăng nhập thành công!', 'success')
                
                # Redirect to requested page or dashboard
                next_page = request.args.get('next')
                return redirect(next_page or url_for('views.dashboard'))
            else:
                flash('Người dùng không tồn tại', 'danger')
                return redirect(url_for('auth.login'))
        else:
            flash('Mã OTP không đúng', 'danger')
            return render_template('auth/verify_otp.html', form=form, phone_number=phone_number)
    
    return render_template('auth/verify_otp.html', form=form, phone_number=phone_number)


@auth_bp.route('/send-otp', methods=['POST'])
def send_otp():
    """
    API endpoint for sending OTP.
    
    Returns:
        JSON response
    """
    data = request.json
    phone_number = data.get('phone_number', '')
    
    if not phone_number:
        return jsonify({
            'success': False,
            'error': 'Số điện thoại không hợp lệ'
        }), 400
    
    # Check if user exists
    user = User.query.filter_by(phone_number=phone_number).first()
    
    if not user:
        return jsonify({
            'success': False,
            'error': 'Số điện thoại không tồn tại trong hệ thống'
        }), 404
    
    # This is a placeholder for actual OTP sending logic
    # send_otp_to_user(phone_number)
    
    return jsonify({
        'success': True,
        'message': 'Mã OTP đã được gửi đến số điện thoại của bạn'
    }) 