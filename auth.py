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
        try:
            # Format phone number with country code
            if not phone_number.startswith('+'):
                phone_number = f"{country_code}{phone_number}"
            
            # Initialize client if not already done
            if not self.client:
                await self.initialize_client()
            
            # Send code request
            sent_code = await self.client.send_code_request(phone_number)
            
            # Store session info temporarily
            session_id = os.urandom(16).hex()
            self.temp_sessions[session_id] = {
                'phone_number': phone_number,
                'phone_code_hash': sent_code.phone_code_hash,
                'client': self.client
            }
            
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
        try:
            if session_id not in self.temp_sessions:
                return {
                    'success': False,
                    'error': 'Invalid or expired session'
                }
            
            session_data = self.temp_sessions[session_id]
            client = session_data['client']
            phone_number = session_data['phone_number']
            phone_code_hash = session_data['phone_code_hash']
            
            try:
                # Try to sign in with the code
                user = await client.sign_in(
                    phone=phone_number,
                    code=verification_code,
                    phone_code_hash=phone_code_hash
                )
            except SessionPasswordNeededError:
                # Two-factor authentication is enabled
                if not password:
                    return {
                        'success': False,
                        'error': 'Two-factor authentication password required',
                        'requires_password': True
                    }
                
                # Sign in with password
                user = await client.sign_in(password=password)
            
            # Get user information
            telegram_user = await client.get_me()
            
            # Create or get user in database
            db_user = self.create_or_update_user(telegram_user, phone_number)
            
            # Clean up temporary session
            del self.temp_sessions[session_id]
            await client.disconnect()
            
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
            return {
                'success': False,
                'error': 'Invalid verification code'
            }
        except Exception as e:
            return {
                'success': False,
                'error': f'Authentication failed: {str(e)}'
            }
    
    def create_or_update_user(self, telegram_user: TelegramUser, phone_number: str) -> User:
        """Create or update user in database"""
        # Generate username from Telegram data
        username = telegram_user.username or f"user_{telegram_user.id}"
        email = f"{username}@telegram.local"
        
        # Check if user already exists by telegram_id
        user = User.query.filter_by(telegram_id=telegram_user.id).first()
        
        if not user:
            # Create new user
            user = User(
                username=username,
                email=email,
                telegram_id=telegram_user.id,
                phone_number=phone_number,
                first_name=telegram_user.first_name or '',
                last_name=telegram_user.last_name or '',
                is_active=True,
                role='user'
            )
            db.session.add(user)
        else:
            # Update existing user
            user.phone_number = phone_number
            user.first_name = telegram_user.first_name or ''
            user.last_name = telegram_user.last_name or ''
            user.is_active = True
        
        db.session.commit()
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
    """Get list of common country codes"""
    return [
        ('+84', 'Vietnam (+84)'),
        ('+1', 'United States (+1)'),
        ('+44', 'United Kingdom (+44)'),
        ('+86', 'China (+86)'),
        ('+91', 'India (+91)'),
        ('+81', 'Japan (+81)'),
        ('+82', 'South Korea (+82)'),
        ('+65', 'Singapore (+65)'),
        ('+60', 'Malaysia (+60)'),
        ('+66', 'Thailand (+66)'),
        ('+62', 'Indonesia (+62)'),
        ('+63', 'Philippines (+63)'),
        ('+7', 'Russia (+7)'),
        ('+49', 'Germany (+49)'),
        ('+33', 'France (+33)'),
        ('+39', 'Italy (+39)'),
        ('+34', 'Spain (+34)'),
        ('+55', 'Brazil (+55)'),
        ('+52', 'Mexico (+52)'),
        ('+61', 'Australia (+61)'),
        ('+90', 'Turkey (+90)'),
        ('+31', 'Netherlands (+31)'),
        ('+46', 'Sweden (+46)'),
        ('+47', 'Norway (+47)'),
        ('+45', 'Denmark (+45)'),
        ('+41', 'Switzerland (+41)'),
        ('+43', 'Austria (+43)'),
        ('+32', 'Belgium (+32)'),
        ('+351', 'Portugal (+351)'),
        ('+30', 'Greece (+30)'),
        ('+48', 'Poland (+48)'),
        ('+420', 'Czech Republic (+420)'),
        ('+36', 'Hungary (+36)'),
        ('+40', 'Romania (+40)'),
        ('+359', 'Bulgaria (+359)'),
        ('+385', 'Croatia (+385)'),
        ('+386', 'Slovenia (+386)'),
        ('+421', 'Slovakia (+421)'),
        ('+370', 'Lithuania (+370)'),
        ('+371', 'Latvia (+371)'),
        ('+372', 'Estonia (+372)'),
        ('+358', 'Finland (+358)'),
        ('+354', 'Iceland (+354)'),
        ('+353', 'Ireland (+353)'),
        ('+380', 'Ukraine (+380)'),
        ('+375', 'Belarus (+375)'),
        ('+374', 'Armenia (+374)'),
        ('+995', 'Georgia (+995)'),
        ('+994', 'Azerbaijan (+994)'),
        ('+998', 'Uzbekistan (+998)'),
        ('+996', 'Kyrgyzstan (+996)'),
        ('+992', 'Tajikistan (+992)'),
        ('+993', 'Turkmenistan (+993)'),
        ('+977', 'Nepal (+977)'),
        ('+880', 'Bangladesh (+880)'),
        ('+94', 'Sri Lanka (+94)'),
        ('+95', 'Myanmar (+95)'),
        ('+855', 'Cambodia (+855)'),
        ('+856', 'Laos (+856)'),
        ('+673', 'Brunei (+673)'),
        ('+852', 'Hong Kong (+852)'),
        ('+853', 'Macau (+853)'),
        ('+886', 'Taiwan (+886)'),
        ('+976', 'Mongolia (+976)'),
        ('+850', 'North Korea (+850)'),
        ('+20', 'Egypt (+20)'),
        ('+27', 'South Africa (+27)'),
        ('+234', 'Nigeria (+234)'),
        ('+254', 'Kenya (+254)'),
        ('+233', 'Ghana (+233)'),
        ('+212', 'Morocco (+212)'),
        ('+213', 'Algeria (+213)'),
        ('+216', 'Tunisia (+216)'),
        ('+218', 'Libya (+218)'),
        ('+251', 'Ethiopia (+251)'),
        ('+256', 'Uganda (+256)'),
        ('+255', 'Tanzania (+255)'),
        ('+260', 'Zambia (+260)'),
        ('+263', 'Zimbabwe (+263)'),
        ('+264', 'Namibia (+264)'),
        ('+267', 'Botswana (+267)'),
        ('+268', 'Eswatini (+268)'),
        ('+266', 'Lesotho (+266)'),
        ('+230', 'Mauritius (+230)'),
        ('+248', 'Seychelles (+248)'),
        ('+261', 'Madagascar (+261)'),
        ('+262', 'Réunion (+262)'),
        ('+290', 'Saint Helena (+290)'),
        ('+54', 'Argentina (+54)'),
        ('+56', 'Chile (+56)'),
        ('+57', 'Colombia (+57)'),
        ('+58', 'Venezuela (+58)'),
        ('+51', 'Peru (+51)'),
        ('+593', 'Ecuador (+593)'),
        ('+591', 'Bolivia (+591)'),
        ('+595', 'Paraguay (+595)'),
        ('+598', 'Uruguay (+598)'),
        ('+592', 'Guyana (+592)'),
        ('+597', 'Suriname (+597)'),
        ('+594', 'French Guiana (+594)'),
        ('+508', 'Saint Pierre and Miquelon (+508)'),
        ('+590', 'Guadeloupe (+590)'),
        ('+596', 'Martinique (+596)'),
        ('+64', 'New Zealand (+64)'),
        ('+679', 'Fiji (+679)'),
        ('+685', 'Samoa (+685)'),
        ('+686', 'Kiribati (+686)'),
        ('+687', 'New Caledonia (+687)'),
        ('+688', 'Tuvalu (+688)'),
        ('+689', 'French Polynesia (+689)'),
        ('+690', 'Tokelau (+690)'),
        ('+691', 'Micronesia (+691)'),
        ('+692', 'Marshall Islands (+692)'),
        ('+93', 'Afghanistan (+93)'),
        ('+92', 'Pakistan (+92)'),
        ('+98', 'Iran (+98)'),
        ('+964', 'Iraq (+964)'),
        ('+965', 'Kuwait (+965)'),
        ('+966', 'Saudi Arabia (+966)'),
        ('+967', 'Yemen (+967)'),
        ('+968', 'Oman (+968)'),
        ('+971', 'United Arab Emirates (+971)'),
        ('+972', 'Israel (+972)'),
        ('+973', 'Bahrain (+973)'),
        ('+974', 'Qatar (+974)'),
        ('+975', 'Bhutan (+975)'),
        ('+960', 'Maldives (+960)'),
        ('+961', 'Lebanon (+961)'),
        ('+962', 'Jordan (+962)'),
        ('+963', 'Syria (+963)'),
        ('+970', 'Palestine (+970)')
    ]
