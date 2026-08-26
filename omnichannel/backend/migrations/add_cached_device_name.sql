-- Migration: Add cached_device_name to chatbot_settings
-- This stores the last known device name so deleted devices still show friendly name

-- Add column
ALTER TABLE chatbot_settings 
ADD COLUMN IF NOT EXISTS cached_device_name VARCHAR(255);

-- Backfill existing bots from WhatsApp
UPDATE chatbot_settings cs
SET cached_device_name = COALESCE(ws.name, ws.whatsapp_number)
FROM whatsapp_sessions ws
WHERE cs.session_id = ws.session_id AND cs.cached_device_name IS NULL;

-- Backfill from Messenger
UPDATE chatbot_settings cs
SET cached_device_name = mp.page_name
FROM messenger_pages mp
WHERE cs.session_id = mp.page_id AND cs.cached_device_name IS NULL;

-- Backfill from Instagram
UPDATE chatbot_settings cs
SET cached_device_name = '@' || ia.username
FROM instagram_accounts ia
WHERE cs.session_id = ia.ig_id AND cs.cached_device_name IS NULL;

-- Backfill from Telegram
UPDATE chatbot_settings cs
SET cached_device_name = '@' || tb.username
FROM telegram_bots tb
WHERE cs.session_id = tb.bot_token AND cs.cached_device_name IS NULL;

-- Backfill from Webchat (FIX: Only cast valid UUIDs)
UPDATE chatbot_settings cs
SET cached_device_name = wc.name
FROM webchat_configs wc
WHERE cs.session_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND cs.session_id::uuid = wc.widget_uid 
  AND cs.cached_device_name IS NULL;
