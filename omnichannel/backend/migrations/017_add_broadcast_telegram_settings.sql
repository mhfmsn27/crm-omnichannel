-- Migration 017: Broadcast Telegram Notification Settings
CREATE TABLE IF NOT EXISTS broadcast_settings (
    id SERIAL PRIMARY KEY,
    organization_id BIGINT UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
    telegram_bot_token TEXT,
    telegram_chat_id TEXT,
    telegram_notify_on_complete BOOLEAN DEFAULT TRUE,
    telegram_notify_on_pause BOOLEAN DEFAULT TRUE,
    telegram_notify_on_cancel BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add telegram_settings column to broadcasts if not exists
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS telegram_settings JSONB;
