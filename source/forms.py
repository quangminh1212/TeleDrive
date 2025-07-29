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
        Length(min=5, max=6, message='Verification code must be 5-6 digits')
    ])
    password = PasswordField('Two-Factor Password', validators=[
        # Optional field for 2FA
    ])
    submit = SubmitField('Verify')
