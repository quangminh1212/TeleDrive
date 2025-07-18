@echo off
echo Testing config validation...
python check_config.py
echo Exit code: %errorlevel%
if %errorlevel% equ 0 (
    echo SUCCESS: Config is valid
) else (
    echo FAILED: Config is invalid
)
pause
