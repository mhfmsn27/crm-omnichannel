
-- 1. Add role_level
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_level INTEGER DEFAULT 10;

-- 2. Add permissions
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;

-- 3. Add closing_message
ALTER TABLE users ADD COLUMN IF NOT EXISTS closing_message TEXT;

-- 4. Add assigned_devices
ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_devices JSONB DEFAULT '[]'::jsonb;

-- 5. Add is_online
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;

-- 6. Add Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_org_online ON users(organization_id, is_online);

ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_pic_url TEXT;
