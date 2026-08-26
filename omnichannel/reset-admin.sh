#!/bin/bash
# OMNICHANNEL ADMIN PASSWORD RESET SCRIPT

DB_NAME="omni_db"
DB_USER="omni_user"
BACKEND_PATH="/var/www/omnichannel/backend"

echo "--------------------------------------------------------"
echo "Super Admin Password Reset"
echo "--------------------------------------------------------"

# 1. Request New Password Input
read -s -p "Enter New Password: " NEW_PASS
echo ""
read -s -p "Confirm New Password: " CONFIRM_PASS
echo ""

if [ "$NEW_PASS" != "$CONFIRM_PASS" ]; then
    echo "❌ Passwords do not match! Please try again."
    exit 1
fi

# 2. Generate Bcrypt Hash via Node.js
# Uses the bcrypt module existing in the backend directory
echo "Generating security hash..."
HASH=$(node -e "const bcrypt = require('$BACKEND_PATH/node_modules/bcrypt'); console.log(bcrypt.hashSync('$NEW_PASS', 10))")

if [ -z "$HASH" ]; then
    echo "❌ Failed to generate hash. Ensure the bcrypt module is installed in $BACKEND_PATH."
    exit 1
fi

# 3. Update Database
echo "Updating database..."
sudo -u postgres psql -d $DB_NAME -c "UPDATE public.users SET password_hash = '$HASH' WHERE email = 'superadmin@example.com';"

echo "--------------------------------------------------------"
echo "✅ SUCCESS: Password for superadmin@example.com has been updated."
echo "Please try logging in again via the dashboard."
echo "--------------------------------------------------------"
