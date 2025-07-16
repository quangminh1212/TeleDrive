@echo off
chcp 65001 >nul
title TeleDrive - Commit Config Updates

echo.
echo ===============================================
echo     COMMIT CONFIG UPDATES TO REPOSITORY
echo ===============================================
echo.

REM Check if git is available
git --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Git không được cài đặt hoặc không có trong PATH
    echo 💡 Vui lòng cài đặt Git từ https://git-scm.com
    pause
    exit /b 1
)

REM Check if we're in a git repository
git status >nul 2>&1
if errorlevel 1 (
    echo ❌ Thư mục hiện tại không phải là git repository
    echo 💡 Vui lòng chạy 'git init' hoặc clone repository
    pause
    exit /b 1
)

echo 📋 THAY ĐỔI SẼ ĐƯỢC COMMIT:
echo =============================
echo ✅ config.json - Cấu hình tập trung v2.0
echo ✅ config_manager.py - Config manager nâng cấp
echo ✅ config_setup.py - Tiện ích thiết lập cấu hình
echo ✅ run.bat - Script khởi chạy cập nhật
echo ✅ CONFIG_GUIDE.md - Hướng dẫn cấu hình chi tiết
echo.

REM Show current status
echo 📊 GIT STATUS:
echo ===============
git status --short

echo.
set /p confirm="Bạn có muốn commit các thay đổi này? (y/N): "

if /i not "%confirm%"=="y" (
    echo ❌ Đã hủy commit
    pause
    exit /b 0
)

echo.
echo 🔄 ĐANG COMMIT...
echo ==================

REM Add all config-related files
echo 📁 Adding files to staging...
git add config.json
git add config_manager.py
git add config_setup.py
git add run.bat
git add CONFIG_GUIDE.md

REM Check if there are changes to commit
git diff --cached --quiet
if not errorlevel 1 (
    echo ⚠️ Không có thay đổi nào để commit
    pause
    exit /b 0
)

REM Commit with detailed message
echo 💾 Committing changes...
git commit -m "feat: Implement centralized configuration system v2.0

- Enhanced config.json with comprehensive settings structure
- Added project metadata, UI, database, and API configurations  
- Integrated channel management directly in main config
- Updated config_manager.py with new features:
  * Auto-migration from v1.0 to v2.0
  * Channel CRUD operations
  * UI and database configuration management
  * Enhanced validation and error handling
- Added config_setup.py interactive configuration utility
- Updated run.bat with improved workflow and menu system
- Added CONFIG_GUIDE.md with comprehensive documentation
- Centralized all parameters in single config file
- Improved user experience with guided setup process

This update consolidates all project configuration into a single,
well-structured config.json file with full validation and management tools."

if errorlevel 1 (
    echo ❌ Lỗi khi commit
    pause
    exit /b 1
)

echo.
echo ✅ COMMIT THÀNH CÔNG!
echo =====================
echo 📝 Commit message: "feat: Implement centralized configuration system v2.0"
echo 📊 Files committed:
git show --name-only --pretty=format: HEAD | findstr /v "^$"

echo.
echo 🚀 NEXT STEPS:
echo ===============
echo 1. 📤 Push to remote: git push origin main
echo 2. 🔧 Test configuration: python config_setup.py
echo 3. 🏃 Run application: run.bat
echo 4. 📖 Read guide: CONFIG_GUIDE.md

echo.
set /p push="Bạn có muốn push lên remote repository? (y/N): "

if /i "%push%"=="y" (
    echo.
    echo 📤 PUSHING TO REMOTE...
    echo =======================
    git push origin main
    if errorlevel 1 (
        echo ❌ Lỗi khi push
        echo 💡 Có thể cần pull trước hoặc kiểm tra remote URL
    ) else (
        echo ✅ Push thành công!
    )
)

echo.
echo 🎉 HOÀN THÀNH!
echo ==============
echo 📋 Tất cả thay đổi đã được commit và cập nhật
echo 💡 Sử dụng 'python config_setup.py' để cấu hình
echo 🚀 Sử dụng 'run.bat' để khởi chạy ứng dụng

pause
