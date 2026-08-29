-- ============================================================================
-- Migration 021: Upgrade Invoice 2.0 & Channel Integrations 2.0
-- Description: Adds support for Quotations, Partial Payments (DP/Termin),
--              Tax Details (NPWP/NIK), Recurring Invoices, Dunning Reminders,
--              Channel Integrations (Email, TikTok, LINE), and Webchat 2.0
-- ============================================================================

-- 1. ENHANCE INVOICES TABLE
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS document_type VARCHAR(20) DEFAULT 'invoice';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS valid_until DATE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_type VARCHAR(20) DEFAULT 'full';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS down_payment_amount DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS balance_due DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS buyer_npwp VARCHAR(50);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS buyer_nik VARCHAR(50);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS buyer_company_name VARCHAR(150);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_type VARCHAR(20) DEFAULT 'exclusive';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(5, 2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS recurring_frequency VARCHAR(20) DEFAULT 'monthly';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS recurring_next_date DATE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS recurring_status VARCHAR(20) DEFAULT 'inactive';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS dunning_count INTEGER DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS last_dunning_at TIMESTAMPTZ;

-- Backfill balance_due for existing invoices safely
UPDATE invoices 
SET balance_due = CASE 
    WHEN status = 'paid' THEN 0 
    ELSE COALESCE(total_amount, 0) - COALESCE(paid_amount, 0)
END,
paid_amount = CASE 
    WHEN status = 'paid' THEN COALESCE(total_amount, 0)
    ELSE COALESCE(paid_amount, 0)
END
WHERE balance_due IS NULL OR balance_due = 0 AND status != 'paid';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_doc_type ON invoices(organization_id, document_type);
CREATE INDEX IF NOT EXISTS idx_invoices_due_dunning ON invoices(status, due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_recurring ON invoices(is_recurring, recurring_status, recurring_next_date);

-- 2. PARTIAL PAYMENTS / INSTALLMENT MILESTONES TABLE
CREATE TABLE IF NOT EXISTS invoice_partial_payments (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    invoice_id BIGINT REFERENCES invoices(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'manual', -- manual, bank_transfer, qris, gateway
    payment_reference VARCHAR(100),
    proof_url TEXT,
    notes TEXT,
    payment_date TIMESTAMPTZ DEFAULT NOW(),
    recorded_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_partial_payments_inv ON invoice_partial_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_partial_payments_org ON invoice_partial_payments(organization_id);

-- 3. RECURRING INVOICE TEMPLATES & SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS recurring_invoices (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    contact_id BIGINT REFERENCES contacts(id) ON DELETE SET NULL,
    title VARCHAR(150) NOT NULL,
    frequency VARCHAR(20) DEFAULT 'monthly', -- weekly, monthly, quarterly, yearly
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    next_run_date DATE NOT NULL DEFAULT CURRENT_DATE,
    last_generated_at TIMESTAMPTZ,
    generated_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active', -- active, paused, completed, cancelled
    subtotal DECIMAL(12, 2) DEFAULT 0,
    tax_percentage DECIMAL(5, 2) DEFAULT 0,
    tax_amount DECIMAL(12, 2) DEFAULT 0,
    discount_amount DECIMAL(12, 2) DEFAULT 0,
    total_amount DECIMAL(12, 2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'IDR',
    notes TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    auto_send_whatsapp BOOLEAN DEFAULT TRUE,
    auto_send_email BOOLEAN DEFAULT FALSE,
    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recurring_invoices_status_date ON recurring_invoices(status, next_run_date);
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_org ON recurring_invoices(organization_id);

-- 4. CHANNEL INTEGRATIONS (EMAIL, TIKTOK, LINE, ETC)
CREATE TABLE IF NOT EXISTS channel_integrations (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    channel_type VARCHAR(50) NOT NULL, -- email, tiktok, line, custom
    name VARCHAR(100) NOT NULL,
    account_identifier VARCHAR(150), -- email address, shop id, line channel id
    credentials JSONB DEFAULT '{}'::jsonb, -- smtp, imap, tokens, secrets, client_id
    webhook_secret VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    status VARCHAR(20) DEFAULT 'connected', -- connected, error, disconnected
    error_message TEXT,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, channel_type, account_identifier)
);

CREATE INDEX IF NOT EXISTS idx_channel_integrations_org_type ON channel_integrations(organization_id, channel_type);

-- 5. WEBCHAT 2.0 LEAD CAPTURE & HANDOVER ENHANCEMENTS
ALTER TABLE webchat_configs ADD COLUMN IF NOT EXISTS prechat_lead_form_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE webchat_configs ADD COLUMN IF NOT EXISTS prechat_fields JSONB DEFAULT '["name", "whatsapp", "email"]'::jsonb;
ALTER TABLE webchat_configs ADD COLUMN IF NOT EXISTS whatsapp_handoff_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE webchat_configs ADD COLUMN IF NOT EXISTS whatsapp_handoff_number VARCHAR(50);
ALTER TABLE webchat_configs ADD COLUMN IF NOT EXISTS ai_copilot_enabled BOOLEAN DEFAULT TRUE;
