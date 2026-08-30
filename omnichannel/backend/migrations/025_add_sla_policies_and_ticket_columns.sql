-- ============================================================================
-- Migration 025: SLA Policies, Ticket Sequences, and Conversation Columns
-- ============================================================================

-- 1. Ticket Sequence
CREATE SEQUENCE IF NOT EXISTS ticket_seq START WITH 1001;

-- 2. SLA Policies Table
CREATE TABLE IF NOT EXISTS sla_policies (
    id SERIAL PRIMARY KEY,
    organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
    priority VARCHAR(50) NOT NULL,
    frt_minutes INT DEFAULT 60,
    resolution_minutes INT DEFAULT 480,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, priority)
);

-- 3. SLA Breach Logs Table
CREATE TABLE IF NOT EXISTS sla_breach_logs (
    id SERIAL PRIMARY KEY,
    organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
    conversation_id INT REFERENCES conversations(id) ON DELETE CASCADE,
    breach_type VARCHAR(50) NOT NULL,
    breached_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. SLA & Ticket Columns on Conversations Table
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS sla_deadline_at TIMESTAMPTZ;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS sla_breached BOOLEAN DEFAULT false;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS first_reply_at TIMESTAMPTZ;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ticket_number VARCHAR(100);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'medium';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS csat_rating INT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS csat_status VARCHAR(50);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS csat_token VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_conversations_sla ON conversations (sla_deadline_at) WHERE sla_deadline_at IS NOT NULL;

-- 5. Agent Notes Table
CREATE TABLE IF NOT EXISTS agent_notes (
    id SERIAL PRIMARY KEY,
    organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
    conversation_id INT REFERENCES conversations(id) ON DELETE CASCADE,
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    note TEXT NOT NULL,
    note_type VARCHAR(50) DEFAULT 'general',
    is_internal BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Scheduled Messages Table
CREATE TABLE IF NOT EXISTS scheduled_messages (
    id SERIAL PRIMARY KEY,
    organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
    conversation_id INT REFERENCES conversations(id) ON DELETE CASCADE,
    contact_id INT REFERENCES contacts(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    scheduled_by INT REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'pending',
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_due ON scheduled_messages (status, scheduled_at) WHERE status = 'pending';

-- 7. Columns on Messages Table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS retry_count INT DEFAULT 0;

-- 8. Columns on Flow Sessions Table
ALTER TABLE flow_sessions ADD COLUMN IF NOT EXISTS resume_at TIMESTAMPTZ;
ALTER TABLE flow_sessions ADD COLUMN IF NOT EXISTS current_node_id VARCHAR(255);
ALTER TABLE flow_sessions ADD COLUMN IF NOT EXISTS variables JSONB DEFAULT '{}'::jsonb;
ALTER TABLE flow_sessions ADD COLUMN IF NOT EXISTS whatsapp_session_id INT;
CREATE INDEX IF NOT EXISTS idx_flow_sessions_resume ON flow_sessions (status, resume_at) WHERE status = 'sleeping';
