#!/bin/bash
# MAIN APP - DEPLOYMENT SCRIPT (BACKEND & FRONTEND)

echo "--------------------------------------------------------"
echo "Starting Omnichannel SenderChat Application Deployment..."
echo "--------------------------------------------------------"

# 1. Setup Folders & Permissions
# Preparing directories for file/image storage
echo "Preparing storage directories..."
sudo mkdir -p /var/www/omnichannel/backend/uploads/{system,cms,chat,temp,webchat,products,qris}
sudo mkdir -p /var/www/omnichannel/backend/public/sounds
sudo chown -R $USER:$USER /var/www/omnichannel
sudo chmod -R 755 /var/www/omnichannel/backend/uploads

# 2. Backend Setup
echo "Configuring Backend (Node.js)..."
cd /var/www/omnichannel/backend || exit

# Cleaning old node_modules to prevent conflicts
rm -rf node_modules package-lock.json
echo "Installing backend dependencies (please wait)..."
npm install

# REBUILD BCRYPT: Mandatory to prevent 'Invalid Password' errors due to architecture mismatch
echo "Rebuilding bcrypt for server architecture..."
npm rebuild bcrypt --build-from-source

# AUTOMATED DATABASE MIGRATION & SEED CHECK
echo "Running automated database migrations..."
npm run db:setup

# Run/Restart with PM2
pm2 delete omni-backend 2>/dev/null
pm2 start server.js --name "omni-backend" --update-env

# 3. Frontend Setup
echo "--------------------------------------------------------"
echo "Configuring Frontend (Vite/React)..."
cd /var/www/omnichannel/frontend || exit

# Cleaning old build and dependencies
rm -rf node_modules dist package-lock.json
echo "Installing frontend dependencies..."
npm install

# Build Frontend (Variables from .env will be injected here)
echo "Executing production build (npm run build)..."
npm run build

# 4. Finalization
pm2 save
# Automation for PM2 startup script if available
pm2 startup | grep "sudo" | bash

echo "--------------------------------------------------------"
echo "✅ Backend & Frontend successfully deployed!"
echo "Backend: Running via PM2 (omni-backend)"
echo "Frontend: 'dist' folder ready to be served via Nginx"
echo "--------------------------------------------------------"
