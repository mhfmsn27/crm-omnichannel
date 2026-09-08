-- Migration: 043_enterprise_flagship_features.sql
-- Purpose: Schema updates for Agent Macros, Broadcast A/B Testing, and Audit Trail indexes.

-- 1. Agent Workflow Macros Table
CREATE TABLE IF NOT EXISTS agent_macros (
    id SERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    actions JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_macros_org ON agent_macros(organization_id, is_active);

-- 2. Broadcast A/B Split Testing Columns
ALTER TABLE broadcasts 
ADD COLUMN IF NOT EXISTS is_ab_test BOOLEAN DEFAULT FALSE;

ALTER TABLE broadcasts 
ADD COLUMN IF NOT EXISTS message_template_b TEXT;

ALTER TABLE broadcasts 
ADD COLUMN IF NOT EXISTS ab_split_ratio INTEGER DEFAULT 50;

-- 3. Broadcast Recipients Variant Column
ALTER TABLE broadcast_recipients 
ADD COLUMN IF NOT EXISTS message_variant VARCHAR(5) DEFAULT 'A';

CREATE INDEX IF NOT EXISTS idx_bc_recipients_variant ON broadcast_recipients(broadcast_id, message_variant);

-- 4. Audit Log Indexes for High-Speed Compliance Queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created ON audit_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(organization_id, action);
