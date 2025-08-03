#!/usr/bin/env python3
"""
Telegram Authentication Module for TeleDrive
Handles Telegram login authentication using phone number and verification code
"""

import asyncio
import json
import os
import time
from typing import Optional, Dict, Any
from telethon import TelegramClient
from telethon.errors import PhoneCodeInvalidError, PhoneNumberInvalidError, SessionPasswordNeededError, PhoneCodeExpiredError
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
        self.session_timeout = 300  # 5 minutes timeout for verification codes

    async def __aenter__(self):
        """Async context manager entry"""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit with proper cleanup"""
        await self.close()
        return False
        
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

            # Store session info temporarily with timestamp
            session_id = os.urandom(16).hex()
            self.temp_sessions[session_id] = {
                'phone_number': phone_number,
                'phone_code_hash': sent_code.phone_code_hash,
                'client': self.client,
                'created_at': time.time(),
                'expires_at': time.time() + 300  # 5 minutes expiry
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
            # Clean up expired sessions first
            await self.cleanup_expired_sessions()

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
                    'error': 'Invalid or expired session. Please request a new verification code.',
                    'session_expired': True
                }

            session_data = self.temp_sessions[session_id]

            # Check if session has expired
            if time.time() > session_data.get('expires_at', 0):
                if DETAILED_LOGGING_AVAILABLE:
                    log_authentication_event("CODE_VERIFY_FAILED", {
                        'error': 'Session expired',
                        'session_id': session_id
                    }, success=False)
                await self.cleanup_session(session_id)
                return {
                    'success': False,
                    'error': 'Session has expired. Please request a new verification code.',
                    'session_expired': True
                }

            session_data = self.temp_sessions[session_id]
            phone_number = session_data['phone_number']
            phone_code_hash = session_data['phone_code_hash']

            if DETAILED_LOGGING_AVAILABLE:
                log_step("SESSION DATA", f"Retrieved session data for phone: {phone_number[:3]}***{phone_number[-3:]}")

            # Create a new client for verification to avoid event loop issues
            # Don't reuse the stored client as it may be tied to a different event loop
            if DETAILED_LOGGING_AVAILABLE:
                log_step("CLIENT CREATE", "Creating new client for verification to avoid event loop conflicts...")

            # Create a new client with a unique session name for verification
            verification_session = f"verify_{session_id}_{os.urandom(4).hex()}"
            client = TelegramClient(
                f"data/{verification_session}",
                int(config.API_ID),
                config.API_HASH
            )

            try:
                # Connect the new client
                await client.connect()
                if DETAILED_LOGGING_AVAILABLE:
                    log_step("CLIENT CONNECTED", "New verification client connected successfully")

                # Try to sign in with the code using the new client
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
                    # Clean up clients before returning
                    try:
                        await client.disconnect()
                    except:
                        pass
                    old_client = session_data.get('client')
                    if old_client:
                        try:
                            if old_client.is_connected():
                                await old_client.disconnect()
                        except:
                            pass
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

            # Clean up temporary session and disconnect both clients
            old_client = session_data.get('client')
            del self.temp_sessions[session_id]

            # Disconnect the new verification client
            try:
                await client.disconnect()
                print("AUTH: Disconnected verification client")
            except Exception as e:
                print(f"AUTH: Failed to disconnect verification client: {e}")

            # Clean up the old stored client if it exists
            if old_client:
                try:
                    if old_client.is_connected():
                        await old_client.disconnect()
                        print("AUTH: Disconnected old stored client")
                except Exception as e:
                    print(f"AUTH: Failed to disconnect old stored client: {e}")

            # Clean up the verification session file
            try:
                import os
                session_file = f"data/{verification_session}.session"
                if os.path.exists(session_file):
                    os.remove(session_file)
                    print("AUTH: Cleaned up verification session file")
            except Exception as e:
                print(f"AUTH: Failed to clean up verification session file: {e}")

            print("AUTH: Session cleanup completed")

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
            # Clean up verification client
            try:
                await client.disconnect()
            except:
                pass
            if DETAILED_LOGGING_AVAILABLE:
                log_authentication_event("CODE_VERIFY_FAILED", {
                    'error': 'Invalid verification code',
                    'session_id': session_id
                }, success=False)
            return {
                'success': False,
                'error': 'Invalid verification code'
            }
        except PhoneCodeExpiredError:
            print("AUTH: Verification code expired error")
            # Clean up verification client
            try:
                await client.disconnect()
            except:
                pass
            if DETAILED_LOGGING_AVAILABLE:
                log_authentication_event("CODE_VERIFY_FAILED", {
                    'error': 'Verification code expired',
                    'session_id': session_id
                }, success=False)
            # Clean up expired session
            if session_id in self.temp_sessions:
                await self.cleanup_session(session_id)
            return {
                'success': False,
                'error': 'Verification code has expired. Please request a new code.',
                'code_expired': True
            }
        except Exception as e:
            print(f"AUTH: Authentication failed with exception: {str(e)}")
            # Clean up verification client first
            try:
                await client.disconnect()
                print("AUTH: Disconnected verification client after error")
            except Exception as client_error:
                print(f"AUTH: Error disconnecting verification client: {client_error}")

            # Clean up session on any error
            if session_id in self.temp_sessions:
                try:
                    await self.cleanup_session(session_id)
                except Exception as cleanup_error:
                    print(f"AUTH: Error during session cleanup: {cleanup_error}")

            if DETAILED_LOGGING_AVAILABLE:
                log_authentication_event("CODE_VERIFY_FAILED", {
                    'error': str(e),
                    'session_id': session_id
                }, success=False)

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
    
    async def cleanup_expired_sessions(self):
        """Clean up expired sessions asynchronously"""
        current_time = time.time()
        expired_sessions = []

        for session_id, session_data in self.temp_sessions.items():
            if current_time > session_data.get('expires_at', 0):
                expired_sessions.append(session_id)

        # Clean up expired sessions properly
        for session_id in expired_sessions:
            print(f"AUTH: Cleaning up expired session: {session_id}")
            await self.cleanup_session(session_id)

    async def cleanup_session(self, session_id: str):
        """Clean up temporary session with improved error handling"""
        if session_id in self.temp_sessions:
            session_data = self.temp_sessions[session_id]
            client = session_data.get('client')

            if client:
                try:
                    # Check if client is connected before trying to disconnect
                    if client.is_connected():
                        await asyncio.wait_for(client.disconnect(), timeout=5.0)
                        print(f"AUTH: Successfully disconnected client for session {session_id}")
                    else:
                        print(f"AUTH: Client for session {session_id} was already disconnected")
                except asyncio.TimeoutError:
                    print(f"AUTH: Timeout disconnecting client for session {session_id}")
                except Exception as e:
                    print(f"AUTH: Error disconnecting client for session {session_id}: {e}")

            # Always remove from temp_sessions even if disconnect failed
            del self.temp_sessions[session_id]
            print(f"AUTH: Cleaned up session {session_id}")
    
    async def close(self):
        """Close all connections and clean up with improved error handling"""
        # Clean up all temporary sessions first
        for session_id in list(self.temp_sessions.keys()):
            try:
                await self.cleanup_session(session_id)
            except Exception as e:
                print(f"AUTH: Error cleaning up session {session_id}: {e}")

        # Clean up main client
        if self.client:
            try:
                if self.client.is_connected():
                    await asyncio.wait_for(self.client.disconnect(), timeout=10.0)
                    print("AUTH: Successfully disconnected main client")
                else:
                    print("AUTH: Main client was already disconnected")
            except asyncio.TimeoutError:
                print("AUTH: Timeout disconnecting main client")
            except Exception as e:
                print(f"AUTH: Error disconnecting main client: {e}")
            finally:
                self.client = None

# Global authenticator instance
telegram_auth = TelegramAuthenticator()

def get_country_codes():
    """Get comprehensive list of country codes with country names"""
    return [
        # Most popular countries first
        ('+84', '+84 Vietnam'),
        ('+1', '+1 United States'),
        ('+86', '+86 China'),
        ('+91', '+91 India'),
        ('+44', '+44 United Kingdom'),
        ('+7', '+7 Russia'),
        ('+81', '+81 Japan'),
        ('+49', '+49 Germany'),
        ('+33', '+33 France'),
        ('+55', '+55 Brazil'),

        # Southeast Asia
        ('+62', '+62 Indonesia'),
        ('+66', '+66 Thailand'),
        ('+63', '+63 Philippines'),
        ('+60', '+60 Malaysia'),
        ('+65', '+65 Singapore'),
        ('+855', '+855 Cambodia'),
        ('+856', '+856 Laos'),
        ('+95', '+95 Myanmar'),
        ('+673', '+673 Brunei'),

        # East Asia
        ('+82', '+82 South Korea'),
        ('+852', '+852 Hong Kong'),
        ('+853', '+853 Macau'),
        ('+886', '+886 Taiwan'),
        ('+976', '+976 Mongolia'),
        ('+850', '+850 North Korea'),

        # South Asia
        ('+92', '+92 Pakistan'),
        ('+880', '+880 Bangladesh'),
        ('+94', '+94 Sri Lanka'),
        ('+977', '+977 Nepal'),
        ('+975', '+975 Bhutan'),
        ('+960', '+960 Maldives'),

        # Europe
        ('+39', '+39 Italy'),
        ('+34', '+34 Spain'),
        ('+31', '+31 Netherlands'),
        ('+48', '+48 Poland'),
        ('+90', '+90 Turkey'),
        ('+380', '+380 Ukraine'),
        ('+40', '+40 Romania'),
        ('+420', '+420 Czech Republic'),
        ('+30', '+30 Greece'),
        ('+351', '+351 Portugal'),
        ('+36', '+36 Hungary'),
        ('+46', '+46 Sweden'),
        ('+47', '+47 Norway'),
        ('+45', '+45 Denmark'),
        ('+358', '+358 Finland'),
        ('+41', '+41 Switzerland'),
        ('+43', '+43 Austria'),
        ('+32', '+32 Belgium'),
        ('+359', '+359 Bulgaria'),
        ('+385', '+385 Croatia'),
        ('+386', '+386 Slovenia'),
        ('+421', '+421 Slovakia'),
        ('+370', '+370 Lithuania'),
        ('+371', '+371 Latvia'),
        ('+372', '+372 Estonia'),
        ('+354', '+354 Iceland'),
        ('+353', '+353 Ireland'),
        ('+375', '+375 Belarus'),
        ('+374', '+374 Armenia'),
        ('+995', '+995 Georgia'),
        ('+994', '+994 Azerbaijan'),

        # Central Asia
        ('+998', '+998 Uzbekistan'),
        ('+996', '+996 Kyrgyzstan'),
        ('+992', '+992 Tajikistan'),
        ('+993', '+993 Turkmenistan'),

        # Middle East
        ('+98', '+98 Iran'),
        ('+964', '+964 Iraq'),
        ('+966', '+966 Saudi Arabia'),
        ('+971', '+971 UAE'),
        ('+972', '+972 Israel'),
        ('+961', '+961 Lebanon'),
        ('+962', '+962 Jordan'),
        ('+963', '+963 Syria'),
        ('+970', '+970 Palestine'),
        ('+965', '+965 Kuwait'),
        ('+973', '+973 Bahrain'),
        ('+974', '+974 Qatar'),
        ('+968', '+968 Oman'),
        ('+967', '+967 Yemen'),
        ('+93', '+93 Afghanistan'),

        # Africa
        ('+20', '+20 Egypt'),
        ('+27', '+27 South Africa'),
        ('+234', '+234 Nigeria'),
        ('+254', '+254 Kenya'),
        ('+233', '+233 Ghana'),
        ('+212', '+212 Morocco'),
        ('+213', '+213 Algeria'),
        ('+216', '+216 Tunisia'),
        ('+218', '+218 Libya'),
        ('+251', '+251 Ethiopia'),
        ('+256', '+256 Uganda'),
        ('+255', '+255 Tanzania'),
        ('+260', '+260 Zambia'),
        ('+263', '+263 Zimbabwe'),
        ('+264', '+264 Namibia'),
        ('+267', '+267 Botswana'),
        ('+268', '+268 Eswatini'),
        ('+266', '+266 Lesotho'),
        ('+230', '+230 Mauritius'),
        ('+248', '+248 Seychelles'),
        ('+261', '+261 Madagascar'),
        ('+262', '+262 Réunion'),
        ('+290', '+290 Saint Helena'),

        # Americas
        ('+52', '+52 Mexico'),
        ('+54', '+54 Argentina'),
        ('+56', '+56 Chile'),
        ('+57', '+57 Colombia'),
        ('+58', '+58 Venezuela'),
        ('+51', '+51 Peru'),
        ('+593', '+593 Ecuador'),
        ('+591', '+591 Bolivia'),
        ('+595', '+595 Paraguay'),
        ('+598', '+598 Uruguay'),
        ('+592', '+592 Guyana'),
        ('+597', '+597 Suriname'),
        ('+594', '+594 French Guiana'),
        ('+508', '+508 Saint Pierre and Miquelon'),
        ('+590', '+590 Guadeloupe'),
        ('+596', '+596 Martinique'),

        # Oceania
        ('+61', '+61 Australia'),
        ('+64', '+64 New Zealand'),
        ('+679', '+679 Fiji'),
        ('+685', '+685 Samoa'),
        ('+686', '+686 Kiribati'),
        ('+687', '+687 New Caledonia'),
        ('+688', '+688 Tuvalu'),
        ('+689', '+689 French Polynesia'),
        ('+690', '+690 Tokelau'),
        ('+691', '+691 Micronesia'),
        ('+692', '+692 Marshall Islands'),

        # Additional North American regions
        # Note: +1 already included above for US
    ]
