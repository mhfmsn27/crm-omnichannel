-- ============================================================================
-- Migration 020: Add Natural Human Active Hours to Warmer Circles
-- Prevents unnatural late-night / early-morning (00:00 - 07:59) spamming
-- Safe & Idempotent (Zero Breaking Change)
-- ============================================================================

ALTER TABLE warmer_circles 
ADD COLUMN IF NOT EXISTS active_hours_start INTEGER DEFAULT 8,
ADD COLUMN IF NOT EXISTS active_hours_end INTEGER DEFAULT 21,
ADD COLUMN IF NOT EXISTS enable_active_hours BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN warmer_circles.active_hours_start IS 'Start hour (0-23 in WIB) when warmer begins daily chat interactions. Default 8 = 08:00 WIB';
COMMENT ON COLUMN warmer_circles.active_hours_end IS 'End hour (0-23 in WIB) when warmer stops daily chat interactions. Default 21 = 21:00 WIB';
COMMENT ON COLUMN warmer_circles.enable_active_hours IS 'If true, enforces natural human waking hours. Default TRUE';

-- Set defaults for any existing records
UPDATE warmer_circles
SET active_hours_start = 8
WHERE active_hours_start IS NULL;

UPDATE warmer_circles
SET active_hours_end = 21
WHERE active_hours_end IS NULL;

UPDATE warmer_circles
SET enable_active_hours = TRUE
WHERE enable_active_hours IS NULL;
