#!/usr/bin/env python3
"""
Advanced Security Module for TeleDrive
Provides enhanced security features including 2FA, session management, and audit logging
"""

import os
import secrets
import hashlib
import pyotp
import qrcode
from io import BytesIO
import base64
from datetime import datetime, timedelta
from flask import request, session, current_app
from flask_login import current_user
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship

from models import db, User

class TwoFactorAuth(db.Model):
    """Two-factor authentication model"""
    __tablename__ = 'two_factor_auth'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, unique=True)
    secret_key = Column(String(32), nullable=False)
    backup_codes = Column(Text)  # JSON array of backup codes
    is_enabled = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_used = Column(DateTime)
    
    # Relationships
    user = relationship('User', backref='two_factor_auth')
    
    def __init__(self, user_id):
        self.user_id = user_id
        self.secret_key = pyotp.random_base32()
        self.backup_codes = self._generate_backup_codes()
    
    def _generate_backup_codes(self):
        """Generate backup codes for 2FA recovery"""
        import json
        codes = [secrets.token_hex(4).upper() for _ in range(10)]
        return json.dumps(codes)
    
    def get_backup_codes(self):
        """Get backup codes as a list"""
        import json
        return json.loads(self.backup_codes) if self.backup_codes else []
    
    def verify_token(self, token):
        """Verify TOTP token"""
        totp = pyotp.TOTP(self.secret_key)
        return totp.verify(token, valid_window=1)
    
    def verify_backup_code(self, code):
        """Verify and consume backup code"""
        import json
        codes = self.get_backup_codes()
        if code.upper() in codes:
            codes.remove(code.upper())
            self.backup_codes = json.dumps(codes)
            db.session.commit()
            return True
        return False
    
    def get_qr_code(self):
        """Generate QR code for 2FA setup"""
        totp = pyotp.TOTP(self.secret_key)
        provisioning_uri = totp.provisioning_uri(
            name=self.user.email,
            issuer_name="TeleDrive"
        )
        
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(provisioning_uri)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        
        return base64.b64encode(buffer.getvalue()).decode()

class SecurityLog(db.Model):
    """Security audit log"""
    __tablename__ = 'security_logs'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    event_type = Column(String(50), nullable=False)  # login, logout, failed_login, 2fa_enabled, etc.
    ip_address = Column(String(45))
    user_agent = Column(Text)
    details = Column(Text)  # JSON details
    risk_level = Column(String(20), default='low')  # low, medium, high, critical
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship('User', backref='security_logs')
    
    def __repr__(self):
        return f'<SecurityLog {self.event_type}:{self.user_id}>'

class SessionSecurity(db.Model):
    """Enhanced session management"""
    __tablename__ = 'user_sessions'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    session_token = Column(String(128), unique=True, nullable=False)
    ip_address = Column(String(45))
    user_agent = Column(Text)
    location = Column(String(100))  # Approximate location
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_activity = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime)
    
    # Relationships
    user = relationship('User', backref='sessions')
    
    def __init__(self, user_id, ip_address=None, user_agent=None):
        self.user_id = user_id
        self.session_token = secrets.token_urlsafe(64)
        self.ip_address = ip_address
        self.user_agent = user_agent
        self.expires_at = datetime.utcnow() + timedelta(days=30)
    
    def is_expired(self):
        """Check if session has expired"""
        return datetime.utcnow() > self.expires_at
    
    def update_activity(self):
        """Update last activity timestamp"""
        self.last_activity = datetime.utcnow()

class SecurityManager:
    """Main security manager class"""
    
    def __init__(self):
        self.max_login_attempts = 5
        self.lockout_duration = timedelta(minutes=15)
        self.session_timeout = timedelta(hours=24)
    
    def log_security_event(self, event_type, user_id=None, details=None, risk_level='low'):
        """Log a security event"""
        try:
            log_entry = SecurityLog(
                user_id=user_id,
                event_type=event_type,
                ip_address=request.remote_addr if request else None,
                user_agent=request.headers.get('User-Agent') if request else None,
                details=details,
                risk_level=risk_level
            )
            db.session.add(log_entry)
            db.session.commit()
        except Exception as e:
            print(f"Failed to log security event: {e}")
    
    def check_login_attempts(self, username_or_email):
        """Check if user has exceeded login attempts"""
        cutoff_time = datetime.utcnow() - self.lockout_duration
        
        failed_attempts = SecurityLog.query.filter(
            SecurityLog.event_type == 'failed_login',
            SecurityLog.details.contains(username_or_email),
            SecurityLog.created_at > cutoff_time
        ).count()
        
        return failed_attempts < self.max_login_attempts
    
    def create_session(self, user_id):
        """Create a new secure session"""
        # Invalidate old sessions if too many
        active_sessions = SessionSecurity.query.filter_by(
            user_id=user_id, is_active=True
        ).count()
        
        if active_sessions >= 5:  # Max 5 concurrent sessions
            # Deactivate oldest session
            oldest_session = SessionSecurity.query.filter_by(
                user_id=user_id, is_active=True
            ).order_by(SessionSecurity.last_activity).first()
            if oldest_session:
                oldest_session.is_active = False
        
        # Create new session
        new_session = SessionSecurity(
            user_id=user_id,
            ip_address=request.remote_addr if request else None,
            user_agent=request.headers.get('User-Agent') if request else None
        )
        
        db.session.add(new_session)
        db.session.commit()
        
        self.log_security_event('login', user_id, f"New session created")
        
        return new_session.session_token
    
    def validate_session(self, session_token):
        """Validate and update session"""
        session_obj = SessionSecurity.query.filter_by(
            session_token=session_token, is_active=True
        ).first()
        
        if not session_obj or session_obj.is_expired():
            return False
        
        # Update activity
        session_obj.update_activity()
        db.session.commit()
        
        return True
    
    def invalidate_session(self, session_token):
        """Invalidate a session"""
        session_obj = SessionSecurity.query.filter_by(
            session_token=session_token
        ).first()
        
        if session_obj:
            session_obj.is_active = False
            db.session.commit()
            
            self.log_security_event(
                'logout', 
                session_obj.user_id, 
                "Session invalidated"
            )
    
    def setup_2fa(self, user_id):
        """Setup 2FA for a user"""
        existing_2fa = TwoFactorAuth.query.filter_by(user_id=user_id).first()
        if existing_2fa:
            return existing_2fa
        
        two_fa = TwoFactorAuth(user_id)
        db.session.add(two_fa)
        db.session.commit()
        
        self.log_security_event('2fa_setup', user_id, "2FA setup initiated")
        
        return two_fa
    
    def enable_2fa(self, user_id, token):
        """Enable 2FA after verification"""
        two_fa = TwoFactorAuth.query.filter_by(user_id=user_id).first()
        if not two_fa:
            return False
        
        if two_fa.verify_token(token):
            two_fa.is_enabled = True
            two_fa.last_used = datetime.utcnow()
            db.session.commit()
            
            self.log_security_event('2fa_enabled', user_id, "2FA enabled successfully")
            return True
        
        return False
    
    def verify_2fa(self, user_id, token):
        """Verify 2FA token"""
        two_fa = TwoFactorAuth.query.filter_by(user_id=user_id, is_enabled=True).first()
        if not two_fa:
            return True  # 2FA not enabled
        
        if two_fa.verify_token(token) or two_fa.verify_backup_code(token):
            two_fa.last_used = datetime.utcnow()
            db.session.commit()
            
            self.log_security_event('2fa_success', user_id, "2FA verification successful")
            return True
        
        self.log_security_event('2fa_failed', user_id, "2FA verification failed", 'medium')
        return False
    
    def get_security_summary(self, user_id):
        """Get security summary for a user"""
        user = User.query.get(user_id)
        if not user:
            return None
        
        # Get 2FA status
        two_fa = TwoFactorAuth.query.filter_by(user_id=user_id).first()
        
        # Get active sessions
        active_sessions = SessionSecurity.query.filter_by(
            user_id=user_id, is_active=True
        ).count()
        
        # Get recent security events
        recent_events = SecurityLog.query.filter_by(
            user_id=user_id
        ).order_by(SecurityLog.created_at.desc()).limit(10).all()
        
        return {
            'user_id': user_id,
            'username': user.username,
            'email': user.email,
            'two_factor_enabled': two_fa.is_enabled if two_fa else False,
            'active_sessions': active_sessions,
            'last_login': user.updated_at,
            'recent_events': [
                {
                    'event_type': event.event_type,
                    'created_at': event.created_at.isoformat(),
                    'ip_address': event.ip_address,
                    'risk_level': event.risk_level
                }
                for event in recent_events
            ]
        }

# Global security manager instance
security_manager = SecurityManager()
