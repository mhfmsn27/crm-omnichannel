-- Migration 044: Whisper Notes Mentions & Timeline Performance Indexes
-- Adds agent_mentions tracking table and optimizes Customer 360 timeline queries

CREATE TABLE IF NOT EXISTS agent_mentions (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
    mentioned_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mentions lookup indexes
CREATE INDEX IF NOT EXISTS idx_agent_mentions_user 
    ON agent_mentions(organization_id, mentioned_user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_agent_mentions_conv 
    ON agent_mentions(conversation_id);

-- Customer 360 Timeline performance indexes
CREATE INDEX IF NOT EXISTS idx_journey_touchpoints_lookup 
    ON journey_touchpoints(organization_id, journey_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_stage_history_timeline 
    ON pipeline_stage_history(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_contact_timeline 
    ON invoices(organization_id, contact_id, created_at DESC);
