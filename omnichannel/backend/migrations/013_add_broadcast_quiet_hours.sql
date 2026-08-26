-- Migration: Add broadcast quiet hours settings to organizations table
-- Allows each organization to configure when broadcast messages can be sent

-- Add columns for broadcast quiet hours (default: enabled, 04:00-23:00 WIB)
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS broadcast_quiet_hours_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS quiet_hours_start INTEGER DEFAULT 4,  -- Default 04:00 (stored as hour 0-23)
ADD COLUMN IF NOT EXISTS quiet_hours_end INTEGER DEFAULT 23;   -- Default 23:00 (stored as hour 0-23)

-- Add comments for documentation
COMMENT ON COLUMN organizations.broadcast_quiet_hours_enabled IS 'Enable/disable quiet hours for broadcasts. TRUE = quiet hours active (messages queued outside hours)';
COMMENT ON COLUMN organizations.quiet_hours_start IS 'Start of quiet hours in 24-hour format (WIB timezone). Default 4 = 04:00 WIB';
COMMENT ON COLUMN organizations.quiet_hours_end IS 'End of quiet hours in 24-hour format (WIB timezone). Default 23 = 23:00 WIB';
