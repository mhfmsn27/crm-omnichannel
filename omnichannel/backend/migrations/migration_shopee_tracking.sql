-- Migration: Shopee Integration + Source Tracking
-- Purpose: Add Shopee channel integration and UTM-based source tracking
-- Run: sudo -u postgres psql -d omni_db -f migration_shopee_tracking.sql

-- ==========================================
-- SHOPEE ACCOUNTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS shopee_accounts (
    id SERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    shop_name VARCHAR(255),
    shop_id VARCHAR(100),
    access_token TEXT,
    refresh_token TEXT,
    webhook_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    ai_auto_reply BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shopee_org ON shopee_accounts(organization_id);

-- ==========================================
-- SOURCE TRACKING - UTMS
-- ==========================================

-- Short links with UTM tracking
CREATE TABLE IF NOT EXISTS short_links (
    id SERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    slug VARCHAR(100) UNIQUE NOT NULL,
    target_url TEXT NOT NULL,

    -- UTM Parameters
    utm_source VARCHAR(50),
    utm_medium VARCHAR(50),
    utm_campaign VARCHAR(100),
    utm_content VARCHAR(100),
    utm_term VARCHAR(100),

    -- Tracking
    click_count INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,

    -- Rotation (CS Rotator)
    rotator_group_id BIGINT REFERENCES rotator_groups(id) ON DELETE SET NULL,
    rotator_index INTEGER DEFAULT 0,

    -- Meta
    is_active BOOLEAN DEFAULT TRUE,
    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_short_links_org ON short_links(organization_id);
CREATE INDEX IF NOT EXISTS idx_short_links_slug ON short_links(slug);

-- ==========================================
-- VISITOR SESSIONS & SOURCE ATTRIBUTION
-- ==========================================

-- Track visitor first touch attribution
CREATE TABLE IF NOT EXISTS visitor_sessions (
    id SERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    visitor_id VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),

    -- First touch attribution
    first_source VARCHAR(50),           -- whatsapp, instagram, facebook, tiktok, shopee, website, etc
    first_medium VARCHAR(50),          -- ads, organic, referral, cpc, etc
    first_campaign VARCHAR(100),
    first_content VARCHAR(100),
    first_term VARCHAR(100),
    first_click_at TIMESTAMPTZ,

    -- Last touch attribution
    last_source VARCHAR(50),
    last_medium VARCHAR(50),
    last_campaign VARCHAR(100),
    last_click_at TIMESTAMPTZ,

    -- Channel specific
    channel_type VARCHAR(20),           -- whatsapp, instagram, etc
    channel_id BIGINT,                 -- device/session id based on channel_type

    -- Conversation link
    contact_id BIGINT REFERENCES contacts(id) ON DELETE SET NULL,
    conversation_id BIGINT REFERENCES conversations(id) ON DELETE SET NULL,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, visitor_id)
);

CREATE INDEX IF NOT EXISTS idx_visitor_sessions_org ON visitor_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_contact ON visitor_sessions(contact_id);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_source ON visitor_sessions(first_source);

-- ==========================================
-- SHORT LINK CLICKS (DETAILED LOG)
-- ==========================================

CREATE TABLE IF NOT EXISTS short_link_clicks (
    id SERIAL PRIMARY KEY,
    short_link_id BIGINT NOT NULL REFERENCES short_links(id) ON DELETE CASCADE,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Visitor info
    visitor_id VARCHAR(100),
    ip_address VARCHAR(45),
    user_agent TEXT,

    -- Attribution data at click time
    source VARCHAR(50),
    medium VARCHAR(50),
    campaign VARCHAR(100),
    content VARCHAR(100),
    term VARCHAR(100),

    -- Destination reached
    destination_reached BOOLEAN DEFAULT FALSE,
    reached_at TIMESTAMPTZ,

    -- Lead conversion
    converted_to_contact BOOLEAN DEFAULT FALSE,
    contact_id BIGINT REFERENCES contacts(id) ON DELETE SET NULL,
    converted_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_link_clicks_link ON short_link_clicks(short_link_id);
CREATE INDEX IF NOT EXISTS idx_link_clicks_org ON short_link_clicks(organization_id);
CREATE INDEX IF NOT EXISTS idx_link_clicks_created ON short_link_clicks(created_at DESC);

-- ==========================================
-- CONTACTS - ENHANCED SOURCE TRACKING
-- ==========================================

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS first_touch_source VARCHAR(50);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS first_touch_medium VARCHAR(50);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS first_touch_campaign VARCHAR(100);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS first_touch_click_at TIMESTAMPTZ;

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_touch_source VARCHAR(50);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_touch_medium VARCHAR(50);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_touch_campaign VARCHAR(100);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_touch_click_at TIMESTAMPTZ;

-- ==========================================
-- UPDATE contacts source field options
-- ==========================================

-- Note: source field currently has limited options
-- We'll use first_touch_source for detailed tracking instead
-- source field can be: 'manual', 'import', 'website', 'whatsapp', 'instagram', 'facebook', 'tiktok', 'shopee', 'telegram', 'webchat', 'short_link'

-- ==========================================
-- AUTO LABEL ENHANCEMENT FOR SHOPEE
-- ==========================================

-- Add shopee to available channels in auto_label_rules
-- This is already supported via source_channel VARCHAR(20) field

-- ==========================================
-- VERIFICATION QUERIES
-- ==========================================

-- Check Shopee accounts:
-- SELECT * FROM shopee_accounts;

-- Check Short Links:
-- SELECT slug, target_url, utm_source, utm_medium, click_count FROM short_links;

-- Check Visitor Sessions with attribution:
-- SELECT visitor_id, first_source, first_medium, first_campaign, channel_type
-- FROM visitor_sessions
-- ORDER BY created_at DESC;