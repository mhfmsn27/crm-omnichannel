-- Migration: 032_add_updated_at_to_conversations.sql
-- Description: Add updated_at column to conversations table for live tracking and resolution telemetry

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS agent_status VARCHAR(20) DEFAULT 'available';

-- Backfill updated_at with best known timestamp
UPDATE conversations 
SET updated_at = COALESCE(closed_at, last_message_at, created_at, NOW()) 
WHERE updated_at IS NULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations (organization_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_conversations_closed_at ON conversations (organization_id, closed_at);
