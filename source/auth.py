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
        print(f"AUTH: send_code_request called with phone: {phone_number}, country: {country_code}")
        try:
            # Format phone number with country code
            if not phone_number.startswith('+'):
                phone_number = f"{country_code}{phone_number}"

            print(f"AUTH: Formatted phone number: {phone_number}")

            # Initialize client if not already done
            if not self.client:
                print("AUTH: Initializing Telegram client...")
                await self.initialize_client()

            # Send code request
            print("AUTH: Sending code request to Telegram...")
            sent_code = await self.client.send_code_request(phone_number)
            print(f"AUTH: Code sent successfully, phone_code_hash: {sent_code.phone_code_hash[:10]}...")

            # Store session info temporarily
            session_id = os.urandom(16).hex()
            self.temp_sessions[session_id] = {
                'phone_number': phone_number,
                'phone_code_hash': sent_code.phone_code_hash,
                'client': self.client
            }
            print(f"AUTH: Session stored with ID: {session_id}")

            return {
                'success': True,
                'session_id': session_id,
                'phone_number': phone_number,
                'message': 'Verification code sent successfully'
            }
            
        except PhoneNumberInvalidError:
            return {
                'success': False,
                'error': 'Invalid phone number format'
            }
        except Exception as e:
            return {
                'success': False,
                'error': f'Failed to send verification code: {str(e)}'
            }
    
    async def verify_code(self, session_id: str, verification_code: str, password: str = None) -> Dict[str, Any]:
        """Verify the code and complete authentication"""
        print(f"AUTH: verify_code called with session_id: {session_id}, code length: {len(verification_code)}")
        try:
            if session_id not in self.temp_sessions:
                print(f"AUTH: Session {session_id} not found in temp_sessions")
                print(f"AUTH: Available sessions: {list(self.temp_sessions.keys())}")
                return {
                    'success': False,
                    'error': 'Invalid or expired session'
                }

            session_data = self.temp_sessions[session_id]
            phone_number = session_data['phone_number']
            phone_code_hash = session_data['phone_code_hash']

            print(f"AUTH: Retrieved session data for phone: {phone_number}")

            # Create a new client for this verification request to avoid event loop issues
            print("AUTH: Creating new client for verification...")
            client = TelegramClient(
                f"data/verify_session_{session_id}",
                int(config.API_ID),
                config.API_HASH
            )
            await client.connect()
            print("AUTH: New client connected successfully")

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
                except Exception as e:
                    print(f"AUTH: Failed to disconnect old client: {e}")

            # Clean up the verification client
            try:
                await client.disconnect()
                print("AUTH: Disconnected verification client")
            except Exception as e:
                print(f"AUTH: Failed to disconnect verification client: {e}")

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
            error_str = str(e).lower()
            print(f"AUTH: Authentication failed with exception: {str(e)}")

            # Handle specific error cases
            if 'confirmation code has expired' in error_str or 'code has expired' in error_str:
                print("AUTH: Verification code has expired")
                # Clean up the expired session
                if session_id in self.temp_sessions:
                    await self.cleanup_session(session_id)

                return {
                    'success': False,
                    'error': 'Verification code has expired. Please request a new code.',
                    'error_type': 'code_expired',
                    'requires_new_code': True
                }
            elif 'phone code invalid' in error_str or 'invalid code' in error_str:
                print("AUTH: Invalid verification code")
                return {
                    'success': False,
                    'error': 'Invalid verification code. Please check and try again.',
                    'error_type': 'invalid_code'
                }
            elif 'phone number invalid' in error_str:
                print("AUTH: Invalid phone number")
                return {
                    'success': False,
                    'error': 'Invalid phone number format.',
                    'error_type': 'invalid_phone'
                }
            else:
                return {
                    'success': False,
                    'error': f'Authentication failed: {str(e)}',
                    'error_type': 'general'
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
    """Get simplified list of most commonly used country codes"""
    return [
        # Most popular countries - simplified list
        ('+84', '🇻🇳 Vietnam (+84)'),
        ('+1', '🇺🇸 United States (+1)'),
        ('+86', '🇨🇳 China (+86)'),
        ('+91', '🇮🇳 India (+91)'),
        ('+44', '🇬🇧 United Kingdom (+44)'),
        ('+7', '🇷🇺 Russia (+7)'),
        ('+81', '🇯🇵 Japan (+81)'),
        ('+49', '🇩🇪 Germany (+49)'),
        ('+33', '🇫🇷 France (+33)'),
        ('+55', '🇧🇷 Brazil (+55)'),

        # Southeast Asia
        ('+62', '🇮🇩 Indonesia (+62)'),
        ('+66', '🇹🇭 Thailand (+66)'),
        ('+63', '🇵🇭 Philippines (+63)'),
        ('+60', '🇲🇾 Malaysia (+60)'),
        ('+65', '🇸🇬 Singapore (+65)'),
        ('+82', '🇰🇷 South Korea (+82)'),

        # Europe
        ('+39', '🇮🇹 Italy (+39)'),
        ('+34', '🇪🇸 Spain (+34)'),
        ('+31', '🇳🇱 Netherlands (+31)'),
        ('+48', '🇵🇱 Poland (+48)'),
        ('+90', '🇹🇷 Turkey (+90)'),
        ('+380', '🇺🇦 Ukraine (+380)'),

        # Americas
        ('+52', '🇲🇽 Mexico (+52)'),
        ('+54', '🇦🇷 Argentina (+54)'),
        ('+56', '🇨🇱 Chile (+56)'),
        ('+57', '🇨🇴 Colombia (+57)'),

        # Oceania
        ('+61', '🇦🇺 Australia (+61)'),
        ('+64', '🇳🇿 New Zealand (+64)'),

        # Middle East
        ('+971', '🇦🇪 UAE (+971)'),
        ('+966', '🇸🇦 Saudi Arabia (+966)'),
        ('+972', '🇮🇱 Israel (+972)'),

    ]
