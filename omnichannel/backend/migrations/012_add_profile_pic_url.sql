-- Migration: Add profile_pic_url column to whatsapp_sessions
-- Description: Stores WhatsApp profile picture URL for devices

ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS profile_pic_url TEXT;

-- Add index for faster lookups if needed
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_profile_pic ON whatsapp_sessions(profile_pic_url);
