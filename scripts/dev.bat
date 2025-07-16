@echo off
REM TeleDrive Development Script
REM Quick development workflow commands

echo ========================================
echo TeleDrive - Development Helper
echo ========================================
echo.

if "%1"=="" goto show_help

if "%1"=="install" goto install_dev
if "%1"=="test" goto run_tests
if "%1"=="format" goto format_code
if "%1"=="lint" goto lint_code
if "%1"=="clean" goto clean_project
if "%1"=="build" goto build_project
if "%1"=="run" goto run_app
if "%1"=="docs" goto build_docs
if "%1"=="check" goto check_all

:show_help
echo Available commands:
echo.
echo   scripts\dev.bat install    - Install development dependencies
echo   scripts\dev.bat test       - Run test suite
echo   scripts\dev.bat format     - Format code with black and isort
echo   scripts\dev.bat lint       - Run linting checks
echo   scripts\dev.bat clean      - Clean build artifacts
echo   scripts\dev.bat build      - Build distribution packages
echo   scripts\dev.bat run        - Run the application
echo   scripts\dev.bat docs       - Build documentation
echo   scripts\dev.bat check      - Run all quality checks
echo.
goto end

:install_dev
echo Installing development dependencies...
call scripts\setup.bat
goto end

:run_tests
echo Running tests...
call scripts\test.bat
goto end

:format_code
echo Formatting code...
call scripts\format.bat
goto end

:lint_code
echo Running linting checks...
if exist venv call venv\Scripts\activate.bat
flake8 src/ tests/ --max-line-length=88 --extend-ignore=E203,W503
if errorlevel 1 (
    echo ❌ Linting issues found
) else (
    echo ✅ Linting passed
)
goto end

:clean_project
echo Cleaning project...
call scripts\clean.bat
goto end

:build_project
echo Building project...
call scripts\build.bat
goto end

:run_app
echo Running application...
call scripts\run.bat
goto end

:build_docs
echo Building documentation...
if exist venv call venv\Scripts\activate.bat
if not exist docs mkdir docs
echo Building Sphinx documentation...
sphinx-build -b html docs docs/_build/html
if errorlevel 1 (
    echo ❌ Documentation build failed
) else (
    echo ✅ Documentation built successfully
    echo Open docs/_build/html/index.html to view
)
goto end

:check_all
echo Running all quality checks...
echo.
echo [1/4] Running tests...
call scripts\test.bat
echo.
echo [2/4] Formatting code...
call scripts\format.bat
echo.
echo [3/4] Running linting...
if exist venv call venv\Scripts\activate.bat
flake8 src/ tests/ --max-line-length=88 --extend-ignore=E203,W503
echo.
echo [4/4] Type checking...
mypy src/teledrive --ignore-missing-imports
echo.
echo ✅ All checks completed
goto end

:end
echo.
echo Development command completed.
pause
