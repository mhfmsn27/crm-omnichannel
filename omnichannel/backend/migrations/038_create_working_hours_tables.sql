-- Migration 038: Create working_hours and working_hours_config tables

CREATE TABLE IF NOT EXISTS working_hours (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL DEFAULT '09:00',
    end_time TIME NOT NULL DEFAULT '17:00',
    is_active BOOLEAN DEFAULT true,
    UNIQUE(organization_id, day_of_week)
);

CREATE TABLE IF NOT EXISTS working_hours_config (
    organization_id INT PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    timezone VARCHAR(50) DEFAULT 'Asia/Jakarta',
    outside_mode VARCHAR(20) DEFAULT 'message',
    offline_message TEXT DEFAULT 'Terima kasih telah menghubungi kami. Saat ini kami sedang tidak beroperasi. Kami akan segera membalas pesan Anda pada jam operasional berikutnya.'
);

CREATE INDEX IF NOT EXISTS idx_working_hours_org ON working_hours(organization_id, day_of_week);
