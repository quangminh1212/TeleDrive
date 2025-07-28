#!/bin/bash

# TeleDrive Setup Script - Final Version
echo "🚀 Setting up TeleDrive environment..."

# Update system packages
sudo apt-get update -qq

# Install Python 3 and required packages
echo "📦 Installing Python 3 and venv..."
sudo apt-get install -y python3 python3-pip python3-venv python3-dev

# Install system dependencies for Python packages
echo "📦 Installing system dependencies..."
sudo apt-get install -y \
    build-essential \
    libffi-dev \
    libssl-dev \
    pkg-config \
    libcairo2-dev \
    libjpeg-dev \
    libgif-dev \
    sqlite3 \
    git

# Create virtual environment
echo "🔧 Creating Python virtual environment..."
python3 -m venv .venv

# Activate virtual environment and add to profile
echo "🔧 Configuring virtual environment..."
echo 'source /mnt/persist/workspace/.venv/bin/activate' >> $HOME/.profile

# Activate virtual environment for current session
source .venv/bin/activate

# Upgrade pip and setuptools to latest versions
echo "📦 Upgrading pip and setuptools..."
pip install --upgrade pip setuptools wheel

# Install dependencies one by one to handle conflicts
echo "📦 Installing core dependencies..."
pip install flask>=2.3.0
pip install flask-socketio>=5.3.0
pip install eventlet>=0.33.0
pip install sqlalchemy>=1.4.0
pip install flask-sqlalchemy>=3.0.0
pip install alembic>=1.8.0
pip install flask-migrate>=3.1.0

echo "📦 Installing authentication dependencies..."
pip install flask-login>=0.6.0
pip install bcrypt>=4.0.0
pip install flask-wtf>=1.1.0
pip install wtforms>=3.0.0
pip install email-validator>=2.0.0

echo "📦 Installing data processing dependencies..."
pip install pandas>=2.0.0
pip install tqdm>=4.65.0
pip install python-dotenv>=1.0.0
pip install aiofiles>=23.0.0
pip install openpyxl>=3.1.0

echo "📦 Installing testing dependencies..."
pip install pytest>=7.0.0

echo "📦 Installing Telegram dependencies..."
# Install telethon with specific version to avoid pyaes conflicts
pip install telethon==1.34.0

# Create necessary directories with proper permissions
echo "📁 Creating application directories..."
mkdir -p data/uploads data/backups data/temp output logs static templates
chmod 755 data data/uploads data/backups data/temp output logs static templates

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

# Create a simple database initialization script to avoid path issues
echo "🗄️ Creating database initialization script..."
cat > init_db_simple.py << 'EOF'
#!/usr/bin/env python3
import os
import sqlite3
from pathlib import Path

# Ensure data directory exists
data_dir = Path('data')
data_dir.mkdir(exist_ok=True)

# Create database file
db_path = data_dir / 'teledrive.db'
print(f"Creating database at: {db_path.absolute()}")

try:
    # Create database connection
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    # Create basic tables
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username VARCHAR(80) UNIQUE NOT NULL,
            email VARCHAR(120) UNIQUE NOT NULL,
            password_hash VARCHAR(128),
            role VARCHAR(20) DEFAULT 'user',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_active BOOLEAN DEFAULT 1
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename VARCHAR(255) NOT NULL,
            file_size INTEGER,
            file_type VARCHAR(50),
            telegram_message_id INTEGER,
            telegram_channel VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            user_id INTEGER,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    # Insert default admin user
    cursor.execute('''
        INSERT OR IGNORE INTO users (username, email, password_hash, role)
        VALUES ('admin', 'admin@teledrive.local', 'pbkdf2:sha256:600000$dummy$hash', 'admin')
    ''')
    
    conn.commit()
    conn.close()
    
    print("✅ Database created successfully!")
    print(f"📍 Database location: {db_path.absolute()}")
    
except Exception as e:
    print(f"❌ Database creation failed: {e}")
    
EOF

# Run simple database initialization
echo "🗄️ Initializing database..."
python init_db_simple.py

# Set permissions
chmod +x main.py app.py test_login.py init_db_simple.py

echo "✅ Setup completed successfully!"
echo "📋 Next steps:"
echo "   1. Edit .env file with your Telegram API credentials"
echo "   2. Run 'source .venv/bin/activate' to activate virtual environment"
echo "   3. Run 'python app.py' to start web interface"
echo "   4. Run 'python main.py' to start CLI scanner"