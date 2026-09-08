-- Migration: 042_add_validate_whatsapp_to_broadcasts.sql
-- Purpose: Add validate_whatsapp column to broadcasts table for pre-send WhatsApp registration verification.

ALTER TABLE broadcasts 
ADD COLUMN IF NOT EXISTS validate_whatsapp BOOLEAN DEFAULT TRUE;

-- Add index on broadcast_recipients (broadcast_id, status) if not already existing to ensure fast lookups
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_bc_status 
ON broadcast_recipients (broadcast_id, status);
