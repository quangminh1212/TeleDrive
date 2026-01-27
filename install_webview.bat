@echo off
echo Installing pywebview for embedded web interface...
echo.

:: Try to install pywebview
pip install pywebview --user

if errorlevel 1 (
    echo.
    echo WARNING: pywebview installation failed
    echo This is expected on Python 3.14 due to pythonnet dependency
    echo.
    echo Installing fallback: tkinterweb...
    pip install tkinterweb --user
    
    if errorlevel 1 (
        echo.
        echo WARNING: tkinterweb also failed
        echo The app will use external browser as fallback
        echo.
    ) else (
        echo.
        echo ✓ tkinterweb installed successfully
        echo The app will use tkinterweb for embedded browser
        echo.
    )
) else (
    echo.
    echo ✓ pywebview installed successfully
    echo The app will use native webview
    echo.
)

pause
