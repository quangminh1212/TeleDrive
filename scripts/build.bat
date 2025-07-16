@echo off
REM TeleDrive Build Script
REM Build distribution packages for TeleDrive

echo ========================================
echo TeleDrive - Build Script
echo ========================================
echo.

REM Activate virtual environment
if exist venv (
    call venv\Scripts\activate.bat
    echo ✅ Virtual environment activated
) else (
    echo WARNING: Virtual environment not found, using system Python
)
echo.

REM Install build dependencies
echo Installing build dependencies...
pip install build twine wheel
if errorlevel 1 (
    echo ERROR: Failed to install build dependencies
    pause
    exit /b 1
)
echo ✅ Build dependencies installed
echo.

REM Clean previous builds
echo Cleaning previous builds...
if exist build rmdir /s /q build
if exist dist rmdir /s /q dist
if exist src\teledrive.egg-info rmdir /s /q src\teledrive.egg-info
echo ✅ Previous builds cleaned
echo.

REM Run tests before building
echo Running tests before building...
python -m pytest tests/ -q
if errorlevel 1 (
    echo WARNING: Tests failed, but continuing with build...
    echo You may want to fix tests before distributing
    timeout /t 3 >nul
)
echo.

REM Build package
echo Building package...
python -m build
if errorlevel 1 (
    echo ERROR: Build failed
    pause
    exit /b 1
)
echo ✅ Package built successfully
echo.

REM Check built packages
echo Built packages:
dir dist\
echo.

REM Validate package
echo Validating package...
python -m twine check dist/*
if errorlevel 1 (
    echo WARNING: Package validation failed
    echo Check the output above for issues
) else (
    echo ✅ Package validation passed
)
echo.

echo ========================================
echo Build completed successfully!
echo ========================================
echo.
echo Built files are in the 'dist/' directory:
echo - .whl file: For pip installation
echo - .tar.gz file: Source distribution
echo.
echo To install locally: pip install dist\teledrive-1.0.0-py3-none-any.whl
echo To upload to PyPI: python -m twine upload dist/*
echo.
pause
