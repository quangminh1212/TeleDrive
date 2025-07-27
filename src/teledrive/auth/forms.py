"""
Authentication Forms

Form classes for authentication in TeleDrive.
"""

from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, BooleanField, SubmitField
from wtforms.validators import DataRequired, Email, Length, ValidationError
import re


def validate_phone_number(form, field):
    """
    Validate phone number format.
    
    Args:
        form: The form containing the field
        field: The field to validate
        
    Raises:
        ValidationError: If phone number format is invalid
    """
    phone = field.data
    
    # Remove spaces and dashes
    phone = phone.replace(' ', '').replace('-', '')
    
    # Check if starts with + and contains only digits after that
    if not (phone.startswith('+') and phone[1:].isdigit()):
        raise ValidationError('Số điện thoại không hợp lệ. Định dạng hợp lệ: +84123456789')
    
    # Check length (international format usually between 8 and 15 digits excluding +)
    if len(phone) < 9 or len(phone) > 16:
        raise ValidationError('Số điện thoại không hợp lệ. Phải có từ 8-15 chữ số.')


class LoginForm(FlaskForm):
    """
    Login form for phone-based authentication.
    """
    phone_number = StringField(
        'Số điện thoại',
        validators=[DataRequired(), validate_phone_number],
        render_kw={"placeholder": "+84123456789"}
    )
    remember = BooleanField('Ghi nhớ đăng nhập')
    submit = SubmitField('Đăng nhập')


class OTPForm(FlaskForm):
    """
    OTP verification form.
    """
    otp_code = StringField(
        'Mã xác thực (OTP)',
        validators=[
            DataRequired(),
            Length(min=6, max=6, message="Mã OTP phải có 6 chữ số")
        ],
        render_kw={"placeholder": "123456"}
    )
    submit = SubmitField('Xác thực')
    
    def validate_otp_code(form, field):
        """
        Validate OTP code format.
        
        Args:
            form: The form containing the field
            field: The field to validate
            
        Raises:
            ValidationError: If OTP code format is invalid
        """
        if not field.data.isdigit():
            raise ValidationError('Mã OTP chỉ được chứa chữ số')


class RegistrationForm(FlaskForm):
    """
    Registration form for new users.
    """
    username = StringField(
        'Tên người dùng',
        validators=[DataRequired(), Length(min=3, max=20)],
        render_kw={"placeholder": "nguyenvana"}
    )
    phone_number = StringField(
        'Số điện thoại',
        validators=[DataRequired(), validate_phone_number],
        render_kw={"placeholder": "+84123456789"}
    )
    email = StringField(
        'Email',
        validators=[Email(message="Email không hợp lệ")],
        render_kw={"placeholder": "example@example.com"}
    )
    submit = SubmitField('Đăng ký') 