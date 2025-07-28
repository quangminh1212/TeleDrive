# Telegram API Configuration - TeleDrive Project

## App Information
- **App Title**: Telegram Unlimited Driver
- **Short Name**: TeleDrive
- **API ID**: 21272067
- **API Hash**: b7690dc86952dbc9b16717b101164af3

## API Credentials Source
Get your API credentials from: https://my.telegram.org/apps

## MTProto Server Configuration

### Test Environment
- **DC ID**: 2
- **IP**: 149.154.167.40
- **Port**: 443
- **Public Key**:
```
-----BEGIN RSA PUBLIC KEY-----
MIIBCgKCAQEAyMEdY1aR+sCR3ZSJrtztKTKqigvO/vBfqACJLZtS7QMgCGXJ6XIR
yy7mx66W0/sOFa7/1mAZtEoIokDP3ShoqF4fVNb6XeqgQfaUHd8wJpDWHcR2OFwv
plUUI1PLTktZ9uW2WE23b+ixNwJjJGwBDJPQEQFBE+vfmH0JP503wr5INS1poWg/
j25sIWeYPHYeOrFp/eXaqhISP6G+q2IeTaWTXpwZj4LzXq5YOpk4bYEQ6mvRq7D1
aHWfYmlEGepfaYR8Q0YqvvhYtMte3ITnuSJs171+GDqpdKcSwHnd6FudwGO4pcCO
j4WcDuXc2CTHgH8gFTNhp/Y8/SpDOhvn9QIDAQAB
-----END RSA PUBLIC KEY-----
```

### Production Environment
- **DC ID**: 2
- **IP**: 149.154.167.50
- **Port**: 443
- **Public Key**:
```
-----BEGIN RSA PUBLIC KEY-----
MIIBCgKCAQEA6LszBcC1LGzyr992NzE0ieY+BSaOW622Aa9Bd4ZHLl+TuFQ4lo4g
5nKaMBwK/BIb9xUfg0Q29/2mgIR6Zr9krM7HjuIcCzFvDtr+L0GQjae9H0pRB2OO
62cECs5HKhT5DZ98K33vmWiLowc621dQuwKWSQKjWf50XYFw42h21P2KXUGyp2y/
+aEyZ+uVgLLQbRA1dEjSDZ2iGRy12Mk5gpYc397aYp438fsJoHIgJ2lgMv5h7WY9
t6N/byY9Nw9p21Og3AoXSL2q/2IJ1WRUhebgAdGVMlV1fkuOQoEzR7EdpqtQD9Cs
5+bfo3Nhmcyvk5ftB0WkJ9z6bNZ7yxrP8wIDAQAB
-----END RSA PUBLIC KEY-----
```

## Configuration Files

### 1. .env File
Contains environment variables for API credentials:
```env
TELEGRAM_API_ID=21272067
TELEGRAM_API_HASH=b7690dc86952dbc9b16717b101164af3
TELEGRAM_PHONE=+84936374950
TELEGRAM_APP_TITLE=Telegram Unlimited Driver
TELEGRAM_SHORT_NAME=TeleDrive
TELEGRAM_DEVICE_MODEL=Telegram Unlimited Driver
TELEGRAM_SERVER_ENVIRONMENT=production
```

### 2. config.json File
Contains detailed configuration including MTProto server settings and public keys.

### 3. config.py File
Loads and manages configuration from both .env and config.json files.

## Usage

The project automatically uses the production environment by default. The MTProto server configurations and public keys are embedded in the configuration files and will be used by the Telethon library for secure communication with Telegram servers.

## Security Notes

- Keep your API credentials secure and never commit them to public repositories
- The public keys provided are official Telegram RSA public keys for MTProto protocol
- Use production environment for live applications
- Test environment is available for development and testing purposes

## Integration

The configuration is automatically loaded when the application starts:
1. Environment variables are loaded from .env file
2. Configuration is merged with config.json settings
3. MTProto server settings are available through the config module
4. Telethon client uses these settings for secure communication

## Files Updated

- `config.json` - Added MTProto server configurations and app information
- `.env` - Enhanced with additional Telegram API settings
- `config.py` - Updated to handle new configuration options
- `TELEGRAM_API_CONFIG.md` - This documentation file

## Next Steps

After updating the configuration:
1. Test the connection with Telegram servers
2. Verify that the application can authenticate successfully
3. Ensure all features work with the new configuration
4. Commit changes to version control
