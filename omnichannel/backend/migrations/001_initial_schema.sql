

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Enable pgvector extension for RAG
CREATE EXTENSION IF NOT EXISTS vector;

-- ==========================================
-- 1. CORE: PLANS & ORGANIZATIONS
-- ==========================================

CREATE TABLE plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price_monthly DECIMAL(12, 2) NOT NULL DEFAULT 0,
    price_monthly_promo DECIMAL(12, 2) DEFAULT NULL,
    price_yearly DECIMAL(12, 2) NOT NULL DEFAULT 0,
    price_yearly_promo DECIMAL(12, 2) DEFAULT NULL,
    trial_days INTEGER DEFAULT 0,
    is_trial_allowed BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE plan_features (
    id SERIAL PRIMARY KEY,
    plan_id INTEGER REFERENCES plans(id) ON DELETE CASCADE,
    feature_code VARCHAR(50) NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    limit_value INTEGER DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE organizations (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    plan_id INTEGER REFERENCES plans(id),
    subscription_status VARCHAR(20) DEFAULT 'trial',
    webhook_url TEXT,
    is_active BOOLEAN DEFAULT true,
    gemini_api_key TEXT, -- Moved here for Organization-wide API Key
    has_used_trial BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 2. AUTH: USERS
-- ==========================================

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL,
    phone VARCHAR(20),
    profile_pic_url TEXT,
    division VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 3. WHATSAPP INTEGRATION
-- ==========================================

CREATE TABLE whatsapp_sessions (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    session_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(100),
    whatsapp_number VARCHAR(20),
    status VARCHAR(20) DEFAULT 'created',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE rotator_groups (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE rotator_group_sessions (
    id BIGSERIAL PRIMARY KEY,
    rotator_group_id BIGINT REFERENCES rotator_groups(id) ON DELETE CASCADE,
    whatsapp_session_id BIGINT REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 4. CONTACTS & LABELS
-- ==========================================

CREATE TABLE labels (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(20) DEFAULT '#6366F1',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, name)
);

CREATE TABLE contacts (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100),
    phone_number VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    profile_pic_url TEXT,
    source VARCHAR(20) DEFAULT 'manual',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, phone_number)
);

CREATE TABLE contact_labels (
    contact_id BIGINT REFERENCES contacts(id) ON DELETE CASCADE,
    label_id BIGINT REFERENCES labels(id) ON DELETE CASCADE,
    PRIMARY KEY (contact_id, label_id)
);

-- ==========================================
-- 5. INBOX & MESSAGING
-- ==========================================

CREATE TABLE conversations (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    contact_id BIGINT REFERENCES contacts(id) ON DELETE CASCADE,
    whatsapp_session_id BIGINT REFERENCES whatsapp_sessions(id) ON DELETE SET NULL,
    last_message TEXT,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    unread_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'open',
    is_chatbot_active BOOLEAN DEFAULT true,
    is_archived BOOLEAN DEFAULT false,
    is_pinned BOOLEAN DEFAULT false,
    -- Rating & Resolution
    rating_score INTEGER,
    rating_feedback TEXT,
    rating_token VARCHAR(100),
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE conversation_ratings (
    id BIGSERIAL PRIMARY KEY,
    conversation_id BIGINT REFERENCES conversations(id) ON DELETE CASCADE,
    rating_token VARCHAR(100),
    score INTEGER NOT NULL,
    feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(conversation_id, rating_token)
);

CREATE TABLE messages (
    id BIGSERIAL PRIMARY KEY,
    conversation_id BIGINT REFERENCES conversations(id) ON DELETE CASCADE,
    organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    from_me BOOLEAN DEFAULT false,
    type VARCHAR(20) DEFAULT 'text',
    content TEXT,
    media_url TEXT,
    status VARCHAR(20) DEFAULT 'sent',
    wa_message_id VARCHAR(100) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE quick_replies (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    shortcut VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    media_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, shortcut)
);

-- ==========================================
-- 6. BROADCAST
-- ==========================================

CREATE TABLE broadcasts (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    message_template TEXT NOT NULL,
    media_url TEXT,
    rotator_group_id BIGINT REFERENCES rotator_groups(id),
    device_id BIGINT REFERENCES whatsapp_sessions(id),
    target_type VARCHAR(20) DEFAULT 'all',
    target_value TEXT,
    status VARCHAR(20) DEFAULT 'draft',
    scheduled_at TIMESTAMPTZ,
    delay_settings JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE broadcast_recipients (
    id BIGSERIAL PRIMARY KEY,
    broadcast_id BIGINT REFERENCES broadcasts(id) ON DELETE CASCADE,
    phone_number VARCHAR(20) NOT NULL,
    name VARCHAR(100),
    status VARCHAR(20) DEFAULT 'queued',
    used_session_id BIGINT REFERENCES whatsapp_sessions(id),
    sent_at TIMESTAMPTZ,
    error_log TEXT
);

-- ==========================================
-- 7. CHATBOT AI (REFACTORED)
-- ==========================================

-- Table now represents a specific BOT Entity attached to a device
CREATE TABLE chatbot_settings (
    id SERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Identity
    name VARCHAR(100) NOT NULL DEFAULT 'My Bot',
    
    -- Device Association (One bot per device session)
    session_id VARCHAR(100) UNIQUE, -- Links to whatsapp_sessions.session_id
    
    is_active BOOLEAN DEFAULT false,
    
    -- Persona
    system_prompt TEXT DEFAULT 'You are a helpful assistant.',
    escalation_keywords TEXT,
    
    -- Knowledge Base Strategy
    use_global_kb BOOLEAN DEFAULT true, -- If true, use Org-level KB. If false, use Bot-specific KB.
    
    -- Automation Rules (JSONB for flexibility)
    -- { business_hours: { enabled: bool, schedule: {} }, welcome: { enabled: bool, message: "" }, delayed: { enabled: bool, timer: 60 } }
    auto_reply_config JSONB DEFAULT '{}'::jsonb,
    
    -- Cache Device Name for display when device is disconnected/deleted
    cached_device_name VARCHAR(255),
    
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE knowledge_base_qa (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Context Scope
    session_id VARCHAR(100) DEFAULT NULL, -- NULL = Global, Value = Specific Bot
    
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    embedding vector(768),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON knowledge_base_qa USING hnsw (embedding vector_cosine_ops);

CREATE TABLE knowledge_base_assets (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Context Scope
    session_id VARCHAR(100) DEFAULT NULL, -- NULL = Global, Value = Specific Bot
    
    file_url TEXT NOT NULL,
    mime_type VARCHAR(50),
    description TEXT,
    embedding vector(768),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON knowledge_base_assets USING hnsw (embedding vector_cosine_ops);

-- ==========================================
-- 8. BILLING & SUBSCRIPTIONS
-- ==========================================
-- (Rest of schema remains similar)
CREATE TABLE addons (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price_monthly DECIMAL(12, 2) NOT NULL,
    feature_code VARCHAR(50) NOT NULL,
    prerequisite_feature_code VARCHAR(50),
    type VARCHAR(20) NOT NULL,
    value INTEGER DEFAULT 1,
    duration_days INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE subscriptions (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    plan_id INTEGER REFERENCES plans(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'active',
    is_trial BOOLEAN DEFAULT false,
    trial_ends_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE subscription_addons (
    id BIGSERIAL PRIMARY KEY,
    subscription_id BIGINT REFERENCES subscriptions(id) ON DELETE CASCADE,
    addon_id INTEGER REFERENCES addons(id),
    quantity INTEGER DEFAULT 1,
    price_at_purchase DECIMAL(12, 2),
    status VARCHAR(20) DEFAULT 'active',
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE payment_channels (
    id SERIAL PRIMARY KEY,
    type VARCHAR(20) NOT NULL,
    provider_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(100),
    account_holder VARCHAR(100),
    instructions TEXT,
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE transactions (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES organizations(id),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    plan_id INTEGER REFERENCES plans(id),
    addon_id INTEGER REFERENCES addons(id),
    payment_channel_id INTEGER REFERENCES payment_channels(id),
    amount DECIMAL(12, 2) NOT NULL,
    subtotal DECIMAL(12, 2) DEFAULT 0,
    tax DECIMAL(12, 2) DEFAULT 0,
    admin_fee DECIMAL(12, 2) DEFAULT 0,
    unique_code INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending',
    payment_method VARCHAR(255),
    payment_proof_url TEXT,
    checkout_url TEXT,
    payment_code VARCHAR(50),
    expired_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    approved_by BIGINT REFERENCES users(id),
    admin_note TEXT,
    cycle VARCHAR(20) DEFAULT 'monthly',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 9. WHATSAPP WARMER
-- ==========================================

CREATE TABLE warmer_settings (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    session_id_1 BIGINT REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
    session_id_2 BIGINT REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
    interval_min INTEGER DEFAULT 60,
    interval_max INTEGER DEFAULT 300,
    daily_limit INTEGER DEFAULT 50,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, session_id_1, session_id_2)
);

CREATE TABLE warmer_logs (
    id BIGSERIAL PRIMARY KEY,
    warmer_setting_id BIGINT REFERENCES warmer_settings(id) ON DELETE CASCADE,
    sender_session_id BIGINT REFERENCES whatsapp_sessions(id),
    message_content TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 10. SYSTEM SETTINGS, LOGS & CMS
-- ==========================================

CREATE TABLE system_settings (
    key VARCHAR(50) PRIMARY KEY,
    value TEXT,
    type VARCHAR(20) DEFAULT 'text',
    group_name VARCHAR(50) DEFAULT 'general',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE activity_logs (
    id BIGSERIAL PRIMARY KEY,
    actor_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    target_type VARCHAR(50),
    target_id BIGINT,
    action VARCHAR(50) NOT NULL,
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE landing_page_sections (
    id SERIAL PRIMARY KEY,
    section_key VARCHAR(50) UNIQUE NOT NULL,
    content JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public_pages (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    meta_description VARCHAR(255),
    is_published BOOLEAN DEFAULT false,
    page_type VARCHAR(20) DEFAULT 'static',
    target_menu VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'info',
    image_url TEXT,
    link_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notification_templates (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) UNIQUE NOT NULL,
    label VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SEED DATA

-- Insert Default Plans (with conflict handling for re-runs)
INSERT INTO plans (id, name, description, price_monthly, price_yearly, is_active, trial_days, is_trial_allowed) VALUES 
(1, 'Basic', 'Paket dasar untuk memulai bisnis digital Anda', 99000, 990000, true, 7, true),
(2, 'Professional', 'Paket untuk bisnis yang sedang berkembang', 299000, 2990000, true, 7, true),
(3, 'Enterprise', 'Paket lengkap untuk enterprise', 999000, 9990000, true, 14, true)
ON CONFLICT (id) DO NOTHING;

-- Reset sequence after manual ID insert
SELECT setval('plans_id_seq', (SELECT MAX(id) FROM plans));

-- Insert System Admin Organization with explicit ID
INSERT INTO organizations (id, name, plan_id, subscription_status) 
VALUES (1, 'System Admin', 3, 'active')
ON CONFLICT (id) DO NOTHING;

-- Reset sequence after manual ID insert
SELECT setval('organizations_id_seq', (SELECT MAX(id) FROM organizations));

-- Insert Super Admin User
INSERT INTO users (organization_id, name, email, password_hash, role) 
VALUES (1, 'Super Admin', 'superadmin@example.com', '$2a$10$XBeUzsFMbHKc25fLZE31jOFTmyitCQEJ364Tekybam6LnO9udwKfq', 'super_admin')
ON CONFLICT (email) DO NOTHING;

-- ==========================================
-- MIGRATION: update-broadcast-enhancement.txt
-- ==========================================

-- Update for Broadcast Enhancement (Run this SQL)

-- 1. Add media_url to quick_replies (for Templates)
ALTER TABLE quick_replies ADD COLUMN IF NOT EXISTS media_url TEXT;

-- 2. Add device_id to broadcasts (for Single Device Campaigns)
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS device_id BIGINT REFERENCES whatsapp_sessions(id);

-- 3. Optional: Index for faster lookups if needed
CREATE INDEX IF NOT EXISTS idx_broadcasts_device_id ON broadcasts(device_id);

-- 4. Optional: Add delay settings storage in broadcasts if you want to persist config
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS delay_settings JSONB;


-- ==========================================
-- MIGRATION: update-chatbot-refactor.txt
-- ==========================================


-- ==============================================================
-- MIGRATION SCRIPT: Chatbot Refactor (Per-Device & Global KB)
-- RUN THIS SCRIPT ONCE IN YOUR PRODUCTION DATABASE
-- ==============================================================

BEGIN;

-- 1. Tambahkan kolom API Key Global ke tabel organizations
--    Agar klien tidak perlu input API key berulang kali untuk setiap bot.
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS gemini_api_key TEXT;

-- 2. Update Tabel chatbot_settings
--    Mengubah konsep dari "Setting Global" menjadi "Entitas Bot".
ALTER TABLE chatbot_settings 
ADD COLUMN IF NOT EXISTS name VARCHAR(100) DEFAULT 'My AI Assistant',
ADD COLUMN IF NOT EXISTS session_id VARCHAR(100), -- Menghubungkan bot ke device tertentu
ADD COLUMN IF NOT EXISTS use_global_kb BOOLEAN DEFAULT true, -- Pilihan pakai KB Global atau Custom
ADD COLUMN IF NOT EXISTS auto_reply_config JSONB DEFAULT '{}'::jsonb; -- Config jam kerja, welcome msg, dll

-- Pastikan session_id unik (Satu device hanya boleh punya satu bot aktif)
-- Menggunakan DROP CONSTRAINT IF EXISTS agar aman jika dijalankan ulang
ALTER TABLE chatbot_settings DROP CONSTRAINT IF EXISTS chatbot_settings_session_id_key;
ALTER TABLE chatbot_settings ADD CONSTRAINT chatbot_settings_session_id_key UNIQUE (session_id);

-- 3. Update Tabel Knowledge Base (Q&A)
--    Menambahkan kolom session_id untuk membedakan data Global vs Custom.
ALTER TABLE knowledge_base_qa 
ADD COLUMN IF NOT EXISTS session_id VARCHAR(100) DEFAULT NULL; 
-- Note: Jika NULL berarti Data Global (bisa dipakai semua bot). Jika terisi, berarti Custom milik bot itu saja.

-- 4. Update Tabel Knowledge Base (Assets/PDF)
ALTER TABLE knowledge_base_assets 
ADD COLUMN IF NOT EXISTS session_id VARCHAR(100) DEFAULT NULL;

-- 5. Tambahkan Index untuk performa pencarian (Optional tapi Recommended)
CREATE INDEX IF NOT EXISTS idx_kb_qa_session ON knowledge_base_qa(session_id);
CREATE INDEX IF NOT EXISTS idx_kb_assets_session ON knowledge_base_assets(session_id);

COMMIT;

-- ==============================================================
-- END OF MIGRATION
-- ==============================================================


-- ==========================================
-- MIGRATION: update-contacts-source.txt
-- ==========================================

-- Add 'source' column to contacts table to track origin (manual, import, inbox, google)
-- Default to 'manual' for existing records created via UI
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'manual';

-- Update existing contacts that have no source but were likely from inbox (if any logic suggests it, otherwise default is fine)
-- Example: If you want to assume everything else is manual, the default handles it.


-- ==========================================
-- MIGRATION: update-device-refactor.txt
-- ==========================================

-- 1. Update WhatsApp Sessions for Tracking
ALTER TABLE whatsapp_sessions 
ADD COLUMN IF NOT EXISTS connected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS device_info JSONB DEFAULT '{}'::jsonb;

-- 2. Update Messages to Track Agent Performance
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS sender_id BIGINT REFERENCES users(id) ON DELETE SET NULL;

-- 3. Create Index for Reporting Performance
CREATE INDEX IF NOT EXISTS idx_messages_sender_stats ON messages(organization_id, sender_id, created_at);


-- ==========================================
-- MIGRATION: update-followup-feature.txt
-- ==========================================

-- ==========================================
-- AUTO FOLLOW-UP TABLES
-- ==========================================

-- 1. Follow-up Sequences (Templates)
CREATE TABLE IF NOT EXISTS followup_sequences (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    steps JSONB NOT NULL, -- Array of { delay_hours: 24, message: "..." }
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Follow-up Instances (Running Sessions)
CREATE TABLE IF NOT EXISTS followup_instances (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    contact_id BIGINT REFERENCES contacts(id) ON DELETE CASCADE,
    whatsapp_session_id BIGINT REFERENCES whatsapp_sessions(id) ON DELETE SET NULL,
    sequence_id BIGINT REFERENCES followup_sequences(id) ON DELETE SET NULL,
    current_step_index INTEGER DEFAULT 0,
    next_run_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'active', -- active, completed, cancelled, paused
    last_check_message_id BIGINT, -- ID of the last message when follow-up started (to check replies)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_followup_next_run ON followup_instances(status, next_run_at);
CREATE INDEX IF NOT EXISTS idx_followup_contact ON followup_instances(contact_id);


-- ==========================================
-- MIGRATION: update-form-feature.txt
-- ==========================================

-- ==========================================
-- CONVERSATIONAL FORM TABLES
-- ==========================================

-- 1. Form Definitions
CREATE TABLE IF NOT EXISTS forms (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    trigger_keyword VARCHAR(50) NOT NULL, -- Keyword to start form (e.g. "daftar")
    is_active BOOLEAN DEFAULT true,
    steps JSONB NOT NULL, -- Array of questions [{id, question, type, validation}]
    pdf_config JSONB DEFAULT '{}'::jsonb, -- PDF template settings
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, trigger_keyword)
);

-- 2. Form Sessions (Active User Progress)
CREATE TABLE IF NOT EXISTS form_sessions (
    id BIGSERIAL PRIMARY KEY,
    form_id BIGINT REFERENCES forms(id) ON DELETE CASCADE,
    contact_id BIGINT REFERENCES contacts(id) ON DELETE CASCADE,
    whatsapp_session_id BIGINT REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
    current_step_index INTEGER DEFAULT 0,
    answers JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(20) DEFAULT 'active', -- active, completed, cancelled
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(contact_id, status) -- Only one active session per contact
);

-- 3. Form Submissions (Completed Data)
CREATE TABLE IF NOT EXISTS form_submissions (
    id BIGSERIAL PRIMARY KEY,
    form_id BIGINT REFERENCES forms(id) ON DELETE CASCADE,
    contact_id BIGINT REFERENCES contacts(id) ON DELETE SET NULL,
    data JSONB NOT NULL,
    generated_pdf_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forms_keyword ON forms(organization_id, trigger_keyword);
CREATE INDEX IF NOT EXISTS idx_form_sessions_active ON form_sessions(contact_id, status);


-- ==========================================
-- MIGRATION: update-group-broadcast.txt
-- ==========================================

-- Add group_name to broadcast_recipients for better reporting
ALTER TABLE broadcast_recipients ADD COLUMN IF NOT EXISTS group_name VARCHAR(255);





-- ==========================================
-- MIGRATION: update-invoicing.txt
-- ==========================================

-- ==========================================
-- INVOICING MODULE TABLES
-- ==========================================

-- 1. Invoice Settings (Configuration per Org)
CREATE TABLE IF NOT EXISTS invoice_settings (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    prefix VARCHAR(20) DEFAULT 'INV',
    logo_url TEXT,
    footer_note TEXT DEFAULT 'Thank you for your business. Please transfer to BCA 1234567890.',
    tax_percentage INTEGER DEFAULT 0,
    due_days INTEGER DEFAULT 7,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id)
);

-- 2. Invoices Header
CREATE TABLE IF NOT EXISTS invoices (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    contact_id BIGINT REFERENCES contacts(id) ON DELETE SET NULL,
    invoice_number VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'draft', -- draft, sent, paid, unpaid, cancelled, overdue
    issue_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    subtotal DECIMAL(12, 2) DEFAULT 0,
    tax_amount DECIMAL(12, 2) DEFAULT 0,
    discount_amount DECIMAL(12, 2) DEFAULT 0,
    total_amount DECIMAL(12, 2) DEFAULT 0,
    notes TEXT,
    public_token VARCHAR(100) UNIQUE, -- For public access link
    batch_id VARCHAR(100), -- For grouping bulk invoices
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_invoices_org_status ON invoices(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_token ON invoices(public_token);
CREATE INDEX IF NOT EXISTS idx_invoices_batch ON invoices(batch_id);

-- 3. Invoice Items
CREATE TABLE IF NOT EXISTS invoice_items (
    id BIGSERIAL PRIMARY KEY,
    invoice_id BIGINT REFERENCES invoices(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(12, 2) DEFAULT 0,
    amount DECIMAL(12, 2) DEFAULT 0
);

-- 4. Product Categories & Products Catalog
CREATE TABLE IF NOT EXISTS product_categories (
    id SERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(20) DEFAULT '#6366f1',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES product_categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sku VARCHAR(100),
    price DECIMAL(15, 2) NOT NULL DEFAULT 0,
    cost_price DECIMAL(15, 2) DEFAULT 0,
    unit VARCHAR(50) DEFAULT 'pcs',
    image_url TEXT,
    stock INTEGER,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_org ON products(organization_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_org ON product_categories(organization_id);

-- 5. Update Broadcast Recipients to support Custom Variables (Dynamic Fields)
ALTER TABLE broadcast_recipients ADD COLUMN IF NOT EXISTS custom_vars JSONB DEFAULT '{}'::jsonb;


-- ==========================================
-- MIGRATION: update-invoice-org-details.txt
-- ==========================================

-- Add organization detail fields to invoice_settings table
ALTER TABLE invoice_settings ADD COLUMN IF NOT EXISTS org_name VARCHAR(100);
ALTER TABLE invoice_settings ADD COLUMN IF NOT EXISTS org_address TEXT;
ALTER TABLE invoice_settings ADD COLUMN IF NOT EXISTS org_email VARCHAR(100);
ALTER TABLE invoice_settings ADD COLUMN IF NOT EXISTS org_phone VARCHAR(20);


-- ==========================================
-- MIGRATION: update-link-tracking.txt
-- ==========================================

-- UPDATE-DB/update-link-tracking.txt
-- 1. Short Links Table
CREATE TABLE IF NOT EXISTS short_links (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    broadcast_id BIGINT REFERENCES broadcasts(id) ON DELETE SET NULL,
    contact_id BIGINT REFERENCES contacts(id) ON DELETE CASCADE,
    original_url TEXT NOT NULL,
    slug VARCHAR(20) UNIQUE NOT NULL,
    type VARCHAR(20) DEFAULT 'tracking', -- 'tracking', 'unsubscribe'
    clicks_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_short_links_slug ON short_links(slug);

-- 2. Link Clicks Logs
CREATE TABLE IF NOT EXISTS link_clicks (
    id BIGSERIAL PRIMARY KEY,
    short_link_id BIGINT REFERENCES short_links(id) ON DELETE CASCADE,
    clicked_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address VARCHAR(45),
    user_agent TEXT
);

-- 3. Update Contacts Table
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS is_subscribed BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_contacts_subscription ON contacts(is_subscribed);


-- ==========================================
-- MIGRATION: update-meta-api.txt
-- ==========================================

-- Update whatsapp_sessions for Official API
ALTER TABLE whatsapp_sessions 
ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'unofficial', -- 'official' vs 'unofficial'
ADD COLUMN IF NOT EXISTS waba_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS phone_number_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS access_token TEXT,
ADD COLUMN IF NOT EXISTS quality_rating VARCHAR(20), -- GREEN, YELLOW, RED
ADD COLUMN IF NOT EXISTS messaging_limit VARCHAR(50); -- TIER_50, TIER_250, etc.

-- Index for faster webhook lookups by phone ID
CREATE INDEX IF NOT EXISTS idx_sessions_phone_id ON whatsapp_sessions(phone_number_id);

-- Ensure contacts table tracks last inbound message time for 24h window logic
-- (This assumes messages table has created_at, but checking contacts is faster for session window)
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS last_inbound_at TIMESTAMPTZ;


-- ==========================================
-- MIGRATION: update-meta-templates.txt
-- ==========================================

-- Create Meta Templates Table
CREATE TABLE IF NOT EXISTS meta_templates (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    waba_id VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    language VARCHAR(10) NOT NULL,
    status VARCHAR(50) NOT NULL, -- APPROVED, REJECTED, PENDING
    category VARCHAR(50), -- MARKETING, UTILITY, AUTHENTICATION
    components JSONB NOT NULL, -- Structure of the template
    raw_data JSONB, -- Full response from Meta
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(waba_id, name, language)
);

-- Add index for faster lookup during broadcast
CREATE INDEX IF NOT EXISTS idx_meta_templates_org ON meta_templates(organization_id);


-- ==========================================
-- MIGRATION: update-number-checker.txt
-- ==========================================

-- ==========================================
-- NUMBER CHECKER TABLES
-- ==========================================

-- 1. Header: Batch History
CREATE TABLE number_check_batches (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    session_id BIGINT REFERENCES whatsapp_sessions(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
    total_numbers INTEGER DEFAULT 0,
    valid_count INTEGER DEFAULT 0,
    invalid_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Detail: Items per Batch
CREATE TABLE number_check_items (
    id BIGSERIAL PRIMARY KEY,
    batch_id BIGINT REFERENCES number_check_batches(id) ON DELETE CASCADE,
    input_number VARCHAR(50),
    formatted_number VARCHAR(50), -- 628...
    is_registered BOOLEAN DEFAULT NULL, -- NULL=Pending, TRUE=Valid, FALSE=Invalid
    status VARCHAR(20) DEFAULT 'pending', -- pending, checked, failed
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing for performance
CREATE INDEX idx_check_items_batch ON number_check_items(batch_id);
CREATE INDEX idx_check_items_status ON number_check_items(status);


-- ==========================================
-- MIGRATION: update-rotator-db.txt
-- ==========================================

ALTER TABLE whatsapp_sessions 
ADD COLUMN IF NOT EXISTS daily_sent_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS health_score INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS last_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS consecutive_errors INTEGER DEFAULT 0;


-- ==========================================
-- MIGRATION: update-scraper-feature.txt
-- ==========================================

-- ==========================================
-- GMAPS SCRAPER TABLES (RUN THIS IF NOT EXISTS)
-- ==========================================

-- 1. Integration Settings (Store API Keys per User/Org)
CREATE TABLE IF NOT EXISTS integration_settings (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- 'google_places', 'serpapi'
    credentials JSONB NOT NULL, -- { "api_key": "..." }
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, provider)
);

-- 2. Scraper History (Cache Results)
CREATE TABLE IF NOT EXISTS scraper_history (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    keyword VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    provider_used VARCHAR(50),
    total_results INTEGER DEFAULT 0,
    results_data JSONB, -- Store array of scraped leads
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scraper_history_org ON scraper_history(organization_id);


-- ==========================================
-- MIGRATION: update-unique-message-id.txt
-- ==========================================

-- Add Unique Constraint to wa_message_id to prevent duplicate messages
-- This handles race conditions where deduplication logic in application code fails

-- 1. Remove duplicates first (keep the one with smallest ID)
DELETE FROM messages a USING messages b
WHERE a.id > b.id 
AND a.wa_message_id = b.wa_message_id 
AND a.wa_message_id IS NOT NULL;

-- 2. Add unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_wa_message_id ON messages(wa_message_id);

-- 3. Add Constraint (Enforce Uniqueness)
ALTER TABLE messages 
ADD CONSTRAINT unique_wa_message_id UNIQUE USING INDEX idx_messages_wa_message_id;


-- ==========================================
-- MIGRATION: update-unsubscribe-logs.txt
-- ==========================================

-- 1. Create Unsubscribe Logs Table
CREATE TABLE IF NOT EXISTS unsubscribe_logs (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    contact_id BIGINT REFERENCES contacts(id) ON DELETE CASCADE,
    method VARCHAR(20) NOT NULL, -- 'link', 'keyword'
    details TEXT, -- 'Clicked link in Broadcast #123' or 'Replied STOP'
    unsubscribed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_unsub_logs_org ON unsubscribe_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_unsub_logs_contact ON unsubscribe_logs(contact_id);


-- ==========================================
-- MIGRATION: update-warmer-refactor.txt
-- ==========================================

-- 1. Warmer Circles (Header)
CREATE TABLE IF NOT EXISTS warmer_circles (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    interval_min INTEGER DEFAULT 60,
    interval_max INTEGER DEFAULT 300,
    daily_limit_per_device INTEGER DEFAULT 50,
    dictionary_mode VARCHAR(20) DEFAULT 'system', -- 'system' or 'custom'
    custom_dictionary JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Warmer Circle Sessions (Members)
CREATE TABLE IF NOT EXISTS warmer_circle_sessions (
    id BIGSERIAL PRIMARY KEY,
    warmer_circle_id BIGINT REFERENCES warmer_circles(id) ON DELETE CASCADE,
    session_id BIGINT REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
    messages_sent_today INTEGER DEFAULT 0,
    last_active_at TIMESTAMPTZ,
    last_reset_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(warmer_circle_id, session_id)
);

-- 3. Update Logs to support Circle ID
ALTER TABLE warmer_logs ADD COLUMN IF NOT EXISTS warmer_circle_id BIGINT REFERENCES warmer_circles(id) ON DELETE CASCADE;
ALTER TABLE warmer_logs ALTER COLUMN warmer_setting_id DROP NOT NULL;





-- ==========================================
-- MIGRATION: update-webchat.txt
-- ==========================================


-- ==========================================
-- WEBCHAT WIDGET TABLES
-- ==========================================

-- 1. Webchat Configurations
CREATE TABLE IF NOT EXISTS webchat_configs (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL DEFAULT 'Web Widget',
    widget_uid UUID DEFAULT uuid_generate_v4() UNIQUE,
    
    -- Appearance
    primary_color VARCHAR(20) DEFAULT '#6366F1',
    logo_url TEXT,
    position VARCHAR(20) DEFAULT 'bottom-right', -- bottom-right, bottom-left
    launcher_icon VARCHAR(50) DEFAULT 'message-circle', -- message-circle, mail, zap
    
    -- Launcher Customization (NEW)
    launcher_logo_url TEXT,
    launcher_width INTEGER DEFAULT 60,
    launcher_height INTEGER DEFAULT 60,
    
    -- Greeting
    welcome_message TEXT DEFAULT 'Halo! Ada yang bisa kami bantu?',
    offline_message TEXT DEFAULT 'Kami sedang offline, silakan tinggalkan pesan.',
    
    -- Behavior
    require_email BOOLEAN DEFAULT false,
    require_name BOOLEAN DEFAULT true,
    require_phone BOOLEAN DEFAULT false,
    show_agent_face BOOLEAN DEFAULT true,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Update Contacts for Web Visitors
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS web_visitor_id VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_contacts_web_visitor ON contacts(web_visitor_id);

-- 3. Update Conversations Table (Link to Webchat Config)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS webchat_config_id BIGINT REFERENCES webchat_configs(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_webchat ON conversations(webchat_config_id);

-- 4. Ensure source enum/varchar allows 'webchat'
-- (PostgreSQL VARCHAR doesn't need explicit enum update, but logic in code should handle it)


-- ==========================================
-- MIGRATION: update-webchat-launcher.txt
-- ==========================================

-- Add launcher_logo_url column to webchat_configs table
ALTER TABLE webchat_configs 
ADD COLUMN IF NOT EXISTS launcher_logo_url TEXT;


-- ==========================================
-- MIGRATION: update-webchat-launcher-size.txt
-- ==========================================

-- Add launcher_width and launcher_height columns to webchat_configs table
ALTER TABLE webchat_configs 
ADD COLUMN IF NOT EXISTS launcher_width INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS launcher_height INTEGER DEFAULT 60;


-- ==========================================
-- MIGRATION: fix-broadcast-recipient-schema.txt
-- ==========================================

-- Increase phone_number length in broadcast_recipients to support Group JIDs (e.g. 120363023936472363@g.us)
-- Group IDs are longer than standard phone numbers.
ALTER TABLE broadcast_recipients ALTER COLUMN phone_number TYPE VARCHAR(255);

-- ==========================================
-- MIGRATION: update-messenger-integration.txt
-- ==========================================

-- 1. Create Messenger Pages Table
CREATE TABLE IF NOT EXISTS messenger_pages (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    page_id VARCHAR(100) UNIQUE NOT NULL,
    page_name VARCHAR(255) NOT NULL,
    picture_url TEXT,
    access_token TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    ai_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Update Conversations Table for Multi-channel
-- Add 'channel' column, default to 'whatsapp' for existing data
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS channel VARCHAR(20) DEFAULT 'whatsapp';
-- Add 'messenger_page_id' to link conversation to specific FB Page
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS messenger_page_id BIGINT REFERENCES messenger_pages(id) ON DELETE SET NULL;

-- 3. Update Contacts Table
-- Ensure phone_number can store PSID (long string)
ALTER TABLE contacts ALTER COLUMN phone_number TYPE VARCHAR(255);
-- source column already exists (added in previous migration), logic will just use 'messenger' value

-- 4. Indexing
CREATE INDEX IF NOT EXISTS idx_conversations_channel ON conversations(channel);
CREATE INDEX IF NOT EXISTS idx_messenger_pages_org ON messenger_pages(organization_id);

-- ==========================================
-- MIGRATION: update-instagram-integration.txt
-- ==========================================

-- 1. Create Instagram Accounts Table
CREATE TABLE IF NOT EXISTS instagram_accounts (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    ig_id VARCHAR(100) UNIQUE NOT NULL, -- Instagram Scoped ID (IGSID)
    username VARCHAR(100) NOT NULL,
    profile_picture_url TEXT,
    fb_page_id VARCHAR(100), -- Linked Facebook Page ID
    access_token TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    ai_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Update Conversations Table (Already has channel, just adding FK if needed, but loose coupling is fine)
-- We use 'instagram' in channel column.
-- Optional: Add instagram_account_id column for stricter relation, but reuse messenger_page_id or create new one.
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS instagram_account_id BIGINT REFERENCES instagram_accounts(id) ON DELETE SET NULL;

-- 3. Update Contacts Table
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS username VARCHAR(100); -- Store IG handle

-- 4. Indexing
CREATE INDEX IF NOT EXISTS idx_instagram_accounts_org ON instagram_accounts(organization_id);

-- ==========================================
-- MIGRATION: update-telegram-integration.txt
-- ==========================================

-- 1. Create Telegram Bots Table
CREATE TABLE IF NOT EXISTS telegram_bots (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    bot_token TEXT UNIQUE NOT NULL, -- Encrypted ideally, plain for MVP
    bot_id BIGINT NOT NULL, -- Telegram Numeric ID
    username VARCHAR(100), -- without @
    first_name VARCHAR(255),
    photo_url TEXT,
    is_active BOOLEAN DEFAULT true,
    ai_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Update Conversations Table
-- Channel 'telegram' is used.
-- Link conversation to specific bot
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS telegram_bot_id BIGINT REFERENCES telegram_bots(id) ON DELETE SET NULL;

-- 3. Update Contacts Table
-- Telegram uses numeric ID (BigInt), phone_number column is VARCHAR so it fits.
-- We will store the Chat ID in phone_number for consistency, or add telegram_id column for strict typing.
-- Storing in phone_number allows reusing existing logic, but let's add specific column for clarity/indexing.
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS telegram_id BIGINT; 
-- Note: 'username' column already added in Instagram migration, reused here.

-- 4. Indexing
CREATE INDEX IF NOT EXISTS idx_telegram_bots_org ON telegram_bots(organization_id);
CREATE INDEX IF NOT EXISTS idx_contacts_telegram_id ON contacts(telegram_id);

-- ==========================================
-- MIGRATION: fix-contacts-columns-length.txt
-- ==========================================

-- Fix 'value too long' error for Instagram contacts
ALTER TABLE contacts ALTER COLUMN name TYPE VARCHAR(255);
ALTER TABLE contacts ALTER COLUMN username TYPE VARCHAR(255);

-- ==========================================
-- MIGRATION: fix-instagram-length-issues.txt
-- ==========================================

-- Fix 'value too long' errors for Instagram Integration
-- 1. Increase contact name and username length
ALTER TABLE contacts ALTER COLUMN name TYPE VARCHAR(255);
ALTER TABLE contacts ALTER COLUMN username TYPE VARCHAR(255);

-- 2. Increase message ID length (Instagram IDs can be long)
ALTER TABLE messages ALTER COLUMN wa_message_id TYPE VARCHAR(255);


-- ==========================================
-- MIGRATION: update-inbox-workflow-v3.txt
-- ==========================================

-- 1. Update Conversations for Assignment & Rating
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS assigned_to_agent_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS closed_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS rating_score INTEGER,
ADD COLUMN IF NOT EXISTS rating_feedback TEXT,
ADD COLUMN IF NOT EXISTS rating_token VARCHAR(100) UNIQUE;

-- 2. Ensure Messages track sender type explicitly if needed (or rely on sender_id)
-- Adding sender_name snapshot for historical accuracy if agent name changes
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_name_snapshot VARCHAR(100);

-- 3. Indexing for performance
CREATE INDEX IF NOT EXISTS idx_conversations_assigned ON conversations(assigned_to_agent_id);
CREATE INDEX IF NOT EXISTS idx_conversations_rating_token ON conversations(rating_token);


-- ==========================================
-- MIGRATION: update-kb-ai-learning.txt
-- ==========================================

-- Update Knowledge Base QA table for AI Learning features
ALTER TABLE knowledge_base_qa 
ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual', -- 'manual', 'import', 'ai_generated'
ADD COLUMN IF NOT EXISTS created_by_agent_id BIGINT REFERENCES users(id) ON DELETE SET NULL;

-- Ensure created_by_agent_id is indexed for reporting
CREATE INDEX IF NOT EXISTS idx_kb_qa_creator ON knowledge_base_qa(created_by_agent_id);


-- ==========================================
-- MIGRATION: update-permissions-v4.txt
-- ==========================================

-- Add permissions column to users table for Granular Access Control
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb;


-- ==========================================
-- MIGRATION: update-role-management.txt
-- ==========================================

-- Update users table for role management
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role_level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb;

-- Set default role_level for existing admins
UPDATE users SET role_level = 100 WHERE role IN ('admin_member', 'super_admin');

-- Set default role_level for existing agents
UPDATE users SET role_level = 1 WHERE role = 'agent';


-- ==========================================
-- MIGRATION: update-super-agent-devices.txt
-- ==========================================

-- Add assigned_devices column to users table for Super Agent restrictions
ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_devices JSONB DEFAULT '[]'::jsonb;


-- ==========================================
-- MIGRATION: update-user-template.txt
-- ==========================================

-- Add closing message template for agents
ALTER TABLE users ADD COLUMN IF NOT EXISTS closing_message TEXT DEFAULT 'Terima kasih telah menghubungi kami. Semoga harimu menyenangkan!';

-- ==========================================
-- MIGRATION: update-feature-flags.txt
-- ==========================================

-- Create System Feature Flags Table
CREATE TABLE IF NOT EXISTS system_feature_flags (
    key VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL, -- core, module, tool, finance, integration, channel
    is_active BOOLEAN DEFAULT true,
    maintenance_message TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Default Features (Including new Channels)
INSERT INTO system_feature_flags (key, name, category, is_active) VALUES 
('core_wa_gateway', 'WhatsApp Gateway (Unofficial)', 'core', true),
('channel_wa_api', 'WhatsApp Official API', 'channel', true),
('channel_wa_coex', 'WhatsApp Official CoEx', 'channel', true),
('mod_inbox', 'Unified Inbox', 'module', true),
('mod_broadcast', 'Broadcast Campaign', 'module', true),
('mod_chatbot', 'AI Chatbot (Gemini)', 'module', true),
('mod_autoreply', 'Basic Auto-reply', 'module', true),
('tool_warmer', 'WhatsApp Warmer', 'tool', true),
('tool_scraper', 'GMaps Scraper', 'tool', true),
('tool_number_check', 'Number Checker', 'tool', true),
('tool_group_grab', 'Group Extractor', 'tool', true),
('fin_invoice', 'Invoicing System', 'finance', true),
('api_public', 'Public Developer API', 'integration', true),
-- New Channels
('channel_messenger', 'Facebook Messenger', 'channel', true),
('channel_instagram', 'Instagram DM', 'channel', true),
('channel_telegram', 'Telegram Bot', 'channel', true),
('channel_webchat', 'Webchat Widget', 'channel', true)
ON CONFLICT (key) DO NOTHING;

-- ==========================================
-- MIGRATION: update-subscription-plan-trial.txt
-- ==========================================

-- Update Plans Table
ALTER TABLE plans 
ADD COLUMN IF NOT EXISTS trial_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_trial_allowed BOOLEAN DEFAULT false;

-- Update Subscriptions Table
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- Update Organizations Table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS has_used_trial BOOLEAN DEFAULT false;

-- ==========================================
-- MIGRATION: update-chat-flow.txt
-- ==========================================

-- 1. Chat Flows Table (Definitions)
CREATE TABLE IF NOT EXISTS chat_flows (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    trigger_keyword VARCHAR(50) NOT NULL,
    nodes JSONB NOT NULL,
    edges JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, trigger_keyword)
);

-- 2. Flow Sessions (Execution State)
CREATE TABLE IF NOT EXISTS flow_sessions (
    id BIGSERIAL PRIMARY KEY,
    flow_id BIGINT REFERENCES chat_flows(id) ON DELETE CASCADE,
    contact_id BIGINT REFERENCES contacts(id) ON DELETE CASCADE,
    whatsapp_session_id BIGINT REFERENCES whatsapp_sessions(id) ON DELETE SET NULL, -- Device executing the flow
    current_node_id VARCHAR(100), -- UUID string from React Flow
    variables JSONB DEFAULT '{}'::jsonb, -- Store user inputs
    status VARCHAR(20) DEFAULT 'active', -- active, completed, paused
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(contact_id, status) -- Ensure only one active flow per user
);

CREATE INDEX IF NOT EXISTS idx_chat_flows_keyword ON chat_flows(organization_id, trigger_keyword);
CREATE INDEX IF NOT EXISTS idx_flow_sessions_contact ON flow_sessions(contact_id, status);

-- ==========================================
-- MIGRATION: update-keyword-reply.txt
-- ==========================================

-- 1. Keyword Replies Table (Menu Flow)
CREATE TABLE IF NOT EXISTS keyword_replies (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    parent_id BIGINT REFERENCES keyword_replies(id) ON DELETE CASCADE, -- Null for Root, Value for Child
    keyword VARCHAR(100) NOT NULL,
    match_type VARCHAR(20) DEFAULT 'exact', -- 'exact', 'contains'
    response_content TEXT NOT NULL,
    media_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, parent_id, keyword) -- Prevent duplicate keywords at same level
);

CREATE INDEX IF NOT EXISTS idx_keyword_replies_org ON keyword_replies(organization_id);
CREATE INDEX IF NOT EXISTS idx_keyword_replies_parent ON keyword_replies(parent_id);

-- 2. Ensure chatbot_settings has auto_reply_config (already added in previous migration, but ensuring defaults)
-- auto_reply_config structure: 
-- { 
--   business_hours: { enabled: bool, schedule: { mon: {open, close}, ... }, message: "..." }, 
--   welcome: { enabled: bool, message: "..." },
--   delayed: { enabled: bool, timer_min: 5, message: "..." }
-- }

-- ==========================================
-- MIGRATION: update-developer-api.txt
-- ==========================================

-- 1. Developer Apps (User Credentials)
CREATE TABLE IF NOT EXISTS developer_apps (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    api_key VARCHAR(64) UNIQUE NOT NULL,
    webhook_url TEXT,
    webhook_secret VARCHAR(64) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dev_apps_org ON developer_apps(organization_id);
CREATE INDEX IF NOT EXISTS idx_dev_apps_key ON developer_apps(api_key);

-- 2. App Channels (Granular Permissions: App A -> WhatsApp B, Telegram C)
CREATE TABLE IF NOT EXISTS developer_app_channels (
    id BIGSERIAL PRIMARY KEY,
    developer_app_id BIGINT REFERENCES developer_apps(id) ON DELETE CASCADE,
    channel_type VARCHAR(20) NOT NULL, -- whatsapp, telegram, messenger, instagram, webchat
    session_id VARCHAR(100) NOT NULL, -- The unique ID (uuid, bot token, page id, ig id)
    label VARCHAR(100), -- Friendly name snapshot
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(developer_app_id, session_id)
);

-- 3. API Logs
CREATE TABLE IF NOT EXISTS developer_api_logs (
    id BIGSERIAL PRIMARY KEY,
    developer_app_id BIGINT REFERENCES developer_apps(id) ON DELETE CASCADE,
    endpoint VARCHAR(100),
    method VARCHAR(10),
    status_code INTEGER,
    payload JSONB,
    response JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- MIGRATION: fix-developer-api-label.txt
-- ==========================================

-- Fix missing column in developer_app_channels
ALTER TABLE developer_app_channels ADD COLUMN IF NOT EXISTS label VARCHAR(100);

-- Ensure developer_apps table exists (Just in case)
CREATE TABLE IF NOT EXISTS developer_apps (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    api_key VARCHAR(64) UNIQUE NOT NULL,
    webhook_url TEXT,
    webhook_secret VARCHAR(64) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- MIGRATION: update-tiktok-integration.txt
-- ==========================================

-- 1. Create TikTok Shops Table
CREATE TABLE IF NOT EXISTS tiktok_shops (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    shop_id VARCHAR(100) UNIQUE NOT NULL,
    shop_name VARCHAR(255) NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    is_active BOOLEAN DEFAULT true,
    ai_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Update Conversations Table
-- Reuse channel column 'tiktok'
-- No explicit FK to tiktok_shops needed as sessions are loosely coupled in conversation, but index helps
CREATE INDEX IF NOT EXISTS idx_tiktok_shops_org ON tiktok_shops(organization_id);

-- UPDATE TIKTOK SHOPS TABLE
CREATE TABLE IF NOT EXISTS tiktok_shops (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    shop_id VARCHAR(100) UNIQUE NOT NULL, -- This stores the shop_cipher
    shop_name VARCHAR(255) NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    shop_cipher TEXT, -- Redundant but explicit
    token_expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    ai_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_tiktok_shops_org ON tiktok_shops(organization_id);

-- Add Feature Flag
INSERT INTO system_feature_flags (key, name, category, is_active) VALUES
('channel_tiktok', 'TikTok Shop Chat', 'channel', true)
ON CONFLICT (key) DO NOTHING;


-- ==========================================
-- EXAMPLE SEED DATA (Rating)
-- ==========================================
-- UPDATE conversations 
-- SET rating_score = 5, rating_feedback = 'Great service!' 
-- WHERE id = [YOUR_CONVERSATION_ID];


-- EXAMPLE SEED DATA (Rating History)
-- INSERT INTO conversation_ratings (conversation_id, rating_token, score, feedback) VALUES (1, 'mock-token', 5, 'Great!');

-- ==========================================
-- MIGRATION: Chatbot Reporting (Merged)
-- ==========================================

-- 1. Add hit_count to keyword_replies
ALTER TABLE keyword_replies ADD COLUMN IF NOT EXISTS hit_count INTEGER DEFAULT 0;

-- 2. Chatbot Logs for Analytics
CREATE TABLE IF NOT EXISTS chatbot_logs (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    contact_id BIGINT REFERENCES contacts(id) ON DELETE CASCADE,
    conversation_id BIGINT REFERENCES conversations(id) ON DELETE CASCADE,
    message_content TEXT,
    matched_rule_id BIGINT REFERENCES keyword_replies(id) ON DELETE SET NULL,
    match_type VARCHAR(20), -- 'exact', 'contains', 'fallback', 'business_hours', 'welcome'
    is_handled BOOLEAN DEFAULT true,
    is_fallback BOOLEAN DEFAULT false,
    confidence_score DECIMAL(5,2) DEFAULT 1.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chatbot_logs_org_date ON chatbot_logs(organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chatbot_logs_rule ON chatbot_logs(matched_rule_id);


-- ==========================================
-- 15. PIPELINE CRM
-- ==========================================
CREATE TABLE IF NOT EXISTS pipelines (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(20),
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pipelines_org ON pipelines(organization_id);

CREATE TABLE IF NOT EXISTS pipeline_stages (
    id SERIAL PRIMARY KEY,
    pipeline_id INTEGER NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(20),
    position INTEGER NOT NULL,
    is_closed_stage BOOLEAN DEFAULT false,
    automation_actions JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_pipeline ON pipeline_stages(pipeline_id);

-- Note: ALTER TABLE commands for 'conversations' are usually handled in migration scripts if the table exists,
-- but for fresh install:
-- ALTER TABLE conversations ADD COLUMN pipeline_id INTEGER REFERENCES pipelines(id) ON DELETE SET NULL;
-- ALTER TABLE conversations ADD COLUMN pipeline_stage_id INTEGER REFERENCES pipeline_stages(id) ON DELETE SET NULL;
-- ALTER TABLE conversations ADD COLUMN stage_changed_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS pipeline_stage_history (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    pipeline_id INTEGER NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    from_stage_id INTEGER REFERENCES pipeline_stages(id) ON DELETE SET NULL,
    to_stage_id INTEGER NOT NULL REFERENCES pipeline_stages(id) ON DELETE CASCADE,
    changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    duration_seconds INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pipeline_history_conversation ON pipeline_stage_history(conversation_id);

-- ==========================================
-- 16. ONGKIR INTEGRATION (BYOK)
-- ==========================================
CREATE TABLE IF NOT EXISTS ongkir_settings (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    rajaongkir_api_key TEXT NOT NULL, 
    rajaongkir_account_type VARCHAR(20) DEFAULT 'starter', 
    default_origin_city_id INTEGER,
    default_origin_city_name VARCHAR(255),
    default_origin_province VARCHAR(255),
    enabled_couriers TEXT[], 
    is_active BOOLEAN DEFAULT false,
    last_verified_at TIMESTAMPTZ,
    api_status VARCHAR(20) DEFAULT 'unverified',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id)
);

CREATE TABLE IF NOT EXISTS ongkir_logs (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    conversation_id INTEGER REFERENCES conversations(id) ON DELETE SET NULL,
    origin VARCHAR(255),
    destination VARCHAR(255),
    weight INTEGER,
    courier VARCHAR(50),
    cost INTEGER,
    api_response JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ongkir_logs_org ON ongkir_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_ongkir_logs_created ON ongkir_logs(created_at);


-- ==========================================
-- 17. AFFILIATE PROGRAM
-- ==========================================

-- 17.1 User Extensions
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referrer_id INT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS affiliate_clicks INT DEFAULT 0;

-- 17.2 Commissions
CREATE TABLE IF NOT EXISTS affiliate_commissions (
    id SERIAL PRIMARY KEY,
    partner_id INT NOT NULL,
    source_user_id INT,
    amount NUMERIC(15,2) NOT NULL,
    order_ref VARCHAR(50),
    description TEXT,
    status VARCHAR(20) DEFAULT 'available',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_partner ON affiliate_commissions(partner_id);

-- 17.3 Payouts
CREATE TABLE IF NOT EXISTS affiliate_payouts (
    id SERIAL PRIMARY KEY,
    partner_id INT NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    bank_details TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    proof_url TEXT,
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_partner ON affiliate_payouts(partner_id);

-- 17.4 Settings Seed
INSERT INTO system_settings (key, value, group_name, type) 
VALUES ('affiliate_commission_rate', '20', 'affiliate', 'number'),
       ('affiliate_min_payout', '100000', 'affiliate', 'number')
ON CONFLICT (key) DO NOTHING;


-- ==========================================
-- 18. UPSELLING CAMPAIGNS & BROADCAST
-- ==========================================

CREATE TABLE IF NOT EXISTS upselling_campaigns (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    name TEXT NOT NULL,
    frequency VARCHAR(50) NOT NULL, -- 'daily', 'monthly', 'yearly'
    time TIME NOT NULL,
    day_of_month INT,
    month_of_year INT,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP,
    device_id INT,
    rotator_group_id INT,
    target_type VARCHAR(50), -- 'label', 'all'
    target_value TEXT,
    message_template TEXT,
    delay_seconds INT DEFAULT 60,
    status VARCHAR(50) DEFAULT 'active',
    last_run_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_upselling_org ON upselling_campaigns(organization_id);

-- ==========================================
-- 19. QUEUE SYSTEM
-- ==========================================

CREATE TABLE IF NOT EXISTS queues (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    division VARCHAR(50) NOT NULL,
    contact_id INT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    queue_number INT,
    status VARCHAR(20) DEFAULT 'waiting', -- waiting, serving, completed, cancelled
    served_by INT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_queues_org_div_status ON queues(organization_id, division, status);
CREATE INDEX IF NOT EXISTS idx_queues_contact ON queues(contact_id);

-- E. Promo Codes
CREATE TABLE IF NOT EXISTS promo_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('percent', 'fixed')),
    value DECIMAL(15,2) NOT NULL,
    max_uses INTEGER,
    used_count INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- END OF INITIAL SCHEMA
-- ==========================================

-- ==========================================
-- 20. CONSOLIDATED MIGRATIONS (Webchat, Team, Extras)
-- ==========================================

-- A. Webchat Configurations
CREATE TABLE IF NOT EXISTS webchat_configs (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL DEFAULT 'Web Widget',
    widget_uid UUID DEFAULT uuid_generate_v4() UNIQUE,
    
    -- Appearance
    primary_color VARCHAR(20) DEFAULT '#6366F1',
    logo_url TEXT,
    position VARCHAR(20) DEFAULT 'bottom-right',
    launcher_icon VARCHAR(50) DEFAULT 'message-circle',
    launcher_logo_url TEXT,
    launcher_width INTEGER DEFAULT 60,
    launcher_height INTEGER DEFAULT 60,
    
    -- Greeting
    welcome_message TEXT DEFAULT 'Halo! Ada yang bisa kami bantu?',
    offline_message TEXT DEFAULT 'Kami sedang offline, silakan tinggalkan pesan.',
    
    -- Behavior
    require_email BOOLEAN DEFAULT false,
    require_name BOOLEAN DEFAULT true,
    require_phone BOOLEAN DEFAULT false,
    show_agent_face BOOLEAN DEFAULT true,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- B. System Feature Flags
CREATE TABLE IF NOT EXISTS system_feature_flags (
    key VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    maintenance_message TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO system_feature_flags (key, name, category, is_active) 
VALUES ('channel_webchat', 'Webchat Widget', 'channel', true)
ON CONFLICT (key) DO NOTHING;

-- C. Missing Columns in Conversations (Team & Webchat)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS assigned_to_agent_id BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS closed_by BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS webchat_config_id BIGINT REFERENCES webchat_configs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_assigned ON conversations(assigned_to_agent_id);
CREATE INDEX IF NOT EXISTS idx_conversations_webchat ON conversations(webchat_config_id);

-- D. Missing Columns in Contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS web_visitor_id VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_contacts_web_visitor ON contacts(web_visitor_id);


-- ==========================================
-- E. Consolidated Latest Migrations (Q1 2026)
-- ==========================================

-- 1. CoEx Feature Flag (002 & 003)
INSERT INTO system_feature_flags (key, name, category, is_active)
VALUES ('channel_wa_coex', 'WhatsApp Official (CoEx)', 'core', true)
ON CONFLICT (key) DO UPDATE SET category = 'core';

-- 2. Allow Null Pricing (004)
ALTER TABLE plans ALTER COLUMN price_monthly DROP NOT NULL;
ALTER TABLE plans ALTER COLUMN price_yearly DROP NOT NULL;

-- 3. Enhanced User Columns (005)
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_level INTEGER DEFAULT 10;
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS closing_message TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_devices JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_pic_url TEXT;
CREATE INDEX IF NOT EXISTS idx_users_org_online ON users(organization_id, is_online);

-- 4. Chatbot Device Cache
ALTER TABLE chatbot_settings ADD COLUMN IF NOT EXISTS cached_device_name VARCHAR(255);

-- 5. Quick Reply Enhancements
ALTER TABLE quick_replies ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'quick_reply';
CREATE INDEX IF NOT EXISTS idx_quick_replies_type ON quick_replies (type);

ALTER TABLE quick_replies ADD COLUMN IF NOT EXISTS user_id BIGINT;
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_quick_replies_user') THEN
        ALTER TABLE quick_replies ADD CONSTRAINT fk_quick_replies_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_quick_replies_user_id ON quick_replies(user_id);

-- 6. User FCM Tokens
CREATE TABLE IF NOT EXISTS user_fcm_tokens (
    id SERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users (id) ON DELETE CASCADE,
    fcm_token TEXT UNIQUE NOT NULL,
    device_id TEXT,
    platform VARCHAR(20),
    updated_at TIMESTAMPTZ DEFAULT NOW (),
    last_used_at TIMESTAMPTZ DEFAULT NOW ()
);
CREATE INDEX IF NOT EXISTS idx_fcm_user_id ON user_fcm_tokens (user_id);

-- 7. Org Webhooks & Dispatch Logs
CREATE TABLE IF NOT EXISTS org_webhooks (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    url TEXT NOT NULL,
    secret VARCHAR(64) NOT NULL,
    events TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_org_webhooks_org ON org_webhooks(organization_id);

CREATE TABLE IF NOT EXISTS org_webhook_logs (
    id BIGSERIAL PRIMARY KEY,
    webhook_id BIGINT REFERENCES org_webhooks(id) ON DELETE CASCADE,
    event VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'success',
    status_code INTEGER,
    response_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_org_webhook_logs_webhook ON org_webhook_logs(webhook_id, created_at DESC);

-- 8. Email Logs
CREATE TABLE IF NOT EXISTS email_logs (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    to_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    status VARCHAR(50) DEFAULT 'sent',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_logs_org ON email_logs(organization_id, created_at DESC);

-- 9. AI Chat & Suggestion Logs
CREATE TABLE IF NOT EXISTS ai_chat_logs (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    contact_id BIGINT REFERENCES contacts(id) ON DELETE SET NULL,
    bot_config_id BIGINT REFERENCES chatbot_settings(id) ON DELETE SET NULL,
    user_message TEXT,
    ai_response TEXT,
    is_fallback BOOLEAN DEFAULT false,
    confidence_score DECIMAL(5,2) DEFAULT 1.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_chat_logs_org ON ai_chat_logs(organization_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ai_suggestion_logs (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    conversation_id BIGINT REFERENCES conversations(id) ON DELETE CASCADE,
    suggested_reply TEXT,
    accepted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_suggestion_logs_conv ON ai_suggestion_logs(conversation_id);

-- 10. Messages Archive
CREATE TABLE IF NOT EXISTS messages_archive (
    id BIGINT PRIMARY KEY,
    conversation_id BIGINT,
    organization_id BIGINT,
    from_me BOOLEAN DEFAULT false,
    type VARCHAR(20) DEFAULT 'text',
    content TEXT,
    media_url TEXT,
    status VARCHAR(20) DEFAULT 'sent',
    wa_message_id VARCHAR(100),
    quoted_message TEXT,
    is_internal BOOLEAN DEFAULT false,
    reactions JSONB DEFAULT '[]'::jsonb,
    is_forwarded BOOLEAN DEFAULT false,
    sentiment VARCHAR(20),
    sentiment_score FLOAT,
    is_starred BOOLEAN DEFAULT FALSE,
    is_edited BOOLEAN DEFAULT FALSE,
    edited_at TIMESTAMPTZ,
    is_pinned BOOLEAN DEFAULT FALSE,
    sender VARCHAR(255),
    archived_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_archive_conv ON messages_archive(conversation_id);

