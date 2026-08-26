ALTER TABLE quick_replies ADD COLUMN IF NOT EXISTS user_id BIGINT;
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_quick_replies_user') THEN
        ALTER TABLE quick_replies ADD CONSTRAINT fk_quick_replies_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_quick_replies_user_id ON quick_replies(user_id);
