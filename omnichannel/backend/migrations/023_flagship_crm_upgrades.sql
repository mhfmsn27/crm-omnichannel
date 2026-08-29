-- ============================================================================
-- Migration 023: Flagship CRM Upgrades (AI Lead Scoring, Call Logs, Wallboard)
-- Description: Adds Predictive AI Lead Scoring fields and Call Logs table
-- ============================================================================

-- 1. ENHANCE CONVERSATIONS TABLE (AI Lead Scoring & Win-Probability)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS lead_grade VARCHAR(20) DEFAULT 'cold'; -- hot, warm, cold
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS lead_score_reasons JSONB DEFAULT '[]'::jsonb;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_scored_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_conversations_lead_grade ON conversations(organization_id, lead_grade);
CREATE INDEX IF NOT EXISTS idx_conversations_lead_score ON conversations(organization_id, lead_score DESC);

-- 2. CALL LOGS TABLE (Click-to-Call & Telephony Logs)
CREATE TABLE IF NOT EXISTS call_logs (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    conversation_id BIGINT REFERENCES conversations(id) ON DELETE SET NULL,
    contact_id BIGINT REFERENCES contacts(id) ON DELETE CASCADE,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    call_type VARCHAR(20) DEFAULT 'outbound', -- inbound, outbound, whatsapp_call
    duration_seconds INTEGER DEFAULT 0,
    status VARCHAR(30) DEFAULT 'completed', -- completed, no_answer, busy, cancelled, failed
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_logs_org_contact ON call_logs(organization_id, contact_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_user_date ON call_logs(user_id, created_at DESC);
