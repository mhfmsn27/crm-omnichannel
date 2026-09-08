-- ============================================================================
-- Migration 041: Add Snooze / Follow-Up Reminder Columns to Conversations
-- Safe & Idempotent (IF NOT EXISTS)
-- ============================================================================

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS snoozed_until TIMESTAMPTZ;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS snooze_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_conversations_snoozed 
    ON conversations(organization_id, snoozed_until)
    WHERE snoozed_until IS NOT NULL;
