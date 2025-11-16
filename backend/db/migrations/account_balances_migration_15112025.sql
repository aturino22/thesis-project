CREATE TABLE IF NOT EXISTS account_balances (
    account_id UUID PRIMARY KEY,
    available_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
    frozen_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_account_balances_account
        FOREIGN KEY (account_id)
        REFERENCES accounts (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

INSERT INTO account_balances (account_id, available_amount, frozen_amount)
SELECT id, balance, 0
FROM accounts
ON CONFLICT (account_id) DO NOTHING;
