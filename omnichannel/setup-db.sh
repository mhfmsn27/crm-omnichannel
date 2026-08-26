#!/bin/bash
# MAIN APP - DATABASE SETUP & IMPORT

DB_NAME="omni_db"
DB_USER="omni_user"
DB_PASS="DefaultPassword123!"
SQL_FILE="/var/www/omnichannel/init_db_v2.sql"

echo "--------------------------------------------------------"
echo "Starting Main App Database Configuration..."
echo "--------------------------------------------------------"

# 1. Clean Drop & Create Database/User
sudo -u postgres psql <<EOF
-- Terminate active connections to allow database deletion
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();

DROP DATABASE IF EXISTS $DB_NAME;
DROP USER IF EXISTS $DB_USER;

-- Create New User & Database
CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';
CREATE DATABASE $DB_NAME;
ALTER USER $DB_USER WITH SUPERUSER;
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;

-- Connect to DB to install mandatory extensions
\c $DB_NAME
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EOF

# 2. Import SQL File (Using PGPASSWORD to automate authentication)
echo "Importing database schema from $SQL_FILE..."
if [ -f "$SQL_FILE" ]; then
    PGPASSWORD=$DB_PASS psql -h localhost -U $DB_USER -d $DB_NAME -f $SQL_FILE
else
    echo "❌ Error: File $SQL_FILE not found!"
    exit 1
fi

# 3. Owner & Permission Fix (MANDATORY: Compatible with PostgreSQL 16 columns)
echo "Adjusting table and sequence ownership to $DB_USER..."
sudo -u postgres psql -d $DB_NAME -t -c "
DO \$$
DECLARE
    r RECORD;
BEGIN
    -- Loop through all tables in the public schema
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' OWNER TO $DB_USER;';
    END LOOP;

    -- FIX: Using 'sequencename' per PostgreSQL 16 standards
    FOR r IN (SELECT sequencename FROM pg_sequences WHERE schemaname = 'public') LOOP
        EXECUTE 'ALTER SEQUENCE public.' || quote_ident(r.sequencename) || ' OWNER TO $DB_USER;';
    END LOOP;
END \$$;"

# 4. Finalize Permissions
sudo -u postgres psql -d $DB_NAME <<EOF
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;
EOF

echo "--------------------------------------------------------"
echo "✅ Database $DB_NAME successfully prepared!"
echo "All tables and sequences are now owned by $DB_USER."
echo "--------------------------------------------------------"
