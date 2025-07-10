@echo off
echo Setting up TeleDrive...

REM Create virtual environment
python -m venv venv

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing dependencies...
pip install -r requirements.txt

REM Create .env file if it doesn't exist
if not exist .env (
    copy .env.example .env
    echo Created .env file. Please edit it with your Telegram API credentials.
)

REM Create necessary directories
if not exist downloads mkdir downloads
if not exist uploads mkdir uploads

echo Setup complete!
echo.
echo Next steps:
echo 1. Edit .env file with your Telegram API credentials
echo 2. For CLI: python teledrive.py
echo 3. For Web Interface: python app.py
echo.
echo Web interface will be available at: http://localhost:5000
echo.
pause
