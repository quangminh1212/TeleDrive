#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OTP Manager Model

Database model for OTP verification in TeleDrive.
"""

from datetime import datetime, timedelta
import random
import re
from typing import Tuple
from ..database import db


def validate_phone_number(phone_number):
    """
    Validate phone number format.
    
    Args:
        phone_number: The phone number to validate
        
    Returns:
        bool: True if the phone number is valid, False otherwise
    """
    # Kiểm tra định dạng cơ bản của số điện thoại
    # Số điện thoại bắt đầu bằng + và theo sau là 7-15 chữ số
    pattern = r'^\+[0-9]{7,15}$'
    return bool(re.match(pattern, phone_number))


def format_phone_number(phone: str) -> str:
    """
    Chuẩn hóa số điện thoại.
    
    Args:
        phone: Số điện thoại cần chuẩn hóa
        
    Returns:
        str: Số điện thoại đã được chuẩn hóa
    """
    # Loại bỏ khoảng trắng và ký tự đặc biệt, giữ lại dấu +
    phone = phone.strip()
    
    # Nếu đã có dấu + ở đầu, kiểm tra xem đã đúng format chưa
    if phone.startswith('+'):
        # Loại bỏ + và chỉ giữ lại số
        digits_only = ''.join(filter(str.isdigit, phone[1:]))
        
        # Nếu đã có mã vùng 84, trả về luôn
        if digits_only.startswith('84'):
            return '+' + digits_only
        # Nếu bắt đầu bằng 0, thay thế bằng 84
        elif digits_only.startswith('0'):
            return '+84' + digits_only[1:]
        # Nếu không có mã vùng, thêm 84
        else:
            return '+84' + digits_only
    else:
        # Loại bỏ tất cả ký tự không phải số
        digits_only = ''.join(filter(str.isdigit, phone))
        
        # Thêm mã quốc gia nếu chưa có
        if digits_only.startswith('0'):
            digits_only = '84' + digits_only[1:]
        elif not digits_only.startswith('84'):
            digits_only = '84' + digits_only
        
        return '+' + digits_only


class OTPManager(db.Model):
    """
    OTP Manager model for handling OTP verification.
    """
    __tablename__ = 'otp_codes'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    phone_number = db.Column(db.String(20), nullable=False)
    otp_code = db.Column(db.String(6), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)
    is_verified = db.Column(db.Boolean, default=False)
    attempts = db.Column(db.Integer, default=0)
    
    def __init__(self, phone_number):
        """
        Initialize a new OTP record.
        
        Args:
            phone_number: User's phone number
        """
        self.phone_number = phone_number
        self.otp_code = self.generate_otp()
        self.created_at = datetime.utcnow()
        self.expires_at = self.created_at + timedelta(minutes=5)  # OTP hết hạn sau 5 phút
        self.is_verified = False
        self.attempts = 0
    
    @staticmethod
    def generate_otp():
        """
        Generate a 6-digit OTP code.
        
        Returns:
            str: 6-digit OTP code
        """
        return str(random.randint(100000, 999999))
    
    def verify(self, code):
        """
        Verify the OTP code.
        
        Args:
            code: The OTP code to verify
            
        Returns:
            bool: True if verification is successful, False otherwise
        """
        self.attempts += 1
        
        # Kiểm tra OTP đã hết hạn chưa
        if datetime.utcnow() > self.expires_at:
            return False
        
        # Kiểm tra quá số lần thử
        if self.attempts > 3:
            return False
        
        # Kiểm tra OTP có đúng không
        if self.otp_code == code:
            self.is_verified = True
            db.session.commit()
            return True
        
        db.session.commit()
        return False
    
    def is_expired(self):
        """
        Check if the OTP has expired.
        
        Returns:
            bool: True if the OTP has expired, False otherwise
        """
        return datetime.utcnow() > self.expires_at
    
    @classmethod
    def get_active_otp(cls, phone_number):
        """
        Get active OTP for a phone number.
        
        Args:
            phone_number: The phone number to get active OTP for
            
        Returns:
            OTPManager: Active OTP record or None
        """
        return cls.query.filter_by(
            phone_number=phone_number,
            is_verified=False
        ).order_by(cls.created_at.desc()).first()
    
    @classmethod
    def cleanup_old_otps(cls):
        """
        Clean up old OTP records.
        """
        expired_time = datetime.utcnow() - timedelta(days=1)
        cls.query.filter(cls.created_at < expired_time).delete()
        db.session.commit()
