-- Migration: Sentiment Analysis
-- Run: sudo -u postgres psql -d omni_db -f migration_sentiment.sql

ALTER TABLE messages ADD COLUMN IF NOT EXISTS sentiment VARCHAR(20);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sentiment_score FLOAT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_sentiment VARCHAR(20);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS sentiment_updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_messages_sentiment ON messages(conversation_id, sentiment);
