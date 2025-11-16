CREATE TABLE IF NOT EXISTS withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    method_id UUID NOT NULL,
    account_id UUID NOT NULL,
    amount NUMERIC(18, 2) NOT NULL,
    fee NUMERIC(18, 2) NOT NULL,
    currency CHAR(3) NOT NULL,
    total_debit NUMERIC(18, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    requested_ip VARCHAR(64),
    requested_user_agent VARCHAR(255),
    reference VARCHAR(64) NOT NULL,
    CONSTRAINT fk_withdrawals_user
        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_withdrawals_method
        FOREIGN KEY (method_id)
        REFERENCES withdrawal_methods (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_withdrawals_account
        FOREIGN KEY (account_id)
        REFERENCES accounts (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT withdrawals_status_chk
        CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'UNDER_REVIEW'))
);

CREATE INDEX IF NOT EXISTS withdrawals_user_idx
    ON withdrawals (user_id);

CREATE INDEX IF NOT EXISTS withdrawals_status_idx
    ON withdrawals (status);
