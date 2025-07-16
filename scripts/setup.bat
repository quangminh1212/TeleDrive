@echo off
REM TeleDrive Setup Script
REM Thiết lập môi trường phát triển cho TeleDrive

echo ========================================
echo TeleDrive - Setup Script
echo ========================================
echo.

REM Check Python installation
echo [1/6] Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://python.org
    pause
    exit /b 1
)

python -c "import sys; exit(0 if sys.version_info >= (3, 8) else 1)" >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python 3.8+ is required
    echo Current version:
    python --version
    pause
    exit /b 1
)

echo ✅ Python version check passed
echo.

REM Create virtual environment
echo [2/6] Creating virtual environment...
if exist venv (
    echo Virtual environment already exists
) else (
    python -m venv venv
    if errorlevel 1 (
        echo ERROR: Failed to create virtual environment
        pause
        exit /b 1
    )
    echo ✅ Virtual environment created
)
echo.

REM Activate virtual environment
echo [3/6] Activating virtual environment...
call venv\Scripts\activate.bat
if errorlevel 1 (
    echo ERROR: Failed to activate virtual environment
    pause
    exit /b 1
)
echo ✅ Virtual environment activated
echo.

REM Upgrade pip
echo [4/6] Upgrading pip...
python -m pip install --upgrade pip
if errorlevel 1 (
    echo WARNING: Failed to upgrade pip, continuing...
)
echo ✅ Pip upgraded
echo.

REM Install dependencies
echo [5/6] Installing dependencies...
echo Installing development dependencies...
pip install -r requirements/dev.txt
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    echo Trying base requirements only...
    pip install -r requirements/base.txt
    if errorlevel 1 (
        echo ERROR: Failed to install base dependencies
        pause
        exit /b 1
    )
)
echo ✅ Dependencies installed
echo.

REM Install package in development mode
echo [6/6] Installing TeleDrive in development mode...
pip install -e .
if errorlevel 1 (
    echo WARNING: Failed to install in development mode
    echo You can still run the application directly
)
echo ✅ TeleDrive installed
echo.

REM Create necessary directories
echo Creating necessary directories...
if not exist logs mkdir logs
if not exist output mkdir output
if not exist downloads mkdir downloads
if not exist data mkdir data
echo ✅ Directories created
echo.

REM Setup pre-commit hooks (if available)
echo Setting up pre-commit hooks...
pre-commit install >nul 2>&1
if errorlevel 1 (
    echo ⚠️ Pre-commit hooks not installed (optional)
) else (
    echo ✅ Pre-commit hooks installed
)
echo.

echo ========================================
echo Setup completed successfully!
echo ========================================
echo.
echo Next steps:
echo 1. Configure your Telegram API credentials in config.json
echo 2. Run: scripts\run.bat to start the application
echo 3. Or run: python main.py for direct execution
echo.
echo For development:
echo - Run tests: scripts\test.bat
echo - Format code: scripts\format.bat
echo - Build package: scripts\build.bat
echo.
pause
