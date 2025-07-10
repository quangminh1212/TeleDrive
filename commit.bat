@echo off
echo Committing changes...
git add .
git commit -m "Remove all test files and simplify project structure - deleted test files, demo files, debug files, cache directories, and redundant run.py to create minimal clean project structure"
echo Done!
pause
