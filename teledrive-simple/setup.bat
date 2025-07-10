@echo off
echo Setting up TeleDrive Simple...

echo Installing dependencies...
pip install -r requirements.txt

echo Setup complete!
echo.
echo Next steps:
echo 1. Edit .env file with your API credentials if needed
echo 2. Run: python teledrive.py list @yourchannel
echo.
pause
