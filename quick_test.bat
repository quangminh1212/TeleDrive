@echo off
echo Testing run.bat syntax...

REM Test basic batch syntax
echo Testing basic commands...
python --version
if errorlevel 1 (
    echo Python not found
) else (
    echo Python OK
)

REM Test config manager
echo Testing config manager...
python -c "from config_manager import ConfigManager; print('Config manager OK')"

echo Test completed!
pause
