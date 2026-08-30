-- ============================================================================
-- Migration 024: Core System Resilience Patch
-- Ensures scheduled_messages, message retries, flow delay resume_at, 
-- auto_archive_settings, csat_surveys, SLA policies, and sequences are fully populated.
-- ============================================================================

-- 1. Table: scheduled_messages
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
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_org ON scheduled_messages (organization_id);

-- 2. Columns on messages for stuck message monitor & retries
ALTER TABLE messages ADD COLUMN IF NOT EXISTS retry_count INT DEFAULT 0;

-- 3. Columns on flow_sessions for delay / wake up scheduling
ALTER TABLE flow_sessions ADD COLUMN IF NOT EXISTS resume_at TIMESTAMPTZ;
ALTER TABLE flow_sessions ADD COLUMN IF NOT EXISTS current_node_id VARCHAR(255);
ALTER TABLE flow_sessions ADD COLUMN IF NOT EXISTS variables JSONB DEFAULT '{}'::jsonb;
ALTER TABLE flow_sessions ADD COLUMN IF NOT EXISTS whatsapp_session_id INT;
CREATE INDEX IF NOT EXISTS idx_flow_sessions_resume ON flow_sessions (status, resume_at) WHERE status = 'sleeping';

-- 4. Tables for auto-archive system
CREATE TABLE IF NOT EXISTS auto_archive_settings (
    id SERIAL PRIMARY KEY,
    organization_id INT UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
    auto_archive_enabled BOOLEAN DEFAULT false,
    archive_after_days INT DEFAULT 30,
    archive_resolved_only BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_archive_logs (
    id SERIAL PRIMARY KEY,
    organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
    conversation_id INT REFERENCES conversations(id) ON DELETE CASCADE,
    archived_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tables for CSAT customer satisfaction survey
CREATE TABLE IF NOT EXISTS csat_surveys (
    id SERIAL PRIMARY KEY,
    organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
    conversation_id INT REFERENCES conversations(id) ON DELETE CASCADE,
    contact_id INT REFERENCES contacts(id) ON DELETE CASCADE,
    agent_id INT REFERENCES users(id) ON DELETE SET NULL,
    rating INT,
    feedback TEXT,
    public_token VARCHAR(255) UNIQUE,
    status VARCHAR(50) DEFAULT 'pending',
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_csat_surveys_org ON csat_surveys (organization_id);
CREATE INDEX IF NOT EXISTS idx_csat_surveys_token ON csat_surveys (public_token);

-- 6. Ticket sequence & SLA policies
CREATE SEQUENCE IF NOT EXISTS ticket_seq START WITH 1001;

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

CREATE TABLE IF NOT EXISTS sla_breach_logs (
    id SERIAL PRIMARY KEY,
    organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
    conversation_id INT REFERENCES conversations(id) ON DELETE CASCADE,
    breach_type VARCHAR(50) NOT NULL,
    breached_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. SLA & Ticket columns on conversations
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS sla_deadline_at TIMESTAMPTZ;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS sla_breached BOOLEAN DEFAULT false;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS first_reply_at TIMESTAMPTZ;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ticket_number VARCHAR(100);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'medium';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS csat_rating INT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS csat_status VARCHAR(50);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS csat_token VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_conversations_sla ON conversations (sla_deadline_at) WHERE sla_deadline_at IS NOT NULL;

-- 8. Table: agent_notes
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
