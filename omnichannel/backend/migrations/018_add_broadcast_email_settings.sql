-- Migration 018: Broadcast Email Notification Settings
ALTER TABLE broadcast_settings 
ADD COLUMN IF NOT EXISTS email_recipient TEXT,
ADD COLUMN IF NOT EXISTS email_notify_on_complete BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS email_notify_on_pause BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS email_notify_on_cancel BOOLEAN DEFAULT TRUE;

-- Add email_settings column to broadcasts if not exists
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS email_settings JSONB;
