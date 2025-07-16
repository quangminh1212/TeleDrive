@echo off
REM TeleDrive Code Formatting Script
REM Format code using black, isort, and flake8

echo ========================================
echo TeleDrive - Code Formatter
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

REM Install formatting tools if not present
echo Checking formatting tools...
python -c "import black, isort, flake8" >nul 2>&1
if errorlevel 1 (
    echo Installing formatting tools...
    pip install black isort flake8 mypy
    if errorlevel 1 (
        echo ERROR: Failed to install formatting tools
        pause
        exit /b 1
    )
)
echo ✅ Formatting tools available
echo.

REM Format with black
echo [1/4] Formatting code with black...
black src/ tests/ --line-length 88
if errorlevel 1 (
    echo WARNING: Black formatting had issues
) else (
    echo ✅ Black formatting completed
)
echo.

REM Sort imports with isort
echo [2/4] Sorting imports with isort...
isort src/ tests/ --profile black
if errorlevel 1 (
    echo WARNING: isort had issues
) else (
    echo ✅ Import sorting completed
)
echo.

REM Check with flake8
echo [3/4] Checking code style with flake8...
flake8 src/ tests/ --max-line-length=88 --extend-ignore=E203,W503
if errorlevel 1 (
    echo ❌ Code style issues found
    echo Please review the output above
) else (
    echo ✅ Code style check passed
)
echo.

REM Type checking with mypy
echo [4/4] Type checking with mypy...
mypy src/teledrive --ignore-missing-imports
if errorlevel 1 (
    echo ❌ Type checking issues found
    echo Please review the output above
) else (
    echo ✅ Type checking passed
)
echo.

echo ========================================
echo Code formatting completed!
echo ========================================
echo.
echo Summary:
echo - Code formatted with black
echo - Imports sorted with isort  
echo - Style checked with flake8
echo - Types checked with mypy
echo.
echo Your code is now properly formatted and ready for commit!
echo.
pause
