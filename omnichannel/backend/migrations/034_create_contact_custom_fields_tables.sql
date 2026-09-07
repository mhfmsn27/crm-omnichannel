-- Migration 034: Create contact_custom_fields and contact_field_values tables

CREATE TABLE IF NOT EXISTS contact_custom_fields (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    field_key VARCHAR(100) NOT NULL,
    field_label VARCHAR(255) NOT NULL,
    field_type VARCHAR(50) NOT NULL DEFAULT 'text',
    field_options JSONB DEFAULT NULL,
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, field_key)
);

CREATE TABLE IF NOT EXISTS contact_field_values (
    id BIGSERIAL PRIMARY KEY,
    contact_id BIGINT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    field_key VARCHAR(100) NOT NULL,
    value TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(contact_id, field_key)
);

CREATE INDEX IF NOT EXISTS idx_contact_custom_fields_org ON contact_custom_fields(organization_id);
CREATE INDEX IF NOT EXISTS idx_contact_custom_fields_pos ON contact_custom_fields(organization_id, position);
CREATE INDEX IF NOT EXISTS idx_contact_field_values_contact ON contact_field_values(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_field_values_org_key ON contact_field_values(organization_id, field_key);
