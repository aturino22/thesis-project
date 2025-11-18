CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    currency CHAR(3) NOT NULL,
    balance NUMERIC(18, 2) NOT NULL DEFAULT 0,
    name VARCHAR(120) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE accounts
    ADD CONSTRAINT fk_accounts_user
        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_accounts_user_id
    ON accounts (user_id);

CREATE OR REPLACE FUNCTION enforce_single_account_per_user()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM accounts
        WHERE user_id = NEW.user_id
    ) THEN
        RAISE EXCEPTION 'User % already owns an account', NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_accounts_single_per_user
    BEFORE INSERT ON accounts
    FOR EACH ROW
    EXECUTE FUNCTION enforce_single_account_per_user();
