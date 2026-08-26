ALTER TABLE quick_replies
ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'quick_reply';

UPDATE quick_replies
SET
    type = 'quick_reply'
WHERE
    type IS NULL;

CREATE INDEX IF NOT EXISTS idx_quick_replies_type ON quick_replies (type);