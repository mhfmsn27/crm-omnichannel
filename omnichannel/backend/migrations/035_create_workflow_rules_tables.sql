-- Migration 035: Create workflow_rules and workflow_rule_logs tables

CREATE TABLE IF NOT EXISTS workflow_rules (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    trigger_type VARCHAR(100) NOT NULL,
    trigger_conditions JSONB DEFAULT '{}'::jsonb,
    actions JSONB NOT NULL DEFAULT '[]'::jsonb,
    priority INTEGER DEFAULT 0,
    stop_on_match BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_rule_logs (
    id BIGSERIAL PRIMARY KEY,
    rule_id BIGINT REFERENCES workflow_rules(id) ON DELETE CASCADE,
    conversation_id BIGINT REFERENCES conversations(id) ON DELETE CASCADE,
    contact_id BIGINT REFERENCES contacts(id) ON DELETE SET NULL,
    trigger_type VARCHAR(100),
    action_executed JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(50) DEFAULT 'success',
    executed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_rules_org ON workflow_rules(organization_id, is_active, priority);
CREATE INDEX IF NOT EXISTS idx_workflow_rule_logs_rule ON workflow_rule_logs(rule_id, executed_at);
