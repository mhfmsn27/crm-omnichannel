#!/bin/bash
# Deploy script for Omnichannel Backend
# Run this on your VPS

echo "=== Deploying Omnichannel Backend ==="

# Navigate to backend directory
cd /var/www/omnichannel/backend

# 1. Pull latest changes (if using git)
# Uncomment if you use git:
# git pull origin main

# 2. Install/Update dependencies
echo "Installing dependencies..."
npm install

# 3. Restart PM2
echo "Restarting PM2..."
pm2 restart omni-backend

# 4. Check logs
echo "Checking logs..."
pm2 logs omni-backend --lines 20 --nostream

echo "=== Deploy Complete ==="
