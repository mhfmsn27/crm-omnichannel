-- Migration 026: Add AI Provider Columns to Organizations table
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS openai_api_key TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS openrouter_api_key TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS ai_provider VARCHAR(50) DEFAULT 'gemini';
