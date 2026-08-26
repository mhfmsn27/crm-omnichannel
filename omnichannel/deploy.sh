#!/bin/bash
echo "🚀 Starting Deployment..."

# 1. Pull Code
git pull origin main

# 2. Install Dependencies (Backend & Frontend)
# Note: Using --legacy-peer-deps just in case of conflicts, adjust as needed.
echo "📦 Installing Backend Dependencies..."
cd backend && npm install

echo "📦 Installing Frontend Dependencies & Building..."
cd ../frontend && npm install && npm run build

# 3. Run Database Migrations & Seeds
echo "🗄️ Running Database Migrations & Centralized Seeds..."
cd ../backend
npm run db:setup

# 4. Restart PM2
echo "🔄 Reloading Application..."
pm2 reload cloud-chat

echo "✅ Deployment Success!"
