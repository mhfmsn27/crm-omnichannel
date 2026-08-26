#!/bin/bash
# WA GATEWAY - STEP 1: DEPENDENCIES & DATABASE
#
# For CRMHUB integration, set these env vars before running:
#   WA_GATEWAY_API_KEY   - must match WA_GATEWAY_API_KEY in CRMHUB's backend .env
#   CRMHUB_WEBHOOK_URL   - e.g. https://yourdomain.com/webhook/wa-gateway

DB_NAME="wa_gateway_db"
DB_USER="wa_user"
DB_PASS="password_rahasia" # Recommendation: Change this password immediately

echo "--- Starting Server & Database Preparation ---"

# Install Node.js, PostgreSQL, and Essential Build Tools
apt update && apt upgrade -y
apt install curl git unzip build-essential postgresql postgresql-contrib -y

# Configure NodeSource for Node.js 20.x LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PM2 Process Manager globally
npm install -g pm2

# Setup Database & Schema
echo "Structuring database and tables..."
sudo -u postgres psql <<EOF
-- Terminate existing connections to avoid locking issues
SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS $DB_NAME;
DROP USER IF EXISTS $DB_USER;

-- Create User & Database
CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASS';
CREATE DATABASE $DB_NAME;
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER USER $DB_USER WITH SUPERUSER;

-- Connect to the newly created database to build the schema
\c $DB_NAME
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table for system administrators
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table for API clients/users
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    webhook_url TEXT,
    api_key VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table for managing multiple WhatsApp sessions
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing Baileys authentication data (Session persistence)
CREATE TABLE baileys_sessions (
    client_id VARCHAR(255) NOT NULL,
    session_key VARCHAR(255) NOT NULL,
    session_data JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (client_id, session_key)
);
EOF

echo "✅ Database $DB_NAME and all tables have been successfully created!"

# Auto-create the CRMHUB API client if credentials are supplied
if [ -n "$WA_GATEWAY_API_KEY" ] && [ -n "$CRMHUB_WEBHOOK_URL" ]; then
    echo "Creating CRMHUB client record..."
    sudo -u postgres psql -d $DB_NAME <<CLIENTSQL
INSERT INTO clients (name, webhook_url, api_key)
VALUES ('CRMHUB', '$CRMHUB_WEBHOOK_URL', '$WA_GATEWAY_API_KEY')
ON CONFLICT (api_key) DO UPDATE SET webhook_url = EXCLUDED.webhook_url;
CLIENTSQL
    echo "✅ CRMHUB client created (api_key configured)."
else
    echo "⚠️  WA_GATEWAY_API_KEY or CRMHUB_WEBHOOK_URL not set."
    echo "   Run manually after setup:"
    echo "   sudo -u postgres psql -d $DB_NAME -c \"INSERT INTO clients (name, webhook_url, api_key) VALUES ('CRMHUB', 'https://yourdomain.com/webhook/wa-gateway', 'your_api_key');\""
fi
