-- Migration: Urgency Flagging
-- Run: sudo -u postgres psql -d omni_db -f migration_urgency.sql

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN DEFAULT FALSE;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS urgency_score INTEGER DEFAULT 0;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS urgency_reason TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS urgency_flagged_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_conversations_urgent
    ON conversations(organization_id, is_urgent)
    WHERE is_urgent = TRUE;
