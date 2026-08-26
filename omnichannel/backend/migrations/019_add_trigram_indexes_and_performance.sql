-- ============================================================================
-- Migration 019: Trigram Full-Text Indexes & High-Performance Composite Indexes
-- Safe & Idempotent (Zero Breaking Change)
-- ============================================================================

-- 1. Enable pg_trgm extension for fast ILIKE and substring searching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. GIN Trigram index for rapid contact search by name & phone_number
CREATE INDEX IF NOT EXISTS idx_contacts_name_trgm 
    ON contacts USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_contacts_phone_trgm 
    ON contacts USING gin (phone_number gin_trgm_ops);

-- 3. GIN Trigram index for rapid message content search (ILIKE '%keyword%')
CREATE INDEX IF NOT EXISTS idx_messages_content_trgm 
    ON messages USING gin (content gin_trgm_ops) 
    WHERE content IS NOT NULL AND content != '';

-- 4. High-efficiency composite index for conversation unread & active list filters
CREATE INDEX IF NOT EXISTS idx_conv_org_status_archived_lastmsg 
    ON conversations(organization_id, status, is_archived, last_message_at DESC NULLS LAST);

-- 5. Index for fast lookup on messages by conversation and status
CREATE INDEX IF NOT EXISTS idx_messages_conv_status 
    ON messages(conversation_id, status);

-- 6. Index for fast lookup on contacts by organization and blocked status
CREATE INDEX IF NOT EXISTS idx_contacts_org_blocked 
    ON contacts(organization_id, is_blocked);
