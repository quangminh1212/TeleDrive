@echo off
REM TeleDrive Test Script
REM Chạy test suite cho TeleDrive

echo ========================================
echo TeleDrive - Test Runner
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

REM Check if pytest is installed
python -c "import pytest" >nul 2>&1
if errorlevel 1 (
    echo Installing pytest...
    pip install pytest pytest-asyncio pytest-cov
    if errorlevel 1 (
        echo ERROR: Failed to install pytest
        pause
        exit /b 1
    )
)

REM Create test directory if it doesn't exist
if not exist tests (
    mkdir tests
    echo. > tests\__init__.py
    echo ✅ Created tests directory
)

REM Run tests
echo Running tests...
echo.

REM Check if there are any test files
dir /b tests\test_*.py >nul 2>&1
if errorlevel 1 (
    echo No test files found in tests/ directory
    echo Creating a basic test file...
    
    echo import pytest > tests\test_basic.py
    echo from src.teledrive.config.manager import ConfigManager >> tests\test_basic.py
    echo. >> tests\test_basic.py
    echo def test_config_manager_creation(): >> tests\test_basic.py
    echo     """Test that ConfigManager can be created""" >> tests\test_basic.py
    echo     manager = ConfigManager() >> tests\test_basic.py
    echo     assert manager is not None >> tests\test_basic.py
    echo     assert manager.config_path.name == "config.json" >> tests\test_basic.py
    
    echo ✅ Created basic test file
)

REM Run pytest with coverage
echo Running pytest with coverage...
pytest tests/ -v --cov=src/teledrive --cov-report=html --cov-report=term-missing

if errorlevel 1 (
    echo.
    echo ❌ Some tests failed
    echo Check the output above for details
) else (
    echo.
    echo ✅ All tests passed!
    echo Coverage report generated in htmlcov/
)

echo.
echo ========================================
echo Test run completed
echo ========================================
pause
