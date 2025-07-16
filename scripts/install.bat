@echo off
REM TeleDrive Installation Script
REM Install TeleDrive in different modes

echo ========================================
echo TeleDrive - Installation Script
echo ========================================
echo.

if "%1"=="" goto show_help

if "%1"=="dev" goto install_dev
if "%1"=="prod" goto install_prod
if "%1"=="user" goto install_user
if "%1"=="editable" goto install_editable

:show_help
echo Installation modes:
echo.
echo   scripts\install.bat dev        - Install for development (with dev dependencies)
echo   scripts\install.bat prod       - Install for production (minimal dependencies)
echo   scripts\install.bat user       - Install for end user (from PyPI)
echo   scripts\install.bat editable   - Install in editable mode
echo.
goto end

:install_dev
echo Installing TeleDrive for development...
echo.

REM Create virtual environment if it doesn't exist
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo ❌ Failed to create virtual environment
        goto end
    )
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Upgrade pip
python -m pip install --upgrade pip

REM Install development dependencies
echo Installing development dependencies...
pip install -r requirements/dev.txt
if errorlevel 1 (
    echo ❌ Failed to install development dependencies
    goto end
)

REM Install in editable mode
echo Installing TeleDrive in editable mode...
pip install -e .
if errorlevel 1 (
    echo ❌ Failed to install TeleDrive
    goto end
)

echo ✅ Development installation completed!
echo.
echo Next steps:
echo 1. Configure your API credentials in config.json
echo 2. Run: scripts\run.bat
echo.
goto end

:install_prod
echo Installing TeleDrive for production...
echo.

REM Create virtual environment if it doesn't exist
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo ❌ Failed to create virtual environment
        goto end
    )
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Upgrade pip
python -m pip install --upgrade pip

REM Install production dependencies
echo Installing production dependencies...
pip install -r requirements/prod.txt
if errorlevel 1 (
    echo ❌ Failed to install production dependencies
    goto end
)

REM Install TeleDrive
echo Installing TeleDrive...
pip install .
if errorlevel 1 (
    echo ❌ Failed to install TeleDrive
    goto end
)

echo ✅ Production installation completed!
goto end

:install_user
echo Installing TeleDrive from PyPI...
echo.
echo Note: This will install the latest published version from PyPI
echo.

pip install teledrive
if errorlevel 1 (
    echo ❌ Failed to install from PyPI
    echo This might be because the package is not yet published
    echo Try: scripts\install.bat dev
    goto end
)

echo ✅ User installation completed!
goto end

:install_editable
echo Installing TeleDrive in editable mode...
echo.

if not exist venv (
    echo ❌ Virtual environment not found
    echo Please run: scripts\setup.bat first
    goto end
)

call venv\Scripts\activate.bat

pip install -e .
if errorlevel 1 (
    echo ❌ Failed to install in editable mode
    goto end
)

echo ✅ Editable installation completed!
goto end

:end
pause
