-- Migration 036: Create wa_template_library table

CREATE TABLE IF NOT EXISTS wa_template_library (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    content TEXT NOT NULL,
    variables JSONB DEFAULT '[]'::jsonb,
    use_count INTEGER DEFAULT 0,
    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_template_library_org ON wa_template_library(organization_id, category);
CREATE INDEX IF NOT EXISTS idx_wa_template_library_use ON wa_template_library(organization_id, use_count DESC);
