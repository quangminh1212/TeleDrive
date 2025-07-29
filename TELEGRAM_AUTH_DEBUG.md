# Telegram Authentication Debugging Guide

## Overview
The Telegram authentication system now includes comprehensive logging to help debug any login issues. This guide explains how to use the logging information to troubleshoot problems.

## Logging Locations

### 1. Flask Application Logs (app.py)
The main Flask application logs authentication events with the prefix `=== TELEGRAM LOGIN START ===` and `=== TELEGRAM VERIFY START ===`.

### 2. Authentication Module Logs (auth.py)
The Telegram authentication module logs events with the prefix `AUTH:`.

## How to View Logs

### Method 1: Console Output
When running the Flask application in development mode, logs will appear in the console where you started the server.

```bash
python source/app.py
```

### Method 2: Log Files
If you have configured log files in your Flask configuration, check those files for authentication events.

## Authentication Flow Logging

### Step 1: Phone Number Submission
```
=== TELEGRAM LOGIN START ===
Login attempt for phone: +84987654321
Stored phone in session: +84987654321
Sending verification code...
AUTH: send_code_request called with phone: 987654321, country: +84
AUTH: Formatted phone number: +84987654321
AUTH: Initializing Telegram client...
AUTH: Sending code request to Telegram...
AUTH: Code sent successfully, phone_code_hash: abc123...
AUTH: Session stored with ID: def456...
Send code result: {'success': True, 'session_id': 'def456...', ...}
Session ID stored: def456...
```

### Step 2: Verification Code Submission
```
=== TELEGRAM VERIFY START ===
Session keys: ['telegram_phone', 'telegram_session_id', 'telegram_country_code']
Phone from session: +84987654321
Verification attempt - Session ID: def456...
Verification code length: 5
Starting code verification...
AUTH: verify_code called with session_id: def456..., code length: 5
AUTH: Retrieved session data for phone: +84987654321
AUTH: Attempting to sign in with verification code...
AUTH: Sign in with code successful
AUTH: Getting user information from Telegram...
AUTH: Retrieved Telegram user: username123 (ID: 987654321)
AUTH: Creating or updating user in database...
AUTH: create_or_update_user called for telegram_id: 987654321
AUTH: Generated username: username123, email: username123@telegram.local
AUTH: Creating new user in database
AUTH: Added new user to session: username123
AUTH: User committed to database with ID: 5
AUTH: Database user: username123 (ID: 5)
AUTH: Cleaned up session and disconnected client
Verification result: {'success': True, 'user': {...}, ...}
```

### Step 3: User Login Process
```
=== AUTHENTICATION SUCCESSFUL ===
Looking for user with telegram_id: 987654321
Found existing user: username123 (ID: 5)
User active status: True
User auth method: telegram
Recording successful login
Calling login_user()
Login completed. current_user.is_authenticated: True
Cleared session data
Redirecting to: /dashboard
```

## Common Issues and Solutions

### Issue 1: Session Expired Error
**Log Pattern:**
```
No telegram_session_id in session - session expired
```
**Solution:** This happens when the session data is lost between phone number submission and verification. Check session configuration and ensure cookies are enabled.

### Issue 2: Invalid Verification Code
**Log Pattern:**
```
AUTH: Invalid verification code error
Authentication failed: Invalid verification code
```
**Solution:** User entered wrong code. Ask them to check their Telegram app for the correct code.

### Issue 3: User Not Found After Authentication
**Log Pattern:**
```
User not found in database for telegram_id: 987654321
Creating fallback user account
```
**Solution:** This indicates the user creation in auth.py didn't work properly. Check database connectivity and permissions.

### Issue 4: Flask-Login Integration Issues
**Log Pattern:**
```
Login completed. current_user.is_authenticated: False
```
**Solution:** This indicates a problem with Flask-Login integration. Check the User model's Flask-Login methods.

### Issue 5: Two-Factor Authentication
**Log Pattern:**
```
AUTH: Two-factor authentication required
Two-factor authentication required
```
**Solution:** User has 2FA enabled. The system will prompt for their 2FA password.

## Testing the Authentication System

You can test the authentication system by:

1. **Running the Application:** Start the Flask app and attempt to log in through the web interface
2. **Checking Logs:** Monitor the console output for the log messages described above
3. **Database Verification:** Check the database to ensure users are being created correctly

## Troubleshooting Steps

1. **Check Session Configuration:** Ensure Flask sessions are properly configured
2. **Verify Database Connection:** Make sure the database is accessible and writable
3. **Test Telegram API:** Verify that the Telegram API credentials are correct
4. **Check User Model:** Ensure the User model's Flask-Login methods work correctly
5. **Review Network:** Check for any network issues preventing Telegram API calls

## Log Analysis Tips

- Look for the session ID to track a specific login attempt through the entire flow
- Check timestamps to identify where delays or timeouts might be occurring
- Pay attention to database commit messages to ensure data is being saved
- Monitor the `current_user.is_authenticated` status to verify Flask-Login integration

## Disabling Debug Logging

To disable the detailed logging in production, you can:

1. Remove or comment out the `print()` statements in `auth.py`
2. Set the Flask app logger level to WARNING or ERROR
3. Configure proper log rotation for production environments

This logging system should help identify and resolve any remaining authentication issues quickly and efficiently.
