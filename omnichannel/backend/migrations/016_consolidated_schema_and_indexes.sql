-- ============================================================================
-- Migration 016: Consolidated Schema & Composite Performance Indexes
-- ============================================================================

-- 1. WhatsApp Sessions enhancements
ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS sync_full_history BOOLEAN DEFAULT FALSE;
ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS device_status VARCHAR(20) DEFAULT 'active';
ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS profile_pic_url TEXT;

DO $$ BEGIN
    ALTER TABLE whatsapp_sessions ADD CONSTRAINT chk_device_status CHECK (device_status IN ('active', 'deleted', 'inactive'));
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. Organizations & Organization Settings
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS csat_enabled BOOLEAN DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS csat_trigger VARCHAR(50) DEFAULT 'conversation_closed';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS csat_questions JSONB DEFAULT '[{"id":"rating","type":"rating","text":"How satisfied were you with this conversation?"}]';

CREATE TABLE IF NOT EXISTS organization_settings (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    setting_key VARCHAR(100) NOT NULL,
    setting_value BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, setting_key)
);
CREATE INDEX IF NOT EXISTS idx_org_settings_org_key ON organization_settings(organization_id, setting_key);

-- 3. Announcements
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS placement VARCHAR(20) DEFAULT 'dashboard';

-- 4. Short links & Link tracking
ALTER TABLE short_links ADD COLUMN IF NOT EXISTS broadcast_id BIGINT REFERENCES broadcasts(id) ON DELETE SET NULL;
ALTER TABLE short_links ADD COLUMN IF NOT EXISTS contact_id BIGINT REFERENCES contacts(id) ON DELETE CASCADE;
ALTER TABLE short_links ADD COLUMN IF NOT EXISTS original_url TEXT;
ALTER TABLE short_links ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'tracking';

-- 5. Contacts enhancements
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS whatsapp_lid VARCHAR(255);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS is_subscribed BOOLEAN DEFAULT true;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMPTZ;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS internal_note TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_broadcast_id INTEGER;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_broadcast_at TIMESTAMP;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_broadcast_assigned_agent_id BIGINT REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_whatsapp_lid ON contacts(whatsapp_lid);
CREATE INDEX IF NOT EXISTS idx_contacts_org ON contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(organization_id, phone_number);
CREATE INDEX IF NOT EXISTS idx_contacts_org_sub_phone ON contacts(organization_id, is_subscribed, phone_number);

-- 6. Conversations enhancements
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_muted BOOLEAN DEFAULT false;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN DEFAULT FALSE;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS urgency_score INTEGER DEFAULT 0;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS urgency_reason TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS urgency_flagged_at TIMESTAMPTZ;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_sentiment VARCHAR(20);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS sentiment_updated_at TIMESTAMPTZ;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ctwa_ad_id VARCHAR(255);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ctwa_source_type VARCHAR(50);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ctwa_headline TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS system_metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS current_flow_id INTEGER;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS current_node_id VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_conversations_org ON conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversations_contact ON conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_conversations_session ON conversations(whatsapp_session_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created ON conversations(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(organization_id, status) WHERE status != 'resolved';
CREATE INDEX IF NOT EXISTS idx_conversations_last_msg ON conversations(organization_id, last_message_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_conversations_org_status_last_msg ON conversations(organization_id, status, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_org_unread_status ON conversations(organization_id, unread_count, status, last_message_at DESC) WHERE status != 'resolved' AND is_archived = false;

-- 7. Messages enhancements
ALTER TABLE messages ADD COLUMN IF NOT EXISTS quoted_message TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_forwarded BOOLEAN DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sentiment VARCHAR(20);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sentiment_score FLOAT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_org_created ON messages(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conv_from_me ON messages(conversation_id, from_me, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_is_forwarded ON messages(is_forwarded);
CREATE INDEX IF NOT EXISTS idx_messages_conv_created_id ON messages(conversation_id, created_at DESC, id DESC);

-- 8. Broadcasts & Recipients
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS scheduled_status VARCHAR(20) DEFAULT 'draft';
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE;
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS recurrence_type VARCHAR(20) DEFAULT 'none';
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS next_run_at TIMESTAMPTZ;
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS flow_id INTEGER REFERENCES chat_flows(id) ON DELETE SET NULL;
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS assigned_agent_id BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS show_in_history BOOLEAN DEFAULT FALSE;

ALTER TABLE broadcast_recipients ADD COLUMN IF NOT EXISTS wa_message_id VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_wamid ON broadcast_recipients(wa_message_id);
CREATE INDEX IF NOT EXISTS idx_broadcasts_org ON broadcasts(organization_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_broadcast ON broadcast_recipients(broadcast_id, status);

CREATE TABLE IF NOT EXISTS scheduled_broadcasts (
    id SERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    campaign_name VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    channel VARCHAR(20) DEFAULT 'whatsapp',
    target_type VARCHAR(20) DEFAULT 'all',
    target_ids JSONB DEFAULT '[]'::jsonb,
    target_labels JSONB DEFAULT '[]'::jsonb,
    device_id BIGINT REFERENCES whatsapp_sessions(id),
    media_url TEXT,
    scheduled_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_scheduled_broadcasts_org ON scheduled_broadcasts(organization_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_broadcasts_status ON scheduled_broadcasts(status, scheduled_at);

-- 9. Users & Custom Roles
ALTER TABLE users ADD COLUMN IF NOT EXISTS handled_channels JSONB DEFAULT '["whatsapp", "messenger", "instagram", "webchat", "telegram", "tiktok"]'::jsonb;

CREATE TABLE IF NOT EXISTS custom_roles (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    role_type VARCHAR(20) NOT NULL DEFAULT 'agent',
    role_level INTEGER NOT NULL DEFAULT 1,
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    color VARCHAR(20) DEFAULT 'blue',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, name)
);
CREATE INDEX IF NOT EXISTS idx_custom_roles_org ON custom_roles(organization_id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_role_id BIGINT REFERENCES custom_roles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);

-- 10. Chatbot Training, Tools & Agent Notes
CREATE TABLE IF NOT EXISTS chatbot_training_data (
    id SERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    data_type VARCHAR(20) NOT NULL,
    question TEXT,
    answer TEXT,
    keywords TEXT[],
    category VARCHAR(100),
    source VARCHAR(50) DEFAULT 'manual',
    confidence_score INTEGER DEFAULT 80,
    is_active BOOLEAN DEFAULT TRUE,
    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_training_org ON chatbot_training_data(organization_id);

CREATE TABLE IF NOT EXISTS chatbot_tools (
    id SERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    bot_config_id BIGINT REFERENCES chatbot_settings(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    parameters JSONB DEFAULT '{}',
    url TEXT NOT NULL,
    method VARCHAR(10) DEFAULT 'GET',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(bot_config_id, name)
);

CREATE TABLE IF NOT EXISTS agent_notes (
    id SERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    conversation_id BIGINT REFERENCES conversations(id) ON DELETE CASCADE,
    contact_id BIGINT REFERENCES contacts(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    note_type VARCHAR(20) DEFAULT 'general',
    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    is_resolved BOOLEAN DEFAULT FALSE,
    is_internal BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notes_conversation ON agent_notes(conversation_id);

CREATE TABLE IF NOT EXISTS contact_import_logs (
    id SERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    filename VARCHAR(255),
    total_rows INTEGER,
    imported_count INTEGER DEFAULT 0,
    skipped_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    errors JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'pending',
    imported_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_import_logs_org ON contact_import_logs(organization_id);

-- 11. Quick Replies & Message Templates
ALTER TABLE quick_replies ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT FALSE;
ALTER TABLE quick_replies ADD COLUMN IF NOT EXISTS global_shortcut VARCHAR(50);

CREATE TABLE IF NOT EXISTS message_templates (
    id SERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    template_type VARCHAR(30) NOT NULL,
    title VARCHAR(255),
    description TEXT,
    image_url TEXT,
    buttons JSONB DEFAULT '[]',
    cta_url TEXT,
    cta_text VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_templates_org ON message_templates(organization_id);

-- 12. Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
    title VARCHAR(255),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    reminder_h24_sent BOOLEAN DEFAULT false,
    reminder_h1_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bookings_org ON bookings(organization_id);
CREATE INDEX IF NOT EXISTS idx_bookings_contact ON bookings(contact_id);
CREATE INDEX IF NOT EXISTS idx_bookings_cron ON bookings(status, start_time);

-- 13. Warmer Circle Sessions & Logs
ALTER TABLE warmer_circle_sessions ADD COLUMN IF NOT EXISTS last_reset_at TIMESTAMPTZ DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_warmer_circle_sessions_last_reset ON warmer_circle_sessions(last_reset_at);
CREATE INDEX IF NOT EXISTS idx_wcs_circle_id ON warmer_circle_sessions(warmer_circle_id);
CREATE INDEX IF NOT EXISTS idx_warmer_logs_circle_id ON warmer_logs(warmer_circle_id);
CREATE INDEX IF NOT EXISTS idx_warmer_logs_sent_at ON warmer_logs(sent_at);

-- 14. Queues & Labels indexes
CREATE INDEX IF NOT EXISTS idx_queues_org ON queues(organization_id);
CREATE INDEX IF NOT EXISTS idx_queues_contact ON queues(contact_id);
CREATE INDEX IF NOT EXISTS idx_queues_waiting ON queues(organization_id, division, status, created_at) WHERE status = 'waiting';
CREATE INDEX IF NOT EXISTS idx_labels_org ON labels(organization_id);
CREATE INDEX IF NOT EXISTS idx_contact_labels_label ON contact_labels(label_id);

-- 15. Invoicing & Payments
CREATE TABLE IF NOT EXISTS invoice_payment_gateways (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    gateway_type VARCHAR(30) NOT NULL,
    config JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT false,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, gateway_type)
);

CREATE TABLE IF NOT EXISTS invoice_payments (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    payment_method VARCHAR(50),
    reference_id VARCHAR(255),
    notes TEXT,
    created_by INTEGER,
    paid_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice ON invoice_payments(invoice_id);

CREATE TABLE IF NOT EXISTS invoice_recurring_templates (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
    items JSONB NOT NULL DEFAULT '[]',
    notes TEXT,
    frequency VARCHAR(20) NOT NULL DEFAULT 'monthly',
    next_issue_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    auto_send_wa BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_gateway VARCHAR(30);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_url TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS gateway_invoice_id VARCHAR(255);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(15,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS dp_amount DECIMAL(15,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS document_type VARCHAR(50) DEFAULT 'invoice';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS overdue_sent_at TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(15,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS courier VARCHAR(100);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_cogs DECIMAL(15,2) DEFAULT 0;

ALTER TABLE invoice_settings ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN DEFAULT false;
ALTER TABLE invoice_settings ADD COLUMN IF NOT EXISTS reminder_days_before INTEGER DEFAULT 3;
ALTER TABLE invoice_settings ADD COLUMN IF NOT EXISTS reminder_days_after INTEGER DEFAULT 3;
ALTER TABLE invoice_settings ADD COLUMN IF NOT EXISTS reminder_message_template TEXT;
ALTER TABLE invoice_settings ADD COLUMN IF NOT EXISTS recurring_enabled BOOLEAN DEFAULT false;

ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price DECIMAL(15,2) DEFAULT 0;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS product_id INTEGER REFERENCES products(id) ON DELETE SET NULL;
