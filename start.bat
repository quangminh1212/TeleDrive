@echo off
echo ===================================
echo Launching TeleDrive - Server & Client
echo ===================================
echo.

echo Creating data directories if they don't exist...
mkdir server\data\sessions 2>nul
mkdir server\data\users 2>nul
mkdir server\data\files 2>nul
mkdir server\data\folders 2>nul

echo.
echo Starting Server...
start cmd /k "cd server && npm run dev"

echo.
echo Waiting for server to initialize (5 seconds)...
timeout /t 5 /nobreak > nul

echo.
echo Starting Client...
start cmd /k "cd client && npm run dev"

echo.
echo ===================================
echo TeleDrive is now running!
echo.
echo Server: http://localhost:5000
echo Client: http://localhost:3000
echo API Health Check: http://localhost:5000/api/health
echo ===================================
echo.
echo Press any key to exit this window. The server and client will continue running.
echo.
pause > nul 