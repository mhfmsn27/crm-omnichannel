-- Migration: AI Prompt Training + Agent Notes + Import Kontak
-- Purpose: Add features that WhatSmail has but CRMHub doesn't
-- Run: Tables will be auto-created via auto-migration in server.js

-- ==========================================
-- AI CHATBOT TRAINING / PROMPT TRAINING
-- ==========================================

CREATE TABLE IF NOT EXISTS chatbot_training_data (
    id SERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Training data type
    data_type VARCHAR(20) NOT NULL,  -- 'product', 'service', 'faq', 'knowledge', 'policy'

    -- Content
    question TEXT,
    answer TEXT,
    keywords TEXT[],  -- Array of keywords for matching
    category VARCHAR(100),

    -- Metadata
    source VARCHAR(50),  -- 'manual', 'file_import', 'ecommerce_sync', 'ai_generated'
    confidence_score INTEGER DEFAULT 80,  -- 0-100

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_org ON chatbot_training_data(organization_id);
CREATE INDEX IF NOT EXISTS idx_training_type ON chatbot_training_data(data_type);
CREATE INDEX IF NOT EXISTS idx_training_active ON chatbot_training_data(is_active);
CREATE INDEX IF NOT EXISTS idx_training_keywords ON chatbot_training_data USING GIN(keywords);

-- Chatbot Training Sessions (to track what was trained when)
CREATE TABLE IF NOT EXISTS chatbot_training_sessions (
    id SERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    session_name VARCHAR(255),
    items_count INTEGER DEFAULT 0,
    data_types JSONB DEFAULT '[]',  -- ["product", "faq", etc]

    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- AGENT NOTES / INTERACTION NOTES
-- ==========================================

CREATE TABLE IF NOT EXISTS agent_notes (
    id SERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    conversation_id BIGINT REFERENCES conversations(id) ON DELETE CASCADE,
    contact_id BIGINT REFERENCES contacts(id) ON DELETE CASCADE,

    -- Note content
    note TEXT NOT NULL,
    note_type VARCHAR(20) DEFAULT 'general',  -- 'general', 'complaint', 'feedback', 'internal', 'action_item'

    -- Author
    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,

    -- Resolution tracking
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,

    -- For internal notes (customer won't see)
    is_internal BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notes_conversation ON agent_notes(conversation_id);
CREATE INDEX IF NOT EXISTS idx_notes_contact ON agent_notes(contact_id);
CREATE INDEX IF NOT EXISTS idx_notes_org ON agent_notes(organization_id);

-- ==========================================
-- CONTACT IMPORT LOG
-- ==========================================

CREATE TABLE IF NOT EXISTS contact_import_logs (
    id SERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- File info
    filename VARCHAR(255),
    file_size INTEGER,

    -- Import results
    total_rows INTEGER,
    imported_count INTEGER DEFAULT 0,
    skipped_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    errors JSONB DEFAULT '[]',  -- [{row: 1, error: "Invalid phone"}, ...]

    -- Status
    status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'processing', 'completed', 'failed'

    imported_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_import_logs_org ON contact_import_logs(organization_id);

-- ==========================================
-- SCHEDULED BROADCAST / BROADCAST SCHEDULE
-- ==========================================

ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS scheduled_status VARCHAR(20) DEFAULT 'draft';  -- 'draft', 'scheduled', 'sending', 'sent', 'failed'
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS scheduled_by BIGINT REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_broadcasts_scheduled ON broadcasts(scheduled_at) WHERE scheduled_status = 'scheduled';

-- ==========================================
-- QUICK REPLY GLOBAL (SHARED)
-- ==========================================

-- Already exists in quick_replies table, just need to add global flag
ALTER TABLE quick_replies ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT FALSE;
ALTER TABLE quick_replies ADD COLUMN IF NOT EXISTS global_shortcut VARCHAR(50);

-- ==========================================
-- RICH MEDIA MESSAGES / CTA BUTTONS
-- ==========================================

CREATE TABLE IF NOT EXISTS message_templates (
    id SERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Template info
    name VARCHAR(255) NOT NULL,
    template_type VARCHAR(30) NOT NULL,  -- 'product_card', 'cta_button', 'gallery', 'video_card', 'rich_link'

    -- Content
    title VARCHAR(255),
    description TEXT,
    image_url TEXT,
    buttons JSONB DEFAULT '[]',  -- [{text: "Buy Now", url: "...", action: "url"}]

    -- CTA Link
    cta_url TEXT,
    cta_text VARCHAR(100),

    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,

    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_templates_org ON message_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_templates_type ON message_templates(template_type);

-- ==========================================
-- WHATSAPP TEMPLATES (IMPROVED)
-- ==========================================

CREATE TABLE IF NOT EXISTS whatsapp_templates (
    id SERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50),
    language VARCHAR(20) DEFAULT 'id',
    content TEXT,
    components JSONB DEFAULT '[]',
    status VARCHAR(50) DEFAULT 'APPROVED',
    usage_count INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE meta_templates ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;
ALTER TABLE meta_templates ADD COLUMN IF NOT EXISTS success_rate DECIMAL(5,2) DEFAULT 0;
ALTER TABLE meta_templates ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

-- ==========================================
-- CHAT AUTO-ARCHIVE SETTINGS
-- ==========================================

CREATE TABLE IF NOT EXISTS auto_archive_settings (
    id SERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Archive rules
    auto_archive_enabled BOOLEAN DEFAULT FALSE,
    archive_after_days INTEGER DEFAULT 30,  -- Archive conversations after X days
    archive_resolved_only BOOLEAN DEFAULT TRUE,

    -- Conditions
    archive_channel VARCHAR(20)[],  -- ['whatsapp', 'instagram'] or NULL for all
    archive_with_label VARCHAR(50)[],  -- Only archive with these labels

    -- Exceptions
    exclude_agents BIGINT[],  -- Don't archive if assigned to these agents

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Archive log
CREATE TABLE IF NOT EXISTS chat_archive_logs (
    id SERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    conversation_id BIGINT REFERENCES conversations(id) ON DELETE SET NULL,

    archived_at TIMESTAMPTZ DEFAULT NOW(),
    reason VARCHAR(50)
);

-- ==========================================
-- ENHANCE EXISTING TABLES
-- ==========================================

-- Add quick_reply shortcut for global access
ALTER TABLE quick_replies ADD COLUMN IF NOT EXISTS global_shortcut VARCHAR(50);
ALTER TABLE quick_replies ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;