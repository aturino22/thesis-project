CREATE TABLE IF NOT EXISTS otp_challenges (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    channel_id UUID NOT NULL REFERENCES otp_channels (id) ON DELETE CASCADE,
    destination VARCHAR(255),
    context VARCHAR(64) NOT NULL DEFAULT 'default',
    code_hash TEXT NOT NULL,
    metadata JSONB,
    status TEXT NOT NULL DEFAULT 'PENDING',
    attempts SMALLINT NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS otp_challenges_user_idx
    ON otp_challenges (user_id, context, status);

CREATE INDEX IF NOT EXISTS otp_challenges_expires_idx
    ON otp_challenges (expires_at);
