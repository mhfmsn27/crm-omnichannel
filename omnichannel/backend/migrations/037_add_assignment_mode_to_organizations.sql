-- Migration 037: Add assignment_mode and rr_last_user_id to organizations

ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS assignment_mode VARCHAR(20) DEFAULT 'manual',
    ADD COLUMN IF NOT EXISTS rr_last_user_id INT DEFAULT NULL;
