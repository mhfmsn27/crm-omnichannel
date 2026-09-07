-- Migration: 033_add_deal_pipeline_columns_to_conversations.sql
-- Description: Add deal_probability, deal_close_date, and deal_note to conversations table for Sales Pipeline

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS pipeline_id INTEGER REFERENCES pipelines(id) ON DELETE SET NULL;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS pipeline_stage_id INTEGER REFERENCES pipeline_stages(id) ON DELETE SET NULL;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS stage_changed_at TIMESTAMPTZ;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS value DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS deal_probability INTEGER DEFAULT 100;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS deal_close_date DATE;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS deal_note TEXT;

CREATE INDEX IF NOT EXISTS idx_conversations_pipeline ON conversations(pipeline_id, pipeline_stage_id);
CREATE INDEX IF NOT EXISTS idx_conversations_deal_prob ON conversations(organization_id, deal_probability);
