-- Migration: Lead Qualification
-- Run: sudo -u postgres psql -d omni_db -f migration_lead_qualification.sql

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS lead_status VARCHAR(20) DEFAULT 'unqualified';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS lead_qualified_at TIMESTAMPTZ;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS lead_qualification_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_contacts_lead_status ON contacts(organization_id, lead_status);
CREATE INDEX IF NOT EXISTS idx_contacts_lead_score ON contacts(organization_id, lead_score DESC);
