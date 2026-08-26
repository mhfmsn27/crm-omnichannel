CREATE TABLE IF NOT EXISTS registered_groups (
    id SERIAL PRIMARY KEY,
    organization_id INT,
    group_jid VARCHAR(255) NOT NULL,
    group_name VARCHAR(255),
    company_id INT,
    status VARCHAR(50) DEFAULT 'active',
    assigned_agent_id INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_registered_groups_jid ON registered_groups(group_jid);
CREATE INDEX IF NOT EXISTS idx_registered_groups_org ON registered_groups(organization_id);
