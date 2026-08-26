-- Table to store FCM tokens for users (Agents/Admins) to receive push notifications
CREATE TABLE IF NOT EXISTS user_fcm_tokens (
    id SERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users (id) ON DELETE CASCADE,
    fcm_token TEXT UNIQUE NOT NULL,
    device_id TEXT, -- Optional: Unique device identifier to support multiple devices per user
    platform VARCHAR(20), -- 'android', 'ios', 'web'
    updated_at TIMESTAMPTZ DEFAULT NOW (),
    last_used_at TIMESTAMPTZ DEFAULT NOW ()
);

CREATE INDEX IF NOT EXISTS idx_fcm_user_id ON user_fcm_tokens (user_id);