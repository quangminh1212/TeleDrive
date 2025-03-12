@echo off
setlocal enabledelayedexpansion

:: Xử lý tham số
set "mode=run"

if "%1"=="" goto :help
if /i "%1"=="run" set "mode=run" & goto :continue
if /i "%1"=="dev" set "mode=dev" & goto :continue
if /i "%1"=="setup" set "mode=setup" & goto :continue
if /i "%1"=="fixpath" set "mode=fixpath" & goto :fixpath
if /i "%1"=="help" goto :help
if /i "%1"=="-h" goto :help
if /i "%1"=="--help" goto :help

echo [ERROR] Invalid parameter: %1
goto :help

:help
echo ===================================
echo    TELEDRIVE - USAGE GUIDE
echo ===================================
echo.
echo Usage: runapp [command]
echo.
echo Commands:
echo   run           - Run the application (default)
echo   dev           - Run in development mode with nodemon
echo   setup         - Install dependencies
echo   fixpath       - Fix Node.js PATH issues
echo   help          - Show this help
echo.
exit /b 0

:fixpath
echo ===================================
echo    FIXING NODE.JS PATH
echo ===================================
echo.

:: Check if Node.js exists in Program Files
if exist "C:\Program Files\nodejs\node.exe" (
  echo [INFO] Node.js found in C:\Program Files\nodejs
  
  echo [INFO] Adding Node.js to PATH...
  setx PATH "%PATH%;C:\Program Files\nodejs" /M
  
  echo [INFO] Node.js has been added to PATH.
  echo [INFO] Please restart your terminal for changes to take effect.
  echo.
  pause
  exit /b 0
) else (
  echo [ERROR] Node.js not found in C:\Program Files\nodejs
  echo [INFO] Please download and install Node.js from https://nodejs.org/
  echo.
  pause
  exit /b 1
)

:continue
title TeleDrive - %mode% mode

echo ===================================
echo    TELEDRIVE - %mode% MODE
echo ===================================
echo.

:: Set Node.js paths if they exist
set "NODE_PATH="
set "NPM_PATH="

if exist "C:\Program Files\nodejs\node.exe" (
  set "NODE_PATH=C:\Program Files\nodejs\node.exe"
  set "NPM_PATH=C:\Program Files\nodejs\npm.cmd"
  echo [INFO] Using Node.js from C:\Program Files\nodejs
)

:: Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  if defined NODE_PATH (
    echo [INFO] Node.js found at !NODE_PATH! but not in PATH
    echo [INFO] Using explicit path to Node.js
  ) else (
    echo [WARNING] Node.js is not installed.
    echo Please install Node.js from https://nodejs.org/ or run "runapp fixpath" to fix PATH issues
    echo.
    pause
    exit /b 1
  )
)

:: Kiểm tra và tạo file .env nếu chưa có
if not exist .env (
  call :create_env
)

:: Nếu chỉ cài đặt, thực hiện và thoát
if "%mode%"=="setup" (
  goto :setup
)

:: Kiểm tra xem có thư mục node_modules chưa
if not exist node_modules (
  echo [INFO] Dependencies not installed. Running setup...
  call :setup
)

:: Tạo thư mục uploads nếu chưa có
if not exist uploads mkdir uploads

:: Chạy theo mode khác nhau
if "%mode%"=="dev" (
  goto :run_dev
) else (
  goto :run_normal
)

:setup
echo ===================================
echo    INSTALLING DEPENDENCIES
echo ===================================
echo.

:: Hiển thị thông tin Node.js
if defined NODE_PATH (
  echo [INFO] Node.js version:
  "!NODE_PATH!" -v
  
  echo [INFO] npm version:
  "!NPM_PATH!" -v
) else (
  echo [INFO] Node.js version:
  node -v
  
  echo [INFO] npm version:
  npm -v
)

:: Cài đặt dependencies
echo [INFO] Installing dependencies...
if defined NPM_PATH (
  "!NPM_PATH!" install
) else (
  call npm install
)

if %ERRORLEVEL% NEQ 0 (
  echo [WARNING] Failed to install all dependencies. Trying with --no-optional...
  if defined NPM_PATH (
    "!NPM_PATH!" install --no-optional
  ) else (
    call npm install --no-optional
  )
  
  if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Could not install dependencies.
    pause
    exit /b 1
  ) else (
    echo [INFO] Installed core dependencies successfully (without optional packages).
  )
) else (
  echo [INFO] Installed all dependencies successfully.
)

echo.
if "%mode%"=="setup" (
  pause
  exit /b 0
)
exit /b 0

:run_dev
echo ===================================
echo    STARTING DEVELOPMENT MODE
echo ===================================
echo.

:: Tìm và dừng tất cả các tiến trình đang sử dụng cổng 3000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    echo Stopping process with PID: %%a
    taskkill /F /PID %%a >nul 2>&1
)

:: Kiểm tra xem nodemon có được cài đặt hay không
if defined NPM_PATH (
  "!NPM_PATH!" list -g nodemon >nul 2>&1
) else (
  call npx nodemon -v >nul 2>&1
)

if %ERRORLEVEL% NEQ 0 (
  echo [INFO] Nodemon not installed. Installing...
  if defined NPM_PATH (
    "!NPM_PATH!" install nodemon --save-dev
  ) else (
    call npm install nodemon --save-dev
  )
  
  if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Could not install nodemon. Using normal mode instead.
    goto :run_normal
  )
)

:: Khởi động server với nodemon
echo [INFO] Starting server with nodemon...
if defined NODE_PATH (
  start /B cmd /c "npx nodemon server.js"
) else (
  start /B cmd /c "npx nodemon server.js"
)

:: Đợi server khởi động
echo [INFO] Waiting for server to start...
timeout /t 3 /nobreak > nul

:: Mở URL trong trình duyệt mặc định
echo [INFO] Opening browser...
start "" http://localhost:3000

echo.
echo [INFO] Server is running in development mode at http://localhost:3000
echo To stop the server, close this cmd window or press Ctrl+C.
echo.
pause
exit /b 0

:run_normal
echo ===================================
echo    STARTING APPLICATION
echo ===================================
echo.

:: Tìm và dừng tất cả các tiến trình đang sử dụng cổng 3000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    echo Stopping process with PID: %%a
    taskkill /F /PID %%a >nul 2>&1
)

:: Khởi động server Node.js
echo [INFO] Starting server...
if defined NODE_PATH (
  start /B cmd /c ""!NODE_PATH!" server.js"
) else (
  start /B cmd /c "node server.js"
)

:: Đợi server khởi động
echo [INFO] Waiting for server to start...
timeout /t 3 /nobreak > nul

:: Mở URL trong trình duyệt mặc định
echo [INFO] Opening browser...
start "" http://localhost:3000

echo.
echo [INFO] Server is running at http://localhost:3000
echo To stop the server, close this cmd window or press Ctrl+C.
echo.
pause
exit /b 0

:create_env
echo ===================================
echo    CREATING CONFIG FILE
echo ===================================
echo.

:: Kiểm tra file .env.example tồn tại
if not exist .env.example (
  echo [ERROR] File .env.example not found
  pause
  exit /b 1
)

:: Tạo file .env từ .env.example
echo [INFO] Creating .env file from template...
copy .env.example .env >nul
if %ERRORLEVEL% NEQ 0 (
  echo [ERROR] Could not create .env file
  pause
  exit /b 1
)

echo [INFO] Created .env file successfully.
echo.
echo [INFO] Please edit the .env file to configure the application.
echo.
exit /b 0 