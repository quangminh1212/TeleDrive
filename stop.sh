#!/bin/bash

# Stop the container
docker stop teledrive-app

# Remove the container
docker rm teledrive-app

echo "TeleDrive stopped and container removed" 