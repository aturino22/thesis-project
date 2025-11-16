CREATE TABLE IF NOT EXISTS withdrawal_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    type TEXT NOT NULL DEFAULT 'BANK_ACCOUNT',
    iban VARCHAR(34) NOT NULL,
    bic VARCHAR(11),
    bank_name VARCHAR(140),
    account_holder_name VARCHAR(140) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_at TIMESTAMPTZ,
    CONSTRAINT fk_withdrawal_methods_user
        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT withdrawal_methods_type_chk
        CHECK (type IN ('BANK_ACCOUNT')),
    CONSTRAINT withdrawal_methods_status_chk
        CHECK (status IN ('PENDING_VERIFICATION', 'VERIFIED', 'REJECTED'))
);

ALTER TABLE withdrawal_methods
    ADD CONSTRAINT withdrawal_methods_iban_unique UNIQUE (iban);

CREATE INDEX IF NOT EXISTS withdrawal_methods_user_idx
    ON withdrawal_methods (user_id);

CREATE UNIQUE INDEX IF NOT EXISTS withdrawal_methods_default_idx
    ON withdrawal_methods (user_id)
    WHERE is_default;
