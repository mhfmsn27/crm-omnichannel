-- Migration 039: Add SMTP columns to organizations and ensure email_logs table

ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS smtp_host VARCHAR(255),
    ADD COLUMN IF NOT EXISTS smtp_port INTEGER DEFAULT 587,
    ADD COLUMN IF NOT EXISTS smtp_secure BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS smtp_user VARCHAR(255),
    ADD COLUMN IF NOT EXISTS smtp_pass TEXT,
    ADD COLUMN IF NOT EXISTS smtp_from_email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS smtp_from_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS smtp_enabled BOOLEAN DEFAULT false;

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
