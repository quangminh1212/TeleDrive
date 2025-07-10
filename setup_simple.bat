@echo off
echo Setting up TeleDrive Simple...

echo Installing dependencies...
pip install -r requirements_simple.txt

echo Copying configuration...
if not exist .env (
    copy .env_simple .env
    echo Please edit .env file with your Telegram API credentials
) else (
    echo .env file already exists
)

echo Setup complete!
echo.
echo Next steps:
echo 1. Edit .env file with your API credentials
echo 2. Run: python teledrive_simple.py list @yourchannel
echo.
pause
