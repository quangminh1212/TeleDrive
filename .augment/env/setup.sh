#!/bin/bash

# TeleDrive Setup Script for Linux
echo "🚀 Setting up TeleDrive environment..."

# Update system packages
sudo apt-get update -qq

# Install Python 3 and pip if not available
if ! command -v python3 &> /dev/null; then
    echo "📦 Installing Python 3..."
    sudo apt-get install -y python3 python3-pip python3-venv
else
    echo "📦 Installing python3-venv..."
    sudo apt-get install -y python3-venv
fi

# Install system dependencies for Python packages
echo "📦 Installing system dependencies..."
sudo apt-get install -y \
    build-essential \
    python3-dev \
    libffi-dev \
    libssl-dev \
    pkg-config \
    libcairo2-dev \
    libjpeg-dev \
    libgif-dev \
    sqlite3

# Add local bin to PATH for current session
export PATH="$HOME/.local/bin:$PATH"

# Create virtual environment
echo "🔧 Creating Python virtual environment..."
python3 -m venv .venv

# Activate virtual environment and add to profile
echo "🔧 Configuring virtual environment..."
echo 'export PATH="$HOME/.local/bin:$PATH"' >> $HOME/.profile
echo 'source /mnt/persist/workspace/.venv/bin/activate' >> $HOME/.profile

# Activate virtual environment for current session
source .venv/bin/activate

# Upgrade pip within virtual environment
echo "📦 Upgrading pip in virtual environment..."
pip install --upgrade pip setuptools wheel

# Install Python dependencies in virtual environment
echo "📦 Installing Python dependencies..."
pip install -r requirements.txt

# Create necessary directories
echo "📁 Creating application directories..."
mkdir -p data/uploads data/backups data/temp output logs static templates

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << 'EOF'
# Telegram API Configuration
API_ID=
API_HASH=
PHONE_NUMBER=

# Flask Configuration
FLASK_SECRET_KEY=your-secret-key-here
FLASK_ENV=development

# Database Configuration
DATABASE_URL=sqlite:///data/teledrive.db
EOF
fi

# Initialize database
echo "🗄️ Initializing database..."
python database.py

# Set permissions
chmod +x main.py app.py test_login.py

echo "✅ Setup completed successfully!"
echo "📋 Next steps:"
echo "   1. Edit .env file with your Telegram API credentials"
echo "   2. Run 'python app.py' to start web interface"
echo "   3. Run 'python main.py' to start CLI scanner"