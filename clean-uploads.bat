@echo off
echo Cleaning uploads directory...
del /Q uploads\* 
copy NUL uploads\.gitkeep
echo # This file is used to keep the directory structure in git. > uploads\.gitkeep
echo Done! 