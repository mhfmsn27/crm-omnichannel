-- Migration 016: Add Broadcast Settings & Campaign Notification Settings
CREATE TABLE IF NOT EXISTS broadcast_settings (
    id SERIAL PRIMARY KEY,
    organization_id BIGINT UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
    telegram_bot_token VARCHAR(255),
    telegram_chat_id VARCHAR(100),
    telegram_notify_on_complete BOOLEAN DEFAULT true,
    telegram_notify_on_pause BOOLEAN DEFAULT true,
    telegram_notify_on_cancel BOOLEAN DEFAULT true,
    email_recipient VARCHAR(255),
    email_notify_on_complete BOOLEAN DEFAULT true,
    email_notify_on_pause BOOLEAN DEFAULT true,
    email_notify_on_cancel BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_broadcast_settings_org_id ON broadcast_settings(organization_id);

-- Add notification columns to broadcasts table for per-campaign overrides
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS telegram_settings JSONB;
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS email_settings JSONB;
