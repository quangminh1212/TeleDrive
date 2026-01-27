@echo off
REM TeleDrive - Web Mode (Browser)
REM Runs the application in browser instead of desktop window

echo ========================================
echo TeleDrive - Web Mode
echo ========================================
echo.

REM Check if virtual environment exists
if not exist ".venv\Scripts\activate.bat" (
    echo Virtual environment not found!
    echo Please run setup.bat first
    echo.
    pause
    exit /b 1
)

REM Activate virtual environment
call .venv\Scripts\activate.bat

REM Set environment variable to force browser mode
set TELEDRIVE_FORCE_BROWSER=1

REM Run the Flask app directly (browser mode)
echo Starting TeleDrive in browser mode...
echo.
python app\app.py

REM Check exit code
if errorlevel 1 (
    echo.
    echo ========================================
    echo TeleDrive stopped with errors
    echo ========================================
    echo Check teledrive.log for details
) else (
    echo.
    echo ========================================
    echo TeleDrive stopped
    echo ========================================
)

echo.
echo To restart, run: run_web.bat
pause
