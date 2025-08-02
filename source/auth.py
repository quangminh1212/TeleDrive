#!/usr/bin/env python3
"""
Telegram Authentication Module for TeleDrive
Handles Telegram login authentication using phone number and verification code
"""

import asyncio
import json
import os
from typing import Optional, Dict, Any
from telethon import TelegramClient
from telethon.errors import PhoneCodeInvalidError, PhoneNumberInvalidError, SessionPasswordNeededError
from telethon.tl.types import User as TelegramUser
import config
from models import db, User, get_or_create_user
from flask import current_app

# Import detailed logging
try:
    from logger import (log_step, log_authentication_event, log_security_event,
                       log_error, log_performance_metric, get_logger)
    DETAILED_LOGGING_AVAILABLE = True
    logger = get_logger('auth')
except ImportError:
    DETAILED_LOGGING_AVAILABLE = False
    import logging
    logger = logging.getLogger(__name__)

class TelegramAuthenticator:
    """Handle Telegram authentication for web login"""
    
    def __init__(self):
        self.client = None
        self.temp_sessions = {}  # Store temporary session data
        
    async def initialize_client(self, session_name: str = None):
        """Initialize Telegram client for authentication"""
        if not session_name:
            session_name = f"auth_session_{os.urandom(8).hex()}"
            
        try:
            self.client = TelegramClient(
                f"data/{session_name}",
                int(config.API_ID),
                config.API_HASH
            )
            await self.client.connect()
            return True
        except Exception as e:
            print(f"Error initializing Telegram client: {e}")
            return False
    
    async def send_code_request(self, phone_number: str, country_code: str = "+84") -> Dict[str, Any]:
        """Send verification code to phone number"""
        if DETAILED_LOGGING_AVAILABLE:
            log_step("AUTH REQUEST", f"Sending verification code to {phone_number[:3]}***{phone_number[-3:]}")
            log_authentication_event("CODE_REQUEST_START", {
                'phone_masked': phone_number[:3] + '***' + phone_number[-3:],
                'country_code': country_code
            })

        try:
            # Format phone number with country code
            if not phone_number.startswith('+'):
                phone_number = f"{country_code}{phone_number}"

            if DETAILED_LOGGING_AVAILABLE:
                log_step("PHONE FORMAT", f"Formatted phone: {phone_number[:3]}***{phone_number[-3:]}")

            # Initialize client if not already done
            if not self.client:
                if DETAILED_LOGGING_AVAILABLE:
                    log_step("CLIENT INIT", "Initializing Telegram client...")
                await self.initialize_client()

            # Send code request
            if DETAILED_LOGGING_AVAILABLE:
                log_step("SEND CODE", "Sending code request to Telegram...")
            sent_code = await self.client.send_code_request(phone_number)

            if DETAILED_LOGGING_AVAILABLE:
                log_step("CODE SENT", "Verification code sent successfully")
                log_authentication_event("CODE_REQUEST_SUCCESS", {
                    'phone_masked': phone_number[:3] + '***' + phone_number[-3:]
                })

            # Store session info temporarily
            session_id = os.urandom(16).hex()
            self.temp_sessions[session_id] = {
                'phone_number': phone_number,
                'phone_code_hash': sent_code.phone_code_hash,
                'client': self.client
            }

            if DETAILED_LOGGING_AVAILABLE:
                log_step("SESSION STORE", f"Session stored with ID: {session_id}")

            return {
                'success': True,
                'session_id': session_id,
                'phone_number': phone_number,
                'message': 'Verification code sent successfully'
            }
            
        except PhoneNumberInvalidError as e:
            if DETAILED_LOGGING_AVAILABLE:
                log_authentication_event("CODE_REQUEST_FAILED", {
                    'error': 'Invalid phone number format',
                    'phone_masked': phone_number[:3] + '***' + phone_number[-3:] if len(phone_number) > 6 else 'invalid'
                }, success=False)
                log_security_event("INVALID_PHONE_FORMAT", {
                    'phone_masked': phone_number[:3] + '***' + phone_number[-3:] if len(phone_number) > 6 else 'invalid'
                }, "WARNING")
            return {
                'success': False,
                'error': 'Invalid phone number format'
            }
        except Exception as e:
            if DETAILED_LOGGING_AVAILABLE:
                log_error(e, "send_code_request")
                log_authentication_event("CODE_REQUEST_ERROR", {
                    'error': str(e),
                    'phone_masked': phone_number[:3] + '***' + phone_number[-3:] if len(phone_number) > 6 else 'unknown'
                }, success=False)
            return {
                'success': False,
                'error': f'Failed to send verification code: {str(e)}'
            }
    
    async def verify_code(self, session_id: str, verification_code: str, password: str = None) -> Dict[str, Any]:
        """Verify the code and complete authentication"""
        if DETAILED_LOGGING_AVAILABLE:
            log_step("VERIFY CODE", f"Verifying code for session: {session_id}")
            log_authentication_event("CODE_VERIFY_START", {
                'session_id': session_id,
                'code_length': len(verification_code)
            })

        try:
            if session_id not in self.temp_sessions:
                if DETAILED_LOGGING_AVAILABLE:
                    log_authentication_event("CODE_VERIFY_FAILED", {
                        'error': 'Invalid or expired session',
                        'session_id': session_id,
                        'available_sessions': len(self.temp_sessions)
                    }, success=False)
                    log_security_event("INVALID_SESSION_ACCESS", {
                        'session_id': session_id,
                        'available_sessions': len(self.temp_sessions)
                    }, "WARNING")
                return {
                    'success': False,
                    'error': 'Invalid or expired session'
                }

            session_data = self.temp_sessions[session_id]
            phone_number = session_data['phone_number']
            phone_code_hash = session_data['phone_code_hash']

            if DETAILED_LOGGING_AVAILABLE:
                log_step("SESSION DATA", f"Retrieved session data for phone: {phone_number[:3]}***{phone_number[-3:]}")

            # Create a new client for this verification request to avoid event loop issues
            if DETAILED_LOGGING_AVAILABLE:
                log_step("CLIENT CREATE", "Creating new client for verification...")
            client = TelegramClient(
                f"data/verify_session_{session_id}",
                int(config.API_ID),
                config.API_HASH
            )
            await client.connect()

            if DETAILED_LOGGING_AVAILABLE:
                log_step("CLIENT CONNECT", "New client connected successfully")

            try:
                # Try to sign in with the code
                print("AUTH: Attempting to sign in with verification code...")
                user = await client.sign_in(
                    phone=phone_number,
                    code=verification_code,
                    phone_code_hash=phone_code_hash
                )
                print("AUTH: Sign in with code successful")
            except SessionPasswordNeededError:
                print("AUTH: Two-factor authentication required")
                # Two-factor authentication is enabled
                if not password:
                    await client.disconnect()
                    return {
                        'success': False,
                        'error': 'Two-factor authentication password required',
                        'requires_password': True
                    }

                # Sign in with password
                print("AUTH: Attempting to sign in with 2FA password...")
                user = await client.sign_in(password=password)
                print("AUTH: Sign in with 2FA password successful")

            # Get user information
            print("AUTH: Getting user information from Telegram...")
            telegram_user = await client.get_me()
            print(f"AUTH: Retrieved Telegram user: {telegram_user.username} (ID: {telegram_user.id})")

            # Create or get user in database
            print("AUTH: Creating or updating user in database...")
            db_user = self.create_or_update_user(telegram_user, phone_number)
            print(f"AUTH: Database user: {db_user.username} (ID: {db_user.id})")

            # Clean up temporary session and old client
            old_client = session_data.get('client')
            if old_client:
                try:
                    await old_client.disconnect()
                    print("AUTH: Disconnected old client")
                except:
                    print("AUTH: Failed to disconnect old client (may already be disconnected)")

            del self.temp_sessions[session_id]
            await client.disconnect()
            print("AUTH: Cleaned up session and disconnected client")

            return {
                'success': True,
                'user': {
                    'id': db_user.id,
                    'username': db_user.username,
                    'telegram_id': telegram_user.id,
                    'first_name': telegram_user.first_name,
                    'last_name': telegram_user.last_name,
                    'phone': phone_number
                },
                'message': 'Authentication successful'
            }
            
        except PhoneCodeInvalidError:
            print("AUTH: Invalid verification code error")
            return {
                'success': False,
                'error': 'Invalid verification code'
            }
        except Exception as e:
            print(f"AUTH: Authentication failed with exception: {str(e)}")
            return {
                'success': False,
                'error': f'Authentication failed: {str(e)}'
            }
    
    def create_or_update_user(self, telegram_user: TelegramUser, phone_number: str) -> User:
        """Create or update user in database"""
        print(f"AUTH: create_or_update_user called for telegram_id: {telegram_user.id}")

        # Generate username from Telegram data
        username = telegram_user.username or f"user_{telegram_user.id}"
        email = f"{username}@telegram.local"

        print(f"AUTH: Generated username: {username}, email: {email}")

        # Check if user already exists by telegram_id (store as string)
        user = User.query.filter_by(telegram_id=str(telegram_user.id)).first()

        if not user:
            print("AUTH: Creating new user in database")
            # Create new user
            user = User(
                username=username,
                email=email,
                telegram_id=str(telegram_user.id),  # Store as string for consistency
                phone_number=phone_number,
                first_name=telegram_user.first_name or '',
                last_name=telegram_user.last_name or '',
                is_active=True,
                role='user',
                auth_method='telegram'  # Set auth method to telegram
            )
            db.session.add(user)
            print(f"AUTH: Added new user to session: {username}")
        else:
            print(f"AUTH: Updating existing user: {user.username}")
            # Update existing user
            user.phone_number = phone_number
            user.first_name = telegram_user.first_name or ''
            user.last_name = telegram_user.last_name or ''
            user.is_active = True

        db.session.commit()
        print(f"AUTH: User committed to database with ID: {user.id}")
        return user
    
    async def cleanup_session(self, session_id: str):
        """Clean up temporary session"""
        if session_id in self.temp_sessions:
            client = self.temp_sessions[session_id]['client']
            try:
                await client.disconnect()
            except:
                pass
            del self.temp_sessions[session_id]
    
    async def close(self):
        """Close all connections and clean up"""
        for session_id in list(self.temp_sessions.keys()):
            await self.cleanup_session(session_id)
        
        if self.client:
            try:
                await self.client.disconnect()
            except:
                pass

# Global authenticator instance
telegram_auth = TelegramAuthenticator()

def get_country_codes():
    """Get comprehensive list of country codes - simplified to show only codes"""
    return [
        # Most popular countries first
        ('+84', '+84'),
        ('+1', '+1'),
        ('+86', '+86'),
        ('+91', '+91'),
        ('+44', '+44'),
        ('+7', '+7'),
        ('+81', '+81'),
        ('+49', '+49'),
        ('+33', '+33'),
        ('+55', '+55'),

        # Southeast Asia
        ('+62', '+62'),
        ('+66', '+66'),
        ('+63', '+63'),
        ('+60', '+60'),
        ('+65', '+65'),
        ('+855', '+855'),
        ('+856', '+856'),
        ('+95', '+95'),
        ('+673', '+673'),

        # East Asia
        ('+82', '+82'),
        ('+852', '+852'),
        ('+853', '+853'),
        ('+886', '+886'),
        ('+976', '+976'),
        ('+850', '+850'),

        # South Asia
        ('+92', '+92'),
        ('+880', '+880'),
        ('+94', '+94'),
        ('+977', '+977'),
        ('+975', '+975'),
        ('+960', '+960'),

        # Europe
        ('+39', '+39'),
        ('+34', '+34'),
        ('+31', '+31'),
        ('+48', '+48'),
        ('+90', '+90'),
        ('+380', '+380'),
        ('+40', '+40'),
        ('+420', '+420'),
        ('+30', '+30'),
        ('+351', '+351'),
        ('+36', '+36'),
        ('+46', '+46'),
        ('+47', '+47'),
        ('+45', '+45'),
        ('+358', '+358'),
        ('+41', '+41'),
        ('+43', '+43'),
        ('+32', '+32'),
        ('+359', '+359'),
        ('+385', '+385'),
        ('+386', '+386'),
        ('+421', '+421'),
        ('+370', '+370'),
        ('+371', '+371'),
        ('+372', '+372'),
        ('+354', '+354'),
        ('+353', '+353'),
        ('+375', '+375'),
        ('+374', '+374'),
        ('+995', '+995'),
        ('+994', '+994'),

        # Central Asia
        ('+998', '+998'),
        ('+996', '+996'),
        ('+992', '+992'),
        ('+993', '+993'),

        # Middle East
        ('+98', '+98'),
        ('+964', '+964'),
        ('+966', '+966'),
        ('+971', '+971'),
        ('+972', '+972'),
        ('+961', '+961'),
        ('+962', '+962'),
        ('+963', '+963'),
        ('+970', '+970'),
        ('+965', '+965'),
        ('+973', '+973'),
        ('+974', '+974'),
        ('+968', '+968'),
        ('+967', '+967'),
        ('+93', '+93'),

        # Africa
        ('+20', '+20'),
        ('+27', '+27'),
        ('+234', '+234'),
        ('+254', '+254'),
        ('+233', '+233'),
        ('+212', '+212'),
        ('+213', '+213'),
        ('+216', '+216'),
        ('+218', '+218'),
        ('+251', '+251'),
        ('+256', '+256'),
        ('+255', '+255'),
        ('+260', '+260'),
        ('+263', '+263'),
        ('+264', '+264'),
        ('+267', '+267'),
        ('+268', '+268'),
        ('+266', '+266'),
        ('+230', '+230'),
        ('+248', '+248'),
        ('+261', '+261'),
        ('+262', '+262'),
        ('+290', '+290'),

        # Americas
        ('+52', '+52'),
        ('+54', '+54'),
        ('+56', '+56'),
        ('+57', '+57'),
        ('+58', '+58'),
        ('+51', '+51'),
        ('+593', '+593'),
        ('+591', '+591'),
        ('+595', '+595'),
        ('+598', '+598'),
        ('+592', '+592'),
        ('+597', '+597'),
        ('+594', '+594'),
        ('+508', '+508'),
        ('+590', '+590'),
        ('+596', '+596'),

        # Oceania
        ('+61', '+61'),
        ('+64', '+64'),
        ('+679', '+679'),
        ('+685', '+685'),
        ('+686', '+686'),
        ('+687', '+687'),
        ('+688', '+688'),
        ('+689', '+689'),
        ('+690', '+690'),
        ('+691', '+691'),
        ('+692', '+692'),

        # Additional North American regions
        # Note: +1 already included above for US
    ]
