#!/bin/bash
# 🚀 Creator Hub - Ubuntu VPS Deployment & Setup Script 🚀

set -e

echo "=============================================="
echo "Initializing Production Environment Setup..."
echo "=============================================="

# 1. Update OS package indexes
sudo apt-get update && sudo apt-get upgrade -y

# 2. Install essential system binaries
sudo apt-get install -y \
    curl \
    git \
    ffmpeg \
    python3 \
    python3-pip \
    python3-venv \
    build-essential \
    libjpeg-dev \
    zlib1g-dev

# 3. Install Docker & Docker Compose
if ! command -v docker &> /dev/null; then
    echo "Installing Docker Daemon..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
fi

# 4. Install Node.js v20 LTS
if ! command -v node &> /dev/null; then
    echo "Installing Node.js Runtime..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# 5. Install PM2 global utility
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2 Process Manager..."
    sudo npm install -p -g pm2
fi

# 6. Setup root virtual environment & packages
echo "Configuring Python virtual environment..."
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate

# 7. Setup Production environment file if not exists
if [ ! -f .env ]; then
    echo "Creating environment config file template .env..."
    cp .env.example .env
    echo "⚠️  Please open .env and configure real credentials (API keys, handles, db passwords)."
fi

# 8. Run prisma migrations and backend build
echo "Installing Node packages and compiling backend..."
npm install
npm run prisma:generate
npm run prisma:migrate
npm run build

echo "=============================================="
echo "✅ DEPLOYMENT SETUP COMPLETED SUCCESSFULLY! ✅"
echo "=============================================="
echo "To run with Docker:   docker-compose up -d"
echo "To run with PM2:      pm2 start backend/ecosystem.config.js --env production"
echo "=============================================="
