#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OTP Manager for Telegram Authentication
Quản lý mã OTP cho xác thực qua Telegram
"""

import secrets
import string
from datetime import datetime, timedelta
from typing import Optional, Tuple
from flask_sqlalchemy import SQLAlchemy
from ..database import db

class OTPCode(db.Model):
    """Model lưu trữ mã OTP tạm thời"""
    __tablename__ = 'otp_codes'

    id = db.Column(db.Integer, primary_key=True)
    phone_number = db.Column(db.String(20), nullable=False, index=True)
    code = db.Column(db.String(6), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)
    is_used = db.Column(db.Boolean, default=False)
    attempts = db.Column(db.Integer, default=0)

    def __init__(self, phone_number: str, code: str, expires_in_minutes: int = 5):
        self.phone_number = phone_number
        self.code = code
        self.expires_at = datetime.utcnow() + timedelta(minutes=expires_in_minutes)

    def is_expired(self) -> bool:
        """Kiểm tra mã OTP đã hết hạn chưa"""
        return datetime.utcnow() > self.expires_at

    def is_valid(self) -> bool:
        """Kiểm tra mã OTP còn hợp lệ không"""
        return not self.is_used and not self.is_expired() and self.attempts < 3

    def mark_used(self):
        """Đánh dấu mã OTP đã được sử dụng"""
        self.is_used = True
        db.session.commit()

    def increment_attempts(self):
        """Tăng số lần thử"""
        self.attempts += 1
        db.session.commit()

class OTPManager:
    """Quản lý mã OTP"""

    @staticmethod
    def generate_otp_code(length: int = 6) -> str:
        """Tạo mã OTP ngẫu nhiên"""
        digits = string.digits
        return ''.join(secrets.choice(digits) for _ in range(length))

    @staticmethod
    def create_otp(phone_number: str, expires_in_minutes: int = 5) -> str:
        """Tạo mã OTP mới cho số điện thoại"""
        try:
            # Xóa các mã OTP cũ chưa sử dụng của số này
            OTPCode.query.filter_by(
                phone_number=phone_number,
                is_used=False
            ).delete()

            # Tạo mã OTP mới
            code = OTPManager.generate_otp_code()
            otp = OTPCode(phone_number, code, expires_in_minutes)

            db.session.add(otp)
            db.session.commit()

            return code

        except Exception as e:
            db.session.rollback()
            raise Exception(f"Lỗi tạo mã OTP: {str(e)}")

    @staticmethod
    def verify_otp(phone_number: str, code: str) -> Tuple[bool, str]:
        """Xác thực mã OTP"""
        try:
            # Tìm mã OTP mới nhất chưa sử dụng
            otp = OTPCode.query.filter_by(
                phone_number=phone_number,
                code=code,
                is_used=False
            ).order_by(OTPCode.created_at.desc()).first()

            if not otp:
                return False, "Mã OTP không đúng"

            # Tăng số lần thử
            otp.increment_attempts()

            if not otp.is_valid():
                if otp.is_expired():
                    return False, "Mã OTP đã hết hạn"
                elif otp.attempts >= 3:
                    return False, "Đã vượt quá số lần thử cho phép"
                else:
                    return False, "Mã OTP không hợp lệ"

            # Đánh dấu đã sử dụng
            otp.mark_used()
            return True, "Xác thực thành công"

        except Exception as e:
            return False, f"Lỗi xác thực: {str(e)}"

    @staticmethod
    def cleanup_expired_otps():
        """Xóa các mã OTP đã hết hạn"""
        try:
            expired_count = OTPCode.query.filter(
                OTPCode.expires_at < datetime.utcnow()
            ).delete()
            db.session.commit()
            return expired_count
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Lỗi dọn dẹp OTP: {str(e)}")

    @staticmethod
    def get_otp_stats(phone_number: str) -> dict:
        """Lấy thống kê OTP cho số điện thoại"""
        try:
            total = OTPCode.query.filter_by(phone_number=phone_number).count()
            used = OTPCode.query.filter_by(phone_number=phone_number, is_used=True).count()
            expired = OTPCode.query.filter(
                OTPCode.phone_number == phone_number,
                OTPCode.expires_at < datetime.utcnow(),
                OTPCode.is_used == False
            ).count()

            return {
                'total': total,
                'used': used,
                'expired': expired,
                'pending': total - used - expired
            }
        except Exception as e:
            return {'error': str(e)}

def format_phone_number(phone: str) -> str:
    """Chuẩn hóa số điện thoại"""
    # Loại bỏ khoảng trắng và ký tự đặc biệt
    phone = ''.join(filter(str.isdigit, phone.replace('+', '')))

    # Thêm mã quốc gia nếu chưa có
    if phone.startswith('0'):
        phone = '84' + phone[1:]
    elif not phone.startswith('84'):
        phone = '84' + phone

    return '+' + phone

def validate_phone_number(phone: str) -> Tuple[bool, str]:
    """Kiểm tra tính hợp lệ của số điện thoại"""
    if not phone:
        return False, "Vui lòng nhập số điện thoại"

    # Chuẩn hóa số điện thoại
    formatted_phone = format_phone_number(phone)

    # Kiểm tra độ dài (số VN: +84xxxxxxxxx = 12 ký tự)
    if len(formatted_phone) < 10 or len(formatted_phone) > 15:
        return False, "Số điện thoại không hợp lệ"

    # Kiểm tra định dạng số VN
    if formatted_phone.startswith('+84'):
        phone_digits = formatted_phone[3:]  # Bỏ +84
        if len(phone_digits) != 9:
            return False, "Số điện thoại Việt Nam phải có 9 chữ số sau mã vùng"

        # Kiểm tra đầu số hợp lệ
        valid_prefixes = ['3', '5', '7', '8', '9']
        if phone_digits[0] not in valid_prefixes:
            return False, "Đầu số điện thoại không hợp lệ"

    return True, formatted_phone
