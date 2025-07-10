@echo off
echo Committing changes...
git add .
git commit -m "Fix logo display in TeleDrive application - properly load teledrive.png file with RGBA conversion and error handling"
echo Done!
pause
