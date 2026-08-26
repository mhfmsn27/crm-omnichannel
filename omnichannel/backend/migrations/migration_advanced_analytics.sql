-- Migration: Advanced Analytics, Customer Journey, Team Gamification, Multi-Language
-- Purpose: Add comprehensive analytics and engagement features
-- Run: sudo -u postgres psql -d omni_db -f migration_advanced_analytics.sql

-- ==========================================
-- ADVANCED ANALYTICS TABLES
-- ==========================================

-- Daily metrics aggregation for faster dashboard
CREATE TABLE IF NOT EXISTS analytics_daily_metrics (
    id SERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,

    -- Volume metrics
    total_conversations INTEGER DEFAULT 0,
    new_conversations INTEGER DEFAULT 0,
    resolved_conversations INTEGER DEFAULT 0,

    -- Response metrics
    avg_first_response_time_seconds INTEGER DEFAULT 0,
    avg_response_time_seconds INTEGER DEFAULT 0,

    -- Quality metrics
    total_ratings INTEGER DEFAULT 0,
    avg_rating DECIMAL(3,2) DEFAULT 0,
    csat_score DECIMAL(5,2) DEFAULT 0,

    -- Volume metrics
    total_messages INTEGER DEFAULT 0,
    inbound_messages INTEGER DEFAULT 0,
    outbound_messages INTEGER DEFAULT 0,

    -- Channel breakdown (JSONB for flexibility)
    channel_metrics JSONB DEFAULT '{}',

    -- Revenue metrics
    pipeline_value DECIMAL(15,2) DEFAULT 0,
    invoices_sent INTEGER DEFAULT 0,
    invoices_paid DECIMAL(15,2) DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, metric_date)
);

CREATE INDEX IF NOT EXISTS idx_analytics_daily_org_date ON analytics_daily_metrics(organization_id, metric_date DESC);

-- Hourly metrics for intraday analytics
CREATE TABLE IF NOT EXISTS analytics_hourly_metrics (
    id SERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    metric_hour TIMESTAMPTZ NOT NULL,

    total_conversations INTEGER DEFAULT 0,
    total_messages INTEGER DEFAULT 0,
    avg_response_time_seconds INTEGER DEFAULT 0,

    UNIQUE(organization_id, metric_hour)
);

CREATE INDEX IF NOT EXISTS idx_analytics_hourly_org ON analytics_hourly_metrics(organization_id, metric_hour DESC);

-- ==========================================
-- CUSTOMER JOURNEY TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS customer_journeys (
    id SERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    contact_id BIGINT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

    -- Journey status
    status VARCHAR(20) DEFAULT 'active',  -- active, converted, churned, lost

    -- Conversion tracking
    converted_at TIMESTAMPTZ,
    conversion_type VARCHAR(50),  -- purchase, signup, lead, etc
    conversion_value DECIMAL(15,2),
    conversion_note TEXT,

    -- Engagement scoring
    engagement_score INTEGER DEFAULT 0,  -- 0-100
    engagement_trend VARCHAR(10) DEFAULT 'stable',  -- improving, declining, stable

    -- Touchpoint count
    touchpoint_count INTEGER DEFAULT 0,
    first_touch_at TIMESTAMPTZ,
    last_touch_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_journeys_org ON customer_journeys(organization_id);
CREATE INDEX IF NOT EXISTS idx_journeys_contact ON customer_journeys(contact_id);
CREATE INDEX IF NOT EXISTS idx_journeys_status ON customer_journeys(status);

-- Journey touchpoints (each interaction)
CREATE TABLE IF NOT EXISTS journey_touchpoints (
    id SERIAL PRIMARY KEY,
    journey_id BIGINT NOT NULL REFERENCES customer_journeys(id) ON DELETE CASCADE,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Touchpoint details
    touchpoint_type VARCHAR(50) NOT NULL,  -- whatsapp, instagram, website, shopee, etc
    touchpoint_channel VARCHAR(50),  -- For detailed channel tracking

    -- Content
    interaction_type VARCHAR(50),  -- message, click, view, purchase, etc
    content_preview TEXT,

    -- Source tracking
    utm_source VARCHAR(50),
    utm_medium VARCHAR(50),
    utm_campaign VARCHAR(100),

    -- Metadata
    metadata JSONB DEFAULT '{}',  -- Flexible data storage

    -- Timing
    duration_seconds INTEGER,  -- For sessions
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_touchpoints_journey ON journey_touchpoints(journey_id);
CREATE INDEX IF NOT EXISTS idx_touchpoints_org ON journey_touchpoints(organization_id);
CREATE INDEX IF NOT EXISTS idx_touchpoints_type ON journey_touchpoints(touchpoint_type);

-- ==========================================
-- TEAM GAMIFICATION TABLES
-- ==========================================

CREATE TABLE IF NOT EXISTS gamification_settings (
    id SERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Points configuration
    points_per_conversation INTEGER DEFAULT 10,
    points_per_resolution INTEGER DEFAULT 25,
    points_per_positive_rating INTEGER DEFAULT 15,
    points_per_negative_rating INTEGER DEFAULT -5,
    points_per_quick_response INTEGER DEFAULT 5,

    -- Quick response threshold (seconds)
    quick_response_threshold INTEGER DEFAULT 60,

    -- Leaderboard settings
    leaderboard_period VARCHAR(20) DEFAULT 'weekly',  -- daily, weekly, monthly
    top_count INTEGER DEFAULT 10,

    -- Badges configuration (JSONB)
    badges JSONB DEFAULT '[]',

    -- Active status
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gamification_org ON gamification_settings(organization_id);

-- Agent points ledger
CREATE TABLE IF NOT EXISTS agent_points (
    id SERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Points balance
    total_points INTEGER DEFAULT 0,
    lifetime_points INTEGER DEFAULT 0,

    -- Achievement tracking
    badges_earned JSONB DEFAULT '[]',
    milestones_reached JSONB DEFAULT '[]',

    -- Streaks
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_at TIMESTAMPTZ,

    -- Weekly/monthly reset tracking
    period_points INTEGER DEFAULT 0,
    period_type VARCHAR(20) DEFAULT 'weekly',
    period_reset_at TIMESTAMPTZ,

    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_points_org ON agent_points(organization_id);
CREATE INDEX IF NOT EXISTS idx_agent_points_user ON agent_points(user_id);

-- Points transactions log
CREATE TABLE IF NOT EXISTS points_transactions (
    id SERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversation_id BIGINT REFERENCES conversations(id) ON DELETE SET NULL,

    -- Transaction details
    points INTEGER NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,  -- conversation, resolution, rating, quick_response, bonus, penalty
    description TEXT,

    -- Context
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_points_tx_org ON points_transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_points_tx_user ON points_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_points_tx_created ON points_transactions(created_at DESC);

-- Achievement badges definition
CREATE TABLE IF NOT EXISTS achievement_badges (
    id SERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(20),

    -- Requirements
    badge_type VARCHAR(50) NOT NULL,  -- volume, quality, speed, streak, milestone
    requirement_type VARCHAR(50),  -- conversations, rating, response_time, etc
    requirement_value INTEGER,

    -- Points reward
    bonus_points INTEGER DEFAULT 0,

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Predefined badges (can be customized)
INSERT INTO achievement_badges (organization_id, name, description, badge_type, requirement_type, requirement_value, bonus_points)
SELECT DISTINCT org_id, 'First Steps', 'Resolve 10 conversations', 'volume', 'resolutions', 10, 50
FROM (
    SELECT id as org_id FROM organizations
) t
ON CONFLICT DO NOTHING;

-- ==========================================
-- MULTI-LANGUAGE SUPPORT
-- ==========================================

CREATE TABLE IF NOT EXISTS language_settings (
    id SERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Default language
    default_language VARCHAR(10) DEFAULT 'id',
    supported_languages JSONB DEFAULT '["id", "en"]',

    -- Auto-detection
    auto_detect BOOLEAN DEFAULT TRUE,

    -- Language-specific configurations
    language_configs JSONB DEFAULT '{}',

    -- Fallback settings
    fallback_to_english BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_language_settings_org ON language_settings(organization_id);

-- Language detection logs (for analytics)
CREATE TABLE IF NOT EXISTS language_detection_logs (
    id SERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    contact_id BIGINT REFERENCES contacts(id) ON DELETE SET NULL,

    detected_language VARCHAR(10),
    confidence_score DECIMAL(5,2),
    message_preview TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_language_logs_org ON language_detection_logs(organization_id);

-- ==========================================
-- E-COMMERCE INTEGRATION TABLES
-- ==========================================

CREATE TABLE IF NOT EXISTS ecommerce_connections (
    id SERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Platform
    platform VARCHAR(50) NOT NULL,  -- shopee, tokopedia, lazada, blibli, etc
    store_name VARCHAR(255),
    store_id VARCHAR(100),

    -- API Credentials
    api_key TEXT,
    api_secret TEXT,
    api_url TEXT,

    -- Webhook settings
    webhook_url TEXT,
    webhook_secret TEXT,

    -- Sync settings
    auto_sync_products BOOLEAN DEFAULT FALSE,
    auto_sync_orders BOOLEAN DEFAULT FALSE,
    sync_interval_minutes INTEGER DEFAULT 30,
    last_sync_at TIMESTAMPTZ,

    -- Status
    is_active BOOLEAN DEFAULT FALSE,
    connection_status VARCHAR(20) DEFAULT 'disconnected',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ecom_org ON ecommerce_connections(organization_id);
CREATE INDEX IF NOT EXISTS idx_ecom_platform ON ecommerce_connections(platform);

-- Synced products cache
CREATE TABLE IF NOT EXISTS ecommerce_products (
    id SERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    connection_id BIGINT NOT NULL REFERENCES ecommerce_connections(id) ON DELETE CASCADE,

    external_product_id VARCHAR(100) NOT NULL,
    external_variant_ids JSONB DEFAULT '[]',

    name VARCHAR(255),
    description TEXT,
    price DECIMAL(15,2),
    stock INTEGER,
    status VARCHAR(20) DEFAULT 'active',

    images JSONB DEFAULT '[]',
    categories JSONB DEFAULT '[]',

    synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(connection_id, external_product_id)
);

CREATE INDEX IF NOT EXISTS idx_ecom_products_org ON ecommerce_products(organization_id);
CREATE INDEX IF NOT EXISTS idx_ecom_products_connection ON ecommerce_products(connection_id);

-- Synced orders cache
CREATE TABLE IF NOT EXISTS ecommerce_orders (
    id SERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    connection_id BIGINT NOT NULL REFERENCES ecommerce_connections(id) ON DELETE CASCADE,

    external_order_id VARCHAR(100) NOT NULL,
    external_status VARCHAR(50),

    -- Customer
    customer_name VARCHAR(255),
    customer_phone VARCHAR(20),
    customer_address TEXT,

    -- Order details
    items JSONB DEFAULT '[]',
    subtotal DECIMAL(15,2),
    shipping_cost DECIMAL(15,2),
    total_amount DECIMAL(15,2),

    -- Shipping
    shipping_method VARCHAR(100),
    tracking_number VARCHAR(100),

    -- Link to conversation
    conversation_id BIGINT REFERENCES conversations(id) ON DELETE SET NULL,
    contact_id BIGINT REFERENCES contacts(id) ON DELETE SET NULL,

    -- Status
    sync_status VARCHAR(20) DEFAULT 'synced',

    order_time TIMESTAMPTZ,
    synced_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(connection_id, external_order_id)
);

CREATE INDEX IF NOT EXISTS idx_ecom_orders_org ON ecommerce_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_ecom_orders_conversation ON ecommerce_orders(conversation_id);

-- ==========================================
-- ENHANCED CONTACTS FOR JOURNEY TRACKING
-- ==========================================

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS journey_status VARCHAR(20) DEFAULT 'prospect';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS lifetime_value DECIMAL(15,2) DEFAULT 0;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_channel VARCHAR(50);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS touchpoint_count INTEGER DEFAULT 0;