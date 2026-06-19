#!/bin/bash
# Team RISE — Oracle VM one-shot setup
# Run this on a fresh Ubuntu 22.04 Oracle Always Free VM:
#   bash oracle_setup.sh

set -e

echo "=== Team RISE Appointment Worker Setup ==="

# System deps
sudo apt-get update -y
sudo apt-get install -y curl git

# Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
echo "Node $(node -v) installed"

# PM2
sudo npm install -g pm2
echo "PM2 installed"

# Playwright system libraries (Chromium headless deps)
sudo apt-get install -y \
  libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
  libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
  libgbm1 libpango-1.0-0 libcairo2 libasound2 libxshmfence1

# App directory
mkdir -p ~/team-rise/scripts
echo "Created ~/team-rise/"

echo ""
echo "=== Setup complete ==="
echo ""
echo "Next: run the deploy script from your LOCAL machine:"
echo "  bash oracle_deploy.sh YOUR_VM_IP"
