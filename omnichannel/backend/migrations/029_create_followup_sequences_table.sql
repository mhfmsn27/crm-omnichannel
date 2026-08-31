-- Migration 029: Create Followup Sequences and Instances Tables
CREATE TABLE IF NOT EXISTS followup_sequences (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    steps JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS followup_instances (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    sequence_id INT NOT NULL REFERENCES followup_sequences(id) ON DELETE CASCADE,
    conversation_id INT,
    contact_id INT,
    current_step INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'running',
    next_run_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
