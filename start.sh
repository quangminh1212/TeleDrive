#!/bin/bash

echo "==================================="
echo "Launching TeleDrive - Server & Client"
echo "==================================="
echo

echo "Creating data directories if they don't exist..."
mkdir -p server/data/sessions
mkdir -p server/data/users
mkdir -p server/data/files
mkdir -p server/data/folders

echo
echo "Starting Server..."
gnome-terminal -- bash -c "cd server && npm run dev" 2>/dev/null || 
    xterm -e "cd server && npm run dev" 2>/dev/null || 
    osascript -e 'tell app "Terminal" to do script "cd '$(pwd)'/server && npm run dev"' 2>/dev/null || 
    (cd server && npm run dev &)

echo
echo "Waiting for server to initialize (5 seconds)..."
sleep 5

echo
echo "Starting Client..."
gnome-terminal -- bash -c "cd client && npm run dev" 2>/dev/null || 
    xterm -e "cd client && npm run dev" 2>/dev/null || 
    osascript -e 'tell app "Terminal" to do script "cd '$(pwd)'/client && npm run dev"' 2>/dev/null || 
    (cd client && npm run dev &)

echo
echo "==================================="
echo "TeleDrive is now running!"
echo
echo "Server: http://localhost:5000"
echo "Client: http://localhost:3000"
echo "API Health Check: http://localhost:5000/api/health"
echo "==================================="
echo
echo "Press Enter to close this window. The server and client will continue running."
echo
read 