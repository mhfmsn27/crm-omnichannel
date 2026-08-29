-- ============================================================================
-- Migration 022: Enterprise CRM Upgrade (Benchmark Cekat.ai, SleekFlow, Qontak, Barantum)
-- Description: Adds CSAT Surveys, Field Sales GPS Visits, Audit Trail Logs,
--              Voice Note Transcriptions, AI Copilot Suggestion Fields, and
--              Agent Availability Status for Smart Round-Robin
-- ============================================================================

-- 1. CSAT SURVEYS TABLE
CREATE TABLE IF NOT EXISTS csat_surveys (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    conversation_id BIGINT REFERENCES conversations(id) ON DELETE CASCADE,
    contact_id BIGINT REFERENCES contacts(id) ON DELETE CASCADE,
    agent_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    public_token VARCHAR(64) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, completed, expired
    created_at TIMESTAMPTZ DEFAULT NOW(),
    responded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_csat_org_agent ON csat_surveys(organization_id, agent_id);
CREATE INDEX IF NOT EXISTS idx_csat_conv ON csat_surveys(conversation_id);
CREATE INDEX IF NOT EXISTS idx_csat_token ON csat_surveys(public_token);

-- 2. FIELD SALES GPS VISITS TABLE (Barantum Benchmark)
CREATE TABLE IF NOT EXISTS sales_visits (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    contact_id BIGINT REFERENCES contacts(id) ON DELETE SET NULL,
    customer_name VARCHAR(150),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    location_name TEXT,
    address TEXT,
    notes TEXT,
    photo_url TEXT,
    checkin_time TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_visits_org_user ON sales_visits(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_sales_visits_time ON sales_visits(checkin_time);

-- 3. AUDIT TRAIL LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- 'export_contacts', 'delete_conversation', 'mark_invoice_paid', 'change_role', etc.
    module VARCHAR(50) NOT NULL, -- 'inbox', 'contacts', 'invoicing', 'settings', 'sales'
    details JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org_module ON audit_logs(organization_id, module, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);

-- 4. ENHANCE MESSAGES TABLE (Voice Transcription & AI Summary)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS transcription TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS transcription_status VARCHAR(20) DEFAULT 'none'; -- none, processing, completed, failed
ALTER TABLE messages ADD COLUMN IF NOT EXISTS ai_summary TEXT;

-- 5. ENHANCE CONVERSATIONS TABLE (CSAT tracking & AI Insights)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS csat_rating INTEGER;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS csat_status VARCHAR(20) DEFAULT 'not_sent'; -- not_sent, sent, received
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS csat_token VARCHAR(64);

-- 6. ENHANCE USERS TABLE (Agent Status & Round-Robin Capacity)
ALTER TABLE users ADD COLUMN IF NOT EXISTS agent_status VARCHAR(20) DEFAULT 'available'; -- available, busy, away, offline
ALTER TABLE users ADD COLUMN IF NOT EXISTS max_active_chats INTEGER DEFAULT 15;

-- 7. ENHANCE ORGANIZATIONS TABLE (CSAT & Round-Robin Configuration)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS csat_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS csat_message_template TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS auto_round_robin_enabled BOOLEAN DEFAULT TRUE;
