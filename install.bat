@echo off
echo Installing TeleDrive...

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo Python not found! Please install Python 3.7+
    pause
    exit /b 1
)

echo Python found
python --version

echo Installing dependencies...
pip install -r requirements.txt

if errorlevel 1 (
    echo Installation failed!
    pause
    exit /b 1
)

echo.
echo Installation complete!
echo Run "run.bat" to start TeleDrive
pause
