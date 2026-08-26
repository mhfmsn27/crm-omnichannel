#!/bin/bash
# WA GATEWAY - STEP 4: CREATE ADMIN

BACKEND_PATH="/var/www/wa-server/wa-gateway/wa-gateway-backend"

echo "--------------------------------------------------------"
echo "WhatsApp Gateway: Administrative User Creation"
echo "--------------------------------------------------------"

# 1. Request Credentials
read -p "Enter Admin Username: " ADMIN_USER
read -s -p "Enter Admin Password: " ADMIN_PASS
echo ""

cd $BACKEND_PATH || { echo "❌ Error: Backend path not found"; exit 1; }

# 2. Generate Temporary Node.js Script
# This script handles password hashing and database insertion
cat <<EOF > create-admin-temp.js
const bcrypt = require('bcrypt');
const { Client } = require('pg');

// Database connection configuration
const client = new Client({
    connectionString: 'postgres://wa_user:password_rahasia@localhost:5432/wa_gateway_db'
});

async function create() {
    try {
        await client.connect();

        // Generate secure bcrypt hash
        const hash = await bcrypt.hash('$ADMIN_PASS', 10);

        // Insert administrative user into database
        await client.query('INSERT INTO admins (username, password_hash) VALUES (\$1, \$2)', ['$ADMIN_USER', hash]);

        console.log('✅ Admin user "$ADMIN_USER" created successfully');
    } catch (e) {
        console.error('❌ Error:', e.message);
    } finally {
        await client.end();
    }
}

create();
EOF

# 3. Execute and Cleanup
node create-admin-temp.js
rm create-admin-temp.js

echo "--------------------------------------------------------"
echo "Process Complete."
echo "--------------------------------------------------------"
