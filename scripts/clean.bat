@echo off
REM TeleDrive Clean Script
REM Clean up build artifacts, cache files, and temporary files

echo ========================================
echo TeleDrive - Clean Script
echo ========================================
echo.

echo [1/6] Cleaning Python cache files...
if exist __pycache__ (
    rmdir /s /q __pycache__
    echo ✅ Removed __pycache__
)

for /d /r . %%d in (__pycache__) do (
    if exist "%%d" (
        rmdir /s /q "%%d"
        echo ✅ Removed %%d
    )
)

for /r . %%f in (*.pyc *.pyo) do (
    if exist "%%f" (
        del "%%f"
        echo ✅ Removed %%f
    )
)
echo.

echo [2/6] Cleaning build artifacts...
if exist build rmdir /s /q build
if exist dist rmdir /s /q dist
if exist *.egg-info rmdir /s /q *.egg-info
if exist src\teledrive.egg-info rmdir /s /q src\teledrive.egg-info
echo ✅ Build artifacts cleaned
echo.

echo [3/6] Cleaning test artifacts...
if exist .pytest_cache rmdir /s /q .pytest_cache
if exist .coverage del .coverage
if exist htmlcov rmdir /s /q htmlcov
if exist .tox rmdir /s /q .tox
echo ✅ Test artifacts cleaned
echo.

echo [4/6] Cleaning IDE files...
if exist .vscode rmdir /s /q .vscode
if exist .idea rmdir /s /q .idea
for /r . %%f in (*.swp *.swo *~) do (
    if exist "%%f" del "%%f"
)
echo ✅ IDE files cleaned
echo.

echo [5/6] Cleaning log files...
if exist logs (
    for %%f in (logs\*.log) do (
        if exist "%%f" del "%%f"
    )
    echo ✅ Log files cleaned
) else (
    echo ⚠️ No logs directory found
)
echo.

echo [6/6] Cleaning temporary files...
if exist output (
    for %%f in (output\*) do (
        if not "%%~nxf"==".gitkeep" del "%%f"
    )
    echo ✅ Output files cleaned
) else (
    echo ⚠️ No output directory found
)

REM Clean session files (optional)
set /p clean_sessions="Clean Telegram session files? (y/N): "
if /i "%clean_sessions%"=="y" (
    for %%f in (*.session *.session-journal) do (
        if exist "%%f" (
            del "%%f"
            echo ✅ Removed %%f
        )
    )
    echo ✅ Session files cleaned
)
echo.

echo ========================================
echo Clean completed successfully!
echo ========================================
echo.
echo Cleaned:
echo - Python cache files (__pycache__, *.pyc, *.pyo)
echo - Build artifacts (build/, dist/, *.egg-info)
echo - Test artifacts (.pytest_cache, .coverage, htmlcov/)
echo - IDE files (.vscode/, .idea/, swap files)
echo - Log files (logs/*.log)
echo - Temporary output files
if /i "%clean_sessions%"=="y" echo - Telegram session files
echo.
pause
