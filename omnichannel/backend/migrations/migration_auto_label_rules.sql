-- Migration: Auto-Label Rules Engine
-- Purpose: Automatic labeling based on source channel and keywords
-- Run: sudo -u postgres psql -d omni_db -f migration_auto_label_rules.sql

-- ==========================================
-- AUTO LABEL RULES TABLE
-- ==========================================

-- Table for storing auto-labeling rules
CREATE TABLE IF NOT EXISTS auto_label_rules (
    id SERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Rule Configuration
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Source Channel: whatsapp, instagram, facebook, messenger, tiktok, shopee, telegram, webchat
    -- NULL means all channels
    source_channel VARCHAR(20),

    -- Label Type: 'source' = based on channel, 'keyword' = based on message content
    rule_type VARCHAR(20) NOT NULL DEFAULT 'source',

    -- Match Configuration
    -- For rule_type='source': source_channel must match
    -- For rule_type='keyword': keyword_pattern is used

    -- Keyword configuration (for keyword type rules)
    keyword_pattern TEXT,                    -- The keyword/regex to match
    keyword_match_type VARCHAR(20) DEFAULT 'contains',  -- 'contains', 'exact', 'starts_with', 'ends_with', 'regex'
    case_sensitive BOOLEAN DEFAULT FALSE,

    -- Message scope (for keyword type rules)
    -- 'first' = only first message from contact, 'any' = any message, 'continued' = not first message
    message_scope VARCHAR(20) DEFAULT 'any',

    -- Label to apply when rule matches
    label_id BIGINT NOT NULL REFERENCES labels(id) ON DELETE CASCADE,

    -- Rule Settings
    priority INTEGER DEFAULT 0,             -- Higher = processed first
    is_active BOOLEAN DEFAULT TRUE,

    -- Auto-removal: remove label when condition no longer met
    auto_remove BOOLEAN DEFAULT FALSE,       -- Only for keyword type

    -- Tracking
    match_count INTEGER DEFAULT 0,          -- How many times this rule matched
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_rule_type CHECK (rule_type IN ('source', 'keyword')),
    CONSTRAINT chk_keyword_match_type CHECK (keyword_match_type IN ('contains', 'exact', 'starts_with', 'ends_with', 'regex')),
    CONSTRAINT chk_message_scope CHECK (message_scope IN ('first', 'any', 'continued'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_auto_label_rules_org ON auto_label_rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_auto_label_rules_org_active ON auto_label_rules(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_auto_label_rules_source ON auto_label_rules(source_channel) WHERE source_channel IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_auto_label_rules_priority ON auto_label_rules(organization_id, priority DESC) WHERE is_active = TRUE;

-- ==========================================
-- AUTO LABEL APPLIED LOG (Audit Trail)
-- ==========================================

-- Log of automatically applied labels for audit and tracking
CREATE TABLE IF NOT EXISTS auto_label_logs (
    id SERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    contact_id BIGINT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    conversation_id BIGINT REFERENCES conversations(id) ON DELETE SET NULL,
    rule_id INTEGER REFERENCES auto_label_rules(id) ON DELETE SET NULL,
    label_id BIGINT NOT NULL REFERENCES labels(id) ON DELETE CASCADE,

    -- Context
    source_channel VARCHAR(20),            -- The channel where message came from
    matched_text TEXT,                      -- The keyword/text that triggered the rule

    -- Action: 'applied' or 'removed'
    action VARCHAR(20) DEFAULT 'applied',

    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT chk_action CHECK (action IN ('applied', 'removed'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_auto_label_logs_org ON auto_label_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_auto_label_logs_contact ON auto_label_logs(contact_id);
CREATE INDEX IF NOT EXISTS idx_auto_label_logs_created ON auto_label_logs(created_at DESC);

-- ==========================================
-- UPDATE contacts table for tracking
-- ==========================================

-- Add column to track first message timestamp per channel
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS first_message_at TIMESTAMPTZ;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS first_message_source VARCHAR(20);

-- Index for faster queries on first message tracking
CREATE INDEX IF NOT EXISTS idx_contacts_first_message ON contacts(organization_id, first_message_at DESC) WHERE first_message_at IS NOT NULL;

-- ==========================================
-- VERIFY: Sample Query to check rules
-- ==========================================

-- SELECT
--     alr.id,
--     alr.name,
--     alr.rule_type,
--     alr.source_channel,
--     alr.keyword_pattern,
--     alr.keyword_match_type,
--     l.name as label_name,
--     alr.priority,
--     alr.is_active
-- FROM auto_label_rules alr
-- JOIN labels l ON alr.label_id = l.id
-- ORDER BY alr.priority DESC;