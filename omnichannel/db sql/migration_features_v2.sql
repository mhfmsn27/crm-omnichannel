-- ============================================================
-- Migration: Feature Pack v2
-- Fitur: Auto-Assign, Working Hours, Outbound Webhooks, Ticket/SLA
-- ============================================================

-- ============================================================
-- 1. AUTO-ASSIGN / ROUND-ROBIN
-- ============================================================
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS assignment_mode VARCHAR(20) DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS rr_last_user_id INT DEFAULT NULL;

-- ============================================================
-- 2. WORKING HOURS
-- ============================================================
CREATE TABLE IF NOT EXISTS working_hours (
  id SERIAL PRIMARY KEY,
  organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Minggu
  start_time TIME NOT NULL DEFAULT '09:00',
  end_time TIME NOT NULL DEFAULT '17:00',
  is_active BOOLEAN DEFAULT true,
  UNIQUE(organization_id, day_of_week)
);

CREATE TABLE IF NOT EXISTS working_hours_config (
  organization_id INT PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  timezone VARCHAR(50) DEFAULT 'Asia/Jakarta',
  outside_mode VARCHAR(20) DEFAULT 'message', -- message | ai | none
  offline_message TEXT DEFAULT 'Terima kasih telah menghubungi kami. Saat ini kami sedang tidak beroperasi. Kami akan segera membalas pesan Anda pada jam operasional berikutnya.'
);

-- Seed default 7-hari schedule untuk orgs yang sudah ada (opsional, skip jika sudah ada)
-- INSERT INTO working_hours (organization_id, day_of_week, start_time, end_time, is_active)
-- SELECT id, gs, '09:00', '17:00', (gs BETWEEN 1 AND 5)
-- FROM organizations, generate_series(0,6) AS gs
-- ON CONFLICT DO NOTHING;

-- ============================================================
-- 3. OUTBOUND WEBHOOKS (Org-Level)
-- ============================================================
CREATE TABLE IF NOT EXISTS org_webhooks (
  id SERIAL PRIMARY KEY,
  organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  url TEXT NOT NULL,
  secret VARCHAR(100) NOT NULL DEFAULT '',
  events TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS org_webhook_logs (
  id BIGSERIAL PRIMARY KEY,
  webhook_id INT NOT NULL REFERENCES org_webhooks(id) ON DELETE CASCADE,
  event VARCHAR(60) NOT NULL,
  status VARCHAR(10) NOT NULL, -- success | failed
  status_code INT,
  response_ms INT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_webhook_logs_webhook_id ON org_webhook_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_org_webhooks_org ON org_webhooks(organization_id);

-- ============================================================
-- 4. TICKET SYSTEM + SLA
-- ============================================================
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS ticket_number VARCHAR(20),
  ADD COLUMN IF NOT EXISTS priority VARCHAR(10) DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS sla_deadline_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_breached BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS first_reply_at TIMESTAMPTZ;

-- Sequence untuk nomor tiket per org (global, format: TKT-XXXXX)
CREATE SEQUENCE IF NOT EXISTS ticket_seq START 1000;

-- SLA Policy: konfigurasi per priority per org
CREATE TABLE IF NOT EXISTS sla_policies (
  id SERIAL PRIMARY KEY,
  organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  priority VARCHAR(10) NOT NULL CHECK (priority IN ('low','medium','high','urgent')),
  frt_minutes INT NOT NULL DEFAULT 60,
  resolution_minutes INT NOT NULL DEFAULT 480,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(organization_id, priority)
);

-- Seed default SLA policies
-- INSERT INTO sla_policies (organization_id, priority, frt_minutes, resolution_minutes)
-- SELECT id, unnest(ARRAY['low','medium','high','urgent']),
--        unnest(ARRAY[240,60,30,10]),
--        unnest(ARRAY[1440,480,240,60])
-- FROM organizations
-- ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_conversations_priority ON conversations(priority);
CREATE INDEX IF NOT EXISTS idx_conversations_ticket_number ON conversations(ticket_number);
CREATE INDEX IF NOT EXISTS idx_conversations_sla_breach ON conversations(sla_breached) WHERE sla_breached = true;
