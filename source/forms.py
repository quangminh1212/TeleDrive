#!/usr/bin/env python3
"""
Flask-WTF Forms for TeleDrive Authentication
Forms for user registration, login, and other authentication-related operations
"""

from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, BooleanField, SubmitField, SelectField
from wtforms.validators import DataRequired, Email, Length, EqualTo, ValidationError, Regexp
from models import User
from auth import get_country_codes

class LoginForm(FlaskForm):
    """User login form"""
    username = StringField('Username', validators=[
        DataRequired(message='Username is required'),
        Length(min=3, max=80, message='Username must be between 3 and 80 characters')
    ])
    password = PasswordField('Password', validators=[
        DataRequired(message='Password is required')
    ])
    remember_me = BooleanField('Remember Me')
    submit = SubmitField('Sign In')

class RegistrationForm(FlaskForm):
    """User registration form"""
    username = StringField('Username', validators=[
        DataRequired(message='Username is required'),
        Length(min=3, max=80, message='Username must be between 3 and 80 characters'),
        Regexp(r'^[a-zA-Z0-9_.-]+$', message='Username can only contain letters, numbers, dots, hyphens, and underscores')
    ])
    email = StringField('Email', validators=[
        DataRequired(message='Email is required'),
        Email(message='Please enter a valid email address'),
        Length(max=120, message='Email must be less than 120 characters')
    ])
    password = PasswordField('Password', validators=[
        DataRequired(message='Password is required'),
        Length(min=8, message='Password must be at least 8 characters long'),
        Regexp(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)',
               message='Password must contain at least one lowercase letter, one uppercase letter, and one number')
    ])
    password2 = PasswordField('Confirm Password', validators=[
        DataRequired(message='Please confirm your password'),
        EqualTo('password', message='Passwords must match')
    ])
    submit = SubmitField('Register')
    
    def validate_username(self, username):
        """Check if username is already taken"""
        user = User.query.filter_by(username=username.data).first()
        if user:
            raise ValidationError('Username already exists. Please choose a different one.')
    
    def validate_email(self, email):
        """Check if email is already registered"""
        user = User.query.filter_by(email=email.data).first()
        if user:
            raise ValidationError('Email already registered. Please use a different email address.')

    def validate_password(self, password):
        """Check for common weak passwords"""
        weak_passwords = [
            'password', '123456', '123456789', 'qwerty', 'abc123',
            'password123', 'admin', 'letmein', 'welcome', 'monkey',
            '1234567890', 'password1', '123123', 'admin123'
        ]

        if password.data.lower() in weak_passwords:
            raise ValidationError('This password is too common. Please choose a stronger password.')

        # Check if password contains username (will be checked in view)
        if hasattr(self, 'username') and self.username.data:
            if self.username.data.lower() in password.data.lower():
                raise ValidationError('Password cannot contain your username.')

class ChangePasswordForm(FlaskForm):
    """Change password form for authenticated users"""
    current_password = PasswordField('Current Password', validators=[
        DataRequired(message='Current password is required')
    ])
    new_password = PasswordField('New Password', validators=[
        DataRequired(message='New password is required'),
        Length(min=8, message='Password must be at least 8 characters long'),
        Regexp(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)',
               message='Password must contain at least one lowercase letter, one uppercase letter, and one number')
    ])
    new_password2 = PasswordField('Confirm New Password', validators=[
        DataRequired(message='Please confirm your new password'),
        EqualTo('new_password', message='Passwords must match')
    ])
    submit = SubmitField('Change Password')

class RequestPasswordResetForm(FlaskForm):
    """Request password reset form"""
    email = StringField('Email', validators=[
        DataRequired(message='Email is required'),
        Email(message='Please enter a valid email address')
    ])
    submit = SubmitField('Request Password Reset')
    
    def validate_email(self, email):
        """Check if email exists in the system"""
        user = User.query.filter_by(email=email.data).first()
        if not user:
            raise ValidationError('No account found with that email address.')

class ResetPasswordForm(FlaskForm):
    """Reset password form with token"""
    password = PasswordField('New Password', validators=[
        DataRequired(message='Password is required'),
        Length(min=8, message='Password must be at least 8 characters long'),
        Regexp(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)',
               message='Password must contain at least one lowercase letter, one uppercase letter, and one number')
    ])
    password2 = PasswordField('Confirm Password', validators=[
        DataRequired(message='Please confirm your password'),
        EqualTo('password', message='Passwords must match')
    ])
    submit = SubmitField('Reset Password')

class TelegramLoginForm(FlaskForm):
    """Telegram login form - phone number input"""
    country_code = SelectField('Country Code',
                              choices=get_country_codes(),
                              default='+84',
                              validators=[DataRequired()])
    phone_number = StringField('Phone Number', validators=[
        DataRequired(message='Phone number is required'),
        Regexp(r'^\d{8,15}$', message='Please enter a valid phone number (8-15 digits)')
    ])
    submit = SubmitField('Send Code')

class TelegramVerifyForm(FlaskForm):
    """Telegram verification form - code input"""
    verification_code = StringField('Verification Code', validators=[
        DataRequired(message='Verification code is required'),
        Length(min=5, max=6, message='Verification code must be 5-6 digits'),
        Regexp(r'^\d{5,6}$', message='Verification code must contain only digits')
    ])
    password = PasswordField('Two-Factor Password', validators=[
        # Optional field for 2FA
    ])
    submit = SubmitField('Verify')

class FileUploadForm(FlaskForm):
    """File upload form with comprehensive validation"""
    files = None  # Will be handled by request.files
    folder_id = StringField('Folder ID', validators=[
        # Optional field for folder selection
    ])
    description = StringField('Description', validators=[
        Length(max=500, message='Description must be less than 500 characters')
    ])
    tags = StringField('Tags', validators=[
        Length(max=200, message='Tags must be less than 200 characters')
    ])

    def validate_files(self, files):
        """Validate uploaded files"""
        if not files:
            raise ValidationError('No files selected for upload')

        # Import here to avoid circular imports
        from flask_config import flask_config

        upload_config = flask_config.get_upload_config()
        max_file_size = upload_config['max_file_size']
        allowed_extensions = upload_config['allowed_extensions']

        for file in files:
            # Check file size
            if hasattr(file, 'content_length') and file.content_length > max_file_size:
                raise ValidationError(f'File {file.filename} is too large. Maximum size is {max_file_size} bytes.')

            # Check file extension
            if file.filename:
                file_ext = file.filename.rsplit('.', 1)[-1].lower()
                if file_ext not in allowed_extensions:
                    raise ValidationError(f'File type .{file_ext} is not allowed. Allowed types: {", ".join(allowed_extensions)}')

            # Check for malicious filenames
            if file.filename and ('..' in file.filename or '/' in file.filename or '\\' in file.filename):
                raise ValidationError(f'Invalid filename: {file.filename}')

class ChannelScanForm(FlaskForm):
    """Channel scanning form with validation"""
    channel_input = StringField('Channel URL or Username', validators=[
        DataRequired(message='Channel URL or username is required'),
        Length(min=2, max=200, message='Channel input must be between 2 and 200 characters')
    ])
    scan_type = SelectField('Scan Type', choices=[
        ('all', 'All Files'),
        ('images', 'Images Only'),
        ('videos', 'Videos Only'),
        ('documents', 'Documents Only'),
        ('audio', 'Audio Only')
    ], default='all')
    max_files = StringField('Maximum Files', validators=[
        Regexp(r'^\d*$', message='Maximum files must be a number')
    ])
    submit = SubmitField('Start Scan')

    def validate_channel_input(self, channel_input):
        """Validate channel input format"""
        channel = channel_input.data.strip()

        # Check for valid Telegram channel formats
        if not (channel.startswith('@') or
                channel.startswith('https://t.me/') or
                channel.startswith('https://telegram.me/') or
                channel.startswith('t.me/') or
                channel.startswith('telegram.me/')):
            raise ValidationError('Please enter a valid Telegram channel URL or username (starting with @)')

        # Remove common prefixes for validation
        clean_channel = channel
        for prefix in ['https://telegram.me/', 'https://t.me/', 't.me/', 'telegram.me/', '@']:
            if clean_channel.startswith(prefix):
                clean_channel = clean_channel[len(prefix):]
                break

        # Validate channel name format (skip validation for invite links with + or joinchat)
        if not clean_channel:
            raise ValidationError('Invalid channel name format')

        # For invite links, allow more flexible validation
        if channel.startswith('https://t.me/+') or 'joinchat' in channel:
            # Invite links can have various formats, just check minimum length
            if len(clean_channel) < 10:
                raise ValidationError('Invite link too short')
        else:
            # For regular channels, validate format and length
            # Channel names must be 5-32 characters, start with letter/number, contain only letters, numbers, underscores
            if len(clean_channel) < 5:
                raise ValidationError('Channel name too short (minimum 5 characters)')
            elif len(clean_channel) > 32:
                raise ValidationError('Channel name too long (maximum 32 characters)')
            elif not clean_channel[0].isalnum():
                raise ValidationError('Channel name must start with a letter or number')
            elif not clean_channel.replace('_', '').isalnum():
                raise ValidationError('Channel name can only contain letters, numbers, and underscores')

    def validate_max_files(self, max_files):
        """Validate maximum files limit"""
        if max_files.data:
            try:
                max_val = int(max_files.data)
                if max_val < 1:
                    raise ValidationError('Maximum files must be at least 1')
                if max_val > 10000:
                    raise ValidationError('Maximum files cannot exceed 10,000')
            except ValueError:
                raise ValidationError('Maximum files must be a valid number')

class SearchForm(FlaskForm):
    """Search form with validation"""
    query = StringField('Search Query', validators=[
        DataRequired(message='Search query is required'),
        Length(min=1, max=200, message='Search query must be between 1 and 200 characters')
    ])
    search_type = SelectField('Search In', choices=[
        ('all', 'All Fields'),
        ('filename', 'Filename'),
        ('description', 'Description'),
        ('tags', 'Tags'),
        ('content', 'File Content')
    ], default='all')
    file_type = SelectField('File Type', choices=[
        ('all', 'All Types'),
        ('image', 'Images'),
        ('video', 'Videos'),
        ('document', 'Documents'),
        ('audio', 'Audio'),
        ('archive', 'Archives')
    ], default='all')
    submit = SubmitField('Search')

    def validate_query(self, query):
        """Validate search query"""
        # Prevent SQL injection attempts
        dangerous_chars = ['--', ';', '/*', '*/', 'xp_', 'sp_']
        query_lower = query.data.lower()

        for char in dangerous_chars:
            if char in query_lower:
                raise ValidationError('Invalid characters in search query')

        # Prevent excessively long queries
        if len(query.data.strip()) > 200:
            raise ValidationError('Search query is too long')
