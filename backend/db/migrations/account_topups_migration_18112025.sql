CREATE TABLE IF NOT EXISTS account_topups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users (id) ON UPDATE CASCADE ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts (id) ON UPDATE CASCADE ON DELETE CASCADE,
    amount NUMERIC(18, 2) NOT NULL CHECK (amount > 0),
    currency CHAR(3) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_account_topups_user_created
    ON account_topups (user_id, created_at DESC);
