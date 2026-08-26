#!/bin/bash
# WA GATEWAY - STEP 2.5: FRONTEND SETUP (NEXT.JS)

# Path adjusted to your wa-server folder structure
FRONTEND_PATH="/var/www/wa-server/wa-gateway/wa-admin-frontend"

echo "--------------------------------------------------------"
echo "Setup Frontend Dashboard (Next.js) - Fixed Build"
echo "--------------------------------------------------------"

# 1. Enter the directory
cd $FRONTEND_PATH || { echo "❌ Folder not found at $FRONTEND_PATH!"; exit 1; }

# 2. Cache Cleanup (Prevents URL persistence from old builds)
echo "Cleaning up old build cache..."
rm -rf .next
rm -rf node_modules package-lock.json

# 3. Install Dependencies
echo "Installing frontend dependencies (please wait)..."
npm install

# 4. .env Configuration
echo "--------------------------------------------------------"
read -p "Enter the FULL Backend API URL (ex: https://server.senderchat.com): " API_URL
echo "--------------------------------------------------------"

# Ensure the input is not empty and includes the http:// or https:// protocol
if [[ $API_URL != http* ]]; then
    echo "❌ Error: URL must start with http:// or https://"
    exit 1
fi

# Create a clean new .env file
cat <<EOF > .env
NEXT_PUBLIC_API_URL=${API_URL}/api/v1
NEXT_PUBLIC_PLAYGROUND_API_KEY=
EOF

# 5. Build Application (.env variables will be baked into static files)
echo "Executing Next.js build..."
npm run build

# 6. Run with PM2
echo "Starting service with PM2..."
pm2 delete wa-frontend 2>/dev/null
# Using 'npm start' to run the production build result
pm2 start npm --name "wa-frontend" -- start -- -p 3010
pm2 save

echo "--------------------------------------------------------"
echo "✅ Frontend successfully rebuilt and deployed!"
echo "Current API Endpoint: ${API_URL}/api/v1"
echo "--------------------------------------------------------"
