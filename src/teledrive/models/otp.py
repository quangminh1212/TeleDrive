#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OTP Manager Model

Database model for OTP verification in TeleDrive.
Enhanced with security features:
- Rate limiting for OTP generation
- Exponential backoff for failed attempts
- Account lockout after multiple failed attempts
- OTP encryption in database
- Strong OTP generation
"""

from datetime import datetime, timedelta
import random
import re
import string
import secrets
import hashlib
import logging
from typing import Tuple, Dict, Union, Optional
from flask import current_app

from ..database import db


def validate_phone_number(phone_number: str) -> Tuple[bool, str]:
    """
    Validate phone number format and return formatted version.
    
    Args:
        phone_number: The phone number to validate
        
    Returns:
        Tuple[bool, str]: (is_valid, message_or_formatted_number)
    """
    if not phone_number:
        return False, "Số điện thoại không được để trống."
        
    # Loại bỏ khoảng trắng và các ký tự không cần thiết
    phone_number = re.sub(r'[\s\-\(\)]', '', phone_number)
    
    # Kiểm tra định dạng cơ bản của số điện thoại
    # Số điện thoại bắt đầu bằng + và theo sau là 7-15 chữ số
    pattern = r'^\+?[0-9]{7,15}$'
    if not re.match(pattern, phone_number):
        return False, "Định dạng số điện thoại không hợp lệ."
    
    # Chuẩn hóa số điện thoại
    formatted_phone = format_phone_number(phone_number)
    
    return True, formatted_phone


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


# Rate limit tracking cho OTP generation
otp_rate_limits = {}  # phone_number -> {'count': int, 'last_request': datetime}

# Theo dõi các lần thử sai OTP
failed_attempts = {}  # phone_number -> {'count': int, 'last_attempt': datetime}

# Danh sách các số điện thoại bị khóa tạm thời
locked_accounts = {}  # phone_number -> {'until': datetime, 'reason': str}


class OTPManager(db.Model):
    """
    Enhanced OTP Manager model for handling OTP verification with additional security features.
    """
    __tablename__ = 'otp_codes'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    phone_number = db.Column(db.String(20), nullable=False, index=True)
    otp_hash = db.Column(db.String(128), nullable=False)  # Store hashed OTP instead of plaintext
    salt = db.Column(db.String(32), nullable=False)  # Salt for hashing
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)
    is_verified = db.Column(db.Boolean, default=False)
    attempts = db.Column(db.Integer, default=0)
    last_attempt = db.Column(db.DateTime, nullable=True)
    
    @classmethod
    def create_otp(cls, phone_number: str, length: int = 6) -> Optional[str]:
        """
        Generate a new OTP code for a phone number with rate limiting.
        
        Args:
            phone_number: User's phone number
            length: Length of OTP code (default 6)
            
        Returns:
            str: Generated OTP code or None if rate limited
        """
        # Kiểm tra xem tài khoản có bị khóa không
        if cls.is_account_locked(phone_number):
            logging.warning(f"OTP generation attempt for locked account: {phone_number}")
            return None
            
        # Kiểm tra rate limit
        now = datetime.utcnow()
        if not cls.check_rate_limit(phone_number, now):
            logging.warning(f"Rate limit exceeded for OTP generation: {phone_number}")
            return None
        
        # Tạo OTP mới
        otp_code = cls.generate_secure_otp(length)
        
        # Tạo salt
        salt = secrets.token_hex(16)
        
        # Hash mã OTP
        otp_hash = cls._hash_otp(otp_code, salt)
        
        # Xóa các OTP cũ của số điện thoại này
        cls.query.filter_by(phone_number=phone_number, is_verified=False).delete()
        
        # Tạo OTP mới
        otp = cls(
            phone_number=phone_number,
            otp_hash=otp_hash,
            salt=salt,
            created_at=now,
            expires_at=now + timedelta(minutes=10),  # OTP hết hạn sau 10 phút
            is_verified=False,
            attempts=0
        )
        
        try:
            db.session.add(otp)
            db.session.commit()
            
            # Ghi log
            logging.info(f"New OTP created for {phone_number}")
            
            return otp_code
            
        except Exception as e:
            db.session.rollback()
            logging.error(f"Error creating OTP: {e}")
            return None
    
    @staticmethod
    def generate_secure_otp(length: int = 6) -> str:
        """
        Generate a secure OTP code.
        
        Args:
            length: Length of OTP code
            
        Returns:
            str: Secure OTP code
        """
        if length < 6:
            length = 6  # Minimum length for security
            
        # Tạo OTP chỉ bao gồm số để dễ nhập
        # Nếu muốn OTP khó đoán hơn, có thể dùng secrets.token_urlsafe(length)
        # Nhưng việc này sẽ khiến OTP khó đọc và nhập hơn
        digits = ''.join(secrets.choice(string.digits) for _ in range(length))
        
        # Đảm bảo OTP không có quá nhiều số giống nhau liên tiếp
        while any(digits[i] == digits[i+1] == digits[i+2] for i in range(len(digits)-2)):
            digits = ''.join(secrets.choice(string.digits) for _ in range(length))
            
        return digits
    
    @staticmethod
    def _hash_otp(otp_code: str, salt: str) -> str:
        """
        Hash OTP code với salt.
        
        Args:
            otp_code: OTP code to hash
            salt: Salt for hashing
            
        Returns:
            str: Hashed OTP
        """
        # Kết hợp OTP và salt
        salted_otp = (otp_code + salt).encode('utf-8')
        
        # Hash bằng SHA-256
        return hashlib.sha256(salted_otp).hexdigest()
    
    @classmethod
    def check_rate_limit(cls, phone_number: str, now: datetime = None) -> bool:
        """
        Kiểm tra rate limit cho việc tạo OTP.
        
        Args:
            phone_number: Phone number to check
            now: Current datetime
            
        Returns:
            bool: True if not rate limited, False otherwise
        """
        if now is None:
            now = datetime.utcnow()
            
        # Lấy cấu hình rate limit từ app config hoặc dùng mặc định
        max_otps_per_day = current_app.config.get('MAX_OTP_PER_DAY', 10)
        max_otps_per_hour = current_app.config.get('MAX_OTP_PER_HOUR', 5)
        min_seconds_between_otps = current_app.config.get('MIN_SECONDS_BETWEEN_OTPS', 60)
        
        if phone_number not in otp_rate_limits:
            otp_rate_limits[phone_number] = {'count': 1, 'last_request': now, 'daily_count': 1}
            return True
            
        rate_info = otp_rate_limits[phone_number]
        
        # Reset daily count nếu qua ngày mới
        if (now - rate_info.get('day_start', now)).days > 0:
            rate_info['daily_count'] = 0
            rate_info['day_start'] = now
        
        # Reset hourly count nếu qua giờ mới
        if (now - rate_info.get('hour_start', now)).seconds > 3600:
            rate_info['count'] = 0
            rate_info['hour_start'] = now
            
        # Kiểm tra khoảng thời gian tối thiểu giữa các lần gửi OTP
        seconds_since_last = (now - rate_info['last_request']).total_seconds()
        if seconds_since_last < min_seconds_between_otps:
            return False
            
        # Kiểm tra số lượng OTP trong một giờ
        if rate_info['count'] >= max_otps_per_hour:
            return False
            
        # Kiểm tra số lượng OTP trong một ngày
        if rate_info.get('daily_count', 0) >= max_otps_per_day:
            return False
            
        # Cập nhật rate limit
        rate_info['count'] += 1
        rate_info['daily_count'] = rate_info.get('daily_count', 0) + 1
        rate_info['last_request'] = now
        
        return True
    
    def verify(self, code: str) -> Tuple[bool, str]:
        """
        Verify the OTP code.
        
        Args:
            code: The OTP code to verify
            
        Returns:
            Tuple[bool, str]: (success, message)
        """
        now = datetime.utcnow()
        
        # Cập nhật số lần thử và thời gian
        self.attempts += 1
        self.last_attempt = now
        
        # Kiểm tra OTP đã hết hạn chưa
        if now > self.expires_at:
            db.session.commit()
            return False, "Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới."
        
        # Kiểm tra quá số lần thử cho OTP này
        max_attempts = current_app.config.get('MAX_OTP_ATTEMPTS', 3)
        if self.attempts > max_attempts:
            # Khóa tài khoản tạm thời sau nhiều lần thử sai
            OTPManager.lock_account(self.phone_number, "Quá nhiều lần thử sai OTP")
            db.session.commit()
            return False, f"Quá {max_attempts} lần thử. Tài khoản tạm thời bị khóa."
        
        # Tính thời gian chờ theo exponential backoff nếu có lần thử thất bại trước đó
        if self.attempts > 1 and self.attempts <= max_attempts:
            wait_seconds = 2 ** (self.attempts - 1)  # 2, 4, 8, 16 seconds...
            time_since_last = 0
            
            if self.last_attempt:
                time_since_last = (now - self.last_attempt).total_seconds()
                
            if time_since_last < wait_seconds:
                db.session.commit()
                return False, f"Vui lòng đợi {wait_seconds - int(time_since_last)} giây trước khi thử lại."
        
        # Hash OTP để so sánh
        otp_hash = self._hash_otp(code, self.salt)
        
        # Kiểm tra OTP có đúng không
        if otp_hash == self.otp_hash:
            self.is_verified = True
            db.session.commit()
            
            # Reset failed attempts
            if self.phone_number in failed_attempts:
                del failed_attempts[self.phone_number]
                
            return True, "Xác thực OTP thành công"
        
        # Cập nhật failed attempts
        OTPManager.update_failed_attempts(self.phone_number)
        
        db.session.commit()
        return False, "Mã OTP không đúng"
    
    @classmethod
    def update_failed_attempts(cls, phone_number: str) -> None:
        """
        Update failed attempts counter.
        
        Args:
            phone_number: The phone number
        """
        now = datetime.utcnow()
        
        if phone_number not in failed_attempts:
            failed_attempts[phone_number] = {'count': 1, 'last_attempt': now}
            return
            
        attempts = failed_attempts[phone_number]
        attempts['count'] += 1
        attempts['last_attempt'] = now
        
        # Khóa tài khoản nếu quá nhiều lần thất bại
        max_global_attempts = current_app.config.get('MAX_FAILED_ATTEMPTS', 10)
        if attempts['count'] >= max_global_attempts:
            cls.lock_account(phone_number, f"Quá {max_global_attempts} lần thử sai liên tiếp")
    
    @classmethod
    def lock_account(cls, phone_number: str, reason: str) -> None:
        """
        Lock an account temporarily.
        
        Args:
            phone_number: The phone number to lock
            reason: Reason for locking
        """
        # Tính thời gian khóa dựa trên số lần thất bại
        attempts = failed_attempts.get(phone_number, {}).get('count', 0)
        
        # Khóa trong ít nhất 15 phút, tăng theo số lần thử sai
        lock_minutes = max(15, min(60 * 24, attempts * 15))  # Tối đa 24h
        until = datetime.utcnow() + timedelta(minutes=lock_minutes)
        
        locked_accounts[phone_number] = {'until': until, 'reason': reason}
        
        logging.warning(f"Account {phone_number} locked until {until} for reason: {reason}")
    
    @classmethod
    def is_account_locked(cls, phone_number: str) -> bool:
        """
        Check if an account is locked.
        
        Args:
            phone_number: The phone number to check
            
        Returns:
            bool: True if account is locked
        """
        if phone_number not in locked_accounts:
            return False
            
        lock_info = locked_accounts[phone_number]
        now = datetime.utcnow()
        
        # Nếu thời gian khóa đã hết
        if now > lock_info['until']:
            # Xóa khỏi danh sách bị khóa
            del locked_accounts[phone_number]
            return False
            
        return True
    
    @classmethod
    def get_lock_info(cls, phone_number: str) -> Dict[str, Union[str, datetime]]:
        """
        Get lock information for an account.
        
        Args:
            phone_number: The phone number
            
        Returns:
            dict: Lock information or empty dict if not locked
        """
        if not cls.is_account_locked(phone_number):
            return {}
            
        lock_info = locked_accounts[phone_number]
        now = datetime.utcnow()
        remaining_seconds = int((lock_info['until'] - now).total_seconds())
        
        return {
            'locked': True,
            'reason': lock_info['reason'],
            'until': lock_info['until'].isoformat(),
            'remaining_seconds': remaining_seconds
        }
    
    @classmethod
    def unlock_account(cls, phone_number: str) -> bool:
        """
        Unlock an account.
        
        Args:
            phone_number: The phone number to unlock
            
        Returns:
            bool: True if account was unlocked
        """
        if phone_number in locked_accounts:
            del locked_accounts[phone_number]
            
            # Reset failed attempts
            if phone_number in failed_attempts:
                del failed_attempts[phone_number]
                
            logging.info(f"Account {phone_number} manually unlocked")
            return True
            
        return False
    
    @classmethod
    def get_active_otp(cls, phone_number: str) -> Optional['OTPManager']:
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
    def cleanup_old_otps(cls) -> int:
        """
        Clean up old OTP records.
        
        Returns:
            int: Number of records deleted
        """
        try:
            # Xóa OTP đã hết hạn quá 1 ngày
            expired_time = datetime.utcnow() - timedelta(days=1)
            deleted_count = cls.query.filter(cls.created_at < expired_time).delete()
            
            # Xóa OTP đã xác thực thành công quá 1 giờ
            verified_time = datetime.utcnow() - timedelta(hours=1)
            deleted_count += cls.query.filter_by(is_verified=True).filter(cls.created_at < verified_time).delete()
            
            db.session.commit()
            return deleted_count
        except Exception as e:
            db.session.rollback()
            logging.error(f"Error cleaning up OTPs: {e}")
            return 0
