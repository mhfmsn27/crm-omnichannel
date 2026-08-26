-- Migration: Add multi-provider AI support to organizations table
-- Run this script once against your PostgreSQL database

ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS ai_provider VARCHAR(20) NOT NULL DEFAULT 'gemini',
    ADD COLUMN IF NOT EXISTS openai_api_key TEXT;

-- Add a check constraint to ensure only valid providers are stored
ALTER TABLE organizations
    DROP CONSTRAINT IF EXISTS chk_ai_provider;

ALTER TABLE organizations
    ADD CONSTRAINT chk_ai_provider CHECK (ai_provider IN ('gemini', 'openai'));

-- Confirm
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'organizations'
  AND column_name IN ('ai_provider', 'openai_api_key', 'gemini_api_key');
