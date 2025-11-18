CREATE TABLE IF NOT EXISTS user_mfa_sessions (
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    context VARCHAR(64) NOT NULL DEFAULT 'default',
    verified_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (user_id, context)
);

CREATE INDEX IF NOT EXISTS user_mfa_sessions_expires_idx
    ON user_mfa_sessions (expires_at);
