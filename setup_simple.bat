@echo off
title TeleDrive Setup

echo.
echo ===============================================
echo           TELEDRIVE SETUP
echo ===============================================
echo.

REM Check Python
echo [STEP 1] Checking Python...
python --version
if errorlevel 1 (
    echo [ERROR] Python not found. Please install Python from https://python.org
    pause
    exit /b 1
)
echo [OK] Python is available

REM Create virtual environment (optional)
echo.
echo [STEP 2] Setting up virtual environment...
if not exist "venv\Scripts\activate.bat" (
    echo [INFO] Creating virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo [WARNING] Cannot create virtual environment, continuing without it
    ) else (
        echo [OK] Virtual environment created
    )
) else (
    echo [OK] Virtual environment already exists
)

REM Activate virtual environment if available
if exist "venv\Scripts\activate.bat" (
    echo [INFO] Activating virtual environment...
    call "venv\Scripts\activate.bat"
)

REM Install dependencies
echo.
echo [STEP 3] Installing dependencies...
echo [INFO] Installing from requirements.txt...
pip install -r requirements.txt
if errorlevel 1 (
    echo [WARNING] Some packages failed, installing essential ones...
    pip install telethon pandas tqdm aiofiles openpyxl python-dotenv
)

REM Check essential imports
echo.
echo [STEP 4] Testing imports...
python -c "import telethon; print('[OK] telethon')" 2>nul || echo "[ERROR] telethon not installed"
python -c "import pandas; print('[OK] pandas')" 2>nul || echo "[ERROR] pandas not installed"
python -c "import tqdm; print('[OK] tqdm')" 2>nul || echo "[ERROR] tqdm not installed"
python -c "import aiofiles; print('[OK] aiofiles')" 2>nul || echo "[ERROR] aiofiles not installed"

REM Test config manager
echo.
echo [STEP 5] Testing config manager...
python -c "from config_manager import ConfigManager; print('[OK] config_manager works')" 2>nul
if errorlevel 1 (
    echo [ERROR] config_manager import failed
    echo [INFO] Please check if all dependencies are installed
)

REM Create directories
echo.
echo [STEP 6] Creating directories...
if not exist "output" mkdir output
if not exist "logs" mkdir logs
if not exist "downloads" mkdir downloads
if not exist "data" mkdir data
echo [OK] Directories created

REM Check config.json
echo.
echo [STEP 7] Checking configuration...
if not exist "config.json" (
    echo [INFO] Creating default config.json...
    python -c "from config_manager import ConfigManager; cm = ConfigManager(); cm.save_config()"
    if errorlevel 1 (
        echo [ERROR] Cannot create config.json
    ) else (
        echo [OK] Default config.json created
    )
) else (
    echo [OK] config.json exists
)

echo.
echo ===============================================
echo             SETUP COMPLETED
echo ===============================================
echo.
echo Next steps:
echo 1. Run: python config_setup.py (to configure)
echo 2. Run: run.bat (to start application)
echo.
pause
