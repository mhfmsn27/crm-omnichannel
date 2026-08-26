#!/bin/bash
# WA GATEWAY - STEP 2: BACKEND DEPLOYMENT

BACKEND_PATH="/var/www/wa-server/wa-gateway/wa-gateway-backend"
DB_PASS="password_rahasia"
# Generate a random 32-character string for the JWT Secret
JWT_SECRET=$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 32)

echo "--- Setting Up Backend API ---"

# Navigate to the project directory
cd $BACKEND_PATH || { echo "❌ Error: Backend path not found"; exit 1; }

# Install production dependencies
echo "Installing dependencies..."
npm install

# Create environment configuration file
echo "Generating .env file..."
cat <<EOF > .env
NODE_ENV=production
SERVER_PORT=8080
DATABASE_URL=postgres://wa_user:$DB_PASS@localhost:5432/wa_gateway_db
JWT_SECRET=$JWT_SECRET

# CRMHUB integration — webhook is delivered directly to this URL
# Must match: https://<your-crmhub-domain>/webhook/wa-gateway
CRMHUB_WEBHOOK_URL=${CRMHUB_WEBHOOK_URL:-}
EOF

# Build the TypeScript/JavaScript project
echo "Building the project..."
npm run build

# Start the application using PM2 Process Manager
echo "Starting application with PM2..."
pm2 start dist/server.js --name "wa-backend"
pm2 save

echo "--------------------------------------------------------"
echo "✅ SUCCESS: Backend is running on port 8080!"
echo "--------------------------------------------------------"
