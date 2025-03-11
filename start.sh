#!/bin/bash

# Build Docker image
docker build -t teledrive .

# Run Docker container
docker run -d -p 3000:3000 --name teledrive-app \
  -v "$(pwd):/app" \
  -v /app/node_modules \
  --restart unless-stopped \
  teledrive

echo "TeleDrive started on http://localhost:3000" 