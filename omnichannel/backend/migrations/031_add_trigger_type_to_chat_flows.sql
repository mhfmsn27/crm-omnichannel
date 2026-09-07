-- Migration: 031_add_trigger_type_to_chat_flows.sql
-- Description: Add missing trigger_type column and make trigger_keyword optional for chat_flows

ALTER TABLE chat_flows ADD COLUMN IF NOT EXISTS trigger_type VARCHAR(50) DEFAULT 'exact';
ALTER TABLE chat_flows ALTER COLUMN trigger_keyword DROP NOT NULL;

-- Create index for trigger matching performance
CREATE INDEX IF NOT EXISTS idx_chat_flows_trigger ON chat_flows (organization_id, is_active, trigger_type);
