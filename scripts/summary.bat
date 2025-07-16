@echo off
REM TeleDrive Project Summary Script
REM Display comprehensive project information and status

echo ========================================
echo TeleDrive - Project Summary
echo ========================================
echo.

REM Project Information
echo [PROJECT INFO]
echo Name: TeleDrive
echo Description: Advanced Telegram Channel File Scanner
echo Version: 1.0.0
echo License: MIT
echo.

REM Check Python installation
echo [PYTHON ENVIRONMENT]
python --version 2>nul
if errorlevel 1 (
    echo ❌ Python not installed or not in PATH
) else (
    echo ✅ Python installed
)

REM Check virtual environment
if exist venv (
    echo ✅ Virtual environment exists
    call venv\Scripts\activate.bat
    echo Python version in venv:
    python --version
    echo Pip version:
    pip --version
) else (
    echo ❌ Virtual environment not found
    echo Run: scripts\setup.bat to create
)
echo.

REM Check configuration
echo [CONFIGURATION]
if exist config.json (
    echo ✅ Configuration file exists
    python -c "
import json
try:
    with open('config.json', 'r') as f:
        config = json.load(f)
    telegram = config.get('telegram', {})
    api_id = telegram.get('api_id', '')
    api_hash = telegram.get('api_hash', '')
    phone = telegram.get('phone_number', '')
    
    if api_id and api_id != 'YOUR_API_ID':
        print('✅ API ID configured')
    else:
        print('❌ API ID not configured')
        
    if api_hash and api_hash != 'YOUR_API_HASH':
        print('✅ API Hash configured')
    else:
        print('❌ API Hash not configured')
        
    if phone and phone.startswith('+'):
        print('✅ Phone number configured')
    else:
        print('❌ Phone number not configured')
        
except Exception as e:
    print(f'❌ Configuration error: {e}')
" 2>nul
) else (
    echo ❌ Configuration file not found
    echo Run: scripts\run.bat to create default config
)
echo.

REM Check dependencies
echo [DEPENDENCIES]
if exist venv (
    call venv\Scripts\activate.bat
    echo Checking core dependencies...
    python -c "
import sys
required = ['telethon', 'pandas', 'tqdm', 'click', 'rich', 'pydantic']
missing = []
for pkg in required:
    try:
        __import__(pkg)
        print(f'✅ {pkg}')
    except ImportError:
        print(f'❌ {pkg}')
        missing.append(pkg)
        
if missing:
    print(f'Missing packages: {missing}')
    print('Run: pip install -r requirements/dev.txt')
" 2>nul
) else (
    echo ❌ Cannot check dependencies - no virtual environment
)
echo.

REM Project Structure
echo [PROJECT STRUCTURE]
echo Checking project structure...
set "folders=src\teledrive scripts tests logs output downloads"
for %%f in (%folders%) do (
    if exist %%f (
        echo ✅ %%f\
    ) else (
        echo ❌ %%f\ ^(missing^)
    )
)

set "files=pyproject.toml setup.py requirements.txt config.json README.md LICENSE"
for %%f in (%files%) do (
    if exist %%f (
        echo ✅ %%f
    ) else (
        echo ❌ %%f ^(missing^)
    )
)
echo.

REM Development Tools
echo [DEVELOPMENT TOOLS]
if exist venv (
    call venv\Scripts\activate.bat
    echo Checking development tools...
    python -c "
tools = ['pytest', 'black', 'isort', 'flake8', 'mypy', 'pre-commit']
for tool in tools:
    try:
        __import__(tool)
        print(f'✅ {tool}')
    except ImportError:
        print(f'❌ {tool}')
" 2>nul
) else (
    echo ❌ Cannot check tools - no virtual environment
)
echo.

REM Git Status
echo [GIT STATUS]
git status --porcelain 2>nul
if errorlevel 1 (
    echo ❌ Not a git repository or git not installed
) else (
    echo Current branch:
    git branch --show-current
    echo.
    echo Recent commits:
    git log --oneline -5
)
echo.

REM Available Scripts
echo [AVAILABLE SCRIPTS]
echo Development scripts in scripts\ directory:
for %%f in (scripts\*.bat) do (
    echo   %%~nf.bat - %%f
)
echo.

REM Quick Start Guide
echo [QUICK START]
echo 1. Setup environment:     scripts\setup.bat
echo 2. Configure credentials: Edit config.json
echo 3. Run application:       scripts\run.bat
echo 4. Run tests:            scripts\test.bat
echo 5. Format code:          scripts\format.bat
echo 6. Build package:        scripts\build.bat
echo.

REM Health Check
echo [HEALTH CHECK]
set health_score=0

if exist venv set /a health_score+=1
if exist config.json set /a health_score+=1
if exist src\teledrive set /a health_score+=1
if exist tests set /a health_score+=1
if exist pyproject.toml set /a health_score+=1

echo Project health score: %health_score%/5
if %health_score% geq 4 (
    echo ✅ Project is in good health
) else if %health_score% geq 2 (
    echo ⚠️ Project needs attention
) else (
    echo ❌ Project needs significant setup
)
echo.

echo ========================================
echo Summary completed!
echo ========================================
echo.
echo For help with any issues, check:
echo - README.md for documentation
echo - scripts\dev.bat help for development commands
echo - GitHub Issues for bug reports
echo.
pause
