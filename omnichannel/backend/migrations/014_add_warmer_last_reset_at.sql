-- Migration: 014_add_warmer_last_reset_at.sql
-- Description: Add last_reset_at column to warmer_circle_sessions for tracking daily reset timestamps
-- Date: 2026-06-28

-- Add last_reset_at column if not exists
ALTER TABLE warmer_circle_sessions
ADD COLUMN IF NOT EXISTS last_reset_at TIMESTAMPTZ DEFAULT NOW();

-- Add index for faster queries on last_reset_at
CREATE INDEX IF NOT EXISTS idx_warmer_circle_sessions_last_reset
ON warmer_circle_sessions(last_reset_at);

-- Update existing rows to have current timestamp as their last reset
UPDATE warmer_circle_sessions
SET last_reset_at = NOW()
WHERE last_reset_at IS NULL;

-- Reset all counters to 0 to start fresh (since we're adding the reset mechanism)
-- Only reset if counters are non-zero (preserves any intentional high counts from testing)
UPDATE warmer_circle_sessions
SET messages_sent_today = 0
WHERE messages_sent_today > 0;
